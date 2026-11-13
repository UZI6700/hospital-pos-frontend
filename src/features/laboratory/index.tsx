import { useMemo, useState } from 'react'
import { AlertOctagon, BadgeCheck, Barcode as BarcodeIcon, FlaskConical, History, Mail, MessageSquare, Paperclip, Plus, Printer, Syringe, Timer } from 'lucide-react'
import { dbx, notify, printPreview, toast, useAuth, useColl, useDB } from '@/app/store'
import { Barcode, PatientBanner, PatientSearch } from '@/components/common'
import { Letterhead, Sign } from '@/components/common/overlays'
import { BarC, LineC } from '@/components/charts'
import { Badge, Button, DataTable, Empty, Field, Input, Modal, PageHeader, Section, Select, Stat, Status, Tabs, Textarea } from '@/components/ui'
import { ageOf, cn, fDT, nowISO, uid } from '@/utils'
import { LAB_TESTS } from '@/utils/constants'
import type { LabOrder, LabParam } from '@/types'

const testOf = (code: string) => LAB_TESTS.find(t => t.code === code)!
export const flag = (p: LabParam, v: any): '' | 'L' | 'H' | 'CL' | 'CH' => {
  const n = Number(v); if (v === '' || v == null || isNaN(n)) return ''
  if (p.critLow != null && n <= p.critLow) return 'CL'; if (p.critHigh != null && n >= p.critHigh) return 'CH'
  return n < p.low ? 'L' : n > p.high ? 'H' : ''
}
const FCLS: Record<string, string> = { '': '', L: 'text-amber-600 font-semibold', H: 'text-amber-600 font-semibold', CL: 'bg-red-600 text-white font-bold', CH: 'bg-red-600 text-white font-bold' }
const tatH = (o: LabOrder) => (o.completedAt ? (+new Date(o.completedAt) - +new Date(o.orderedAt)) / 36e5 : null)

export function LabReportDoc({ order }: { order: LabOrder }) {
  const t = testOf(order.test), p: any = (dbx().db.patients as any[]).find(x => x.id === order.patientId)
  return (
    <Letterhead title="Laboratory Report" meta={[['Patient', `${order.patientName} (${order.patientId})`], ['Age / Sex', p ? `${ageOf(p.dob)} yrs / ${p.gender}` : '—'], ['Lab No', order.id], ['Referred by', (order as any).doctor], ['Sample', `${t.sample} · collected ${fDT(order.collectedAt)}`], ['Reported', fDT(order.completedAt)]]}>
      <h3 style={{ fontWeight: 700, margin: '8px 0' }}>{t.name}</h3>
      <table><thead><tr><th>Investigation</th><th>Result</th><th>Flag</th><th>Unit</th><th>Biological reference range</th></tr></thead>
        <tbody>{t.params.map(pm => { const v = order.results?.[pm.name], f = flag(pm, v); return <tr key={pm.name}><td>{pm.name}</td><td style={{ fontWeight: f ? 700 : 400, color: f.startsWith('C') ? '#dc2626' : undefined }}>{v ?? '—'}</td><td style={{ fontWeight: 700, color: f.startsWith('C') ? '#dc2626' : '#b45309' }}>{f.startsWith('C') ? `CRITICAL ${f[1]}` : f}</td><td>{pm.unit}</td><td>{pm.low} – {pm.high}</td></tr> })}</tbody></table>
      {order.remarks && <p style={{ marginTop: 8 }}><b>Remarks:</b> {order.remarks}</p>}
      <p style={{ fontSize: 10, marginTop: 8 }}>H = above range, L = below range. Results should be correlated clinically.</p>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><Sign label="Lab Technician" /><Sign label="Consultant Pathologist" name={order.approvedBy || 'Pending approval'} /></div>
    </Letterhead>
  )
}

export default function Laboratory() {
  const user = useAuth(s => s.user)!, { add, update } = useDB(), orders = useColl<LabOrder>('labOrders'), doctors = useColl('doctors')
  const [tab, setTab] = useState('orders'), [neo, setNeo] = useState<any | null>(null), [entry, setEntry] = useState<LabOrder | null>(null), [vals, setVals] = useState<Record<string, string>>({}), [remarks, setRemarks] = useState(''), [file, setFile] = useState(''), [cmp, setCmp] = useState<LabOrder | null>(null)
  const by = (s: string[]) => orders.filter(o => s.includes(o.status))
  const prio = (a: LabOrder, b: LabOrder) => ['STAT', 'Urgent', 'Routine'].indexOf(a.priority) - ['STAT', 'Urgent', 'Routine'].indexOf(b.priority)
  const label = (o: LabOrder) => printPreview(`Sample label ${o.id}`, <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 700 }}>{o.patientName}</div><div style={{ fontSize: 10 }}>{o.patientId} · {testOf(o.test).name}</div><Barcode value={o.id} /><div style={{ fontSize: 10 }}>{testOf(o.test).sample} · {o.priority} · {fDT(nowISO())}</div></div>, true)
  const openEntry = (o: LabOrder) => { setEntry(o); setVals(o.results || {}); setRemarks(o.remarks || ''); setFile(o.attachment || ''); if (o.status === 'Collected') update('labOrders', o.id, { status: 'In-Process' }) }
  const t = entry ? testOf(entry.test) : null
  const invalid = t ? t.params.filter(p => vals[p.name] === undefined || vals[p.name] === '' || isNaN(Number(vals[p.name])) || Number(vals[p.name]) < 0 || Number(vals[p.name]) > p.high * 50) : []
  const submit = () => {
    if (invalid.length) return toast.error(`Auto-validation failed: enter valid numeric values for ${invalid.map(p => p.name).join(', ')}`)
    const crit = t!.params.filter(p => flag(p, vals[p.name]).startsWith('C'))
    update('labOrders', entry!.id, { results: vals, remarks, attachment: file, status: 'Completed', completedAt: nowISO(), enteredBy: user.name })
    if (crit.length) { notify('Critical lab result', `${entry!.patientName}: ${crit.map(p => `${p.name} ${vals[p.name]} ${p.unit}`).join(', ')} — informed ${(entry as any).doctor}`, 'critical', '/laboratory'); toast.warning(`Critical value alert sent to ${(entry as any).doctor}`) }
    toast.success('Results saved — sent for pathologist approval'); setEntry(null)
  }
  const send = (o: LabOrder, ch: string) => { add('commsLog', { id: uid('CM'), at: nowISO(), channel: ch, to: o.patientName, template: 'Lab report ready', status: 'Sent' }); toast.success(`Report sent to patient via ${ch}`) }
  const history = useMemo(() => (cmp ? orders.filter(o => o.patientId === cmp.patientId && o.test === cmp.test && o.results).sort((a, b) => (a.completedAt || '').localeCompare(b.completedAt || '')) : []), [cmp, orders])
  const tat = useMemo(() => LAB_TESTS.map(tt => { const done = orders.filter(o => o.test === tt.code && tatH(o) != null); return { name: tt.code, 'Actual (h)': done.length ? +(done.reduce((s, o) => s + tatH(o)!, 0) / done.length).toFixed(1) : 0, 'Target (h)': tt.tat } }), [orders])
  const cols = [{ key: 'id', label: 'Lab no.', className: 'font-mono text-xs' }, { key: 'patientName', label: 'Patient' }, { key: 'test', label: 'Test', render: (o: LabOrder) => testOf(o.test).name }, { key: 'doctor', label: 'Ordered by' }, { key: 'orderedAt', label: 'Ordered', render: (o: LabOrder) => fDT(o.orderedAt) }, { key: 'priority', label: 'Priority', render: (o: LabOrder) => <Status v={o.priority} /> }, { key: 'status', label: 'Status', render: (o: LabOrder) => <Status v={o.status} /> }]
  return (
    <>
      <PageHeader title="Laboratory" desc="Orders → sample collection → result entry → pathologist approval → report" actions={<Button onClick={() => setNeo({ patient: null, tests: [], priority: 'Routine', doctorId: doctors[0].id })}><Plus />New lab order</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat icon={FlaskConical} label="New orders" value={by(['Ordered']).length} /><Stat icon={Syringe} label="Collected / in-process" value={by(['Collected', 'In-Process']).length} tone="amber" /><Stat icon={BadgeCheck} label="Awaiting approval" value={by(['Completed']).length} tone="purple" />
        <Stat icon={AlertOctagon} label="STAT / urgent pending" value={orders.filter(o => o.priority !== 'Routine' && o.status !== 'Approved').length} tone="red" /><Stat icon={Timer} label="Reports approved" value={by(['Approved']).length} tone="green" />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'orders', label: 'Orders & samples', badge: by(['Ordered']).length }, { id: 'entry', label: 'Result entry', badge: by(['Collected', 'In-Process']).length }, { id: 'approve', label: 'Approval', badge: by(['Completed']).length }, { id: 'reports', label: 'Reports' }, { id: 'tat', label: 'TAT tracking' }]} />
      <Section pad={false}>
        {tab === 'orders' && <DataTable rows={[...orders].sort(prio)} cols={cols} exportName="Lab orders" rowClass={o => (o.priority === 'STAT' && o.status !== 'Approved' ? 'bg-red-50/60 dark:bg-red-500/5' : '')}
          actions={o => <><Button size="xs" variant="outline" onClick={() => label(o)}><BarcodeIcon />Label</Button>{o.status === 'Ordered' && <Button size="xs" onClick={() => { update('labOrders', o.id, { status: 'Collected', collectedAt: nowISO() }); toast.success(`Sample collected for ${o.id}`) }}><Syringe />Collect sample</Button>}{['Collected', 'In-Process'].includes(o.status) && <Button size="xs" variant="success" onClick={() => openEntry(o)}>Enter results</Button>}
            <Select aria-label="Priority" className="h-7 w-24 px-1 text-xs" value={o.priority} onChange={e => update('labOrders', o.id, { priority: e.target.value })} options={['Routine', 'Urgent', 'STAT']} /></>} />}
        {tab === 'entry' && <DataTable rows={by(['Collected', 'In-Process']).sort(prio)} cols={cols} actions={o => <Button size="xs" variant="success" onClick={() => openEntry(o)}>Enter results</Button>} empty="No samples waiting for result entry" />}
        {tab === 'approve' && <DataTable rows={by(['Completed'])} cols={[...cols.slice(0, 3), { key: 'abn', label: 'Abnormal', render: (o: LabOrder) => { const ps = testOf(o.test).params.map(p => flag(p, o.results?.[p.name])); return ps.some(f => f.startsWith('C')) ? <Badge tone="red">Critical</Badge> : ps.some(Boolean) ? <Badge tone="amber">Abnormal</Badge> : <Badge tone="green">Normal</Badge> } }, { key: 'completedAt', label: 'Completed', render: (o: LabOrder) => fDT(o.completedAt) }]}
          actions={o => <><Button size="xs" variant="outline" onClick={() => printPreview(`Lab report ${o.id}`, <LabReportDoc order={o} />)}>Review</Button><Button size="xs" variant="success" onClick={() => { update('labOrders', o.id, { status: 'Approved', approvedBy: `${user.name} (Pathologist)`, approvedAt: nowISO() }); toast.success(`${o.id} approved and released`) }}><BadgeCheck />Approve</Button><Button size="xs" variant="outline" onClick={() => { update('labOrders', o.id, { status: 'In-Process' }); toast.info('Sent back for re-run') }}>Reject</Button></>} empty="Nothing awaiting approval" />}
        {tab === 'reports' && <DataTable rows={by(['Approved'])} exportName="Approved lab reports" cols={[...cols.slice(0, 4), { key: 'completedAt', label: 'Reported', render: (o: LabOrder) => fDT(o.completedAt) }, { key: 'approvedBy', label: 'Approved by' }]}
          actions={o => <><Button size="xs" onClick={() => printPreview(`Lab report ${o.id}`, <LabReportDoc order={o} />)}><Printer />Print / PDF</Button><Button size="icon" variant="ghost" aria-label="Email report" title="Email to patient" onClick={() => send(o, 'Email')}><Mail /></Button><Button size="icon" variant="ghost" aria-label="SMS report link" title="SMS to patient" onClick={() => send(o, 'SMS')}><MessageSquare /></Button><Button size="icon" variant="ghost" aria-label="Historical comparison" title="Historical comparison" onClick={() => setCmp(o)}><History /></Button></>} />}
        {tab === 'tat' && <div className="grid gap-4 p-4 lg:grid-cols-2"><div><h4 className="mb-2 text-sm font-semibold">Average turnaround time vs target</h4><BarC data={tat} keys={['Actual (h)', 'Target (h)']} colors={['#1E40AF', '#94a3b8']} /></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase muted"><tr><th className="py-2">Lab no.</th><th>Test</th><th>Priority</th><th>TAT</th><th>Target</th><th /></tr></thead><tbody className="divide-y">{orders.filter(o => tatH(o) != null).slice(0, 12).map(o => { const h = tatH(o)!, tg = testOf(o.test).tat; return <tr key={o.id}><td className="py-1.5 font-mono text-xs">{o.id}</td><td>{o.test}</td><td><Status v={o.priority} /></td><td className={cn('font-semibold', h > tg ? 'text-red-600' : 'text-emerald-600')}>{h.toFixed(1)} h</td><td>{tg} h</td><td>{h > tg ? <Badge tone="red">Breached</Badge> : <Badge tone="green">Within TAT</Badge>}</td></tr> })}</tbody></table></div></div>}
      </Section>

      <Modal open={!!neo} onClose={() => setNeo(null)} title="New lab order" footer={<><Button variant="outline" onClick={() => setNeo(null)}>Cancel</Button><Button onClick={() => { if (!neo.patient || !neo.tests.length) return toast.error('Select patient and at least one test'); const d: any = doctors.find((x: any) => x.id === neo.doctorId); neo.tests.forEach((c: string) => add('labOrders', { id: dbx().nextNo('lab'), patientId: neo.patient.id, patientName: neo.patient.name, doctorId: d.id, doctor: d.name, test: c, priority: neo.priority, status: 'Ordered', orderedAt: nowISO() })); toast.success(`${neo.tests.length} test(s) ordered`); setNeo(null) }}>Create order</Button></>}>
        {neo && <div className="space-y-3">{neo.patient ? <PatientBanner p={neo.patient} onClear={() => setNeo({ ...neo, patient: null })} /> : <PatientSearch autoFocus onSelect={p => setNeo({ ...neo, patient: p })} />}
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Ordering doctor"><Select value={neo.doctorId} onChange={e => setNeo({ ...neo, doctorId: e.target.value })} options={doctors.map((d: any) => ({ value: d.id, label: d.name }))} /></Field><Field label="Priority"><Select value={neo.priority} onChange={e => setNeo({ ...neo, priority: e.target.value })} options={['Routine', 'Urgent', 'STAT']} /></Field></div>
          <div className="grid gap-2 sm:grid-cols-2">{LAB_TESTS.map(tt => <label key={tt.code} className={cn('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm', neo.tests.includes(tt.code) && 'border-primary bg-blue-50 dark:bg-blue-500/10')}><input type="checkbox" className="h-4 w-4 accent-blue-800" checked={neo.tests.includes(tt.code)} onChange={e => setNeo({ ...neo, tests: e.target.checked ? [...neo.tests, tt.code] : neo.tests.filter((x: string) => x !== tt.code) })} /><span className="flex-1">{tt.name}</span><span className="text-xs muted">TAT {tt.tat}h</span></label>)}</div></div>}
      </Modal>

      <Modal open={!!entry} onClose={() => setEntry(null)} size="lg" title={<span>{t?.name} <span className="text-xs font-normal muted">· {entry?.id} · {entry?.patientName}</span></span>} footer={<><Button variant="ghost" className="mr-auto" onClick={() => setVals(Object.fromEntries(t!.params.map(p => [p.name, String(+((p.low + p.high) / 2).toFixed(1))])))}>Apply normal template</Button><Button variant="outline" onClick={() => { update('labOrders', entry!.id, { results: vals, remarks }); setEntry(null); toast.info('Draft saved') }}>Save draft</Button><Button onClick={submit}>Submit for approval</Button></>}>
        {entry && t && <div className="space-y-3">
          <table className="w-full text-sm"><thead className="text-left text-xs uppercase muted"><tr><th className="py-2">Parameter</th><th className="w-32">Result</th><th>Unit</th><th>Normal range</th><th>Flag</th></tr></thead>
            <tbody className="divide-y">{t.params.map(p => { const f = flag(p, vals[p.name]); return <tr key={p.name}><td className="py-2 font-medium">{p.name}</td><td><Input aria-label={p.name} type="number" step="any" value={vals[p.name] ?? ''} onChange={e => setVals({ ...vals, [p.name]: e.target.value })} className={cn('h-8', FCLS[f], f.startsWith('C') && 'border-red-600')} /></td><td className="muted">{p.unit}</td><td>{p.low} – {p.high}</td><td>{f && <Badge tone={f.startsWith('C') ? 'red' : 'amber'}>{f.startsWith('C') ? `CRITICAL ${f[1] === 'H' ? 'HIGH' : 'LOW'}` : f === 'H' ? 'High' : 'Low'}</Badge>}</td></tr> })}</tbody></table>
          {t.params.some(p => flag(p, vals[p.name]).startsWith('C')) && <div role="alert" className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white"><AlertOctagon className="h-4 w-4" />Critical value detected — the ordering doctor will be notified immediately on submit.</div>}
          <Field label="Remarks / interpretation"><Textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} /></Field>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-primary dark:text-blue-400"><Paperclip className="h-4 w-4" />{file ? `Attached: ${file}` : 'Attach file (analyser print-out / image)'}<input type="file" hidden onChange={e => setFile(e.target.files?.[0]?.name || '')} /></label>
        </div>}
      </Modal>

      <Modal open={!!cmp} onClose={() => setCmp(null)} size="lg" title={`Historical comparison — ${cmp?.patientName} · ${cmp ? testOf(cmp.test).name : ''}`}>
        {cmp && (history.length ? <><LineC data={history.map(h => ({ name: fDT(h.completedAt).slice(0, 6), ...Object.fromEntries(testOf(cmp.test).params.slice(0, 4).map(p => [p.name, Number(h.results![p.name])])) }))} keys={testOf(cmp.test).params.slice(0, 4).map(p => p.name)} />
          <table className="mt-3 w-full text-sm"><thead className="text-left text-xs uppercase muted"><tr><th className="py-1.5">Parameter</th>{history.map(h => <th key={h.id}>{fDT(h.completedAt)}</th>)}<th>Range</th></tr></thead><tbody className="divide-y">{testOf(cmp.test).params.map(p => <tr key={p.name}><td className="py-1.5 font-medium">{p.name}</td>{history.map(h => <td key={h.id}><span className={cn('rounded px-1', FCLS[flag(p, h.results![p.name])])}>{h.results![p.name]}</span></td>)}<td className="muted">{p.low}–{p.high} {p.unit}</td></tr>)}</tbody></table>
          {history.length < 2 && <p className="mt-2 text-xs muted">Only one result on record — trends appear once the test is repeated.</p>}</> : <Empty />)}
      </Modal>
    </>
  )
}
