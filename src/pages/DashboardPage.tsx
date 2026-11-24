import { useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import StatCards from '../components/StatCards'
import AgingBar from '../components/AgingBar'
import BreakdownList from '../components/BreakdownList'
import YearBars from '../components/YearBars'
import TopOwnersTable from '../components/TopOwnersTable'
import Notes from '../components/Notes'
import { computeSummary } from '../lib/arSummary'
import type { ZdData } from '../lib/types'

export default function DashboardPage({ data }: { data: ZdData }) {
  const s = useMemo(() => computeSummary(data), [data])
  return (
    <>
      <PageHeader meta={data.meta} title="Dashboard อายุลูกหนี้ ZD" />
      <StatCards s={s} />
      <div className="mt"><AgingBar totals={s.bandTotals} total={s.total} /></div>
      <div className="grid-2 mt">
        <BreakdownList title="แยกตามสิทธิ" rows={s.bySit} legend />
        <YearBars years={s.over90ByYear} oldAmt={s.notes.oldFyAmt} oldUpTo={s.notes.oldFyUpTo} />
      </div>
      <div className="grid-2 mt">
        <BreakdownList title="แยกตามกลุ่มลูกหนี้" rows={s.byGroup} />
        <div><TopOwnersTable s={s} /></div>
      </div>
      <Notes s={s} />
    </>
  )
}

