import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format, subDays } from 'date-fns'
import { Activity, AlertTriangle, BedDouble, CalendarDays, ClipboardList, CreditCard, FlaskConical, HeartPulse, LogOut, Package, Pill, Plus, Receipt, Siren, Stethoscope, Syringe, Ticket, UserCheck, UserPlus, Users, Wallet } from 'lucide-react'
import { toast, useAuth, useColl, useDB } from '@/app/store'
import { AreaC, BarC, PieC } from '@/components/charts'
import { Badge, Button, DataTable, Empty, Field, Input, PageHeader, Section, Select, Stat, Status } from '@/components/ui'
import { ageOf, cn, daysTo, fDT, fTime, groupSum, money, sum, today } from '@/utils'
import { DEPARTMENTS } from '@/utils/constants'

const isToday = (d?: string) => !!d && format(new Date(d), 'yyyy-MM-dd') === today()
const stockOf = (m: any) => sum(m.batches, (b: any) => b.qty)

function useRevenue() {
  const bills = useColl('bills')
  return useMemo(() => {
    const live = bills.filter((b: any) => b.status !== 'Cancelled')
    const byDay = (n: number) => { const d = format(subDays(new Date(), n), 'yyyy-MM-dd'); return sum(live.filter((b: any) => b.date === d), (b: any) => b.paid) }
    const month = sum(live, (b: any) => b.paid)
    const wave = (i: number) => 0.82 + 0.28 * Math.abs(Math.sin(i * 1.7))
    return {
      today: byDay(0),
      Daily: Array.from({ length: 14 }, (_, i) => ({ name: format(subDays(new Date(), 13 - i), 'dd MMM'), value: byDay(13 - i) })),
      Weekly: Array.from({ length: 8 }, (_, i) => ({ name: `W${i + 1}`, value: i >= 4 ? sum(Array.from({ length: 7 }, (_, d) => byDay((7 - i) * 7 + d)), x => x) : Math.round((month / 4.3) * wave(i)) })),
      Monthly: Array.from({ length: 12 }, (_, i) => ({ name: format(new Date(new Date().getFullYear(), new Date().getMonth() - 11 + i, 1), 'MMM'), value: i === 11 ? month : Math.round(month * wave(i)) })),
      Yearly: Array.from({ length: 5 }, (_, i) => ({ name: String(new Date().getFullYear() - 4 + i), value: Math.round(month * 12 * (0.6 + i * 0.1)) })),
    } as any
  }, [bills])
}

function AdminDash() {
  const nav = useNavigate(), rev = useRevenue(), [period, setPeriod] = useState('Daily')
  const [tokens, appts, adm, er, beds, bills, meds, items, att, audit] = ['tokens', 'appointments', 'admissions', 'emergency', 'beds', 'bills', 'medicines', 'items', 'attendance', 'audit'].map(useColl)
  const opd = tokens.filter((t: any) => isToday(t.createdAt)).length + appts.filter((a: any) => isToday(a.start) && a.status !== 'Cancelled').length
  const ipd = adm.filter((a: any) => a.status === 'Admitted').length, occ = beds.filter((b: any) => b.status === 'Occupied').length
  const pending = bills.filter((b: any) => b.status === 'Unpaid' || b.status === 'Partial')
  const low = [...meds.filter((m: any) => stockOf(m) < m.reorder).map((m: any) => ({ name: m.name, stock: stockOf(m), reorder: m.reorder, src: 'Pharmacy' })), ...items.filter((i: any) => i.stock < i.reorder).map((i: any) => ({ name: i.name, stock: i.stock, reorder: i.reorder, src: 'Inventory' }))]
  const load = useMemo(() => DEPARTMENTS.map(d => ({ name: d.split(' ')[0].slice(0, 8), OPD: appts.filter((a: any) => a.dept === d && isToday(a.start)).length + tokens.filter((t: any) => t.dept === d).length, IPD: adm.filter((a: any) => a.dept === d && a.status === 'Admitted').length })), [appts, tokens, adm])
  const attSum = groupSum(att, (a: any) => a.status)
  return (
    <>
      <PageHeader title="Hospital Overview" desc={format(new Date(), 'EEEE, dd MMMM yyyy')} actions={<>
        <Button onClick={() => nav('/patients/new')}><UserPlus />New Patient</Button><Button variant="outline" onClick={() => nav('/billing/pos')}><Receipt />New Bill</Button><Button variant="danger" onClick={() => nav('/emergency')}><Siren />Emergency Admit</Button></>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <Stat icon={Users} label="OPD patients today" value={opd} sub="Tokens + appointments" onClick={() => nav('/opd/queue')} />
        <Stat icon={BedDouble} label="IPD (admitted)" value={ipd} tone="purple" sub={`${beds.filter((b: any) => b.status === 'Available').length} beds free`} onClick={() => nav('/ipd/beds')} />
        <Stat icon={Siren} label="Emergency today" value={er.length} tone="red" sub={`${er.filter((e: any) => e.triage === 'Red').length} critical`} onClick={() => nav('/emergency')} />
        <Stat icon={Wallet} label="Revenue today" value={money(rev.today)} tone="green" onClick={() => nav('/billing/reports')} />
        <Stat icon={CreditCard} label="Pending bills" value={pending.length} tone="amber" sub={money(sum(pending, (b: any) => b.total - b.paid))} onClick={() => nav('/billing/bills')} />
        <Stat icon={UserCheck} label="Staff present" value={`${att.filter((a: any) => a.status === 'Present' || a.status === 'Late').length}/${att.length}`} tone="slate" onClick={() => nav('/hr')} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section className="lg:col-span-2" title="Revenue summary" desc={`Total: ${money(sum(rev[period], (r: any) => r.value))}`} actions={<div className="flex rounded-lg border p-0.5">{['Daily', 'Weekly', 'Monthly', 'Yearly'].map(p => <button key={p} onClick={() => setPeriod(p)} aria-pressed={period === p} className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition', period === p ? 'bg-primary text-white' : 'muted hover:text-slate-900 dark:hover:text-white')}>{p}</button>)}</div>}>
          <AreaC data={rev[period]} />
        </Section>
        <Section title="Bed occupancy" desc={`${occ} of ${beds.length} beds occupied`}>
          <PieC data={groupSum(beds, (b: any) => b.status)} colors={groupSum(beds, (b: any) => b.status).map(g => ({ Available: '#10b981', Occupied: '#ef4444', Reserved: '#f59e0b', Maintenance: '#94a3b8', Cleaning: '#3b82f6' } as any)[g.name])} center={<><div className="text-2xl font-bold">{Math.round((occ / beds.length) * 100)}%</div><div className="text-[11px] muted">occupancy</div></>} />
        </Section>
        <Section className="lg:col-span-2" title="Department-wise patient load"><BarC data={load} keys={['OPD', 'IPD']} stacked /></Section>
        <Section title="Staff attendance today">
          <PieC data={attSum} height={200} colors={attSum.map(a => ({ Present: '#10b981', Late: '#f59e0b', Absent: '#ef4444', 'On Leave': '#64748b' } as any)[a.name])} />
        </Section>
        <Section title={<span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Low stock alerts</span>} actions={<Badge tone="amber">{low.length}</Badge>} pad={false}>
          <ul className="max-h-72 divide-y overflow-auto">{low.map(l => <li key={l.src + l.name} className="flex items-center justify-between gap-2 px-4 py-2 text-sm"><span className="min-w-0"><span className="block truncate font-medium">{l.name}</span><span className="text-xs muted">{l.src} · reorder at {l.reorder}</span></span><Badge tone={l.stock < l.reorder / 2 ? 'red' : 'amber'}>{l.stock} left</Badge></li>)}{!low.length && <Empty text="All stock levels healthy" />}</ul>
        </Section>
        <Section className="lg:col-span-2" title={<span className="flex items-center gap-2"><Activity className="h-4 w-4" />Recent activity</span>} pad={false}>
          <ul className="max-h-72 divide-y overflow-auto">{audit.slice(0, 12).map((a: any) => <li key={a.id} className="flex items-center gap-3 px-4 py-2 text-sm"><Status v={a.action === 'Create' ? 'New' : a.action === 'Delete' ? 'Cancelled' : 'Pending'} /><span className="min-w-0 flex-1 truncate"><b>{a.user}</b> {a.action.toLowerCase()}d <span className="font-mono text-xs">{a.ref}</span> in <i>{a.module}</i></span><span className="shrink-0 text-xs muted">{fDT(a.at)}</span></li>)}</ul>
        </Section>
      </div>
    </>
  )
}

function DoctorDash() {
  const user = useAuth(s => s.user)!, nav = useNavigate(), doctors = useColl('doctors')
  const doc: any = doctors.find((d: any) => d.id === user.doctorId) || doctors[0]
  const [appts, tokens, adm, labs, rx, cons] = ['appointments', 'tokens', 'admissions', 'labOrders', 'prescriptions', 'consultations'].map(useColl)
  const mine = appts.filter((a: any) => a.doctorId === doc.id && isToday(a.start)).sort((a: any, b: any) => a.start.localeCompare(b.start))
  const queue = tokens.filter((t: any) => t.doctorId === doc.id && ['Waiting', 'Called', 'In-Consultation'].includes(t.status))
  const ipd = adm.filter((a: any) => a.doctorId === doc.id && a.status === 'Admitted'), pl = labs.filter((l: any) => l.doctorId === doc.id && l.status !== 'Approved'), prx = rx.filter((r: any) => r.doctor === doc.name && r.status === 'Pending')
  const hist = cons.filter((c: any) => c.doctorId === doc.id)
  return (
    <>
      <PageHeader title={`Good day, ${doc.name}`} desc={`${doc.specialization} · ${doc.dept}`} actions={<Button onClick={() => nav('/opd/consultation')}><Stethoscope />Start consultation</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat icon={CalendarDays} label="Appointments today" value={mine.length} /><Stat icon={Ticket} label="Patients in queue" value={queue.length} tone="amber" /><Stat icon={BedDouble} label="My admitted patients" value={ipd.length} tone="purple" />
        <Stat icon={FlaskConical} label="Pending lab reports" value={pl.length} tone="red" /><Stat icon={Pill} label="Pending prescriptions" value={prx.length} tone="green" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Patient queue (OPD)" pad={false} actions={<Link to="/opd/queue" className="text-xs font-medium text-primary dark:text-blue-400">Open queue</Link>}>
          <ul className="divide-y">{queue.map((t: any) => <li key={t.id} className="flex items-center gap-3 px-4 py-2.5"><span className="rounded-lg bg-primary px-2 py-1 font-mono text-xs font-bold text-white">{t.no}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{t.patientName}</span><span className="text-xs muted">Waiting since {fTime(t.createdAt)}</span></span>{t.priority !== 'Normal' && <Status v={t.priority} />}<Status v={t.status} /><Button size="sm" variant="outline" onClick={() => nav(`/opd/consultation?patient=${t.patientId}&token=${t.id}`)}>Consult</Button></li>)}{!queue.length && <Empty text="No patients waiting" />}</ul>
        </Section>
        <Section title="My appointments today" pad={false}>
          <ul className="max-h-80 divide-y overflow-auto">{mine.map((a: any) => <li key={a.id} className="flex items-center gap-3 px-4 py-2.5"><span className="w-16 text-xs font-semibold">{fTime(a.start)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{a.patientName}</span><span className="text-xs muted">{a.reason} · {a.type}</span></span><Status v={a.status} /></li>)}{!mine.length && <Empty text="No appointments scheduled today" />}</ul>
        </Section>
        <Section title="My admitted patients (IPD)" pad={false}>
          <DataTable rows={ipd} searchable={false} pageSize={6} cols={[{ key: 'patientName', label: 'Patient' }, { key: 'bedId', label: 'Bed' }, { key: 'diagnosis', label: 'Diagnosis' }, { key: 'admitDate', label: 'Day', render: (r: any) => `Day ${-daysTo(r.admitDate) + 1}` }]} actions={(r: any) => <Button size="xs" variant="outline" onClick={() => nav(`/ipd/care?patient=${r.patientId}`)}>Care sheet</Button>} />
        </Section>
        <Section title="Pending lab reports" pad={false}>
          <DataTable rows={pl} searchable={false} pageSize={6} cols={[{ key: 'patientName', label: 'Patient' }, { key: 'test', label: 'Test' }, { key: 'priority', label: 'Priority', render: (r: any) => <Status v={r.priority} /> }, { key: 'status', label: 'Status', render: (r: any) => <Status v={r.status} /> }]} />
        </Section>
        <Section title="Pending prescriptions" desc="Written but not yet dispensed by pharmacy" pad={false}>
          <ul className="divide-y">{prx.map((r: any) => <li key={r.id} className="px-4 py-2.5 text-sm"><div className="flex justify-between"><b>{r.patientName}</b><span className="font-mono text-xs muted">{r.id}</span></div><div className="text-xs muted">{r.items.map((i: any) => i.drug).join(', ')}</div></li>)}{!prx.length && <Empty text="No pending prescriptions" />}</ul>
        </Section>
        <Section title="Consultation history" pad={false}>
          <ul className="divide-y">{hist.slice(0, 8).map((c: any) => <li key={c.id} className="px-4 py-2.5 text-sm"><div className="flex justify-between"><Link to={`/patients/${c.patientId}`} className="font-semibold text-primary dark:text-blue-400">{c.patientName}</Link><span className="text-xs muted">{fDT(c.date)}</span></div><div className="text-xs muted">{c.diagnosis?.join('; ') || c.complaints}</div></li>)}{!hist.length && <Empty text="Consultations you complete will appear here" />}</ul>
        </Section>
      </div>
    </>
  )
}

function NurseDash() {
  const nav = useNavigate(), { update } = useDB(), user = useAuth(s => s.user)!
  const [adm, mar, vitals] = ['admissions', 'mar', 'vitals'].map(useColl)
  const active = adm.filter((a: any) => a.status === 'Admitted'), wards = [...new Set(active.map((a: any) => a.ward))] as string[]
  const [ward, setWard] = useState('All')
  const list = active.filter((a: any) => ward === 'All' || a.ward === ward)
  const due = mar.filter((m: any) => m.date === today() && (ward === 'All' || m.ward === ward)).sort((a: any, b: any) => a.time.localeCompare(b.time))
  const vitPending = list.filter((a: any) => !vitals.some((v: any) => v.patientId === a.patientId && Date.now() - new Date(v.at).getTime() < 6 * 36e5))
  const dis = active.filter((a: any) => a.dischargeReady)
  return (
    <>
      <PageHeader title="Nursing Station" desc="Ward overview, medication rounds and pending tasks" actions={<Select aria-label="Ward" className="w-48" value={ward} onChange={e => setWard(e.target.value)} options={['All', ...wards]} />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={BedDouble} label="Patients in ward" value={list.length} /><Stat icon={Syringe} label="Medications due" value={due.filter((m: any) => m.status === 'Pending').length} tone="amber" />
        <Stat icon={HeartPulse} label="Vitals entry pending" value={vitPending.length} tone="red" /><Stat icon={LogOut} label="Discharge pending" value={dis.length} tone="green" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Ward-wise patient list" pad={false}>
          <DataTable rows={list} pageSize={8} cols={[{ key: 'bedId', label: 'Bed', className: 'font-mono text-xs' }, { key: 'patientName', label: 'Patient' }, { key: 'ward', label: 'Ward' }, { key: 'doctor', label: 'Doctor' }, { key: 'diagnosis', label: 'Diagnosis' }]} actions={(r: any) => <Button size="xs" variant="outline" onClick={() => nav(`/ipd/care?patient=${r.patientId}`)}>Open</Button>} />
        </Section>
        <Section title="Medication schedule (today)" pad={false}>
          <ul className="max-h-[26rem] divide-y overflow-auto">{due.slice(0, 40).map((m: any) => <li key={m.id} className="flex items-center gap-3 px-4 py-2 text-sm"><span className="w-12 font-mono text-xs font-semibold">{m.time}</span><span className="min-w-0 flex-1"><span className="block truncate font-medium">{m.drug} <span className="muted">· {m.route}</span></span><span className="text-xs muted">{m.patientName} · {m.bedId}</span></span>
            {m.status === 'Pending' ? <Button size="xs" variant="success" onClick={() => { update('mar', m.id, { status: 'Given', by: user.name }); toast.success('Marked as given') }}>Give</Button> : <Status v={m.status} />}</li>)}</ul>
        </Section>
        <Section title="Vitals entry pending" desc="No vitals recorded in the last 6 hours" pad={false}>
          <ul className="max-h-72 divide-y overflow-auto">{vitPending.map((a: any) => <li key={a.id} className="flex items-center justify-between px-4 py-2 text-sm"><span><b>{a.patientName}</b> <span className="muted">· {a.bedId}</span></span><Button size="xs" variant="outline" onClick={() => nav(`/ipd/care?patient=${a.patientId}&tab=vitals`)}><Plus />Record</Button></li>)}{!vitPending.length && <Empty text="All vitals up to date" />}</ul>
        </Section>
        <Section title="Discharge pending list" pad={false}>
          <ul className="divide-y">{dis.map((a: any) => <li key={a.id} className="flex items-center justify-between px-4 py-2 text-sm"><span><b>{a.patientName}</b> <span className="muted">· {a.bedId} · {a.doctor}</span></span><Button size="xs" variant="outline" onClick={() => nav(`/ipd/discharge?patient=${a.patientId}`)}>Process</Button></li>)}{!dis.length && <Empty text="No discharges pending" />}</ul>
        </Section>
      </div>
    </>
  )
}

function ReceptionDash() {
  const nav = useNavigate(), { add, nextNo } = useDB()
  const [appts, tokens, doctors] = ['appointments', 'tokens', 'doctors'].map(useColl)
  const [f, setF] = useState({ name: '', phone: '', gender: 'Male', age: '', department: 'General Medicine' })
  const todayAppts = appts.filter((a: any) => isToday(a.start)).sort((a: any, b: any) => a.start.localeCompare(b.start))
  const mix = [{ name: 'Walk-in', value: todayAppts.filter((a: any) => a.type === 'Walk-in').length + tokens.length }, { name: 'Appointment', value: todayAppts.filter((a: any) => a.type === 'Appointment').length }, { name: 'Online', value: todayAppts.filter((a: any) => a.type === 'Online').length }]
  const waiting = tokens.filter((t: any) => t.status === 'Waiting')
  const quick = (e: React.FormEvent) => {
    e.preventDefault()
    if (f.name.trim().length < 2 || f.phone.replace(/\D/g, '').length < 7) return toast.error('Enter patient name and a valid phone number')
    const id = nextNo('patient')
    add('patients', { id, name: f.name.trim(), phone: f.phone, gender: f.gender, dob: `${new Date().getFullYear() - (Number(f.age) || 30)}-01-01`, blood: 'O+', allergies: '', chronic: '', category: 'General', referral: 'Self', department: f.department, status: 'Active', regDate: today() })
    toast.success(`Registered ${f.name} (${id})`); setF({ ...f, name: '', phone: '', age: '' }); nav(`/patients/${id}`)
  }
  return (
    <>
      <PageHeader title="Front Desk" desc="Registration, appointments and queue at a glance" actions={<><Button onClick={() => nav('/patients/new')}><UserPlus />Full registration</Button><Button variant="outline" onClick={() => nav('/opd/queue')}><Ticket />Issue token</Button></>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={CalendarDays} label="Appointments today" value={todayAppts.length} /><Stat icon={Ticket} label="Tokens issued" value={tokens.length} tone="purple" /><Stat icon={Users} label="Currently waiting" value={waiting.length} tone="amber" />
        <Stat icon={UserCheck} label="Checked-in" value={todayAppts.filter((a: any) => a.status === 'Checked-in').length} tone="green" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Quick registration">
          <form onSubmit={quick} className="grid grid-cols-2 gap-3">
            <Field label="Patient name" required className="col-span-2"><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Phone" required className="col-span-2"><Input inputMode="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="Gender"><Select value={f.gender} onChange={e => setF({ ...f, gender: e.target.value })} options={['Male', 'Female', 'Other']} /></Field>
            <Field label="Age"><Input type="number" min={0} max={120} value={f.age} onChange={e => setF({ ...f, age: e.target.value })} /></Field>
            <Field label="Department" className="col-span-2"><Select value={f.department} onChange={e => setF({ ...f, department: e.target.value })} options={DEPARTMENTS} /></Field>
            <Button type="submit" className="col-span-2"><UserPlus />Register patient</Button>
          </form>
        </Section>
        <Section title="Today's appointment calendar" pad={false} actions={<Link to="/opd/appointments" className="text-xs font-medium text-primary dark:text-blue-400">Open calendar</Link>}>
          <ul className="max-h-80 divide-y overflow-auto">{todayAppts.map((a: any) => <li key={a.id} className="flex items-center gap-3 px-4 py-2"><span className="w-16 text-xs font-semibold">{fTime(a.start)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{a.patientName}</span><span className="block truncate text-xs muted">{doctors.find((d: any) => d.id === a.doctorId)?.name}</span></span><Status v={a.status} /></li>)}{!todayAppts.length && <Empty />}</ul>
        </Section>
        <Section title="Walk-in vs appointment"><PieC data={mix} height={280} /></Section>
        <Section className="lg:col-span-3" title="Token / queue status" pad={false} actions={<Button size="sm" variant="outline" onClick={() => window.open('/display', '_blank')}>Open display board</Button>}>
          <div className="grid gap-px bg-slate-200 dark:bg-slate-800 sm:grid-cols-2 lg:grid-cols-4">{[...new Set(tokens.map((t: any) => t.dept))].map((d: any) => { const q = tokens.filter((t: any) => t.dept === d), cur = q.find((t: any) => t.status === 'In-Consultation' || t.status === 'Called'); return (
            <div key={d} className="bg-white p-4 dark:bg-slate-900"><div className="text-xs font-semibold muted">{d}</div><div className="mt-1 text-2xl font-bold text-primary dark:text-blue-400">{cur?.no || '—'}</div><div className="text-xs muted">Now serving · {q.filter((t: any) => t.status === 'Waiting').length} waiting</div></div>) })}</div>
        </Section>
      </div>
    </>
  )
}

function DeptDash({ role }: { role: string }) {
  const nav = useNavigate(), rev = useRevenue()
  const [meds, sales, rx, labs, bills, emp, att, leaves, claims] = ['medicines', 'pharmacySales', 'prescriptions', 'labOrders', 'bills', 'employees', 'attendance', 'leaves', 'claims'].map(useColl)
  const cfg: Record<string, { title: string; stats: [any, string, any, string, string][]; chart: React.ReactNode }> = {
    pharmacist: { title: 'Pharmacy Dashboard', stats: [[Receipt, 'Sales today', money(sum(sales.filter((s: any) => s.date === today()), (s: any) => s.total)), 'green', '/pharmacy/pos'], [ClipboardList, 'Prescriptions to dispense', rx.filter((r: any) => r.status === 'Pending').length, 'blue', '/pharmacy/pos'], [Package, 'Low stock items', meds.filter((m: any) => stockOf(m) < m.reorder).length, 'red', '/pharmacy/inventory'], [AlertTriangle, 'Expiring ≤ 90 days', meds.filter((m: any) => m.batches.some((b: any) => daysTo(b.expiry) <= 90)).length, 'amber', '/pharmacy/inventory']], chart: <BarC data={groupSum(sales, (s: any) => s.date.slice(5), (s: any) => s.total).reverse()} /> },
    lab: { title: 'Laboratory Dashboard', stats: [[FlaskConical, 'New orders', labs.filter((l: any) => l.status === 'Ordered').length, 'blue', '/laboratory'], [Syringe, 'Samples in process', labs.filter((l: any) => ['Collected', 'In-Process'].includes(l.status)).length, 'amber', '/laboratory'], [ClipboardList, 'Awaiting approval', labs.filter((l: any) => l.status === 'Completed').length, 'purple', '/laboratory'], [Siren, 'STAT / Urgent', labs.filter((l: any) => l.priority !== 'Routine' && l.status !== 'Approved').length, 'red', '/laboratory']], chart: <BarC data={groupSum(labs, (l: any) => l.status)} /> },
    accountant: { title: 'Accounts Dashboard', stats: [[Wallet, 'Collection today', money(rev.today), 'green', '/billing/reports'], [CreditCard, 'Outstanding dues', money(sum(bills.filter((b: any) => b.status !== 'Cancelled'), (b: any) => b.total - b.paid)), 'red', '/billing/bills'], [Receipt, 'Bills today', bills.filter((b: any) => b.date === today()).length, 'blue', '/billing/bills'], [ClipboardList, 'Open insurance claims', claims.filter((c: any) => !['Settled', 'Rejected'].includes(c.status)).length, 'amber', '/billing/insurance']], chart: <AreaC data={rev.Daily} /> },
    hr: { title: 'HR Dashboard', stats: [[Users, 'Total employees', emp.length, 'blue', '/hr'], [UserCheck, 'Present today', att.filter((a: any) => ['Present', 'Late'].includes(a.status)).length, 'green', '/hr'], [AlertTriangle, 'Absent', att.filter((a: any) => a.status === 'Absent').length, 'red', '/hr'], [CalendarDays, 'Leave requests pending', leaves.filter((l: any) => l.status === 'Pending').length, 'amber', '/hr']], chart: <BarC data={groupSum(emp, (e: any) => e.dept)} /> },
  }
  const c = cfg[role]
  return (
    <>
      <PageHeader title={c.title} desc={format(new Date(), 'EEEE, dd MMMM yyyy')} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{c.stats.map(([icon, label, value, tone, to]) => <Stat key={label} icon={icon} label={label} value={value} tone={tone} onClick={() => nav(to)} />)}</div>
      <Section className="mt-4" title="Trend">{c.chart}</Section>
    </>
  )
}

export default function Dashboard() {
  useTranslation()
  const role = useAuth(s => s.user!.role)
  if (role === 'admin') return <AdminDash />
  if (role === 'doctor') return <DoctorDash />
  if (role === 'nurse') return <NurseDash />
  if (role === 'receptionist') return <ReceptionDash />
  return <DeptDash role={role} />
}
export { isToday, stockOf }
