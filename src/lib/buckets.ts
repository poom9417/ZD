/** ค่าจากคอลัมน์ "ช่วงอายุลูกหนี้-" : (4)=ปีงบ 2026, (5)=2025, (6)=2024 และก่อนหน้า (ล้วนค้างเกิน 90 วัน) */
export const BUCKETS = ['0', '1', '2', '3', '4', '5', '6', 'na'] as const
export type BucketKey = (typeof BUCKETS)[number]

export const BUCKET_LABEL: Record<BucketKey, string> = {
  '0': '(0) Current',
  '1': '(1) 1 to 30 Days Past Due',
  '2': '(2) 31 to 60 Days Past Due',
  '3': '(3) 61 to 90 Days Past Due',
  '4': '(4) Greater than 90 Days Past Due',
  '5': '(5) Greater than 90 Days Past Due',
  '6': '(6) Greater than 90 Days Past Due',
  na: '(blank)',
}

export const OVER_90: BucketKey[] = ['4', '5', '6']

/** 5 ช่วงที่ใช้ในหน้า Dashboard (รวม 4-6 เป็น "เกิน 90 วัน") */
export const BANDS: { label: string; color: string; members: BucketKey[] }[] = [
  { label: 'ยังไม่ถึงกำหนด', color: '#8FB8DE', members: ['0'] },
  { label: 'เกิน 1–30 วัน', color: '#F2C265', members: ['1'] },
  { label: 'เกิน 31–60 วัน', color: '#E89A3C', members: ['2'] },
  { label: 'เกิน 61–90 วัน', color: '#D2692A', members: ['3'] },
  { label: 'เกิน 90 วัน', color: '#8E2F1C', members: OVER_90 },
]

export const bandOf = (k: BucketKey): number => BANDS.findIndex((b) => b.members.includes(k))
