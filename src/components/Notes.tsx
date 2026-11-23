import { fmtInt, fmtMillion, pctOf } from '../lib/format'
import type { Summary } from '../lib/arSummary'

export default function Notes({ s }: { s: Summary }) {
  const { topSit, oldFyAmt, oldFyUpTo } = s.notes
  return (
    <section className="card mt">
      <h2>ข้อสังเกต</h2>
      <ul className="notes">
        {topSit && <li>สิทธิ {topSit.label} มียอดค้างเกิน 90 วันมากที่สุด {fmtMillion(topSit.values[4])} ล้านบาท ({pctOf(topSit.values[4], s.over90.amt).toFixed(0)}% ของยอดค้างเกิน 90 วันทั้งหมด)</li>}
        <li>ยอดค้างเกิน 90 วันของปีงบ {oldFyUpTo} และก่อนหน้า {fmtMillion(oldFyAmt)} ล้านบาท ({pctOf(oldFyAmt, s.over90.amt).toFixed(0)}% ของยอดค้างเกิน 90 วัน) ควรติดตามเป็นลำดับแรก</li>
        <li>มีรายการยอดติดลบ {fmtInt(s.negatives.cnt)} รายการ รวม {fmtMillion(s.negatives.amt)} ล้านบาท รวมอยู่ในยอดด้านบนแล้ว</li>
        {s.unclassified.cnt > 0 && <li>มี {fmtInt(s.unclassified.cnt)} รายการ ({fmtInt(s.unclassified.amt)} บาท) ที่ไม่มีช่วงอายุ รวมในยอดรวมแต่ไม่อยู่ในช่วงอายุใด</li>}
      </ul>
    </section>
  )
}
