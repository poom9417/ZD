import { BANDS } from '../lib/buckets'
import { fmtMillion, pctOf } from '../lib/format'

export function BandStack({ values, max }: { values: number[]; max: number }) {
  return (
    <div className="bar" role="img" aria-label="สัดส่วนอายุลูกหนี้">
      {values.map((v, i) => v > 0 && <div key={i} style={{ width: `${(v / max) * 100}%`, background: BANDS[i].color }} />)}
    </div>
  )
}

export function Legend() {
  return (
    <div className="legend">
      {BANDS.map((b) => (
        <span key={b.label}>
          <i style={{ background: b.color }} />
          {b.label}
        </span>
      ))}
    </div>
  )
}

export default function AgingBar({ totals, total }: { totals: number[]; total: number }) {
  return (
    <section className="card">
      <h2>โครงสร้างอายุลูกหนี้</h2>
      <p className="sub">สัดส่วนยอดเงินแยกตามช่วงอายุ (ล้านบาท)</p>
      <div className="bar bar-lg">
        {totals.map((v, i) => (
          <div key={i} style={{ width: `${pctOf(v, total)}%`, background: BANDS[i].color }} />
        ))}
      </div>
      <div className="band-figures">
        {BANDS.map((b, i) => (
          <div key={b.label}>
            <b>{fmtMillion(totals[i])}</b>
            <span>{b.label} · {pctOf(totals[i], total).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </section>
  )
}
