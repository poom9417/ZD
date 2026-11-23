import { BandStack, Legend } from './AgingBar'
import { fmtMillion } from '../lib/format'
import type { BandRow } from '../lib/arSummary'

export default function BreakdownList({ title, rows, legend }: { title: string; rows: BandRow[]; legend?: boolean }) {
  const max = Math.max(...rows.map((r) => r.total), 1)
  return (
    <section className="card">
      <h2>{title}</h2>
      <p className="sub">ยอดรวม (ล้านบาท) และ % ค้างเกิน 90 วัน</p>
      {rows.map((r) => (
        <div className="row" key={r.label}>
          <div className="lb" title={r.label}>{r.label}</div>
          <BandStack values={r.values} max={max} />
          <div className="num">{fmtMillion(r.total)}</div>
          <div className="pc" style={{ color: r.over90Pct >= 50 ? '#8E2F1C' : undefined }}>{r.over90Pct.toFixed(0)}%</div>
        </div>
      ))}
      {legend && <Legend />}
    </section>
  )
}
