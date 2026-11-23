import type { BucketKey } from './buckets'

/** หนึ่งแถว = ยอดรวมของ (สิทธิ, กลุ่มลูกหนี้, หน่วยงาน, ช่วงอายุ, ปีงบ, OPD/IPD) */
export interface ZdRecord {
  s: string
  g: string
  n: string
  k: BucketKey
  fy: number
  t: 'OPD' | 'IPD'
  amt: number
  cnt: number
  neg: number
  negCnt: number
}

export interface ZdMeta {
  asOf: string
  source: string
  rows: number
  total: number
}

export interface ZdData {
  meta: ZdMeta
  records: ZdRecord[]
}
