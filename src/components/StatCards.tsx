import { fmtInt, fmtMillion, pctOf } from '../lib/format'
import type { Summary } from '../lib/arSummary'

function Stat({ label, value, sub, tone }: { label: string; value: number; sub: string; tone?: string }) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: tone }}>
        {fmtMillion(value)}
        <span> ล้านบาท</span>
      </div>
      <div className="stat-sub">{sub}</div>
    </div>
  )
}

export default function StatCards({ s }: { s: Summary }) {
  return (
    <div className="grid-stats">
      <Stat label="ยอดลูกหนี้คงค้างรวม" value={s.total} sub={`${fmtInt(s.rows)} รายการ · ${s.owners} หน่วยงาน`} />
      <Stat label="ค้างชำระเกิน 90 วัน" value={s.over90.amt} tone="#8E2F1C"
        sub={`${pctOf(s.over90.amt, s.total).toFixed(1)}% ของยอดรวม · ${fmtInt(s.over90.cnt)} รายการ`} />
      <Stat label="เกินกำหนด 1–90 วัน" value={s.overdue} tone="#B4691A" sub={`${pctOf(s.overdue, s.total).toFixed(1)}% ของยอดรวม`} />
      <Stat label="ยังไม่ถึงกำหนด" value={s.current} tone="#2A5E91" sub={`${pctOf(s.current, s.total).toFixed(1)}% ของยอดรวม`} />
    </div>
  )
}
