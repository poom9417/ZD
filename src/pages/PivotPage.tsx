import { useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import PivotTable from '../components/PivotTable'
import { buildPivot } from '../lib/pivot'
import type { ZdData } from '../lib/types'

export default function PivotPage({ data }: { data: ZdData }) {
  const { rows, grand } = useMemo(() => buildPivot(data.records), [data])
  return (
    <>
      <PageHeader meta={data.meta} title="ตารางหลักลูกหนี้ แยกตามช่วงอายุ" hint="ยอดเป็นบาท · คลิกแถวเพื่อย่อ/ขยาย" />
      <PivotTable key={data.meta.source + data.meta.total + data.meta.rows} rows={rows} grand={grand} />
    </>
  )
}

