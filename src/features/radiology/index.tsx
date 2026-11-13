import { useState } from 'react'
import { Contrast, FlipHorizontal, ImageUp, Printer, RotateCw, ScanLine, Sun, ZoomIn } from 'lucide-react'
import { printPreview, toast, useAuth, useColl, useDB } from '@/app/store'
import { Resource } from '@/components/common'
import { Letterhead, Sign } from '@/components/common/overlays'
import { Badge, Button, Empty, Field, Modal, PageHeader, Section, Select, Stat, Status, Tabs, Textarea } from '@/components/ui'
import { cn, fDate, today } from '@/utils'
import { IMAGING } from '@/utils/constants'

const EQUIP = ['X-Ray Room 1', 'CT Scanner', 'MRI 1.5T', 'USG Room 2', 'ECG Room']
const SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']

/** Lightweight DICOM-style viewer (window/level, zoom, invert, rotate). Plug a real DICOM toolkit such as Cornerstone in here for production PACS. */
export function Viewer({ order }: { order: any }) {
  const [b, setB] = useState(100), [c, setC] = useState(110), [z, setZ] = useState(1), [inv, setInv] = useState(false), [rot, setRot] = useState(0), [flip, setFlip] = useState(false)
  const style = { filter: `brightness(${b}%) contrast(${c}%) ${inv ? 'invert(1)' : ''}`, transform: `scale(${z}) rotate(${rot}deg) scaleX(${flip ? -1 : 1})`, transition: 'transform .2s' }
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="relative flex aspect-square max-h-[60vh] items-center justify-center overflow-hidden rounded-xl bg-black">
        {order.image ? <img src={order.image} alt={order.study} style={style} className="max-h-full max-w-full" /> : (
          <svg viewBox="0 0 400 400" style={style} className="h-full w-full" role="img" aria-label={`${order.study} (simulated image)`}>
            <defs><radialGradient id="lung" cx="50%" cy="45%" r="60%"><stop offset="0%" stopColor="#1a1a1a" /><stop offset="100%" stopColor="#3a3a3a" /></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="3" /></filter></defs>
            <rect width="400" height="400" fill="#0a0a0a" /><ellipse cx="200" cy="215" rx="165" ry="175" fill="#555" filter="url(#blur)" />
            <ellipse cx="135" cy="205" rx="62" ry="112" fill="url(#lung)" filter="url(#blur)" /><ellipse cx="265" cy="205" rx="62" ry="112" fill="url(#lung)" filter="url(#blur)" />
            <rect x="188" y="50" width="24" height="310" rx="8" fill="#9a9a9a" filter="url(#blur)" /><ellipse cx="222" cy="250" rx="52" ry="62" fill="#8a8a8a" filter="url(#blur)" />
            {Array.from({ length: 9 }, (_, i) => <g key={i} stroke="#b5b5b5" strokeWidth="5" fill="none" opacity=".55" filter="url(#blur)"><path d={`M196 ${88 + i * 26} Q120 ${78 + i * 26} 72 ${118 + i * 27}`} /><path d={`M204 ${88 + i * 26} Q280 ${78 + i * 26} 328 ${118 + i * 27}`} /></g>)}
            <path d="M80 70 Q140 50 196 68 M204 68 Q260 50 320 70" stroke="#c5c5c5" strokeWidth="8" fill="none" filter="url(#blur)" />
          </svg>)}
        <div className="pointer-events-none absolute left-2 top-2 font-mono text-[10px] leading-tight text-emerald-400">{order.patientName}<br />{order.patientId}<br />{order.study}</div>
        <div className="pointer-events-none absolute bottom-2 right-2 text-right font-mono text-[10px] leading-tight text-emerald-400">W:{c} L:{b}<br />Zoom {z.toFixed(1)}×<br />{fDate(order.date)}</div>
      </div>
      <div className="space-y-3 text-xs">
        <label className="block"><span className="flex items-center gap-1 font-medium"><Sun className="h-3.5 w-3.5" />Level (brightness) {b}%</span><input type="range" min={40} max={200} value={b} onChange={e => setB(+e.target.value)} className="w-full accent-blue-700" /></label>
        <label className="block"><span className="flex items-center gap-1 font-medium"><Contrast className="h-3.5 w-3.5" />Window (contrast) {c}%</span><input type="range" min={40} max={250} value={c} onChange={e => setC(+e.target.value)} className="w-full accent-blue-700" /></label>
        <label className="block"><span className="flex items-center gap-1 font-medium"><ZoomIn className="h-3.5 w-3.5" />Zoom {z.toFixed(1)}×</span><input type="range" min={1} max={3} step={0.1} value={z} onChange={e => setZ(+e.target.value)} className="w-full accent-blue-700" /></label>
        <div className="grid grid-cols-2 gap-1.5"><Button size="sm" variant={inv ? 'primary' : 'outline'} onClick={() => setInv(!inv)}>Invert</Button><Button size="sm" variant="outline" onClick={() => setRot(r => r + 90)}><RotateCw />Rotate</Button><Button size="sm" variant={flip ? 'primary' : 'outline'} onClick={() => setFlip(!flip)}><FlipHorizontal />Flip</Button><Button size="sm" variant="outline" onClick={() => { setB(100); setC(110); setZ(1); setInv(false); setRot(0); setFlip(false) }}>Reset</Button></div>
        {!order.image && <p className="rounded-lg bg-amber-50 p-2 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">Simulated image. Upload the study image from the report screen, or connect PACS in Settings › Integrations.</p>}
      </div>
    </div>
  )
}

export default function Radiology() {
  const user = useAuth(s => s.user)!, { update } = useDB(), orders = useColl('radOrders'), tpls = useColl('radTemplates')
  const [tab, setTab] = useState('orders'), [rep, setRep] = useState<any | null>(null), [view, setView] = useState<any | null>(null)
  const ReportDoc = ({ o }: { o: any }) => <Letterhead title="Radiology Report" meta={[['Patient', `${o.patientName} (${o.patientId})`], ['Study', o.study], ['Referred by', o.doctor], ['Date', fDate(o.date)]]}><p><b>Findings:</b></p><p style={{ whiteSpace: 'pre-wrap' }}>{o.findings || '—'}</p><p style={{ marginTop: 8 }}><b>Impression:</b></p><p style={{ whiteSpace: 'pre-wrap' }}>{o.impression || '—'}</p>{o.image && <img src={o.image} alt="" style={{ maxHeight: 220, marginTop: 10 }} />}<Sign label="Consultant Radiologist" name={o.reportedBy} /></Letterhead>
  const upload = (f?: File) => { if (!f) return; if (f.size > 1.5e6) return toast.error('Image too large (max 1.5 MB in demo)'); const r = new FileReader(); r.onload = () => { setRep((x: any) => ({ ...x, image: r.result })); toast.success('Image linked to study') }; r.readAsDataURL(f) }
  return (
    <>
      <PageHeader title="Radiology & Imaging" desc="X-Ray · CT · MRI · Ultrasound · ECG" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat icon={ScanLine} label="New orders" value={orders.filter((o: any) => o.status === 'Ordered').length} /><Stat label="Scheduled" icon={ScanLine} tone="amber" value={orders.filter((o: any) => o.status === 'Scheduled').length} /><Stat label="In progress" icon={ScanLine} tone="purple" value={orders.filter((o: any) => o.status === 'In-Progress').length} /><Stat label="Reported" icon={ScanLine} tone="green" value={orders.filter((o: any) => o.status === 'Reported').length} /></div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'orders', label: 'Imaging orders' }, { id: 'schedule', label: 'Equipment schedule' }, { id: 'tpl', label: 'Report templates' }]} />
      {tab === 'orders' && <Section pad={false}><Resource coll="radOrders" name="Imaging order" prefix="RAD" cols={[{ key: 'patientName', label: 'Patient', type: 'select', options: 'patients', required: true }, { key: 'study', label: 'Study', type: 'select', options: IMAGING }, { key: 'doctor', label: 'Referred by', type: 'select', options: 'doctors' }, { key: 'priority', label: 'Priority', type: 'status', options: ['Routine', 'Urgent', 'STAT'] }, { key: 'date', label: 'Date', type: 'date' }, { key: 'time', label: 'Time', type: 'time' }, { key: 'equipment', label: 'Equipment', type: 'select', options: EQUIP }, { key: 'status', label: 'Status', type: 'status', options: ['Ordered', 'Scheduled', 'In-Progress', 'Reported'] }]}
        actions={(o: any) => <>{o.status === 'Ordered' && <Button size="xs" onClick={() => { update('radOrders', o.id, { status: 'Scheduled', time: o.time || '10:00', equipment: o.equipment || EQUIP[0] }); toast.success('Study scheduled') }}>Schedule</Button>}{o.status === 'Scheduled' && <Button size="xs" onClick={() => update('radOrders', o.id, { status: 'In-Progress' })}>Start scan</Button>}<Button size="xs" variant="outline" onClick={() => setView(o)}>Viewer</Button><Button size="xs" variant={o.status === 'Reported' ? 'outline' : 'success'} onClick={() => setRep({ ...o })}>Report</Button></>} /></Section>}
      {tab === 'schedule' && <Section title={`Equipment schedule — ${fDate(today())}`} pad={false}><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-xs"><thead><tr className="bg-slate-50 dark:bg-slate-800/50"><th className="px-3 py-2 text-left">Equipment</th>{SLOTS.map(s => <th key={s} className="px-2 py-2 font-mono">{s}</th>)}</tr></thead>
        <tbody className="divide-y">{EQUIP.map(eq => <tr key={eq}><td className="whitespace-nowrap px-3 py-2 font-semibold">{eq}</td>{SLOTS.map(s => { const o: any = orders.find((x: any) => x.equipment === eq && x.time === s && x.date === today() && x.status !== 'Ordered'); return <td key={s} className="p-1">{o ? <button onClick={() => setRep({ ...o })} className={cn('w-full rounded-md px-1.5 py-1.5 text-left text-white', o.status === 'Reported' ? 'bg-emerald-600' : o.status === 'In-Progress' ? 'bg-violet-600' : 'bg-primary')}><span className="block truncate font-semibold">{o.patientName}</span><span className="block truncate opacity-80">{o.study}</span></button> : <div className="rounded-md border border-dashed py-3 text-center muted">Free</div>}</td> })}</tr>)}</tbody></table></div></Section>}
      {tab === 'tpl' && <Section pad={false} title="Report template builder" desc="Reusable findings / impression text for common studies"><Resource coll="radTemplates" name="Template" prefix="RTP" cols={[{ key: 'name', label: 'Template name', required: true }, { key: 'modality', label: 'Modality', type: 'select', options: ['X-Ray', 'CT', 'MRI', 'Ultrasound', 'ECG'] }, { key: 'findings', label: 'Findings', type: 'textarea' }, { key: 'impression', label: 'Impression', type: 'textarea' }]} /></Section>}

      <Modal open={!!rep} onClose={() => setRep(null)} size="xl" title={<span>Radiologist report <span className="text-xs font-normal muted">· {rep?.id} · {rep?.patientName} · {rep?.study}</span></span>}
        footer={<><label className="mr-auto inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"><ImageUp className="h-4 w-4" />Upload image<input type="file" accept="image/*" hidden onChange={e => upload(e.target.files?.[0])} /></label><Button variant="outline" onClick={() => printPreview(`Radiology report ${rep.id}`, <ReportDoc o={rep} />)}><Printer />Print</Button><Button onClick={() => { if (!rep.findings.trim()) return toast.error('Enter findings'); const { id, ...r } = rep; update('radOrders', id, { ...r, status: 'Reported', reportedBy: user.name }); toast.success('Report finalised'); setRep(null) }}>Finalise report</Button></>}>
        {rep && <div className="grid gap-4 lg:grid-cols-2"><Viewer order={rep} />
          <div className="space-y-3"><Field label="Apply template"><Select value="" onChange={e => { const t: any = tpls.find((x: any) => x.id === e.target.value); if (t) setRep({ ...rep, findings: t.findings, impression: t.impression }) }} placeholder="Choose a template…" options={tpls.map((t: any) => ({ value: t.id, label: `${t.modality} · ${t.name}` }))} /></Field>
            <Field label="Findings" required><Textarea rows={8} value={rep.findings} onChange={e => setRep({ ...rep, findings: e.target.value })} /></Field><Field label="Impression"><Textarea rows={3} value={rep.impression} onChange={e => setRep({ ...rep, impression: e.target.value })} /></Field><Status v={rep.status} /></div></div>}
      </Modal>
      <Modal open={!!view} onClose={() => setView(null)} size="xl" title={`Image viewer — ${view?.study}`}>{view && <Viewer order={view} />}</Modal>
    </>
  )
}
