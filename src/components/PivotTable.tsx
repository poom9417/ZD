import { useRef } from 'react'
import { BUCKETS, BUCKET_LABEL } from '../lib/buckets'
import { fmtBaht } from '../lib/format'
import type { PivotNode } from '../lib/pivot'

function Cells({ node }: { node: PivotNode }) {
  const cell = (v: number) => fmtBaht(v) ?? <span className="pv-zero">–</span>
  return (
    <>
      {BUCKETS.map((b) => (
        <span key={b}>{cell(node.values[b])}</span>
      ))}
      <span className="pv-sum">{cell(node.total)}</span>
    </>
  )
}

function PivotRow({ node }: { node: PivotNode }) {
  const label = <span className="pv-label" title={node.label}>{node.label}</span>
  if (!node.children.length) {
    return (
      <div className="pv-row pv-l3">
        {label}
        <Cells node={node} />
      </div>
    )
  }
  return (
    <details className="pv-group" open={node.level === 1}>
      <summary className={`pv-row pv-l${node.level}`}>
        {label}
        <Cells node={node} />
      </summary>
      {node.children.map((c) => (
        <PivotRow key={c.label} node={c} />
      ))}
    </details>
  )
}

export default function PivotTable({ rows, grand }: { rows: PivotNode[]; grand: PivotNode }) {
  const root = useRef<HTMLDivElement>(null)
  const setAll = (open: boolean) => root.current?.querySelectorAll('details').forEach((d) => (d.open = open))

  return (
    <div>
      <div className="pv-tools">
        <button type="button" className="btn-quiet" onClick={() => setAll(true)}>ขยายทั้งหมด</button>
        <button type="button" className="btn-quiet" onClick={() => setAll(false)}>ย่อทั้งหมด</button>
      </div>
      <div className="pv-scroll" ref={root}>
        <div className="pv-inner">
          <div className="pv-row pv-head">
            <span className="pv-label">สิทธิ / กลุ่มลูกหนี้ / หน่วยงาน</span>
            {BUCKETS.map((b) => (
              <span key={b}>{BUCKET_LABEL[b]}</span>
            ))}
            <span>Grand Total</span>
          </div>
          {rows.map((r) => (
            <PivotRow key={r.label} node={r} />
          ))}
          <div className="pv-row pv-total">
            <span className="pv-label">{grand.label}</span>
            <Cells node={grand} />
          </div>
        </div>
      </div>
    </div>
  )
}
