import { BUCKETS, type BucketKey } from './buckets'
import { isUnspecified } from './format'
import type { ZdRecord } from './types'

export type BucketValues = Record<BucketKey, number>

export interface PivotNode {
  label: string
  level: 1 | 2 | 3 // สิทธิ › กลุ่มลูกหนี้ › หน่วยงาน
  values: BucketValues
  total: number
  children: PivotNode[]
}

interface Tmp {
  node: PivotNode
  kids: Map<string, Tmp>
}

export const emptyValues = (): BucketValues =>
  Object.fromEntries(BUCKETS.map((b) => [b, 0])) as BucketValues

function get(m: Map<string, Tmp>, label: string, level: 1 | 2 | 3): Tmp {
  let t = m.get(label)
  if (!t) {
    t = { node: { label, level, values: emptyValues(), total: 0, children: [] }, kids: new Map() }
    m.set(label, t)
  }
  return t
}

const byTotal = (a: PivotNode, b: PivotNode) => {
  const ua = isUnspecified(a.label)
  const ub = isUnspecified(b.label)
  return ua !== ub ? (ua ? 1 : -1) : b.total - a.total
}

/** pivot: Rows = สิทธิ › กลุ่มลูกหนี้ › Name, Columns = ช่วงอายุลูกหนี้-, Values = Sum of Amt */
export function buildPivot(records: ZdRecord[]): { rows: PivotNode[]; grand: PivotNode } {
  const root = new Map<string, Tmp>()
  const grand: PivotNode = { label: 'รวมทั้งหมด', level: 1, values: emptyValues(), total: 0, children: [] }
  for (const r of records) {
    const a = get(root, r.s, 1)
    const b = get(a.kids, r.g, 2)
    const c = get(b.kids, r.n, 3)
    for (const n of [a.node, b.node, c.node, grand]) {
      n.values[r.k] += r.amt
      n.total += r.amt
    }
  }
  const finish = (m: Map<string, Tmp>): PivotNode[] =>
    [...m.values()]
      .map((t) => {
        t.node.children = finish(t.kids)
        return t.node
      })
      .sort(byTotal)
  return { rows: finish(root), grand }
}
