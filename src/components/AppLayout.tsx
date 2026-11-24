import { lazy, Suspense, useEffect, useState } from 'react'
import Navbar from './Navbar'
import { PAGES, type PageKey } from './NavMenu'
import PivotPage from '../pages/PivotPage'
import DashboardPage from '../pages/DashboardPage'
const UploadPanel = lazy(() => import('./UploadPanel'))
import { zdData } from '../lib/zdData'
import type { ImportResult } from '../lib/importData'

function readHash(): PageKey {
  const h = window.location.hash.replace('#', '') as PageKey
  return PAGES.some((p) => p.key === h) ? h : 'pivot'
}

export default function AppLayout() {
  const [page, setPage] = useState<PageKey>(readHash)

  const [data, setData] = useState(zdData)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const apply = (result: ImportResult) => {
    setData(result.data); setWarnings(result.warnings); setUploadOpen(false)
    window.location.hash = 'dashboard'
  }

  // เก็บหน้าปัจจุบันไว้ใน URL hash — refresh แล้วยังอยู่หน้าเดิม
  useEffect(() => {
    const onHash = () => setPage(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <div className="min-h-screen">
      <Navbar page={page} uploadOpen={uploadOpen} onUpload={() => setUploadOpen(v => !v)} />
      <main className={`page page-${page}`}>
        {uploadOpen && <Suspense fallback={<p role="status">กำลังเปิดหน้านำเข้าไฟล์…</p>}><UploadPanel onApply={apply} onClose={() => setUploadOpen(false)} /></Suspense>}
        {data !== zdData && <div className="data-notice" role="status"><div><strong>กำลังใช้ไฟล์ที่อัปโหลด: {data.meta.source}</strong><span>ข้อมูลจะกลับเป็นชุดเดิมเมื่อรีเฟรช</span>{warnings.length > 0 && <ul>{warnings.map(w => <li key={w}>{w}</li>)}</ul>}</div><button type="button" className="btn-quiet" onClick={() => { setData(zdData); setWarnings([]) }}>กลับไปใช้ข้อมูลเดิม</button></div>}
        {page === 'pivot' ? <PivotPage data={data} /> : <DashboardPage data={data} />}
      </main>
    </div>
  )
}

