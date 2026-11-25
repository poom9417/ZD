import * as XLSX from 'xlsx'
import { isRawMatrix, mapRaw, type MapResult, type MasterData } from './mapRaw'

type Cell = string | number | boolean | Date | null | undefined

/** หาชีตที่เป็นไฟล์ ZD ดิบจาก SAP (ดูเฉพาะ 15 แถวแรกเพื่อความเร็ว) */
export function findRawSheet(book: XLSX.WorkBook): string | null {
  for (const name of book.SheetNames) {
    const ws = book.Sheets[name]
    if (!ws?.['!ref']) continue
    const r = XLSX.utils.decode_range(ws['!ref'])
    r.e.r = Math.min(r.e.r, r.s.r + 14)
    const head = XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, defval: '', range: XLSX.utils.encode_range(r) })
    if (isRawMatrix(head)) return name
  }
  return null
}

export function mapSheet(book: XLSX.WorkBook, sheet: string, source: string, reportDate: string, migrationYearMonth: string, master: MasterData): MapResult {
  const matrix = XLSX.utils.sheet_to_json<Cell[]>(book.Sheets[sheet], { header: 1, defval: '', blankrows: true })
  return mapRaw(matrix, master, source, { reportDate, migrationYearMonth })
}
