import { fmtInt, fmtMillion } from '../lib/format'
import type { Summary } from '../lib/arSummary'

export default function TopOwnersTable({ s }: { s: Summary }) {
  return (
    <>
      <section className="card">
        <h2>10 หน่วยงานที่ค้างเกิน 90 วันมากที่สุด</h2>
        <p className="sub">ล้านบาท</p>
        <table className="tbl">
          <thead>
            <tr><th>หน่วยงาน</th><th className="r">รายการ</th><th className="r">ยอด</th></tr>
          </thead>
          <tbody>
            {s.topOwners.map((o) => (
              <tr key={o.name}><td>{o.name}</td><td className="r">{fmtInt(o.cnt)}</td><td className="r">{fmtMillion(o.amt)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card mt">
        <h2>OPD / IPD</h2>
        <p className="sub">ยอดรวม (ล้านบาท)</p>
        {s.visits.map((v) => (
          <div className="visit" key={v.type}>
            <div className="stat-label">{v.type}</div>
            <div className="visit-value">{fmtMillion(v.amt)}</div>
            <div className="stat-sub">{fmtInt(v.cnt)} รายการ · ค้างเกิน 90 วัน {fmtMillion(v.over90)} ล้าน ({v.amt ? ((v.over90 / v.amt) * 100).toFixed(0) : 0}%)</div>
          </div>
        ))}
      </section>
    </>
  )
}
