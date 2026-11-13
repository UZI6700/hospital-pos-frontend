import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ambulance, BedDouble, Clock, Gavel, HeartPulse, Plus, Save, Siren } from 'lucide-react'
import { dbx, notify, toast, useColl, useDB } from '@/app/store'
import { Badge, Button, Check, DataTable, Empty, Field, Input, Modal, PageHeader, Section, Select, Stat, Status, Tabs, Textarea } from '@/components/ui'
import { cn, fDT, fTime, nowISO, today, uid } from '@/utils'
import { TRIAGE } from '@/utils/constants'

const blank = { patientName: '', age: '', gender: 'Male', triage: 'Yellow', complaint: '', mode: 'Walk-in', mlc: false, bp: '', pulse: '', spo2: '', temp: '', gcs: 15, doctor: 'Dr. Vivek Singh', notes: '', phone: '' }
const mins = (iso: string) => Math.round((Date.now() - +new Date(iso)) / 6e4)

export default function Emergency() {
  const nav = useNavigate(), { add, update } = useDB(), cases = useColl('emergency'), trips = useColl('trips'), doctors = useColl('doctors')
  const [tab, setTab] = useState('triage'), [reg, setReg] = useState<any | null>(null), [open, setOpen] = useState<any | null>(null)
  const live = cases.filter((c: any) => !['Discharged', 'Admitted', 'Deceased'].includes(c.status))
  const register = () => {
    if (!reg.complaint.trim()) return toast.error('Chief complaint is required')
    const c = { ...reg, id: uid('ER'), patientName: reg.patientName.trim() || `Unknown ${reg.gender}`, arrival: nowISO(), status: reg.triage === 'Black' ? 'Deceased' : 'Waiting', mlcNo: reg.mlc ? `MLC/${new Date().getFullYear()}/${String(cases.filter((x: any) => x.mlc).length + 43).padStart(3, '0')}` : '' }
    add('emergency', c); setReg(null)
    notify('Emergency admission', `${c.patientName} — ${c.complaint} · Triage ${c.triage.toUpperCase()}`, 'emergency', '/emergency'); toast.success(`Emergency case registered (${TRIAGE[c.triage].label})`)
  }
  const fastTrack = (c: any) => {
    let pid = c.patientId
    if (!pid) {
      pid = dbx().nextNo('patient')
      add('patients', { id: pid, name: c.patientName, gender: c.gender, dob: `${new Date().getFullYear() - (Number(c.age) || 30)}-01-01`, phone: c.phone || '+92 000 0000000', blood: 'O+', allergies: '', chronic: '', category: 'General', referral: 'Emergency', department: 'Emergency', status: 'Active', regDate: today() })
    }
    update('emergency', c.id, { patientId: pid, status: 'Admitted' }); setOpen(null); toast.info('Patient registered — complete fast-track admission'); nav(`/ipd/admission?patient=${pid}`)
  }
  const save = () => { const { id, ...rest } = open; update('emergency', id, rest); if (rest.mlc && !rest.mlcNo) update('emergency', id, { mlcNo: `MLC/${new Date().getFullYear()}/${String(cases.filter((x: any) => x.mlc).length + 43).padStart(3, '0')}` }); setOpen(null); toast.success('Case updated') }
  const vitalsForm = (s: any, set: (v: any) => void) => <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{[['bp', 'BP (mmHg)'], ['pulse', 'Pulse /min'], ['spo2', 'SpO₂ %'], ['temp', 'Temp °F'], ['gcs', 'GCS (3–15)']].map(([k, l]) => <Field key={k} label={l}><Input value={s[k]} onChange={e => set({ ...s, [k]: e.target.value })} className={cn((k === 'spo2' && s.spo2 && Number(s.spo2) < 92) || (k === 'gcs' && Number(s.gcs) < 9) ? 'border-red-500 font-bold text-red-600' : '')} /></Field>)}</div>
  const triagePick = (s: any, set: (v: any) => void) => <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Triage severity">{Object.entries(TRIAGE).map(([k, t]) => <button key={k} type="button" role="radio" aria-checked={s.triage === k} onClick={() => set({ ...s, triage: k })} className={cn('rounded-lg border-2 px-2 py-2 text-xs font-bold transition', s.triage === k ? `${t.cls} border-transparent shadow-md` : 'border-slate-200 opacity-70 hover:opacity-100 dark:border-slate-700')}>{k}<span className="block font-normal">{t.label}</span></button>)}</div>
  return (
    <>
      <PageHeader title="Emergency / Casualty" desc="Triage, treat and fast-track emergency patients" actions={<Button variant="danger" size="lg" onClick={() => setReg({ ...blank })}><Siren />Quick registration</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Object.entries(TRIAGE).map(([k, t]) => <div key={k} className={cn('rounded-xl p-4 shadow-sm', t.cls)}><div className="text-xs font-medium opacity-90">{k} · {t.label}</div><div className="text-3xl font-black">{cases.filter((c: any) => c.triage === k && (k === 'Black' || live.includes(c))).length}</div></div>)}
        <Stat icon={Gavel} label="MLC cases" value={cases.filter((c: any) => c.mlc).length} tone="amber" />
      </div>
      <div className="mt-4"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'triage', label: 'Triage board', icon: HeartPulse, badge: live.length }, { id: 'log', label: 'Emergency department log', icon: Clock }, { id: 'amb', label: 'Incoming ambulances', icon: Ambulance, badge: trips.filter((t: any) => t.status === 'In Transit').length }]} /></div>
      {tab === 'triage' && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(TRIAGE).map(([k, t]) => { const list = cases.filter((c: any) => c.triage === k && (k === 'Black' ? true : live.includes(c))); return (
            <section key={k} className="card overflow-hidden"><header className={cn('flex items-center justify-between px-3 py-2 text-sm font-bold', t.cls)}><span>{k} — {t.label}</span><span>{list.length}</span></header>
              <ul className="space-y-2 p-2">{list.map((c: any) => (
                <li key={c.id}><button onClick={() => setOpen({ ...c })} className="w-full rounded-lg border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold">{c.patientName}</span><span className="shrink-0 text-xs muted">{c.age}y {c.gender[0]}</span></div>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{c.complaint}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px]"><Badge>{c.mode}</Badge>{c.mlc && <Badge tone="amber"><Gavel className="h-3 w-3" />MLC</Badge>}<Status v={c.status} /><span className={cn('ml-auto font-medium', mins(c.arrival) > 30 && c.status === 'Waiting' ? 'text-red-600' : 'muted')}>{mins(c.arrival)} min</span></div>
                  <div className="mt-1.5 grid grid-cols-4 gap-1 text-center text-[10px] muted">{[['BP', c.bp], ['HR', c.pulse], ['SpO₂', c.spo2], ['GCS', c.gcs]].map(([l, v]) => <span key={l} className="rounded bg-slate-100 py-0.5 dark:bg-slate-800"><b className="block text-slate-800 dark:text-slate-100">{v || '—'}</b>{l}</span>)}</div>
                </button></li>))}{!list.length && <li className="py-6 text-center text-xs muted">No patients</li>}</ul>
            </section>) })}
        </div>
      )}
      {tab === 'log' && <Section pad={false}><DataTable rows={cases} exportName="Emergency log" cols={[{ key: 'id', label: 'Case', className: 'font-mono text-xs' }, { key: 'arrival', label: 'Arrival', render: (r: any) => fDT(r.arrival) }, { key: 'patientName', label: 'Patient' }, { key: 'age', label: 'Age' }, { key: 'triage', label: 'Triage', render: (r: any) => <span className={cn('rounded px-2 py-0.5 text-xs font-bold', TRIAGE[r.triage].cls)}>{r.triage}</span> }, { key: 'complaint', label: 'Complaint' }, { key: 'mode', label: 'Mode' }, { key: 'mlcNo', label: 'MLC No' }, { key: 'doctor', label: 'Doctor' }, { key: 'status', label: 'Status', render: (r: any) => <Status v={r.status} /> }]} onRow={r => setOpen({ ...r })} /></Section>}
      {tab === 'amb' && <Section pad={false}><ul className="divide-y">{trips.filter((t: any) => t.status === 'In Transit').map((t: any) => <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3"><Ambulance className="h-8 w-8 text-red-600" /><div className="flex-1"><div className="text-sm font-semibold">{t.vehicle} · {t.driver}</div><div className="text-xs muted">{t.pickup} → {t.destination} · Patient: {t.patient}</div></div><Badge tone="blue">ETA ~{Math.max(3, Math.round(t.km * 1.5))} min</Badge><Button size="sm" variant="outline" onClick={() => nav('/ambulance')}>Track on map</Button><Button size="sm" variant="danger" onClick={() => setReg({ ...blank, patientName: t.patient, mode: 'Ambulance', triage: 'Red' })}>Pre-register</Button></li>)}{!trips.some((t: any) => t.status === 'In Transit') && <Empty text="No ambulances inbound" />}</ul></Section>}

      <Modal open={!!reg} onClose={() => setReg(null)} title="Emergency quick registration" size="lg" footer={<><Button variant="outline" onClick={() => setReg(null)}>Cancel</Button><Button variant="danger" onClick={register}><Plus />Register case</Button></>}>
        {reg && <div className="space-y-3">
          {triagePick(reg, setReg)}
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Patient name" hint="Leave blank if unknown" className="sm:col-span-2"><Input autoFocus value={reg.patientName} onChange={e => setReg({ ...reg, patientName: e.target.value })} /></Field>
            <Field label="Age (approx.)"><Input type="number" value={reg.age} onChange={e => setReg({ ...reg, age: e.target.value })} /></Field>
            <Field label="Gender"><Select value={reg.gender} onChange={e => setReg({ ...reg, gender: e.target.value })} options={['Male', 'Female', 'Other']} /></Field>
            <Field label="Chief complaint / mechanism of injury" required className="sm:col-span-4"><Input value={reg.complaint} onChange={e => setReg({ ...reg, complaint: e.target.value })} /></Field>
            <Field label="Mode of arrival"><Select value={reg.mode} onChange={e => setReg({ ...reg, mode: e.target.value })} options={['Walk-in', 'Ambulance', 'Police', 'Referred']} /></Field>
            <Field label="Attending doctor" className="sm:col-span-2"><Select value={reg.doctor} onChange={e => setReg({ ...reg, doctor: e.target.value })} options={doctors.map((d: any) => d.name)} /></Field>
            <div className="flex items-end pb-2"><Check label={<b className="text-amber-700">Medico-legal case (MLC)</b>} checked={reg.mlc} onChange={v => setReg({ ...reg, mlc: v })} /></div>
          </div>
          {vitalsForm(reg, setReg)}
        </div>}
      </Modal>

      <Modal open={!!open} onClose={() => setOpen(null)} size="lg" title={<span className="flex flex-wrap items-center gap-2">{open?.patientName}<span className="text-xs font-normal muted">{open?.id} · arrived {fTime(open?.arrival)}</span>{open?.mlc && <Badge tone="amber">MLC {open.mlcNo}</Badge>}</span>}
        footer={<><Button variant="danger" className="mr-auto" onClick={() => fastTrack(open)} disabled={open?.status === 'Admitted' || open?.triage === 'Black'}><BedDouble />Fast-track admission</Button><Button variant="outline" onClick={() => setOpen(null)}>Close</Button><Button onClick={save}><Save />Save</Button></>}>
        {open && <div className="space-y-3">
          {triagePick(open, setOpen)}
          <Field label="Chief complaint"><Input value={open.complaint} onChange={e => setOpen({ ...open, complaint: e.target.value })} /></Field>
          <div><span className="mb-1 block text-xs font-semibold muted">Emergency vital signs</span>{vitalsForm(open, setOpen)}</div>
          <Field label="Treatment notes"><Textarea rows={4} value={open.notes} onChange={e => setOpen({ ...open, notes: e.target.value })} placeholder="Primary survey (ABCDE), interventions, drugs given, response…" /></Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Status"><Select value={open.status} onChange={e => setOpen({ ...open, status: e.target.value })} options={['Waiting', 'Under Treatment', 'Under Observation', 'Admitted', 'Discharged', 'Referred', 'Deceased']} /></Field>
            <Field label="Doctor"><Select value={open.doctor} onChange={e => setOpen({ ...open, doctor: e.target.value })} options={doctors.map((d: any) => d.name)} /></Field>
            <div className="flex items-end pb-2"><Check label={<b className="text-amber-700">Flag as MLC (police intimation)</b>} checked={!!open.mlc} onChange={v => setOpen({ ...open, mlc: v })} /></div>
          </div>
        </div>}
      </Modal>
    </>
  )
}
