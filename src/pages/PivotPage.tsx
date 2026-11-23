import { useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import PivotTable from '../components/PivotTable'
import { buildPivot } from '../lib/pivot'
import { zdData } from '../lib/zdData'

export default function PivotPage() {
  const { rows, grand } = useMemo(() => buildPivot(zdData.records), [])
  return (
    <>
      <PageHeader title="ตารางหลักลูกหนี้ แยกตามช่วงอายุ" hint="ยอดเป็นบาท · คลิกแถวเพื่อย่อ/ขยาย" />
      <PivotTable rows={rows} grand={grand} />
    </>
  )
}
