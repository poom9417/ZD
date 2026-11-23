import NavMenu, { type PageKey } from './NavMenu'

export default function Navbar({ page }: { page: PageKey }) {
  return (
    <nav className="navbar" aria-label="เมนูหลัก">
      <span className="nav-brand">ลูกหนี้ ZD</span>
      <NavMenu page={page} />
    </nav>
  )
}
