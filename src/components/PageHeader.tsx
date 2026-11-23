import { zdData } from '../lib/zdData'
import { fmtInt } from '../lib/format'

export default function PageHeader({ title, hint }: { title: string; hint?: string }) {
  const { meta } = zdData
  return (
    <header className="page-header">
      <h1>{title}</h1>
      <p>
        ข้อมูล ณ {meta.asOf} · {meta.source} · {fmtInt(meta.rows)} รายการ{hint ? ` · ${hint}` : ''}
      </p>
    </header>
  )
}
