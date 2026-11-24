import NavMenu, { type PageKey } from './NavMenu'

export default function Navbar({ page, uploadOpen, onUpload }: { page: PageKey; uploadOpen: boolean; onUpload: () => void }) {
  return (
    <nav className="navbar" aria-label="เมนูหลัก">
      <span className="nav-brand">ลูกหนี้ ZD</span>
      <div className="nav-links"><NavMenu page={page} /></div>
      <button type="button" className="btn-primary nav-upload" aria-expanded={uploadOpen} aria-controls="upload-panel" onClick={onUpload}>อัปโหลดไฟล์</button>
    </nav>
  )
}

