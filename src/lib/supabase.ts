import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { MasterRow } from './masterData'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** true เมื่อกำหนด VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ตอน build */
export const dbConfigured = Boolean(url && key)

let client: SupabaseClient | null = null
export const db = (): SupabaseClient => {
  if (!url || !key) throw new Error('ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
  // ไม่เก็บ session ลง localStorage — ต้องล็อกอินใหม่เมื่อรีเฟรช
  return (client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: true } }))
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await db().auth.signInWithPassword({ email, password })
  if (error) throw new Error(`ล็อกอินไม่สำเร็จ: ${error.message}`)
}

export const signOut = () => db().auth.signOut()

/** บทบาทของผู้ล็อกอิน (ตาราง profiles) หรือ null ถ้ายังไม่ล็อกอิน/ไม่มี profile */
export async function currentRole(): Promise<{ role: string | null; active: boolean } | null> {
  const { data: u } = await db().auth.getUser()
  if (!u.user) return null
  const { data, error } = await db().from('profiles').select('role, active').eq('id', u.user.id).maybeSingle()
  if (error) throw new Error(`อ่านสิทธิ์ผู้ใช้ไม่สำเร็จ: ${error.message}`)
  return { role: data?.role ?? null, active: Boolean(data?.active) }
}

const CHUNK = 1000

/** upsert ลง master_debtor (conflict: gl_key + visit_type) ทีละ 1,000 แถว — ไม่ลบแถวที่ไม่อยู่ในไฟล์ */
export async function saveMaster(rows: MasterRow[], onProgress?: (done: number, total: number) => void): Promise<number> {
  let done = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const part = rows.slice(i, i + CHUNK).map((r) => ({ ...r, updated_at: new Date().toISOString() }))
    const { error } = await db().from('master_debtor').upsert(part, { onConflict: 'gl_key,visit_type' })
    if (error) throw new Error(`บันทึกไม่สำเร็จที่แถว ${i + 1}–${i + part.length} (บันทึกไปแล้ว ${done.toLocaleString()} แถว): ${error.message}`)
    done += part.length
    onProgress?.(done, rows.length)
  }
  return done
}
