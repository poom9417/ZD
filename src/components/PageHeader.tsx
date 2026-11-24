import type { ZdMeta } from '../lib/types'
import { fmtInt } from '../lib/format'

export default function PageHeader({ title, hint, meta }: { title: string; hint?: string; meta: ZdMeta }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      <p>
        ข้อมูล ณ {meta.asOf} · {meta.source} · {fmtInt(meta.rows)} รายการ{hint ? ` · ${hint}` : ''}
      </p>
    </header>
  )
}

