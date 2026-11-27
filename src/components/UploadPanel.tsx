import { useEffect, useRef, useState } from 'react'
import type { WorkBook } from 'xlsx'
import { importSheet, readUpload, type ImportResult } from '../lib/importData'
import { guessReportDate, type MapResult, type MasterData } from '../lib/mapRaw'
import { clearMaster, loadMaster, readMasterMatrix, saveMaster } from '../lib/masterStore'
import { parseMaster } from '../lib/mapRaw'
import type { MasterCell } from '../lib/masterData'
import MasterSave from './MasterSave'
import { findRawSheet, mapSheet } from '../lib/rawUpload'
import { fmtBaht, fmtInt } from '../lib/format'

const DEFAULT_MIGRATION_YM = '2022/08'

export default function UploadPanel({ onApply, onClose }: { onApply: (result: ImportResult) => void; onClose: () => void }) {
  const [book, setBook] = useState<WorkBook | null>(null)
  const [sheet, setSheet] = useState('')
  const [isRaw, setIsRaw] = useState(false)
  const [filename, setFilename] = useState('')
  const [date, setDate] = useState('')
  const [migYm, setMigYm] = useState(DEFAULT_MIGRATION_YM)
  const [master, setMaster] = useState<MasterData | null>(null)
  const [masterNote, setMasterNote] = useState('')
  const [masterMatrix, setMasterMatrix] = useState<MasterCell[][] | null>(null) // master ที่เพิ่งอัปโหลด → ใช้บันทึกลงฐานข้อมูล
  const [preview, setPreview] = useState<(ImportResult & Partial<Pick<MapResult, 'unmatched'>>) | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const attempt = useRef(0)

  useEffect(() => { void loadMaster().then(m => m && setMaster(m)) }, [])

  const rebuild = (wb: WorkBook, name: string, src: string, asOf: string, raw: boolean, ym: string, m: MasterData | null) => {
    setError(''); setPreview(null)
    try {
      if (!raw) { setPreview(importSheet(wb, name, src, asOf)); return }
      if (!m) { setError('ไฟล์นี้เป็นไฟล์ดิบจาก SAP — กรุณาอัปโหลด master ก่อน เพื่อใช้จัดสิทธิ กลุ่มลูกหนี้ และช่วงอายุ'); return }
      if (!asOf) { setError('กรุณาระบุวันที่รายงาน (วันที่ดึงข้อมูลจาก SAP)'); return }
      setPreview(mapSheet(wb, name, src, asOf, ym.trim(), m))
    } catch (e) { setError(e instanceof Error ? e.message : 'ไม่สามารถอ่านข้อมูลได้') }
  }

  const choose = async (file?: File) => {
    if (!file) return
    const id = ++attempt.current
    setBusy(true); setError(''); setPreview(null); setBook(null); setIsRaw(false); setFilename(file.name); setDate('')
    try {
      const result = await readUpload(file)
      if (id !== attempt.current) return
      if ('data' in result) { setPreview(result); return }
      const rawSheet = findRawSheet(result)
      const name = rawSheet ?? result.SheetNames.find(n => n.toLowerCase() === 'data') ?? result.SheetNames[0]
      if (!name) throw new Error('ไม่พบชีตข้อมูล')
      const asOf = rawSheet ? guessReportDate(file.name) : ''
      setBook(result); setSheet(name); setIsRaw(!!rawSheet); setDate(asOf)
      rebuild(result, name, file.name, asOf, !!rawSheet, migYm, master)
    } catch (e) { if (id === attempt.current) setError(e instanceof Error ? e.message : 'อ่านไฟล์ไม่สำเร็จ') }
    finally { if (id === attempt.current) setBusy(false) }
  }

  const chooseMaster = async (file?: File) => {
    if (!file) return
    setBusy(true); setError(''); setMasterNote('')
    try {
      const { matrix, label } = await readMasterMatrix(file)
      const m = parseMaster(matrix, label)
      const saved = await saveMaster(m)
      setMaster(m); setMasterMatrix(matrix)
      setMasterNote(saved ? 'บันทึก master ไว้ในเบราว์เซอร์นี้แล้ว ไม่ต้องอัปโหลดซ้ำ' : 'ใช้ master นี้ได้ในหน้านี้ แต่บันทึกในเบราว์เซอร์ไม่ได้ (อาจเปิดโหมดส่วนตัวอยู่)')
      if (book && isRaw) rebuild(book, sheet, filename, date, true, migYm, m)
    } catch (e) { setError(e instanceof Error ? e.message : 'อ่าน master ไม่สำเร็จ') }
    finally { setBusy(false) }
  }
  const removeMaster = async () => { await clearMaster(); setMaster(null); setMasterMatrix(null); setMasterNote(''); setPreview(null) }

  return (
    <section id="upload-panel" className="upload-panel" aria-labelledby="upload-title" aria-busy={busy}>
      <div className="upload-heading"><div><h2 id="upload-title">อัปโหลดไฟล์เพื่อสร้าง Dashboard</h2><p>เลือกไฟล์ ZD ดิบจาก SAP (.csv/.xlsx) หรือไฟล์ที่วิเคราะห์แล้ว หรือ zd-records.json · ไม่เกิน 25 MB</p></div><button type="button" className="btn-quiet" onClick={onClose}>ปิด</button></div>

      <div className="upload-fields">
        <div className="field">
          <span>Master (ใช้แมพไฟล์ดิบ → สิทธิ / กลุ่มลูกหนี้ / ชื่อหน่วยงาน / Due)</span>
          {master
            ? <p role="status">ใช้ master: {master.source} · {fmtInt(Object.keys(master.entries).length)} คีย์{master.duplicateKeys ? ` (ตัดคีย์ซ้ำ ${fmtInt(master.duplicateKeys)})` : ''} <button type="button" className="btn-quiet" onClick={() => void removeMaster()}>ลบ master</button></p>
            : <p>ยังไม่มี master — จำเป็นเฉพาะเมื่ออัปโหลดไฟล์ดิบจาก SAP</p>}
          <input type="file" accept=".xlsx,.xls,.csv" disabled={busy} aria-label="อัปโหลดหรือเปลี่ยน master" onChange={e => { void chooseMaster(e.target.files?.[0]); e.target.value = '' }} />
          {masterNote && <p role="status">{masterNote}</p>}
        </div>
        <label className="field">เลือกไฟล์ ZD<input type="file" accept=".xlsx,.xls,.csv,.json" disabled={busy} onChange={e => { void choose(e.target.files?.[0]); e.target.value = '' }} /></label>
        {book && book.SheetNames.length > 1 && <label className="field">ชีตข้อมูล<select value={sheet} onChange={e => { setSheet(e.target.value); rebuild(book, e.target.value, filename, date, isRaw, migYm, master) }}>{book.SheetNames.map(n => <option key={n}>{n}</option>)}</select></label>}
        {book && <label className="field">{isRaw ? 'วันที่รายงาน (วันที่ดึงข้อมูลจาก SAP)' : 'วันที่รายงาน (เว้นว่างเพื่ออ่านจากไฟล์)'}<input type="date" value={date} onChange={e => { setDate(e.target.value); rebuild(book, sheet, filename, e.target.value, isRaw, migYm, master) }} /></label>}
        {book && isRaw && <label className="field">รายการยกยอด Year/Month (ใช้ Net Due Date แทน Posting Date · เว้นว่างเพื่อปิด)<input type="text" value={migYm} placeholder="เช่น 2022/08" onChange={e => { setMigYm(e.target.value); rebuild(book, sheet, filename, date, true, e.target.value, master) }} /></label>}
      </div>
      {masterMatrix && <MasterSave key={master?.savedAt} matrix={masterMatrix} />}
      {isRaw && <p className="upload-help">ตรวจพบไฟล์ดิบจาก SAP — ระบบจะจัดสิทธิ กลุ่มลูกหนี้ และช่วงอายุจาก master ให้อัตโนมัติ</p>}
      {!isRaw && <p className="upload-help">ไฟล์ที่วิเคราะห์แล้วต้องมีคอลัมน์ สิทธิ, กลุ่มลูกหนี้, Name, ช่วงอายุลูกหนี้-, FiscalYear และ Amt in loc.cur.</p>}
      {busy && <p role="status">กำลังอ่านและตรวจสอบไฟล์…</p>}
      {error && <p className="upload-error" role="alert">{error}</p>}
      {preview && <div className="upload-preview" role="status"><strong>{preview.data.meta.source}</strong><p>{fmtInt(preview.data.meta.rows)} รายการ · ยอดรวม {fmtBaht(preview.data.meta.total) ?? '0.00'} บาท · ข้อมูล ณ {preview.data.meta.asOf}</p>
        {preview.warnings.length > 0 && <ul>{preview.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
        <button type="button" className="btn-primary" onClick={() => onApply(preview)}>สร้าง Dashboard จากไฟล์นี้</button></div>}
      <p className="upload-help">ประมวลผลไฟล์บนอุปกรณ์นี้ ข้อมูลใช้ได้ทั้งสองหน้าในระหว่างเปิดเว็บ และจะกลับเป็นข้อมูลเดิมเมื่อรีเฟรช (master ที่บันทึกไว้จะยังอยู่)</p>
    </section>
  )
}
