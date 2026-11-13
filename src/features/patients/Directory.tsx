import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarPlus, Eye, Filter, IdCard, LayoutGrid, List, Pencil, Search, UserPlus } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { printPreview, useColl, useSettings } from '@/app/store'
import { Avatar, Badge, Button, Empty, Field, Input, PageHeader, Select, Skeleton, Status, VirtualList } from '@/components/ui'
import { useDebounce, useFetch } from '@/hooks'
import { ageOf, cn, fDate } from '@/utils'
import { CATEGORIES, DEPARTMENTS } from '@/utils/constants'
import type { Patient } from '@/types'

export function PatientCard({ p }: { p: Patient }) {
  const h = useSettings().hospital
  return (
    <div style={{ width: 340, border: '1px solid #cbd5e1', borderRadius: 12, overflow: 'hidden', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#1E40AF', color: '#fff', padding: '8px 12px', fontWeight: 700 }}>{h.name}<div style={{ fontSize: 10, fontWeight: 400 }}>Patient Registration Card</div></div>
      <div style={{ display: 'flex', gap: 12, padding: 12, alignItems: 'center' }}>
        {p.photo ? <img src={p.photo} alt="" style={{ width: 72, height: 72, borderRadius: 8, objectFit: 'cover' }} /> : <div style={{ width: 72, height: 72, borderRadius: 8, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#475569' }}>{p.name[0]}</div>}
        <div style={{ flex: 1, fontSize: 11, lineHeight: 1.5 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div><div><b>{p.id}</b></div><div>{ageOf(p.dob)} yrs / {p.gender} / {p.blood}</div><div>{p.phone}</div>{p.allergies && <div style={{ color: '#dc2626', fontWeight: 600 }}>Allergy: {p.allergies}</div>}</div>
        <QRCodeSVG value={p.id} size={64} />
      </div>
      <div style={{ background: '#f1f5f9', padding: '4px 12px', fontSize: 9, textAlign: 'center' }}>{h.address} · {h.phone}</div>
    </div>
  )
}

export default function Directory() {
  const nav = useNavigate(), patients = useColl<Patient>('patients'), { loading } = useFetch('/patients')
  const [q, setQ] = useState(''), dq = useDebounce(q), [view, setView] = useState<'card' | 'list'>('list'), [showF, setShowF] = useState(false)
  const [f, setF] = useState({ from: '', to: '', department: '', status: '', category: '', gender: '' })
  const rows = useMemo(() => {
    const s = dq.trim().toLowerCase()
    return patients.filter(p => (!s || p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s) || p.phone.replace(/\s/g, '').includes(s.replace(/\s/g, '')) || p.regDate.includes(s))
      && (!f.from || p.regDate >= f.from) && (!f.to || p.regDate <= f.to) && (!f.department || p.department === f.department) && (!f.status || p.status === f.status) && (!f.category || p.category === f.category) && (!f.gender || p.gender === f.gender))
  }, [patients, dq, f])
  const active = Object.values(f).filter(Boolean).length
  const Actions = ({ p }: { p: Patient }) => (
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="icon" aria-label={`View ${p.name}`} title="View profile" onClick={() => nav(`/patients/${p.id}`)}><Eye /></Button>
      <Button variant="ghost" size="icon" aria-label="New visit" title="New visit" onClick={() => nav(`/opd/queue?patient=${p.id}`)}><CalendarPlus /></Button>
      <Button variant="ghost" size="icon" aria-label="Print card" title="Print card" onClick={() => printPreview(`Patient card ${p.id}`, <PatientCard p={p} />)}><IdCard /></Button>
      <Button variant="ghost" size="icon" aria-label="Edit" title="Edit" onClick={() => nav(`/patients/${p.id}/edit`)}><Pencil /></Button>
    </div>
  )
  return (
    <>
      <PageHeader title="Patient Directory" desc={`${rows.length.toLocaleString()} of ${patients.length.toLocaleString()} patients`} actions={<Button onClick={() => nav('/patients/new')}><UserPlus />New Registration</Button>} />
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><input aria-label="Search patients" className="input pl-8" placeholder="Search by name, patient ID, phone or registration date (yyyy-mm-dd)…" value={q} onChange={e => setQ(e.target.value)} /></div>
          <Button variant={showF || active ? 'secondary' : 'outline'} onClick={() => setShowF(s => !s)} aria-expanded={showF}><Filter />Filters{active > 0 && <Badge tone="blue">{active}</Badge>}</Button>
          <div className="flex rounded-lg border p-0.5" role="group" aria-label="View mode">{([['list', List], ['card', LayoutGrid]] as const).map(([v, I]) => <button key={v} aria-label={`${v} view`} aria-pressed={view === v} onClick={() => setView(v)} className={cn('rounded-md p-1.5 transition', view === v ? 'bg-primary text-white' : 'muted')}><I className="h-4 w-4" /></button>)}</div>
        </div>
        {showF && (
          <div className="grid animate-fade-in grid-cols-2 gap-3 border-b bg-slate-50 p-3 dark:bg-slate-900/50 md:grid-cols-4 xl:grid-cols-7">
            <Field label="Registered from"><Input type="date" value={f.from} onChange={e => setF({ ...f, from: e.target.value })} /></Field>
            <Field label="Registered to"><Input type="date" value={f.to} onChange={e => setF({ ...f, to: e.target.value })} /></Field>
            <Field label="Department"><Select placeholder="All" value={f.department} onChange={e => setF({ ...f, department: e.target.value })} options={DEPARTMENTS} /></Field>
            <Field label="Status"><Select placeholder="All" value={f.status} onChange={e => setF({ ...f, status: e.target.value })} options={['Active', 'Admitted', 'Discharged', 'Deceased']} /></Field>
            <Field label="Category"><Select placeholder="All" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} options={CATEGORIES} /></Field>
            <Field label="Gender"><Select placeholder="All" value={f.gender} onChange={e => setF({ ...f, gender: e.target.value })} options={['Male', 'Female', 'Other']} /></Field>
            <div className="flex items-end"><Button variant="ghost" onClick={() => setF({ from: '', to: '', department: '', status: '', category: '', gender: '' })}>Clear all</Button></div>
          </div>
        )}
        {loading ? <div className="space-y-2 p-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-24" /></div>)}</div>
          : !rows.length ? <Empty text="No patients match your search" />
            : view === 'list' ? (
              <div className="overflow-x-auto"><div className="min-w-[860px]">
                <div className="grid grid-cols-[2.2fr_1fr_1.3fr_1.2fr_1fr_.9fr_150px] gap-3 border-b bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/50"><span>Patient</span><span>Age / Sex</span><span>Phone</span><span>Department</span><span>Registered</span><span>Status</span><span className="text-right">Actions</span></div>
                <VirtualList items={rows} rowHeight={56} height={Math.min(560, rows.length * 56)} render={p => (
                  <div className="grid h-full grid-cols-[2.2fr_1fr_1.3fr_1.2fr_1fr_.9fr_150px] items-center gap-3 border-b px-4 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <Link to={`/patients/${p.id}`} className="flex min-w-0 items-center gap-2.5"><Avatar name={p.name} src={p.photo} size={34} /><span className="min-w-0"><span className="block truncate font-medium text-slate-900 dark:text-white">{p.name}{p.allergies && <span className="ml-1.5 rounded bg-red-600 px-1 text-[10px] font-bold text-white">ALLERGY</span>}</span><span className="block font-mono text-xs muted">{p.id}</span></span></Link>
                    <span>{ageOf(p.dob)}y · {p.gender}</span><span className="truncate">{p.phone}</span><span className="truncate">{p.department}</span><span>{fDate(p.regDate)}</span><span><Status v={p.status} /></span><span className="flex justify-end"><Actions p={p} /></span>
                  </div>)} />
              </div></div>
            ) : (
              <div className="grid max-h-[640px] gap-3 overflow-auto p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rows.slice(0, 60).map(p => (
                  <article key={p.id} className="rounded-xl border p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-center gap-3"><Avatar name={p.name} src={p.photo} size={48} /><div className="min-w-0 flex-1"><Link to={`/patients/${p.id}`} className="block truncate font-semibold hover:text-primary">{p.name}</Link><div className="font-mono text-xs muted">{p.id}</div></div><Status v={p.status} /></div>
                    <dl className="mt-3 grid grid-cols-2 gap-1 text-xs"><div><span className="muted">Age/Sex:</span> {ageOf(p.dob)}y {p.gender[0]}</div><div><span className="muted">Blood:</span> {p.blood}</div><div className="col-span-2 truncate"><span className="muted">Phone:</span> {p.phone}</div><div className="col-span-2 truncate"><span className="muted">Dept:</span> {p.department}</div></dl>
                    {p.allergies && <div className="mt-2 rounded bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">⚠ {p.allergies}</div>}
                    <div className="mt-2 flex justify-end border-t pt-2"><Actions p={p} /></div>
                  </article>))}
                {rows.length > 60 && <p className="col-span-full py-2 text-center text-xs muted">Showing first 60 cards — refine your search or switch to list view for all {rows.length}.</p>}
              </div>
            )}
      </div>
    </>
  )
}
