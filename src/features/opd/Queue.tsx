import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRightLeft, CheckCircle2, Clock, Megaphone, MonitorPlay, SkipForward, Stethoscope, Ticket, Users, Volume2 } from 'lucide-react'
import { toast, useColl, useDB, useSettings } from '@/app/store'
import { PatientBanner, PatientSearch } from '@/components/common'
import { Badge, Button, Empty, Field, Input, Modal, PageHeader, Section, Select, Stat, Status, Tabs } from '@/components/ui'
import { beep, cn, fTime, nowISO, speak, uid } from '@/utils'
import { DEPARTMENTS } from '@/utils/constants'

const WEIGHT: Record<string, number> = { Emergency: 0, Elderly: 1, VIP: 2, Normal: 3 }
const sortQ = (a: any, b: any) => WEIGHT[a.priority] - WEIGHT[b.priority] || a.createdAt.localeCompare(b.createdAt)
const waitMin = (t: any) => Math.max(0, Math.round(((t.calledAt ? +new Date(t.calledAt) : Date.now()) - +new Date(t.createdAt)) / 6e4))

export default function Queue() {
  const nav = useNavigate(), [sp, setSp] = useSearchParams(), { add, update } = useDB()
  const tokens = useColl('tokens'), doctors = useColl('doctors'), patients = useColl('patients')
  const [dept, setDept] = useState('All'), [transfer, setTransfer] = useState<any | null>(null), [, tick] = useState(0)
  const [f, setF] = useState<any>({ patient: null, name: '', dept: 'General Medicine', doctorId: '', priority: 'Normal' })
  useEffect(() => { const p = patients.find((x: any) => x.id === sp.get('patient')); if (p) { setF((s: any) => ({ ...s, patient: p, dept: DEPARTMENTS.includes(p.department) ? p.department : s.dept })); setSp({}, { replace: true }) } }, []) // eslint-disable-line
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(t) }, [])
  const depts = useMemo(() => ['All', ...new Set(tokens.map((t: any) => t.dept))] as string[], [tokens])
  const list = tokens.filter((t: any) => dept === 'All' || t.dept === dept)
  const waiting = list.filter((t: any) => t.status === 'Waiting').sort(sortQ), activeT = list.filter((t: any) => ['Called', 'In-Consultation'].includes(t.status)), done = list.filter((t: any) => ['Completed', 'Skipped'].includes(t.status))
  const served = list.filter((t: any) => t.calledAt), avg = served.length ? Math.round(served.reduce((s: number, t: any) => s + waitMin(t), 0) / served.length) : 0
  const issue = () => {
    const name = f.patient?.name || f.name.trim()
    if (!name) return toast.error('Select a patient or enter a name')
    const n = tokens.filter((t: any) => t.dept === f.dept).length + 1, no = `${f.dept[0]}-${String(tokens.length + 1).padStart(3, '0')}`
    add('tokens', { id: uid('TK'), no, patientId: f.patient?.id, patientName: name, dept: f.dept, doctorId: f.doctorId || doctors.find((d: any) => d.dept === f.dept)?.id, priority: f.priority, status: 'Waiting', createdAt: nowISO() })
    toast.success(`Token ${no} issued for ${name} (position ${n})`); setF({ ...f, patient: null, name: '', priority: 'Normal' })
  }
  const call = (t: any) => { update('tokens', t.id, { status: 'Called', calledAt: t.calledAt || nowISO() }); beep(); setTimeout(() => speak(`Token number ${t.no.replace('-', ' ')}, please proceed to ${t.dept}`), 500); toast.info(`Calling ${t.no} — ${t.patientName}`) }
  const Row = ({ t, pos }: { t: any; pos?: number }) => (
    <li className={cn('flex flex-wrap items-center gap-3 px-4 py-2.5', t.priority === 'Emergency' && 'bg-red-50 dark:bg-red-500/5')}>
      {pos != null && <span className="w-5 text-center text-xs muted">{pos}</span>}
      <span className={cn('rounded-lg px-2.5 py-1.5 font-mono text-sm font-bold text-white', t.status === 'Called' ? 'animate-pulse bg-amber-500' : t.status === 'In-Consultation' ? 'bg-emerald-600' : 'bg-primary')}>{t.no}</span>
      <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{t.patientName}</div><div className="truncate text-xs muted">{t.dept} · {doctors.find((d: any) => d.id === t.doctorId)?.name} · issued {fTime(t.createdAt)} · {t.status === 'Waiting' ? `waiting ${waitMin(t)} min` : `waited ${waitMin(t)} min`}</div></div>
      {t.priority !== 'Normal' && <Status v={t.priority} />}<Status v={t.status} />
      <div className="flex gap-1">
        {['Waiting', 'Called'].includes(t.status) && <Button size="sm" variant={t.status === 'Called' ? 'outline' : 'primary'} onClick={() => call(t)}><Volume2 />{t.status === 'Called' ? 'Recall' : 'Call'}</Button>}
        {t.status === 'Called' && <Button size="sm" variant="success" onClick={() => { update('tokens', t.id, { status: 'In-Consultation' }); if (t.patientId) nav(`/opd/consultation?patient=${t.patientId}&token=${t.id}`) }}><Stethoscope />Start</Button>}
        {t.status === 'In-Consultation' && <Button size="sm" variant="success" onClick={() => { update('tokens', t.id, { status: 'Completed', doneAt: nowISO() }); toast.success(`${t.no} completed`) }}><CheckCircle2 />Done</Button>}
        {!['Completed', 'Skipped'].includes(t.status) && <><Button size="icon" variant="ghost" aria-label="Transfer to another department" title="Transfer" onClick={() => setTransfer({ t, dept: t.dept })}><ArrowRightLeft /></Button><Button size="icon" variant="ghost" aria-label="Skip token" title="Skip" onClick={() => update('tokens', t.id, { status: 'Skipped' })}><SkipForward /></Button></>}
      </div>
    </li>
  )
  return (
    <>
      <PageHeader title="Token & Queue Management" desc="Priority order: Emergency → Elderly → VIP → Normal" actions={<><Button variant="outline" onClick={() => window.open('/display', '_blank')}><MonitorPlay />Display board</Button><Button disabled={!waiting.length} onClick={() => call(waiting[0])}><Megaphone />Call next</Button></>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Users} label="Waiting" value={waiting.length} tone="amber" /><Stat icon={Stethoscope} label="Being served" value={activeT.length} tone="green" /><Stat icon={CheckCircle2} label="Completed" value={done.length} tone="slate" /><Stat icon={Clock} label="Average wait time" value={`${avg} min`} tone="blue" sub={`Est. for new token: ~${avg + waiting.length * 4} min`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title={<span className="flex items-center gap-2"><Ticket className="h-4 w-4" />Issue new token</span>}>
          <div className="space-y-3">
            {f.patient ? <PatientBanner p={f.patient} onClear={() => setF({ ...f, patient: null })} /> : <><PatientSearch onSelect={p => setF({ ...f, patient: p })} /><Field label="…or walk-in name (unregistered)"><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field></>}
            <Field label="Department"><Select value={f.dept} onChange={e => setF({ ...f, dept: e.target.value, doctorId: '' })} options={DEPARTMENTS} /></Field>
            <Field label="Doctor"><Select value={f.doctorId} onChange={e => setF({ ...f, doctorId: e.target.value })} placeholder="Any available" options={doctors.filter((d: any) => d.dept === f.dept).map((d: any) => ({ value: d.id, label: d.name }))} /></Field>
            <Field label="Priority"><div className="grid grid-cols-4 gap-1">{['Normal', 'Elderly', 'VIP', 'Emergency'].map(p => <button key={p} type="button" aria-pressed={f.priority === p} onClick={() => setF({ ...f, priority: p })} className={cn('rounded-lg border px-1 py-1.5 text-xs font-medium transition', f.priority === p ? (p === 'Emergency' ? 'border-red-600 bg-red-600 text-white' : 'border-primary bg-primary text-white') : 'hover:bg-slate-50 dark:hover:bg-slate-800')}>{p}</button>)}</div></Field>
            <Button className="w-full" size="lg" onClick={issue}><Ticket />Generate token</Button>
          </div>
        </Section>
        <div className="lg:col-span-2">
          <Tabs value={dept} onChange={setDept} tabs={depts.map(d => ({ id: d, label: d, badge: tokens.filter((t: any) => (d === 'All' || t.dept === d) && t.status === 'Waiting').length }))} />
          <Section title="Now serving" pad={false} className="mb-4"><ul className="divide-y">{activeT.map((t: any) => <Row key={t.id} t={t} />)}{!activeT.length && <Empty text="No token is being served" />}</ul></Section>
          <Section title={`Waiting (${waiting.length})`} pad={false} className="mb-4"><ul className="divide-y">{waiting.map((t: any, i: number) => <Row key={t.id} t={t} pos={i + 1} />)}{!waiting.length && <Empty text="Queue is empty" />}</ul></Section>
          <Section title={`Completed / skipped (${done.length})`} pad={false}><ul className="max-h-60 divide-y overflow-auto opacity-80">{done.map((t: any) => <Row key={t.id} t={t} />)}</ul></Section>
        </div>
      </div>
      <Modal open={!!transfer} onClose={() => setTransfer(null)} size="sm" title={`Transfer token ${transfer?.t.no}`} footer={<><Button variant="outline" onClick={() => setTransfer(null)}>Cancel</Button><Button onClick={() => { update('tokens', transfer.t.id, { dept: transfer.dept, doctorId: doctors.find((d: any) => d.dept === transfer.dept)?.id, status: 'Waiting', calledAt: undefined }); toast.success(`Transferred to ${transfer.dept}`); setTransfer(null) }}>Transfer</Button></>}>
        {transfer && <Field label="Transfer to department"><Select value={transfer.dept} onChange={e => setTransfer({ ...transfer, dept: e.target.value })} options={DEPARTMENTS} /></Field>}
      </Modal>
    </>
  )
}

/** Full-screen board for waiting-area TVs. Stays in sync with the reception desk through localStorage events. */
export function DisplayBoard() {
  const tokens = useColl('tokens'), h = useSettings().hospital, [now, setNow] = useState(new Date())
  useEffect(() => {
    const sync = (e: StorageEvent) => { if (e.key === 'hpos-db-v1') useDB.persist.rehydrate() }
    window.addEventListener('storage', sync); const t = setInterval(() => setNow(new Date()), 1000)
    return () => { window.removeEventListener('storage', sync); clearInterval(t) }
  }, [])
  const called = tokens.filter((t: any) => t.status === 'Called').map((t: any) => t.id).join()
  useEffect(() => { if (called) beep() }, [called])
  const depts = [...new Set(tokens.map((t: any) => t.dept))] as string[]
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <header className="mb-6 flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-4xl font-bold leading-none">+</span><div><div className="text-2xl font-bold">{h.name}</div><div className="text-blue-300">OPD Queue — please wait for your token number</div></div></div><div className="text-right"><div className="font-mono text-4xl font-bold tabular-nums">{now.toLocaleTimeString()}</div><div className="text-slate-400">{now.toDateString()}</div></div></header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {depts.map(d => {
          const q = tokens.filter((t: any) => t.dept === d), cur: any = q.find((t: any) => t.status === 'Called') || q.find((t: any) => t.status === 'In-Consultation'), next = q.filter((t: any) => t.status === 'Waiting').sort(sortQ)
          return (
            <section key={d} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <h2 className="bg-blue-800 px-5 py-3 text-xl font-semibold text-white">{d}</h2>
              <div className="p-5 text-center"><div className="text-sm uppercase tracking-widest text-slate-400">Now serving</div><div className={cn('my-2 font-mono text-7xl font-black tabular-nums', cur?.status === 'Called' ? 'animate-pulse text-amber-400' : 'text-emerald-400')}>{cur?.no || '—'}</div><div className="text-lg text-slate-300">{cur ? cur.patientName.replace(/(\w)\w+$/, '$1.') : 'Please wait'}</div></div>
              <div className="border-t border-slate-800 px-5 py-3"><div className="mb-2 text-xs uppercase tracking-widest text-slate-400">Next in line · approx. wait {next.length * 6} min</div><div className="flex flex-wrap gap-2">{next.slice(0, 6).map((t: any) => <span key={t.id} className={cn('rounded-lg px-3 py-1.5 font-mono text-xl font-bold', t.priority === 'Emergency' ? 'bg-red-600' : 'bg-slate-800')}>{t.no}</span>)}{!next.length && <span className="text-slate-500">No one waiting</span>}</div></div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
