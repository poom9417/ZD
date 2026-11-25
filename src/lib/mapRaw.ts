/**
 * แปลงไฟล์ ZD ดิบจาก SAP + master ให้เป็นข้อมูลที่จัดสิทธิ/กลุ่ม/ช่วงอายุแล้ว
 * (ทำแทนสูตร Excel ในชีต data ของไฟล์ *_analyzed.xlsx)
 *
 *  คีย์แมพ master     = G/L Account + Account + Special G/L Ind.   (ตรงกับ GL&Customer&Sp.gl)
 *  สิทธิ/กลุ่ม/ชื่อ/Due = จาก master ตามคีย์
 *  BaselineDate        = Posting Date + Due(วัน)
 *  Aoverday            = วันที่รายงาน − BaselineDate
 *  ช่วงอายุ            = Aoverday ≤ 0 → (0); ≤30 → (1); ≤60 → (2); ≤90 → (3);
 *                        เกิน 90 วัน แยกตามปีงบ: ปีงบ (ปีงบวันที่รายงาน−1) → (4), ก่อนหน้า 1 ปี → (5), เก่ากว่านั้น → (6)
 *
 *  กติการายการยกยอด (ค่าเริ่มต้น Year/Month = 2022/08) — ตรงกับที่พบในไฟล์ที่วิเคราะห์เอง:
 *    ใช้ Net Due Date แทน Posting Date และอ่านปีงบจากเลขอ้างอิง (69CO-… → 2026)
 */
import type { BucketKey } from './buckets'
import type { ZdData, ZdRecord } from './types'

type Cell = string | number | boolean | Date | null | undefined

// ---------- ตัวช่วย ----------
const text = (v: Cell) => String(v ?? '').replace(/\s+/g, ' ').trim()
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const DAY = 86_400_000

/** คืนค่าเป็นเวลา UTC เที่ยงคืนของวันนั้น (ตัดปัญหา timezone) */
function dayNumber(v: Cell): number | null {
  if (v instanceof Date && !isNaN(v.getTime())) return Date.UTC(v.getFullYear(), v.getMonth(), v.getDate())
  if (typeof v === 'number' && Number.isFinite(v) && v > 20000 && v < 80000) return Math.round((v - 25569) * DAY)
  const s = text(v)
  if (!s) return null
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s)
  const local = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?: .*)?$/.exec(s)
  if (!iso && !local) return null
  let [y, m, d] = iso ? [+iso[1], +iso[2], +iso[3]] : [+local![3], +local![2], +local![1]]
  if (y > 2400) y -= 543
  const t = Date.UTC(y, m - 1, d)
  const c = new Date(t)
  return c.getUTCFullYear() === y && c.getUTCMonth() === m - 1 && c.getUTCDate() === d ? t : null
}
const fmtDay = (t: number) => {
  const d = new Date(t)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
}
/** ปีงบประมาณไทย: ต.ค.–ก.ย. (ต.ค. 2026 = ปีงบ 2027) */
export const fiscalYearOf = (t: number) => {
  const d = new Date(t)
  return d.getUTCMonth() >= 9 ? d.getUTCFullYear() + 1 : d.getUTCFullYear()
}
function amountOf(v: Cell, row: number): number {
  const s = text(v)
  const n = typeof v === 'number' ? v : /^\(?-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?\)?$/.test(s) ? Number(s.replace(/,/g, '').replace(/^\((.*)\)$/, '-$1')) : NaN
  if (!Number.isFinite(n)) throw new Error(`แถว ${row}: ยอดเงินไม่ถูกต้องหรือว่าง (Amount in Local Currency)`)
  return n
}

// ---------- master ----------
/** [สิทธิ, กลุ่มลูกหนี้, ชื่อหน่วยงาน, Due(วัน) | null] */
export type MasterEntry = [string, string, string, number | null]
export interface MasterData {
  source: string
  savedAt: string
  rows: number
  duplicateKeys: number
  entries: Record<string, MasterEntry>
}

const MASTER_COLUMNS = ['ประเภทลูกหนี้สิทธิ', 'กลุ่มลูกหนี้สิทธิ', 'รหัสลูกหนี้', 'GLAccount', 'SpGLInd', 'ชื่อหน่วยงาน', 'Due']

export const isMasterMatrix = (matrix: Cell[][]) => matrix.some(r => MASTER_COLUMNS.every(c => r.map(text).includes(c)))

/** อ่านชีต master (คอลัมน์ตามไฟล์ analyzed). คีย์สร้างจาก GLAccount + รหัสลูกหนี้ + SpGLInd เพื่อไม่พึ่งคอลัมน์คีย์ที่อาจถูก Excel แปลงเป็นตัวเลข */
export function parseMaster(matrix: Cell[][], source: string): MasterData {
  const hi = matrix.findIndex(r => MASTER_COLUMNS.every(c => r.map(text).includes(c)))
  if (hi < 0) throw new Error(`ไม่พบหัวคอลัมน์ master: ${MASTER_COLUMNS.join(', ')}`)
  const h = matrix[hi].map(text)
  const col = (n: string) => h.indexOf(n)
  const ix = { r: col('ประเภทลูกหนี้สิทธิ'), g: col('กลุ่มลูกหนี้สิทธิ'), acc: col('รหัสลูกหนี้'), gl: col('GLAccount'), sp: col('SpGLInd'), name: col('ชื่อหน่วยงาน'), due: col('Due') }
  const entries: Record<string, MasterEntry> = {}
  let rows = 0, dup = 0
  for (let i = hi + 1; i < matrix.length; i++) {
    const row = matrix[i]
    const acc = text(row[ix.acc])
    if (!acc) continue
    rows++
    const key = text(row[ix.gl]) + acc + text(row[ix.sp])
    const dueText = text(row[ix.due])
    const due = dueText === '' ? null : Number(dueText)
    if (key in entries) { dup++; continue } // key ซ้ำ: ใช้แถวแรก (ค่าสิทธิ/กลุ่ม/Due ที่ซ้ำเหมือนกันทุกคู่ในไฟล์ปัจจุบัน)
    entries[key] = [text(row[ix.r]), text(row[ix.g]), text(row[ix.name]), Number.isFinite(due) ? due : null]
  }
  if (!rows) throw new Error('ชีต master ไม่มีรายการ')
  return { source, savedAt: new Date().toISOString(), rows, duplicateKeys: dup, entries }
}

// ---------- ไฟล์ดิบ ----------
const RAW_COLUMNS = ['Account', 'Document Number', 'Posting Date', 'Special G/L Ind.', 'Amount in Local Currency', 'G/L Account', 'Reference Key 1']
export const isRawMatrix = (matrix: Cell[][]) => matrix.some(r => RAW_COLUMNS.every(c => r.map(text).includes(c)))

export interface MapOptions {
  /** วันที่รายงาน (ตัวเลขวัน UTC หรือสตริงวันที่) */
  reportDate: string
  /** Year/Month ที่เป็นรายการยกยอด ว่างไว้ = ปิดกติกานี้ */
  migrationYearMonth?: string
}
export interface UnmatchedGroup { key: string; account: string; count: number; amount: number }
export interface MapResult {
  data: ZdData
  warnings: string[]
  unmatched: UnmatchedGroup[]
  migratedRows: number
  bucketBaseFy: number
}

export function mapRaw(matrix: Cell[][], master: MasterData, source: string, opt: MapOptions): MapResult {
  const hi = matrix.findIndex(r => RAW_COLUMNS.every(c => r.map(text).includes(c)))
  if (hi < 0) throw new Error(`ไม่พบหัวคอลัมน์ของไฟล์ ZD ดิบ: ${RAW_COLUMNS.join(', ')}`)
  const h = matrix[hi].map(text)
  const ix = (n: string) => h.indexOf(n)
  const need = (n: string) => { if (ix(n) < 0) throw new Error(`ไม่พบคอลัมน์ ${n}`); return ix(n) }
  const c = {
    acc: need('Account'), doc: need('Document Number'), ref: ix('Reference'), post: need('Posting Date'), due: ix('Net Due Date'),
    sp: need('Special G/L Ind.'), amt: need('Amount in Local Currency'), gl: need('G/L Account'), rk1: need('Reference Key 1'),
    ym: ix('Year/Month'), fy: ix('Fiscal Year'),
  }
  const report = dayNumber(opt.reportDate)
  if (report === null) throw new Error('กรุณาระบุวันที่รายงานให้ถูกต้อง')
  const baseFy = fiscalYearOf(report) - 1
  const migYm = (opt.migrationYearMonth ?? '').trim()

  const grouped = new Map<string, ZdRecord>()
  const unmatched = new Map<string, UnmatchedGroup>()
  let rows = 0, total = 0, migrated = 0, blankAge = 0, noPosting = 0, fyFallback = 0

  for (let i = hi + 1; i < matrix.length; i++) {
    const row = matrix[i]
    const account = text(row[c.acc])
    const docNo = text(row[c.doc])
    if (!account && !docNo) continue // แถวว่าง / แถวรวมยอดท้ายไฟล์ SAP
    const amt = amountOf(row[c.amt], i + 1)
    const key = text(row[c.gl]) + account + text(row[c.sp])
    const m = master.entries[key]

    const isMig = migYm !== '' && c.ym >= 0 && text(row[c.ym]) === migYm
    if (isMig) migrated++
    const net = c.due >= 0 ? dayNumber(row[c.due]) : null
    const posted = isMig && net !== null ? net : dayNumber(row[c.post])

    let fy = c.fy >= 0 ? Number(text(row[c.fy])) : NaN
    if (fy > 2400) fy -= 543
    if (isMig && c.ref >= 0) {
      const p = /^(\d{2})/.exec(text(row[c.ref]))
      const fromRef = p ? 1957 + Number(p[1]) : NaN
      if (fromRef >= 2000 && fromRef <= 2100) fy = fromRef; else fyFallback++
    }
    if (!Number.isInteger(fy)) fy = posted !== null ? fiscalYearOf(posted) : 0

    // ช่วงอายุ
    const dueDays = m ? m[3] : null
    let k: BucketKey = 'na'
    if (posted === null) noPosting++
    if (posted !== null && dueDays !== null) {
      const over = Math.round((report - (posted + dueDays * DAY)) / DAY)
      if (over <= 0) k = '0'
      else if (over <= 30) k = '1'
      else if (over <= 60) k = '2'
      else if (over <= 90) k = '3'
      else if (fy === baseFy) k = '4'
      else if (fy === baseFy - 1) k = '5'
      else if (fy < baseFy - 1) k = '6'
      else k = 'na'
    }
    if (k === 'na') blankAge++

    const visitRaw = text(row[c.rk1]).toUpperCase() || 'OPD'
    if (visitRaw !== 'OPD' && visitRaw !== 'IPD') throw new Error(`แถว ${i + 1}: Reference Key 1 ต้องเป็น OPD, IPD หรือว่าง`)

    const s = m?.[0] || '(ไม่ระบุสิทธิ)'
    const g = m?.[1] || '(ไม่ระบุกลุ่ม)'
    const n = m?.[2] || '(ไม่ระบุ)'
    if (!m) {
      const u = unmatched.get(key) ?? { key, account, count: 0, amount: 0 }
      u.count++; u.amount = round2(u.amount + amt)
      unmatched.set(key, u)
    }
    const gk = JSON.stringify([s, g, n, k, fy, visitRaw])
    const e = grouped.get(gk) ?? { s, g, n, k, fy, t: visitRaw as 'OPD' | 'IPD', amt: 0, cnt: 0, neg: 0, negCnt: 0 }
    e.amt += amt; e.cnt++; e.neg += Math.min(amt, 0); e.negCnt += amt < 0 ? 1 : 0
    grouped.set(gk, e)
    rows++; total += amt
  }
  if (!rows) throw new Error('ไฟล์ไม่มีรายการข้อมูลหลังหัวคอลัมน์')

  const un = [...unmatched.values()].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
  const warnings: string[] = []
  if (un.length) warnings.push(`ไม่พบใน master ${un.reduce((s, u) => s + u.count, 0).toLocaleString()} รายการ (${un.length} คีย์) จัดเป็น “(ไม่ระบุสิทธิ)” และไม่มีช่วงอายุ — เช่น ${un.slice(0, 3).map(u => `${u.key} (${u.count})`).join(', ')}`)
  if (migrated) warnings.push(`รายการยกยอด Year/Month ${migYm} จำนวน ${migrated.toLocaleString()} รายการ: ใช้ Net Due Date แทน Posting Date และอ่านปีงบจากเลขอ้างอิง${fyFallback ? ` (${fyFallback} รายการไม่มีเลขอ้างอิงที่อ่านปีได้ ใช้ปีงบจากไฟล์)` : ''}`)
  if (blankAge - un.reduce((s, u) => s + u.count, 0) > 0) warnings.push(`มี ${(blankAge - un.reduce((s, u) => s + u.count, 0)).toLocaleString()} รายการที่ไม่มีช่วงอายุ (ไม่มีวันที่/Due หรือปีงบใหม่กว่าเกณฑ์) รวมในคอลัมน์ (blank)`)
  if (noPosting) warnings.push(`${noPosting.toLocaleString()} รายการไม่มี Posting Date`)
  if (master.duplicateKeys) warnings.push(`master มี key ซ้ำ ${master.duplicateKeys.toLocaleString()} แถว ใช้แถวแรกของแต่ละ key`)
  warnings.push(`ปีงบฐานของช่วงอายุ (4) = ${baseFy} (ปีงบ ${baseFy - 1} = (5), เก่ากว่า = (6))`)

  return {
    data: { meta: { source, asOf: fmtDay(report), rows, total: round2(total) }, records: [...grouped.values()].map(r => ({ ...r, amt: round2(r.amt), neg: round2(r.neg) })) },
    warnings: warnings.filter(Boolean), unmatched: un, migratedRows: migrated, bucketBaseFy: baseFy,
  }
}

/** เดาวันที่รายงานจากชื่อไฟล์ เช่น ZD20112026.csv → 2026-11-20 (DDMMYYYY) */
export function guessReportDate(filename: string): string {
  const m = /(\d{2})(\d{2})(\d{4})/.exec(filename)
  if (!m) return ''
  const y = +m[3] > 2400 ? +m[3] - 543 : +m[3]
  const t = dayNumber(`${y}-${m[2]}-${m[1]}`)
  return t === null ? '' : `${y}-${m[2]}-${m[1]}`
}
