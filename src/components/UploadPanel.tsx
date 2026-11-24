import { useRef, useState } from 'react'
import type { WorkBook } from 'xlsx'
import { importSheet, readUpload, type ImportResult } from '../lib/importData'
import { fmtBaht, fmtInt } from '../lib/format'

export default function UploadPanel({ onApply, onClose }: { onApply: (result: ImportResult) => void; onClose: () => void }) {
  const [book, setBook] = useState<WorkBook | null>(null)
  const [sheet, setSheet] = useState('')
  const [filename, setFilename] = useState('')
  const [date, setDate] = useState('')
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const attempt = useRef(0)
  const rebuild = (wb: WorkBook, name: string, src: string, asOf: string) => {
    setError(''); setPreview(null)
    try { setPreview(importSheet(wb, name, src, asOf)) }
    catch (e) { setError(e instanceof Error ? e.message : 'ไม่สามารถอ่านข้อมูลได้') }
  }
  const choose = async (file?: File) => {
    if (!file) return
    const id = ++attempt.current
    setBusy(true); setError(''); setPreview(null); setBook(null); setFilename(file.name); setDate('')
    try {
      const result = await readUpload(file)
      if (id !== attempt.current) return
      if ('data' in result) setPreview(result)
      else {
        const name = result.SheetNames.find(n => n.toLowerCase() === 'data') ?? result.SheetNames[0]
        if (!name) throw new Error('ไม่พบชีตข้อมูล')
        setBook(result); setSheet(name); rebuild(result, name, file.name, '')
      }
    } catch (e) { if (id === attempt.current) setError(e instanceof Error ? e.message : 'อ่านไฟล์ไม่สำเร็จ') }
    finally { if (id === attempt.current) setBusy(false) }
  }
  return (
    <section id="upload-panel" className="upload-panel" aria-labelledby="upload-title" aria-busy={busy}>
      <div className="upload-heading"><div><h2 id="upload-title">อัปโหลดไฟล์เพื่อสร้าง Dashboard</h2><p>เลือกไฟล์ ZD ที่วิเคราะห์แล้ว (.xlsx, .xls, .csv) หรือ zd-records.json · ไม่เกิน 25 MB</p></div><button type="button" className="btn-quiet" onClick={onClose}>ปิด</button></div>
      <p className="upload-help">ต้องมีคอลัมน์ สิทธิ, กลุ่มลูกหนี้, Name, ช่วงอายุลูกหนี้-, FiscalYear และ Amt in loc.cur.</p>
      <div className="upload-fields">
        <label className="field">เลือกไฟล์<input type="file" accept=".xlsx,.xls,.csv,.json" disabled={busy} onChange={e => { void choose(e.target.files?.[0]); e.target.value = '' }} /></label>
        {book && <><label className="field">ชีตข้อมูล<select value={sheet} onChange={e => { setSheet(e.target.value); rebuild(book, e.target.value, filename, date) }}>{book.SheetNames.map(n => <option key={n}>{n}</option>)}</select></label>
        <label className="field">วันที่รายงาน (เว้นว่างเพื่ออ่านจากไฟล์)<input type="date" value={date} onChange={e => { setDate(e.target.value); rebuild(book, sheet, filename, e.target.value) }} /></label></>}
      </div>
      {busy && <p role="status">กำลังอ่านและตรวจสอบไฟล์…</p>}
      {error && <p className="upload-error" role="alert">{error}</p>}
      {preview && <div className="upload-preview" role="status"><strong>{preview.data.meta.source}</strong><p>{fmtInt(preview.data.meta.rows)} รายการ · ยอดรวม {fmtBaht(preview.data.meta.total) ?? '0.00'} บาท · ข้อมูล ณ {preview.data.meta.asOf}</p>
        {preview.warnings.length > 0 && <ul>{preview.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
        <button type="button" className="btn-primary" onClick={() => onApply(preview)}>สร้าง Dashboard จากไฟล์นี้</button></div>}
      <p className="upload-help">ประมวลผลไฟล์บนอุปกรณ์นี้ ข้อมูลใช้ได้ทั้งสองหน้าในระหว่างเปิดเว็บ และจะกลับเป็นข้อมูลเดิมเมื่อรีเฟรช</p>
    </section>
  )
}
