import { useMemo, useState } from 'react'
import { FileSpreadsheet, FileText, GripVertical, Mail, Plus, Save, Sheet, Trash2, X } from 'lucide-react'
import { toast, useColl, useDB } from '@/app/store'
import { Resource } from '@/components/common'
import { AreaC, BarC, PieC } from '@/components/charts'
import { Badge, Button, Empty, Field, Input, PageHeader, Section, Select, Stat, Tabs } from '@/components/ui'
import { ageOf, cn, dOff, fDate, groupSum, money, sum, today, uid } from '@/utils'
import { exportCSV, exportPDF, exportXLSX, type ExportCol } from '@/utils/export'
import { LAB_TESTS } from '@/utils/constants'

const SOURCES: Record<string, { label: string; fields: string[] }> = {
  patients: { label: 'Patients', fields: ['id', 'name', 'gender', 'dob', 'phone', 'blood', 'category', 'department', 'status', 'regDate', 'insProvider'] },
  bills: { label: 'Bills', fields: ['id', 'date', 'patientName', 'type', 'dept', 'subtotal', 'discount', 'tax', 'total', 'paid', 'status', 'by'] },
  appointments: { label: 'Appointments', fields: ['id', 'patientName', 'dept', 'start', 'type', 'reason', 'status'] },
  admissions: { label: 'Admissions', fields: ['id', 'patientName', 'ward', 'bedId', 'doctor', 'dept', 'admitDate', 'diagnosis', 'status', 'dischargeDate'] },
  labOrders: { label: 'Lab orders', fields: ['id', 'patientName', 'test', 'doctor', 'priority', 'status', 'orderedAt', 'completedAt'] },
  pharmacySales: { label: 'Pharmacy sales', fields: ['id', 'date', 'patientName', 'subtotal', 'discount', 'tax', 'total', 'by'] },
  employees: { label: 'Employees', fields: ['id', 'name', 'dept', 'designation', 'shift', 'joinDate', 'salary', 'status'] },
}
const nice = (f: string) => f.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())

function ExportBar({ name, cols, rows }: { name: string; cols: ExportCol[]; rows: any[] }) {
  return <div className="flex gap-1.5"><Button size="sm" variant="outline" onClick={() => exportPDF(name, cols, rows)}><FileText />PDF</Button><Button size="sm" variant="outline" onClick={() => exportXLSX(name, cols, rows)}><FileSpreadsheet />Excel</Button><Button size="sm" variant="outline" onClick={() => exportCSV(name, cols, rows)}><Sheet />CSV</Button></div>
}
const kv = (a: string, b: string): ExportCol[] => [{ label: a, get: r => r.name }, { label: b, get: r => r.value }]

export default function Reports() {
  const { add, remove } = useDB(), db = useDB(s => s.db), saved = useColl('savedReports')
  const { patients, bills, appointments, beds, admissions, labOrders, consultations, medicines, doctors, pharmacySales } = db
  const [tab, setTab] = useState('ops')
  // ── builder state
  const [src, setSrc] = useState('patients'), [cols, setCols] = useState<string[]>(['id', 'name', 'gender', 'status']), [group, setGroup] = useState(''), [fField, setFField] = useState(''), [fVal, setFVal] = useState(''), [name, setName] = useState('My custom report'), [over, setOver] = useState(false)
  const rows = useMemo(() => (db[src] as any[]).filter(r => !fField || !fVal || String(r[fField] ?? '').toLowerCase().includes(fVal.toLowerCase())), [db, src, fField, fVal])
  const grouped = useMemo(() => (group ? groupSum(rows, r => String(r[group] ?? '—')) : []), [rows, group])
  const drop = (e: React.DragEvent, i?: number) => { e.preventDefault(); e.stopPropagation(); setOver(false); const f = e.dataTransfer.getData('text/plain'); if (!SOURCES[src].fields.includes(f)) return; const next = cols.filter(c => c !== f); next.splice(i ?? next.length, 0, f); setCols(next) }
  const xcols: ExportCol[] = cols.map(c => ({ label: nice(c), get: r => r[c] }))
  const load = (s: any) => { setSrc(s.src); setCols(s.cols); setGroup(s.group || ''); setFField(s.fField || ''); setFVal(s.fVal || ''); setName(s.name); toast.info(`Loaded "${s.name}"`) }
  // ── datasets
  const census = useMemo(() => Array.from({ length: 14 }, (_, i) => { const d = dOff(i - 13); return { name: fDate(d).slice(0, 6), OPD: appointments.filter((a: any) => a.start?.slice(0, 10) === d).length + bills.filter((b: any) => b.date === d && b.type === 'OPD').length, IPD: admissions.filter((a: any) => a.admitDate?.slice(0, 10) <= d && (!a.dischargeDate || a.dischargeDate.slice(0, 10) >= d)).length } }), [appointments, bills, admissions])
  const occ = groupSum(beds, (b: any) => b.status), wardOcc = [...new Set(beds.map((b: any) => b.ward))].map(w => { const l = beds.filter((b: any) => b.ward === w); return { name: String(w).replace('General ', 'Gen. '), Occupied: l.filter((b: any) => b.status === 'Occupied').length, Free: l.filter((b: any) => b.status !== 'Occupied').length } })
  const loadD = groupSum(appointments.filter((a: any) => a.status !== 'Blocked'), (a: any) => a.dept)
  const active = bills.filter((b: any) => b.status !== 'Cancelled'), revDept = groupSum(active, (b: any) => b.dept, (b: any) => b.total), revType = groupSum(active, (b: any) => b.type, (b: any) => b.total)
  const trend = useMemo(() => Array.from({ length: 30 }, (_, i) => { const d = dOff(i - 29); return { name: fDate(d).slice(0, 6), Hospital: sum(active.filter((b: any) => b.date === d), (b: any) => b.total), Pharmacy: sum(pharmacySales.filter((s: any) => s.date === d), (s: any) => s.total) } }), [active, pharmacySales])
  const dx = useMemo(() => groupSum(consultations.flatMap((c: any) => c.diagnosis || []), (d: any) => (typeof d === 'string' ? d : d.desc || d[1] || d.code)).sort((a, b) => b.value - a.value).slice(0, 8), [consultations])
  const ages = groupSum(patients, (p: any) => { const a = ageOf(p.dob); return a < 13 ? '0–12' : a < 20 ? '13–19' : a < 40 ? '20–39' : a < 60 ? '40–59' : '60+' })
  const labMix = groupSum(labOrders, (o: any) => LAB_TESTS.find(t => t.code === o.test)?.name || o.test)
  const closed = admissions.filter((a: any) => a.dischargeDate), alos = closed.length ? (sum(closed, (a: any) => Math.max(1, (+new Date(a.dischargeDate) - +new Date(a.admitDate)) / 864e5)) / closed.length).toFixed(1) : '—'
  return (
    <>
      <PageHeader title="Reports & Analytics" desc="Operational, financial and clinical MIS with export and a custom report builder" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'ops', label: 'Operational' }, { id: 'fin', label: 'Financial' }, { id: 'clin', label: 'Clinical' }, { id: 'build', label: 'Custom report builder' }, { id: 'sched', label: 'Scheduled reports' }]} />
      {tab === 'ops' && <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Registered patients" value={patients.length} /><Stat label="Bed occupancy" tone="amber" value={`${Math.round((beds.filter((b: any) => b.status === 'Occupied').length / beds.length) * 100)}%`} sub={`${beds.filter((b: any) => b.status === 'Occupied').length} / ${beds.length} beds`} /><Stat label="Avg. length of stay" tone="purple" value={`${alos} days`} /><Stat label="No-show rate" tone="red" value={`${Math.round((appointments.filter((a: any) => a.status === 'No-show').length / (appointments.length || 1)) * 100)}%`} /></div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Section title="Patient census (14 days)" className="lg:col-span-2" actions={<ExportBar name="Patient census" cols={[{ label: 'Date', get: r => r.name }, { label: 'OPD', get: r => r.OPD }, { label: 'IPD', get: r => r.IPD }]} rows={census} />}><AreaC data={census} keys={['OPD', 'IPD']} /></Section>
          <Section title="Bed status" actions={<ExportBar name="Bed occupancy" cols={kv('Status', 'Beds')} rows={occ} />}><PieC data={occ} /></Section>
          <Section title="Ward occupancy" className="lg:col-span-2"><BarC data={wardOcc} keys={['Occupied', 'Free']} stacked colors={['#dc2626', '#16a34a']} /></Section>
          <Section title="Department load (appointments)" actions={<ExportBar name="Department load" cols={kv('Department', 'Appointments')} rows={loadD} />}><BarC data={loadD} horizontal /></Section>
        </div></div>}
      {tab === 'fin' && <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Hospital revenue (30d)" value={money(sum(active, (b: any) => b.total))} /><Stat label="Collected" tone="green" value={money(sum(active, (b: any) => b.paid))} /><Stat label="Outstanding" tone="red" value={money(sum(active, (b: any) => b.total - b.paid))} /><Stat label="Pharmacy sales" tone="purple" value={money(Math.round(sum(pharmacySales, (s: any) => s.total)))} /></div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Section title="Revenue trend (30 days)" className="lg:col-span-2" actions={<ExportBar name="Revenue trend" cols={[{ label: 'Date', get: r => r.name }, { label: 'Hospital', get: r => r.Hospital }, { label: 'Pharmacy', get: r => r.Pharmacy }]} rows={trend} />}><AreaC data={trend} keys={['Hospital', 'Pharmacy']} /></Section>
          <Section title="Revenue by bill type"><PieC data={revType} /></Section>
          <Section title="Revenue by department" className="lg:col-span-3" actions={<ExportBar name="Revenue by department" cols={kv('Department', 'Revenue')} rows={revDept} />}><BarC data={revDept} /></Section>
        </div><p className="text-xs muted">Detailed collection, ageing, payment-mode, discount, refund and cash-drawer reports are under Billing › Financial reports.</p></div>}
      {tab === 'clin' && <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Top diagnoses (ICD-10)" actions={<ExportBar name="Top diagnoses" cols={kv('Diagnosis', 'Cases')} rows={dx} />}>{dx.length ? <BarC data={dx.map(d => ({ ...d, name: d.name.slice(0, 16) }))} horizontal /> : <Empty text="Diagnoses appear here once consultations are saved" />}</Section>
        <Section title="Patient age distribution"><PieC data={ages} /></Section>
        <Section title="Laboratory test mix" actions={<ExportBar name="Lab test mix" cols={kv('Test', 'Orders')} rows={labMix} />}><BarC data={labMix.map(d => ({ ...d, name: d.name.split(' ').slice(0, 2).join(' ') }))} /></Section>
        <Section title="Consultations by doctor"><BarC data={groupSum(consultations, (c: any) => String(c.doctor || (doctors.find((d: any) => d.id === c.doctorId) as any)?.name || '—').replace('Dr. ', ''))} horizontal /></Section>
        <Section title="Medicine stock by category" className="lg:col-span-2"><BarC data={groupSum(medicines, (m: any) => m.category, (m: any) => sum(m.batches, (b: any) => b.qty))} /></Section>
      </div>}
      {tab === 'build' && <div className="grid gap-4 lg:grid-cols-4">
        <div className="space-y-4">
          <Section title="1 · Data source"><Select aria-label="Data source" value={src} onChange={e => { setSrc(e.target.value); setCols(SOURCES[e.target.value].fields.slice(0, 4)); setGroup(''); setFField('') }} options={Object.entries(SOURCES).map(([k, v]) => ({ value: k, label: v.label }))} /></Section>
          <Section title="2 · Available fields" desc="Drag into the report, or click +"><ul className="space-y-1">{SOURCES[src].fields.filter(f => !cols.includes(f)).map(f => <li key={f} draggable onDragStart={e => e.dataTransfer.setData('text/plain', f)} className="flex cursor-grab items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 text-sm active:cursor-grabbing dark:bg-slate-900"><GripVertical className="h-4 w-4 text-slate-400" /><span className="flex-1">{nice(f)}</span><Button size="icon" variant="ghost" aria-label={`Add ${f}`} onClick={() => setCols([...cols, f])}><Plus /></Button></li>)}{SOURCES[src].fields.every(f => cols.includes(f)) && <li className="text-xs muted">All fields are in the report</li>}</ul></Section>
          <Section title="3 · Filter & group"><div className="space-y-2"><Field label="Filter field"><Select value={fField} onChange={e => setFField(e.target.value)} placeholder="None" options={SOURCES[src].fields.map(f => ({ value: f, label: nice(f) }))} /></Field>{fField && <Field label="Contains"><Input value={fVal} onChange={e => setFVal(e.target.value)} /></Field>}<Field label="Group by (summary)"><Select value={group} onChange={e => setGroup(e.target.value)} placeholder="None" options={SOURCES[src].fields.map(f => ({ value: f, label: nice(f) }))} /></Field></div></Section>
          {saved.length > 0 && <Section title="Saved reports"><ul className="space-y-1">{saved.map((s: any) => <li key={s.id} className="flex items-center gap-1 text-sm"><button className="flex-1 truncate text-left text-primary hover:underline dark:text-blue-400" onClick={() => load(s)}>{s.name}</button><Button size="icon" variant="ghost" aria-label="Delete saved report" onClick={() => remove('savedReports', s.id)}><Trash2 /></Button></li>)}</ul></Section>}
        </div>
        <Section className="lg:col-span-3" pad={false} title={<input aria-label="Report name" value={name} onChange={e => setName(e.target.value)} className="w-64 rounded bg-transparent font-semibold outline-none focus:ring-2 focus:ring-primary" />} actions={<div className="flex flex-wrap gap-1.5"><Button size="sm" variant="outline" onClick={() => { add('savedReports', { id: uid('RPT'), name, src, cols, group, fField, fVal }); toast.success('Report definition saved') }}><Save />Save</Button><ExportBar name={name} cols={xcols} rows={rows} /></div>}>
          <div onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={e => drop(e)} className={cn('flex min-h-[52px] flex-wrap items-center gap-1.5 border-b p-3 transition', over && 'bg-blue-50 ring-2 ring-inset ring-primary dark:bg-blue-500/10')} aria-label="Report columns drop zone">
            {cols.map((c, i) => <span key={c} draggable onDragStart={e => e.dataTransfer.setData('text/plain', c)} onDragOver={e => e.preventDefault()} onDrop={e => drop(e, i)} className="inline-flex cursor-grab items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-white"><GripVertical className="h-3 w-3 opacity-70" />{nice(c)}<button aria-label={`Remove ${c}`} onClick={() => setCols(cols.filter(x => x !== c))}><X className="h-3 w-3" /></button></span>)}
            {!cols.length && <span className="text-sm muted">Drop fields here to build your report</span>}
          </div>
          {group && <div className="border-b p-3"><h4 className="mb-1 text-xs font-semibold uppercase muted">Summary by {nice(group)}</h4><BarC data={grouped.slice(0, 12)} height={180} /></div>}
          <div className="max-h-[520px] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase muted dark:bg-slate-800"><tr>{cols.map(c => <th key={c} className="whitespace-nowrap px-3 py-2">{nice(c)}</th>)}</tr></thead><tbody className="divide-y">{rows.slice(0, 100).map((r, i) => <tr key={r.id || i}>{cols.map(c => <td key={c} className="whitespace-nowrap px-3 py-1.5">{typeof r[c] === 'object' && r[c] ? JSON.stringify(r[c]).slice(0, 40) : String(r[c] ?? '—')}</td>)}</tr>)}</tbody></table></div>
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs muted"><span>{rows.length} rows{rows.length > 100 && ' · preview shows first 100, export includes all'}</span><Badge tone="blue">{SOURCES[src].label}</Badge></div>
        </Section>
      </div>}
      {tab === 'sched' && <Section pad={false} title={<span className="flex items-center gap-2"><Mail className="h-4 w-4" />Scheduled email reports</span>} desc="Schedules are stored here; delivery needs the backend mail job (see README)"><Resource coll="scheduledReports" name="Schedule" prefix="SR" cols={[{ key: 'report', label: 'Report', type: 'select', options: ['Daily Collection Report', 'Bed Occupancy MIS', 'Monthly P&L', 'Outstanding Ageing', 'Pharmacy Sales', 'Lab TAT Report', ...saved.map((s: any) => s.name)] }, { key: 'frequency', label: 'Frequency', type: 'select', options: ['Daily', 'Weekly', 'Monthly'] }, { key: 'time', label: 'Time', type: 'time', def: '08:00' }, { key: 'recipients', label: 'Recipients (emails)', required: true }, { key: 'format', label: 'Format', type: 'select', options: ['PDF', 'Excel', 'CSV'] }, { key: 'status', label: 'Status', type: 'status', options: ['Active', 'Paused'] }]} /></Section>}
    </>
  )
}
