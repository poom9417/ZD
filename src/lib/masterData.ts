type Cell = string | number | boolean | Date | null | undefined
export type MasterCell = Cell

/** หนึ่งแถวของตาราง public.master_debtor (ZDAging) */
export interface MasterRow {
  gl_key: string
  right_code: string | null
  right_name: string | null
  group_code: string | null
  group_name: string | null
  unit_code: string | null
  unit_short: string | null
  account: string
  gl_account: string | null
  sp_gl_ind: string | null
  visit_type: 'OPD' | 'IPD'
  opd_dueday: number | null
  ipd_dueday: number | null
  day_process: number | null
  start_date: string | null
  end_date: string | null
  unit_name: string | null
  due_days: number | null
}

export interface MasterImport {
  rows: MasterRow[]
  /** แถวในชีตที่อ่านได้ (ก่อนตัดซ้ำ) */
  sourceRows: number
  warnings: string[]
}

/** ชื่อหัวคอลัมน์ในชีต master → ฟิลด์ใน master_debtor */
const HEADERS = {
  gl_key: 'GL&Cus.&sp.gl',
  right_code: 'รหัสประเภทลูกหนี้สิทธิ',
  right_name: 'ประเภทลูกหนี้สิทธิ',
  group_code: 'รหัสกลุ่มลูกหนี้สิทธิ',
  group_name: 'กลุ่มลูกหนี้สิทธิ',
  unit_code: 'รหัสลูกหนี้หน่วยงาน',
  unit_short: 'ลูกหนี้หน่วยงาน',
  account: 'รหัสลูกหนี้',
  gl_account: 'GLAccount',
  sp_gl_ind: 'SpGLInd',
  visit_type: 'PatientType',
  opd_dueday: 'OPDDueday',
  ipd_dueday: 'IPDDueday',
  day_process: 'DayProcess',
  start_date: 'StartDate',
  end_date: 'EndDate',
  unit_name: 'ชื่อหน่วยงาน',
  due_days: 'Due',
} as const
type Field = keyof typeof HEADERS

const text = (v: Cell) => String(v ?? '').replace(/\s+/g, ' ').trim()
const str = (v: Cell): string | null => text(v) || null
const int = (v: Cell, row: number, col: string): number | null => {
  const s = text(v)
  if (!s) return null
  const n = Number(s.replace(/,/g, ''))
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error(`แถว ${row}: คอลัมน์ ${col} ต้องเป็นจำนวนเต็ม (พบ "${s}")`)
  return n
}

/** แปลงตารางชีต master (แถว × คอลัมน์) เป็นแถวสำหรับ master_debtor — ตัดแถวซ้ำที่ (gl_key, visit_type) โดยเก็บแถวหลังสุด และแจ้งเตือนเมื่อแถวซ้ำมีค่าต่างกัน */
export function importMaster(matrix: Cell[][]): MasterImport {
  const need = Object.values(HEADERS)
  const headerIndex = matrix.findIndex((r) => need.every((c) => r.map(text).includes(c)))
  if (headerIndex < 0) throw new Error(`ชีต master ไม่มีหัวคอลัมน์ที่จำเป็น: ${need.filter((c) => !matrix.some((r) => r.map(text).includes(c))).join(', ') || need.join(', ')}`)
  const headers = matrix[headerIndex].map(text)
  const dup = need.filter((c) => headers.filter((h) => h === c).length !== 1)
  if (dup.length) throw new Error(`ชีต master มีหัวคอลัมน์ซ้ำ: ${dup.join(', ')}`)
  const col = Object.fromEntries((Object.keys(HEADERS) as Field[]).map((f) => [f, headers.indexOf(HEADERS[f])])) as Record<Field, number>

  const byKey = new Map<string, MasterRow>()
  let sourceRows = 0, exactDup = 0, conflictDup = 0
  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const r = matrix[i]
    if (r.every((c) => text(c) === '')) continue
    sourceRows++
    const n = i + 1
    const g = (f: Field) => r[col[f]]
    const gl_key = text(g('gl_key'))
    const account = text(g('account'))
    if (!gl_key) throw new Error(`แถว ${n}: GL&Cus.&sp.gl ว่าง`)
    if (!account) throw new Error(`แถว ${n}: รหัสลูกหนี้ ว่าง`)
    const visit = text(g('visit_type')).toUpperCase()
    if (visit !== 'OPD' && visit !== 'IPD') throw new Error(`แถว ${n}: PatientType ต้องเป็น OPD หรือ IPD (พบ "${visit}")`)
    const row: MasterRow = {
      gl_key, account, visit_type: visit,
      right_code: str(g('right_code')), right_name: str(g('right_name')),
      group_code: str(g('group_code')), group_name: str(g('group_name')),
      unit_code: str(g('unit_code')), unit_short: str(g('unit_short')),
      gl_account: str(g('gl_account')), sp_gl_ind: str(g('sp_gl_ind')),
      opd_dueday: int(g('opd_dueday'), n, 'OPDDueday'), ipd_dueday: int(g('ipd_dueday'), n, 'IPDDueday'),
      day_process: int(g('day_process'), n, 'DayProcess'), due_days: int(g('due_days'), n, 'Due'),
      start_date: str(g('start_date')), end_date: str(g('end_date')), unit_name: str(g('unit_name')),
    }
    const key = `${gl_key}\u0000${visit}`
    const prev = byKey.get(key)
    if (prev) JSON.stringify(prev) === JSON.stringify(row) ? exactDup++ : conflictDup++
    byKey.set(key, row)
  }
  if (!sourceRows) throw new Error('ชีต master ไม่มีรายการข้อมูล')
  const warnings: string[] = []
  if (exactDup) warnings.push(`พบแถวซ้ำทุกคอลัมน์ ${exactDup.toLocaleString()} แถว ตัดให้เหลือแถวเดียว`)
  if (conflictDup) warnings.push(`พบ GL&Cus.&sp.gl + PatientType ซ้ำแต่ค่าต่างกัน ${conflictDup.toLocaleString()} แถว ใช้แถวล่างสุดของไฟล์ ควรตรวจชีต master`)
  return { rows: [...byKey.values()], sourceRows, warnings }
}
