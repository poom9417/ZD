export type PageKey = 'pivot' | 'dashboard'

export const PAGES: { key: PageKey; label: string }[] = [
  { key: 'pivot', label: 'ตารางหลัก' },
  { key: 'dashboard', label: 'Dashboard อายุลูกหนี้ ZD' },
]

export default function NavMenu({ page }: { page: PageKey }) {
  return (
    <>
      {PAGES.map((p) => (
        <a key={p.key} href={`#${p.key}`} className="nav-tab" aria-current={p.key === page ? 'page' : undefined}>
          {p.label}
        </a>
      ))}
    </>
  )
}
