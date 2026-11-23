import { BANDS, OVER_90, bandOf } from './buckets'
import { isUnspecified, pctOf, shortName } from './format'
import type { ZdData, ZdRecord } from './types'

export interface BandRow {
  label: string
  values: number[] // ตาม BANDS
  total: number
  over90Pct: number
}

export interface Summary {
  total: number
  rows: number
  owners: number
  bandTotals: number[]
  over90: { amt: number; cnt: number }
  current: number
  overdue: number // เกินกำหนด 1–90 วัน
  unclassified: { amt: number; cnt: number }
  bySit: BandRow[]
  byGroup: BandRow[]
  over90ByYear: { fy: number; amt: number }[]
  topOwners: { name: string; amt: number; cnt: number }[]
  visits: { type: string; amt: number; cnt: number; over90: number }[]
  negatives: { cnt: number; amt: number }
  notes: { topSit: BandRow | null; oldFyAmt: number; oldFyUpTo: number }
}

function bandRows(records: ZdRecord[], key: (r: ZdRecord) => string): BandRow[] {
  const m = new Map<string, BandRow>()
  for (const r of records) {
    const i = bandOf(r.k)
    if (i < 0) continue
    const label = key(r)
    let row = m.get(label)
    if (!row) m.set(label, (row = { label, values: BANDS.map(() => 0), total: 0, over90Pct: 0 }))
    row.values[i] += r.amt
    row.total += r.amt
  }
  const rows = [...m.values()]
  rows.forEach((r) => (r.over90Pct = pctOf(r.values[4], r.total)))
  return rows.sort((a, b) =>
    isUnspecified(a.label) !== isUnspecified(b.label) ? (isUnspecified(a.label) ? 1 : -1) : b.total - a.total,
  )
}

export function computeSummary({ records, meta }: ZdData): Summary {
  const bandTotals = BANDS.map(() => 0)
  const over90 = { amt: 0, cnt: 0 }
  const unclassified = { amt: 0, cnt: 0 }
  const negatives = { cnt: 0, amt: 0 }
  const owners = new Set<string>()
  const byYear = new Map<number, number>()
  const byOwner = new Map<string, { name: string; amt: number; cnt: number }>()
  const visits = new Map<string, { type: string; amt: number; cnt: number; over90: number }>()
  let rows = 0

  for (const r of records) {
    rows += r.cnt
    owners.add(r.n)
    negatives.cnt += r.negCnt
    negatives.amt += r.neg
    const v = visits.get(r.t) ?? { type: r.t, amt: 0, cnt: 0, over90: 0 }
    v.amt += r.amt
    v.cnt += r.cnt
    visits.set(r.t, v)
    const i = bandOf(r.k)
    if (i < 0) {
      unclassified.amt += r.amt
      unclassified.cnt += r.cnt
      continue
    }
    bandTotals[i] += r.amt
    if (OVER_90.includes(r.k)) {
      over90.amt += r.amt
      over90.cnt += r.cnt
      v.over90 += r.amt
      byYear.set(r.fy, (byYear.get(r.fy) ?? 0) + r.amt)
      const o = byOwner.get(r.n) ?? { name: shortName(r.n), amt: 0, cnt: 0 }
      o.amt += r.amt
      o.cnt += r.cnt
      byOwner.set(r.n, o)
    }
  }

  const bySit = bandRows(records, (r) => r.s)
  const years = [...byYear.entries()].sort((a, b) => a[0] - b[0])
  const lastYear = years.length ? years[years.length - 1][0] : 0
  const oldFyUpTo = lastYear - 1
  return {
    total: meta.total,
    rows,
    owners: owners.size,
    bandTotals,
    over90,
    current: bandTotals[0],
    overdue: bandTotals[1] + bandTotals[2] + bandTotals[3],
    unclassified,
    bySit,
    byGroup: bandRows(records, (r) => r.g),
    over90ByYear: years.map(([fy, amt]) => ({ fy, amt })),
    topOwners: [...byOwner.values()].sort((a, b) => b.amt - a.amt).slice(0, 10),
    visits: [...visits.values()],
    negatives,
    notes: {
      topSit: [...bySit].sort((a, b) => b.values[4] - a.values[4])[0] ?? null,
      oldFyAmt: years.filter(([fy]) => fy <= oldFyUpTo).reduce((s, [, a]) => s + a, 0),
      oldFyUpTo,
    },
  }
}
