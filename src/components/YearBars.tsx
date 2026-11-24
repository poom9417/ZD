import { fmtMillion } from '../lib/format'

export default function YearBars({ years, oldAmt, oldUpTo }: { years: { fy: number; amt: number }[]; oldAmt: number; oldUpTo: number }) {
  const max = Math.max(...years.map((y) => y.amt), 1)
  return (
    <section className="card">
      <h2>ค้างเกิน 90 วัน แยกตามปีงบประมาณ</h2>
      <p className="sub">{years.length ? <>ล้านบาท · ปีงบ {oldUpTo} และก่อนหน้า รวม {fmtMillion(oldAmt)} ล้าน</> : 'ไม่มีรายการค้างเกิน 90 วัน'}</p>
      {years.map((y) => (
        <div className="row row-y" key={y.fy}>
          <div className="lb">ปีงบ {y.fy}</div>
          <div className="bar"><div style={{ width: `${(y.amt / max) * 100}%`, background: '#8E2F1C' }} /></div>
          <div className="num">{fmtMillion(y.amt)}</div>
        </div>
      ))}
    </section>
  )
}

