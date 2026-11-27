import { useEffect, useMemo, useState } from 'react'
import { importMaster, type MasterCell } from '../lib/masterData'
import { currentRole, dbConfigured, saveMaster, signIn, signOut } from '../lib/supabase'
import { fmtInt } from '../lib/format'

type Auth = { state: 'loading' } | { state: 'out' } | { state: 'in'; role: string | null; active: boolean }
const WRITERS = ['dev', 'admin']
const msg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

/** master ที่เพิ่งอัปโหลด → บันทึกลง Supabase (public.master_debtor) ต้องล็อกอินเป็น dev/admin */
export default function MasterSave({ matrix }: { matrix: MasterCell[][] }) {
  const parsed = useMemo(() => {
    try { return { ok: importMaster(matrix) } } catch (e) { return { error: msg(e, 'อ่านชีต master ไม่ได้') } }
  }, [matrix])
  const [auth, setAuth] = useState<Auth>({ state: 'loading' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  const refresh = async () => {
    try {
      const r = await currentRole()
      setAuth(r ? { state: 'in', ...r } : { state: 'out' })
    } catch (e) { setAuth({ state: 'out' }); setError(msg(e, 'ตรวจสิทธิ์ไม่สำเร็จ')) }
  }
  useEffect(() => { if (dbConfigured) void refresh(); else setAuth({ state: 'out' }) }, [])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try { await signIn(email.trim(), password); setPassword(''); await refresh() }
    catch (err) { setError(msg(err, 'ล็อกอินไม่สำเร็จ')) }
    finally { setBusy(false) }
  }
  const logout = async () => { await signOut(); setSaved(''); setAuth({ state: 'out' }) }
  const save = async () => {
    const ok = parsed.ok
    if (!ok) return
    setBusy(true); setError(''); setSaved('')
    try {
      const n = await saveMaster(ok.rows, (d, t) => setProgress(`กำลังบันทึก ${fmtInt(d)} / ${fmtInt(t)} แถว`))
      setSaved(`บันทึกลงฐานข้อมูลแล้ว ${fmtInt(n)} แถว (เพิ่มแถวใหม่/อัปเดตแถวเดิม ไม่ลบแถวที่ไม่อยู่ในไฟล์)`)
    } catch (err) { setError(msg(err, 'บันทึกไม่สำเร็จ')) }
    finally { setBusy(false); setProgress('') }
  }

  const canWrite = auth.state === 'in' && auth.active && auth.role !== null && WRITERS.includes(auth.role)
  return (
    <div className="upload-preview master-save" aria-busy={busy}>
      <strong>บันทึก master ลงฐานข้อมูล (Supabase)</strong>
      {!parsed.ok ? <p className="upload-error" role="alert">{parsed.error}</p> : <>
        <p>{fmtInt(parsed.ok.sourceRows)} แถวในไฟล์ · {fmtInt(parsed.ok.rows.length)} รายการไม่ซ้ำ (GL&Cus.&sp.gl + OPD/IPD)</p>
        {parsed.ok.warnings.length > 0 && <ul>{parsed.ok.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
        {!dbConfigured && <p className="upload-help">ยังไม่ได้เชื่อมฐานข้อมูล (ไม่มี VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ตอน build) จึงบันทึกไม่ได้</p>}
        {dbConfigured && auth.state === 'loading' && <p role="status">กำลังตรวจสิทธิ์…</p>}
        {dbConfigured && auth.state === 'out' && (
          <form className="upload-fields" onSubmit={login}>
            <label className="field">อีเมล<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="field">รหัสผ่าน<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button type="submit" className="btn-primary" disabled={busy}>ล็อกอินเพื่อบันทึก</button>
          </form>
        )}
        {dbConfigured && auth.state === 'in' && <>
          {!canWrite && <p className="upload-error" role="alert">บัญชีนี้ไม่มีสิทธิ์บันทึก master (ต้องเป็น dev/admin และเปิดใช้งานแล้ว)</p>}
          <div className="upload-fields">
            <button type="button" className="btn-primary" disabled={busy || !canWrite} onClick={() => void save()}>บันทึก master ลงฐานข้อมูล</button>
            <button type="button" className="btn-quiet" disabled={busy} onClick={() => void logout()}>ออกจากระบบ</button>
          </div>
        </>}
        {progress && <p role="status">{progress}</p>}
        {saved && <p role="status"><strong>{saved}</strong></p>}
        {error && <p className="upload-error" role="alert">{error}</p>}
      </>}
    </div>
  )
}
