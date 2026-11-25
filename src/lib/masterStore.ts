import * as XLSX from 'xlsx'
import { isMasterMatrix, parseMaster, type MasterData } from './mapRaw'

/** เก็บ master ไว้ในเบราว์เซอร์ (IndexedDB) เพื่อไม่ต้องอัปโหลดซ้ำทุกครั้ง */
const DB = 'zd-ar', STORE = 'kv', KEY = 'master'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally { db.close() }
}

export async function loadMaster(): Promise<MasterData | null> {
  try {
    const v = await run<MasterData | undefined>('readonly', s => s.get(KEY))
    return v && v.entries && typeof v.rows === 'number' ? v : null
  } catch { return null }
}
/** คืน false ถ้าบันทึกไม่ได้ (เช่น โหมดส่วนตัวของเบราว์เซอร์) — ยังใช้ master ในหน้านี้ได้ */
export async function saveMaster(m: MasterData): Promise<boolean> {
  try { await run('readwrite', s => s.put(m, KEY)); return true } catch { return false }
}
export async function clearMaster(): Promise<void> {
  try { await run('readwrite', s => s.delete(KEY)) } catch { /* ignore */ }
}

/** อ่านไฟล์ master (.xlsx/.xls/.csv) — ถ้าเป็นไฟล์ analyzed จะหาชีตที่มีหัวคอลัมน์ master ให้เอง */
export async function readMasterFile(file: File): Promise<MasterData> {
  if (file.size > 25 * 1024 * 1024) throw new Error('กรุณาเลือกไฟล์ขนาดไม่เกิน 25 MB')
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) throw new Error('master รองรับเฉพาะ .xlsx, .xls และ .csv')
  const bytes = await file.arrayBuffer()
  const toMatrix = (book: XLSX.WorkBook, name: string) =>
    XLSX.utils.sheet_to_json<(string | number | boolean | Date | null | undefined)[]>(book.Sheets[name], { header: 1, defval: '', blankrows: true })
  if (ext === 'csv') {
    const book = XLSX.read(new TextDecoder('utf-8').decode(bytes), { type: 'string', raw: true })
    return parseMaster(toMatrix(book, book.SheetNames[0]), file.name)
  }
  const names = XLSX.read(bytes, { type: 'array', bookSheets: true }).SheetNames
  const ordered = [...names.filter(n => n.toLowerCase() === 'master'), ...names.filter(n => n.toLowerCase() !== 'master')]
  for (const name of ordered) {
    const book = XLSX.read(bytes, { type: 'array', sheets: [name] }) // อ่านเฉพาะชีตนี้ ไม่โหลดชีตข้อมูลหลักแสนแถว
    const matrix = toMatrix(book, name)
    if (isMasterMatrix(matrix)) return parseMaster(matrix, `${file.name} · ชีต ${name}`)
  }
  throw new Error('ไม่พบชีต master (ต้องมีคอลัมน์ ประเภทลูกหนี้สิทธิ, กลุ่มลูกหนี้สิทธิ, รหัสลูกหนี้, GLAccount, SpGLInd, ชื่อหน่วยงาน, Due)')
}
