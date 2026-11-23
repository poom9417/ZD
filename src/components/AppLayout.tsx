import { useEffect, useState } from 'react'
import Navbar from './Navbar'
import { PAGES, type PageKey } from './NavMenu'
import PivotPage from '../pages/PivotPage'
import DashboardPage from '../pages/DashboardPage'

function readHash(): PageKey {
  const h = window.location.hash.replace('#', '') as PageKey
  return PAGES.some((p) => p.key === h) ? h : 'pivot'
}

export default function AppLayout() {
  const [page, setPage] = useState<PageKey>(readHash)

  // เก็บหน้าปัจจุบันไว้ใน URL hash — refresh แล้วยังอยู่หน้าเดิม
  useEffect(() => {
    const onHash = () => setPage(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <div className="min-h-screen">
      <Navbar page={page} />
      <main className="page">{page === 'pivot' ? <PivotPage /> : <DashboardPage />}</main>
    </div>
  )
}
