export const fmtBaht = (v: number): string | null =>
  Math.abs(v) < 0.005 ? null : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtMillion = (v: number): string =>
  (v / 1e6).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const fmtInt = (v: number): string => v.toLocaleString('en-US')

export const pctOf = (v: number, total: number): number => (total ? (v / total) * 100 : 0)

/** ตัดรหัสท้ายชื่อ "( 30001515 )" ออก */
export const shortName = (n: string): string => n.replace(/\s*\(.*$/, '').trim() || n

export const isUnspecified = (label: string): boolean => label.startsWith('(ไม่ระบุ')
