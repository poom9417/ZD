import * as XLSX from 'xlsx'
import { BUCKETS, type BucketKey } from './buckets'
import type { ZdData, ZdRecord } from './types'

type Cell = string | number | boolean | Date | null | undefined
export interface ImportResult { data: ZdData; warnings: string[] }
const columns = ['สิทธิ', 'กลุ่มลูกหนี้', 'Name', 'ช่วงอายุลูกหนี้-', 'FiscalYear', 'Amt in loc.cur.']
const text = (v: Cell) => String(v ?? '').replace(/\s+/g, ' ').trim()
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

function amount(v: Cell, row: number): number {
  const s = text(v)
  const value = typeof v === 'number' ? v : /^\(?-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?\)?$/.test(s)
    ? Number(s.replace(/,/g, '').replace(/^\((.*)\)$/, '-$1')) : NaN
  if (!Number.isFinite(value)) throw new Error(`แถว ${row}: ยอดเงินไม่ถูกต้องหรือว่าง กรุณาตรวจคอลัมน์ Amt in loc.cur.`)
  return value
}

function dateValue(v: Cell): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    return d ? new Date(d.y, d.m - 1, d.d) : null
  }
  const s = text(v)
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s)
  const local = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})(?: .*)?$/.exec(s)
  if (!iso && !local) return null
  let [y, m, d] = iso ? [+iso[1], +iso[2], +iso[3]] : [+local![3], +local![2], +local![1]]
  if (y > 2400) y -= 543
  const result = new Date(y, m - 1, d)
  return result.getFullYear() === y && result.getMonth() === m - 1 && result.getDate() === d ? result : null
}
const formatDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

export function importRows(matrix: Cell[][], source: string, reportDate = ''): ImportResult {
  const headerIndex = matrix.findIndex(row => columns.every(c => row.map(text).includes(c)))
  if (headerIndex < 0) throw new Error(`ไม่พบหัวคอลัมน์ที่จำเป็น: ${columns.join(', ')} — กรุณาใช้ไฟล์ ZD ที่วิเคราะห์แล้ว ไฟล์ดิบต้องจัดสิทธิ กลุ่มลูกหนี้ และช่วงอายุก่อน`)
  const headers = matrix[headerIndex].map(text)
  if (columns.some(c => headers.filter(h => h === c).length !== 1)) throw new Error('หัวคอลัมน์ที่จำเป็นซ้ำกัน กรุณาแก้ไขไฟล์ก่อนนำเข้า')
  const index = (name: string) => headers.indexOf(name)
  const grouped = new Map<string, ZdRecord>()
  let rows = 0, total = 0, blankAge = 0, missingDate = 0, asOf: Date | null = null
  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const row = matrix[i]
    if (row.every(c => text(c) === '')) continue
    const get = (name: string) => row[index(name)]
    const amt = amount(get('Amt in loc.cur.'), i + 1)
    const age = text(get('ช่วงอายุลูกหนี้-'))
    const code = /^\(([0-6])\)/.exec(age)?.[1] ?? (/^[0-6]$/.test(age) ? age : '')
    if (age && age !== '(blank)' && !code) throw new Error(`แถว ${i + 1}: ช่วงอายุไม่ถูกต้อง ต้องเป็น (0)–(6) หรือว่าง`)
    const k = (code || 'na') as BucketKey
    if (k === 'na') blankAge++
    let fy = Number(text(get('FiscalYear')))
    if (!Number.isInteger(fy) || fy < 1900 || fy > 3000) throw new Error(`แถว ${i + 1}: FiscalYear ต้องเป็นปี ค.ศ. หรือ พ.ศ. 4 หลัก`)
    if (fy > 2400) fy -= 543
    const visit = text(get('Ref.key 1')).toUpperCase() || 'OPD'
    if (visit !== 'OPD' && visit !== 'IPD') throw new Error(`แถว ${i + 1}: Ref.key 1 ต้องเป็น OPD, IPD หรือว่าง`)
    const s = text(get('สิทธิ')) || '(ไม่ระบุสิทธิ)'
    const g = text(get('กลุ่มลูกหนี้')) || '(ไม่ระบุกลุ่ม)'
    const n = text(get('Name')) || '(ไม่ระบุ)'
    const key = JSON.stringify([s, g, n, k, fy, visit])
    const entry = grouped.get(key) ?? { s, g, n, k, fy, t: visit, amt: 0, cnt: 0, neg: 0, negCnt: 0 }
    entry.amt += amt; entry.cnt++; entry.neg += Math.min(amt, 0); entry.negCnt += amt < 0 ? 1 : 0
    grouped.set(key, entry)
    rows++; total += amt
    const date = dateValue(get('Adateasat(วันที่รายงาน)'))
    if (!date) missingDate++
    else if (!asOf || date > asOf) asOf = date
  }
  if (!rows) throw new Error('ไฟล์ไม่มีรายการข้อมูลหลังหัวคอลัมน์')
  if (reportDate) {
    const date = dateValue(reportDate)
    if (!date) throw new Error('วันที่รายงานไม่ถูกต้อง')
    asOf = date
  }
  const warnings: string[] = []
  if (blankAge) warnings.push(`${blankAge.toLocaleString()} รายการไม่มีช่วงอายุ รวมในยอดทั้งหมดและคอลัมน์ (blank)`)
  if (missingDate && !reportDate) warnings.push('วันที่รายงานบางรายการว่างหรือไม่ถูกต้อง ใช้วันที่ล่าสุดที่อ่านได้ หากไม่พบจะแสดง “ไม่ระบุ”')
  if (index('Ref.key 1') < 0) warnings.push('ไม่พบ Ref.key 1 จัดเป็น OPD ทั้งหมดตามกติกาเดิม')
  return { data: { meta: { source, asOf: asOf ? formatDate(asOf) : 'ไม่ระบุ', rows, total: round(total) }, records: [...grouped.values()].map(r => ({ ...r, amt: round(r.amt), neg: round(r.neg) })) }, warnings }
}

export function importJson(value: unknown, source: string): ImportResult {
  const data = value as ZdData
  if (!data || !Array.isArray(data.records) || !data.records.length) throw new Error('JSON ต้องอยู่ในรูปแบบ zd-records.json และมี records')
  for (const [i, r] of data.records.entries()) {
    if (!r || !['s', 'g', 'n'].every(k => typeof r[k as 's'] === 'string') || !BUCKETS.includes(r.k) ||
      !Number.isInteger(r.fy) || r.fy < 1900 || r.fy > 2400 || !['OPD', 'IPD'].includes(r.t) ||
      ![r.amt, r.cnt, r.neg, r.negCnt].every(Number.isFinite) || !Number.isInteger(r.cnt) || r.cnt < 1 ||
      !Number.isInteger(r.negCnt) || r.negCnt < 0 || r.negCnt > r.cnt || r.neg > 0 || r.neg > r.amt || (r.negCnt === 0 && r.neg !== 0)) {
      throw new Error(`JSON: records ลำดับ ${i + 1} มีข้อมูลไม่ถูกต้อง`)
    }
  }
  return { data: { records: data.records, meta: { source, asOf: typeof data.meta?.asOf === 'string' ? data.meta.asOf : 'ไม่ระบุ', rows: data.records.reduce((s, r) => s + r.cnt, 0), total: round(data.records.reduce((s, r) => s + r.amt, 0)) } }, warnings: [] }
}

export async function readUpload(file: File): Promise<XLSX.WorkBook | ImportResult> {
  if (file.size > 25 * 1024 * 1024) throw new Error('กรุณาเลือกไฟล์ขนาดไม่เกิน 25 MB')
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['xlsx', 'xls', 'csv', 'json'].includes(ext ?? '')) throw new Error('รองรับเฉพาะ .xlsx, .xls, .csv และ .json')
  const bytes = await file.arrayBuffer()
  if (ext === 'json') return importJson(JSON.parse(new TextDecoder().decode(bytes)), file.name)
  if (ext === 'csv') {
    const first = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 2))
    let csv = new TextDecoder(first[0] === 255 && first[1] === 254 ? 'utf-16le' : first[0] === 254 && first[1] === 255 ? 'utf-16be' : 'utf-8').decode(bytes)
    if (csv.includes('\uFFFD')) csv = new TextDecoder('windows-874').decode(bytes)
    return XLSX.read(csv, { type: 'string', raw: true })
  }
  return XLSX.read(bytes, { type: 'array', cellDates: true })
}

export function importSheet(book: XLSX.WorkBook, sheet: string, source: string, date: string): ImportResult {
  return importRows(XLSX.utils.sheet_to_json<Cell[]>(book.Sheets[sheet], { header: 1, defval: '', blankrows: true }), source, date)
}
