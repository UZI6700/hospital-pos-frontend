import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Bold, FileBadge, Italic, List, Mic, MicOff, Plus, Printer, Save, Search, Trash2, Underline } from 'lucide-react'
import { dbx, printPreview, toast, useAuth, useColl, useDB } from '@/app/store'
import { PatientBanner, PatientSearch } from '@/components/common'
import { Letterhead, Sign } from '@/components/common/overlays'
import { Badge, Button, Check, Empty, Field, Input, PageHeader, Section, Select, Tabs, Textarea } from '@/components/ui'
import { ageOf, bmiOf, cn, dOff, fDate, nowISO, today, uid } from '@/utils'
import { COMPLAINT_TEMPLATES, FREQ, ICD10, IMAGING, INTERACTIONS, LAB_TESTS } from '@/utils/constants'

const ALLERGY_MAP: Record<string, string[]> = { penicillin: ['amoxicillin'], aspirin: ['aspirin', 'ibuprofen'], sulfa: ['sulfa'] }

function RichText({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null), rec = useRef<any>(null), [listening, setListening] = useState(false)
  useEffect(() => { if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value }, [value])
  const cmd = (c: string) => { document.execCommand(c); ref.current?.focus(); onChange(ref.current!.innerHTML) }
  const voice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return toast.warning('Voice dictation is not supported in this browser (try Chrome or Edge)')
    if (listening) return rec.current?.stop()
    const r = new SR(); rec.current = r; r.lang = 'en-IN'; r.continuous = true
    r.onresult = (e: any) => { const txt = Array.from(e.results).slice(e.resultIndex).map((x: any) => x[0].transcript).join(' '); ref.current!.innerHTML += ` ${txt}`; onChange(ref.current!.innerHTML) }
    r.onend = () => setListening(false); r.onerror = () => { setListening(false); toast.error('Microphone unavailable or permission denied') }
    r.start(); setListening(true)
  }
  return (
    <div className="rounded-lg border border-slate-300 dark:border-slate-700">
      <div className="flex items-center gap-0.5 border-b p-1" role="toolbar" aria-label="Formatting">
        {([['bold', Bold], ['italic', Italic], ['underline', Underline], ['insertUnorderedList', List]] as const).map(([c, I]) => <Button key={c} variant="ghost" size="icon" aria-label={c} onMouseDown={e => { e.preventDefault(); cmd(c) }}><I /></Button>)}
        <Button variant={listening ? 'danger' : 'ghost'} size="sm" className="ml-auto" onClick={voice} aria-pressed={listening}>{listening ? <><MicOff />Stop dictation</> : <><Mic />Voice to text</>}</Button>
      </div>
      <div ref={ref} contentEditable role="textbox" aria-multiline aria-label="Clinical notes" onInput={e => onChange(e.currentTarget.innerHTML)} className="min-h-[120px] p-3 text-sm outline-none [&_ul]:list-disc [&_ul]:pl-5" />
    </div>
  )
}

const blankRx = { drug: '', dose: '1 tab', freq: FREQ[1], duration: '5 days', instr: 'After food' }

export default function Consultation() {
  const nav = useNavigate(), [sp] = useSearchParams(), user = useAuth(s => s.user)!, { add, update, nextNo } = useDB()
  const [patients, doctors, meds, tokens, vitalsAll, templates, pastCons] = ['patients', 'doctors', 'medicines', 'tokens', 'vitals', 'rxTemplates', 'consultations'].map(useColl)
  const doc: any = doctors.find((d: any) => d.id === user.doctorId) || doctors[0]
  const [patient, setPatient] = useState<any>(null), [tab, setTab] = useState('notes'), [saved, setSaved] = useState<any>(null)
  const [vit, setVit] = useState<any>({ sys: '', dia: '', temp: '', pulse: '', spo2: '', weight: '', height: '' })
  const [complaints, setComplaints] = useState(''), [notes, setNotes] = useState(''), [dx, setDx] = useState<[string, string][]>([]), [dq, setDq] = useState('')
  const [rx, setRx] = useState<any[]>([]), [cur, setCur] = useState<any>(blankRx), [tplName, setTplName] = useState('')
  const [labs, setLabs] = useState<string[]>([]), [imgs, setImgs] = useState<string[]>([]), [procedure, setProcedure] = useState('')
  const [ref, setRef] = useState({ to: '', reason: '' }), [follow, setFollow] = useState(''), [cert, setCert] = useState({ type: 'Sick Leave', from: today(), to: dOff(2), remarks: '' })

  const pick = (p: any) => {
    setPatient(p); setSaved(null)
    const last: any = [...vitalsAll].filter((v: any) => v.patientId === p.id).sort((a: any, b: any) => b.at.localeCompare(a.at))[0]
    setVit(last ? { sys: last.sys, dia: last.dia, temp: last.temp, pulse: last.pulse, spo2: last.spo2, weight: last.weight, height: last.height } : { sys: '', dia: '', temp: '', pulse: '', spo2: '', weight: '', height: '' })
    setComplaints(''); setNotes(''); setDx([]); setRx([]); setLabs([]); setImgs([]); setProcedure(''); setRef({ to: '', reason: '' }); setFollow('')
  }
  useEffect(() => { const p = patients.find((x: any) => x.id === sp.get('patient')); if (p) pick(p) }, []) // eslint-disable-line

  const genericOf = (name: string) => (meds.find((m: any) => m.name === name) as any)?.generic || name
  const alerts = useMemo(() => {
    const out: { sev: string; msg: string }[] = [], gens = rx.map(r => genericOf(r.drug))
    INTERACTIONS.forEach(([a, b, sev, msg]) => { if (gens.some(g => g.includes(a)) && gens.some(g => g.includes(b))) out.push({ sev, msg: `${a} + ${b}: ${msg}` }) })
    const al = (patient?.allergies || '').toLowerCase()
    Object.entries(ALLERGY_MAP).forEach(([k, list]) => { if (al.includes(k)) gens.forEach(g => { if (list.some(x => g.toLowerCase().includes(x))) out.push({ sev: 'Allergy', msg: `Patient is allergic to ${k} — ${g} is contraindicated` }) }) })
    const seen = new Set<string>(); gens.forEach(g => { if (seen.has(g)) out.push({ sev: 'Moderate', msg: `Duplicate therapy: ${g} prescribed more than once` }); seen.add(g) })
    return out
  }, [rx, patient, meds]) // eslint-disable-line
  const drugHits = cur.drug.length > 1 && !meds.some((m: any) => m.name === cur.drug) ? meds.filter((m: any) => `${m.name} ${m.generic}`.toLowerCase().includes(cur.drug.toLowerCase())).slice(0, 6) : []
  const icdHits = dq.length > 1 ? ICD10.filter(([c, d]) => `${c} ${d}`.toLowerCase().includes(dq.toLowerCase()) && !dx.some(x => x[0] === c)).slice(0, 7) : []
  const bmi = bmiOf(vit.weight, vit.height)
  const queue = tokens.filter((t: any) => t.patientId && ['Waiting', 'Called', 'In-Consultation'].includes(t.status))

  const RxDoc = ({ items = rx }: { items?: any[] }) => (
    <Letterhead title="Prescription" meta={[['Patient', `${patient.name} (${patient.id})`], ['Age / Sex', `${ageOf(patient.dob)} yrs / ${patient.gender}`], ['Doctor', `${doc.name}, ${doc.qualification}`], ['Date', fDate(today())], ['Diagnosis', dx.map(d => `${d[0]} ${d[1]}`).join('; ')], ['Allergies', patient.allergies || 'None known']]}>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'serif' }}>℞</div>
      <table><thead><tr><th>#</th><th>Medicine</th><th>Dose</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead><tbody>{items.map((r, i) => <tr key={i}><td>{i + 1}</td><td><b>{r.drug}</b><br /><span style={{ fontSize: 10 }}>{genericOf(r.drug)}</span></td><td>{r.dose}</td><td>{r.freq}</td><td>{r.duration}</td><td>{r.instr}</td></tr>)}</tbody></table>
      {(labs.length > 0 || imgs.length > 0) && <p style={{ marginTop: 10 }}><b>Investigations advised:</b> {[...labs.map(c => LAB_TESTS.find(t => t.code === c)?.name), ...imgs].join(', ')}</p>}
      {follow && <p><b>Follow-up:</b> {fDate(follow)}</p>}
      <Sign label={doc.specialization} name={doc.name} />
    </Letterhead>
  )
  const SummaryDoc = () => (
    <Letterhead title="Consultation Summary" meta={[['Patient', `${patient.name} (${patient.id})`], ['Age / Sex', `${ageOf(patient.dob)} yrs / ${patient.gender}`], ['Doctor', doc.name], ['Date', fDate(today())]]}>
      <p><b>Vitals:</b> BP {vit.sys}/{vit.dia} mmHg · Temp {vit.temp}°F · Pulse {vit.pulse}/min · SpO₂ {vit.spo2}% · Wt {vit.weight} kg · Ht {vit.height} cm · BMI {bmi || '—'}</p>
      <p><b>Chief complaints:</b> {complaints || '—'}</p><div><b>Clinical notes:</b><div dangerouslySetInnerHTML={{ __html: notes || '—' }} /></div>
      <p><b>Diagnosis:</b> {dx.map(d => `${d[0]} – ${d[1]}`).join('; ') || '—'}</p>
      {rx.length > 0 && <><b>Prescription:</b><ol style={{ paddingLeft: 18, listStyle: 'decimal' }}>{rx.map((r, i) => <li key={i}>{r.drug} — {r.dose}, {r.freq}, {r.duration} {r.instr && `(${r.instr})`}</li>)}</ol></>}
      {(labs.length > 0 || imgs.length > 0) && <p><b>Investigations:</b> {[...labs, ...imgs].join(', ')}</p>}
      {procedure && <p><b>Procedure notes:</b> {procedure}</p>}{ref.to && <p><b>Referred to:</b> {ref.to} — {ref.reason}</p>}{follow && <p><b>Follow-up on:</b> {fDate(follow)}</p>}
      <Sign label={doc.specialization} name={doc.name} />
    </Letterhead>
  )
  const CertDoc = () => (
    <Letterhead title={`Medical Certificate – ${cert.type}`}>
      <p style={{ lineHeight: 2, fontSize: 13 }}>This is to certify that <b>{patient.name}</b> ({patient.id}), aged <b>{ageOf(patient.dob)} years</b>, {patient.gender}, was examined by me on <b>{fDate(today())}</b>
        {dx.length > 0 && <> and is diagnosed with <b>{dx.map(d => d[1]).join(', ')}</b></>}. {cert.type === 'Sick Leave' ? <>In my opinion, rest and absence from duty/school from <b>{fDate(cert.from)}</b> to <b>{fDate(cert.to)}</b> is necessary for recovery.</> : cert.type === 'Fitness' ? <>The patient has recovered and is <b>fit to resume</b> normal duties with effect from <b>{fDate(cert.from)}</b>.</> : <>The patient is under my treatment since <b>{fDate(cert.from)}</b>.</>}</p>
      {cert.remarks && <p><b>Remarks:</b> {cert.remarks}</p>}
      <Sign label={`${doc.qualification} · ${doc.specialization}`} name={doc.name} />
    </Letterhead>
  )

  const save = () => {
    if (!complaints.trim() && !dx.length) return toast.error('Enter chief complaints or a diagnosis before saving')
    const major = alerts.filter(a => a.sev !== 'Moderate')
    if (major.length && !window.confirm(`There are ${major.length} major drug alert(s):\n\n${major.map(a => '• ' + a.msg).join('\n')}\n\nSave prescription anyway?`)) return
    const diag = dx.map(d => `${d[0]} ${d[1]}`), cid = uid('CON')
    add('consultations', { id: cid, patientId: patient.id, patientName: patient.name, doctorId: doc.id, doctor: doc.name, date: nowISO(), complaints, notes, diagnosis: diag, procedure, followUp: follow })
    if (vit.sys || vit.temp || vit.pulse) add('vitals', { id: uid('VT'), patientId: patient.id, at: nowISO(), ...Object.fromEntries(Object.entries(vit).map(([k, v]) => [k, Number(v) || 0])) })
    let rxId = ''
    if (rx.length) { rxId = nextNo('rx'); add('prescriptions', { id: rxId, patientId: patient.id, patientName: patient.name, doctor: doc.name, date: today(), diagnosis: diag.join('; '), items: rx, status: 'Pending' }) }
    labs.forEach(code => add('labOrders', { id: dbx().nextNo('lab'), patientId: patient.id, patientName: patient.name, doctorId: doc.id, doctor: doc.name, test: code, priority: 'Routine', status: 'Ordered', orderedAt: nowISO() }))
    imgs.forEach(study => add('radOrders', { id: uid('RAD'), patientId: patient.id, patientName: patient.name, doctor: doc.name, study, modality: study.split(' ')[0], priority: 'Routine', status: 'Ordered', date: today(), time: '', equipment: '', findings: '', impression: '' }))
    if (ref.to) add('referrals', { id: uid('REF'), date: today(), patient: patient.name, from: doc.name, to: ref.to, reason: ref.reason, status: 'Pending' })
    if (follow) add('appointments', { id: uid('APT'), patientId: patient.id, patientName: patient.name, doctorId: doc.id, dept: doc.dept, start: new Date(`${follow}T10:00`).toISOString(), end: new Date(`${follow}T10:30`).toISOString(), type: 'Appointment', status: 'Booked', reason: 'Follow-up', sms: true })
    const tk: any = tokens.find((t: any) => t.id === sp.get('token')) || tokens.find((t: any) => t.patientId === patient.id && t.status !== 'Completed')
    if (tk) update('tokens', tk.id, { status: 'Completed', doneAt: nowISO() })
    setSaved({ rxId }); toast.success(`Consultation saved${rxId ? ` · ${rxId} sent to pharmacy` : ''}${labs.length + imgs.length ? ` · ${labs.length + imgs.length} investigation(s) ordered` : ''}`)
  }

  if (!patient) return (
    <>
      <PageHeader title="Doctor Consultation" desc={`${doc.name} · ${doc.dept}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Select patient"><PatientSearch autoFocus onSelect={pick} /><p className="mt-2 text-xs muted">Search any registered patient, or pick from the live OPD queue.</p></Section>
        <Section title="OPD queue" pad={false}><ul className="max-h-96 divide-y overflow-auto">{queue.map((t: any) => <li key={t.id} className="flex items-center gap-3 px-4 py-2.5"><span className="rounded-lg bg-primary px-2 py-1 font-mono text-xs font-bold text-white">{t.no}</span><span className="flex-1 text-sm"><b>{t.patientName}</b><span className="block text-xs muted">{t.dept} · {t.status}</span></span><Button size="sm" onClick={() => { pick(patients.find((p: any) => p.id === t.patientId)); update('tokens', t.id, { status: 'In-Consultation', calledAt: t.calledAt || nowISO() }) }}>Consult</Button></li>)}{!queue.length && <Empty text="No patients in queue" />}</ul></Section>
      </div>
    </>
  )
  const history = pastCons.filter((c: any) => c.patientId === patient.id)
  const V = (k: string, label: string, unit: string, w?: boolean) => <Field key={k} label={`${label} (${unit})`}><Input type="number" value={vit[k]} onChange={e => setVit({ ...vit, [k]: e.target.value })} className={cn(w && 'border-red-500 text-red-600')} /></Field>
  return (
    <>
      <PageHeader title="Doctor Consultation" desc={`${doc.name} · ${doc.dept}`} actions={<>
        <Button variant="outline" onClick={() => printPreview('Consultation summary', <SummaryDoc />)}><Printer />Summary</Button>
        <Button variant="outline" disabled={!rx.length} onClick={() => printPreview('Prescription', <RxDoc />)}><Printer />Prescription</Button>
        {saved ? <Button variant="success" onClick={() => { setPatient(null); nav('/opd/consultation') }}>Next patient</Button> : <Button onClick={save}><Save />Save & complete</Button>}</>} />
      <PatientBanner p={patient} onClear={() => setPatient(null)} extra={saved && <Badge tone="green">Saved</Badge>} />
      <div className="mt-4 grid gap-4 xl:grid-cols-4">
        <div className="space-y-4 xl:col-span-1">
          <Section title="Vitals">
            <div className="grid grid-cols-2 gap-2">
              {V('sys', 'BP sys', 'mmHg', Number(vit.sys) >= 140)}{V('dia', 'BP dia', 'mmHg', Number(vit.dia) >= 90)}{V('temp', 'Temp', '°F', Number(vit.temp) >= 100.4)}{V('pulse', 'Pulse', '/min', Number(vit.pulse) > 100)}
              {V('spo2', 'SpO₂', '%', !!vit.spo2 && Number(vit.spo2) < 94)}{V('weight', 'Weight', 'kg')}{V('height', 'Height', 'cm')}
              <Field label="BMI (auto)"><div className={cn('flex h-9 items-center rounded-lg border px-3 text-sm font-semibold', bmi >= 30 || (bmi && bmi < 18.5) ? 'text-red-600' : bmi >= 25 ? 'text-amber-600' : 'text-emerald-600')}>{bmi || '—'}{bmi ? <span className="ml-1 text-[10px] font-normal muted">{bmi < 18.5 ? 'Under' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Over' : 'Obese'}</span> : null}</div></Field>
            </div>
          </Section>
          <Section title="Previous consultations" pad={false}><ul className="max-h-56 divide-y overflow-auto text-xs">{history.map((c: any) => <li key={c.id} className="px-4 py-2"><b>{fDate(c.date)}</b> · {c.doctor}<div className="muted">{c.diagnosis?.join('; ') || c.complaints}</div></li>)}{!history.length && <li className="px-4 py-3 muted">First consultation for this patient.</li>}</ul></Section>
        </div>
        <div className="card xl:col-span-3">
          <div className="px-4 pt-2"><Tabs className="mb-0" value={tab} onChange={setTab} tabs={[{ id: 'notes', label: 'Complaints & notes' }, { id: 'dx', label: 'Diagnosis', badge: dx.length }, { id: 'rx', label: 'Prescription', badge: rx.length }, { id: 'inv', label: 'Investigations', badge: labs.length + imgs.length }, { id: 'plan', label: 'Procedure · Referral · Follow-up' }, { id: 'cert', label: 'Certificate' }]} /></div>
          <div className="p-4">
            {tab === 'notes' && <div className="space-y-4">
              <Field label="Chief complaints"><Textarea rows={2} value={complaints} onChange={e => setComplaints(e.target.value)} placeholder="Type or click a shortcut below…" /></Field>
              <div className="flex flex-wrap gap-1.5">{COMPLAINT_TEMPLATES.map(c => <button key={c} onClick={() => setComplaints(v => (v ? `${v}, ${c}` : c))} className="rounded-full border px-2.5 py-1 text-xs transition hover:border-primary hover:bg-blue-50 hover:text-primary dark:hover:bg-blue-500/10">+ {c}</button>)}</div>
              <div><span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Clinical notes / examination findings</span><RichText value={notes} onChange={setNotes} /></div>
            </div>}
            {tab === 'dx' && <div className="space-y-3">
              <div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><input aria-label="ICD-10 search" className="input pl-8" placeholder="Search ICD-10 by code or description (e.g. I10, diabetes, fever)…" value={dq} onChange={e => setDq(e.target.value)} />
                {icdHits.length > 0 && <ul role="listbox" className="card absolute z-20 mt-1 w-full p-1 shadow-xl">{icdHits.map(h => <li key={h[0]}><button className="flex w-full items-center gap-3 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-500/10" onClick={() => { setDx([...dx, h]); setDq('') }}><span className="w-16 font-mono text-xs font-bold text-primary dark:text-blue-400">{h[0]}</span>{h[1]}</button></li>)}</ul>}</div>
              <ul className="space-y-2">{dx.map((d, i) => <li key={d[0]} className="flex items-center gap-3 rounded-lg border px-3 py-2"><Badge tone={i === 0 ? 'blue' : 'slate'}>{i === 0 ? 'Primary' : 'Secondary'}</Badge><span className="font-mono text-xs font-bold">{d[0]}</span><span className="flex-1 text-sm">{d[1]}</span><Button variant="ghost" size="icon" aria-label="Remove diagnosis" onClick={() => setDx(dx.filter(x => x !== d))}><Trash2 /></Button></li>)}</ul>
              {!dx.length && <Empty text="No diagnosis added — search ICD-10 above" />}
            </div>}
            {tab === 'rx' && <div className="space-y-3">
              {alerts.length > 0 && <div role="alert" className="space-y-1.5">{alerts.map((a, i) => <div key={i} className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-sm', a.sev === 'Moderate' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-red-400 bg-red-50 text-red-800')}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span><b>{a.sev === 'Allergy' ? 'ALLERGY ALERT' : `${a.sev} interaction`}:</b> {a.msg}</span></div>)}</div>}
              <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium muted">Templates:</span>{templates.map((t: any) => <button key={t.id} onClick={() => { setRx([...rx, ...t.items]); toast.info(`Template "${t.name}" applied`) }} className="rounded-full border px-2.5 py-1 text-xs hover:border-primary hover:text-primary">{t.name}</button>)}
                <div className="ml-auto flex gap-1"><Input aria-label="Template name" placeholder="Save current as template…" className="h-8 w-48 text-xs" value={tplName} onChange={e => setTplName(e.target.value)} /><Button size="sm" variant="outline" disabled={!tplName || !rx.length} onClick={() => { add('rxTemplates', { id: uid('RT'), name: tplName, items: rx }); setTplName(''); toast.success('Template saved') }}>Save</Button></div></div>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/40 md:grid-cols-12">
                <div className="relative col-span-2 md:col-span-4"><Input aria-label="Drug name" placeholder="Drug name (brand or generic)…" value={cur.drug} onChange={e => setCur({ ...cur, drug: e.target.value })} />
                  {drugHits.length > 0 && <ul role="listbox" className="card absolute z-20 mt-1 w-full p-1 shadow-xl">{drugHits.map((m: any) => { const stock = m.batches.reduce((t: number, b: any) => t + b.qty, 0); return <li key={m.id}><button className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-500/10" onClick={() => setCur({ ...cur, drug: m.name, dose: m.form === 'Tablet' || m.form === 'Capsule' ? '1 tab' : m.form === 'Syrup' ? '5 ml' : '1 unit' })}><span><b>{m.name}</b> <span className="text-xs muted">{m.generic} · {m.form}</span></span><Badge tone={stock < m.reorder ? 'red' : 'green'}>{stock} in stock</Badge></button></li> })}</ul>}</div>
                <Input aria-label="Dose" className="md:col-span-1" placeholder="Dose" value={cur.dose} onChange={e => setCur({ ...cur, dose: e.target.value })} />
                <Select aria-label="Frequency" className="md:col-span-2" value={cur.freq} onChange={e => setCur({ ...cur, freq: e.target.value })} options={FREQ} />
                <Input aria-label="Duration" className="md:col-span-2" placeholder="Duration" value={cur.duration} onChange={e => setCur({ ...cur, duration: e.target.value })} />
                <Input aria-label="Instructions" className="md:col-span-2" placeholder="Instructions" value={cur.instr} onChange={e => setCur({ ...cur, instr: e.target.value })} />
                <Button className="col-span-2 md:col-span-1" disabled={!cur.drug.trim()} onClick={() => { setRx([...rx, cur]); setCur(blankRx) }}><Plus />Add</Button>
              </div>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase muted"><tr><th className="py-2">Medicine</th><th>Dose</th><th>Frequency</th><th>Duration</th><th>Instructions</th><th /></tr></thead>
                <tbody className="divide-y">{rx.map((r, i) => <tr key={i}><td className="py-2"><b>{r.drug}</b><div className="text-xs muted">{genericOf(r.drug)}</div></td><td>{r.dose}</td><td>{r.freq}</td><td>{r.duration}</td><td>{r.instr}</td><td className="text-right"><Button variant="ghost" size="icon" aria-label="Remove medicine" onClick={() => setRx(rx.filter((_, j) => j !== i))}><Trash2 /></Button></td></tr>)}</tbody></table></div>
              {!rx.length && <Empty text="No medicines added" />}
            </div>}
            {tab === 'inv' && <div className="grid gap-4 md:grid-cols-2">
              <div><h4 className="mb-2 text-sm font-semibold">Laboratory tests</h4><div className="space-y-2">{LAB_TESTS.map(t => <Check key={t.code} label={<span>{t.name} <span className="muted">· {t.sample}</span></span>} checked={labs.includes(t.code)} onChange={v => setLabs(v ? [...labs, t.code] : labs.filter(x => x !== t.code))} />)}</div></div>
              <div><h4 className="mb-2 text-sm font-semibold">Imaging / radiology</h4><div className="space-y-2">{IMAGING.map(t => <Check key={t} label={t} checked={imgs.includes(t)} onChange={v => setImgs(v ? [...imgs, t] : imgs.filter(x => x !== t))} />)}</div></div>
            </div>}
            {tab === 'plan' && <div className="grid gap-4 md:grid-cols-2">
              <Field label="Procedure notes" className="md:col-span-2"><Textarea rows={3} value={procedure} onChange={e => setProcedure(e.target.value)} placeholder="e.g. Wound dressing done under aseptic precautions…" /></Field>
              <Field label="Refer to specialist / department"><Select value={ref.to} onChange={e => setRef({ ...ref, to: e.target.value })} placeholder="No referral" options={doctors.filter((d: any) => d.id !== doc.id).map((d: any) => ({ value: d.name, label: `${d.name} · ${d.dept}` }))} /></Field>
              <Field label="Reason for referral"><Input value={ref.reason} onChange={e => setRef({ ...ref, reason: e.target.value })} /></Field>
              <Field label="Follow-up date" hint="An appointment is booked automatically on save"><Input type="date" min={today()} value={follow} onChange={e => setFollow(e.target.value)} /></Field>
              <div className="flex items-end gap-1.5">{[3, 7, 14, 30].map(n => <Button key={n} variant="outline" size="sm" onClick={() => setFollow(dOff(n))}>+{n} days</Button>)}</div>
            </div>}
            {tab === 'cert' && <div className="grid gap-3 md:grid-cols-3">
              <Field label="Certificate type"><Select value={cert.type} onChange={e => setCert({ ...cert, type: e.target.value })} options={['Sick Leave', 'Fitness', 'Under Treatment']} /></Field>
              <Field label="From"><Input type="date" value={cert.from} onChange={e => setCert({ ...cert, from: e.target.value })} /></Field>
              <Field label="To"><Input type="date" value={cert.to} onChange={e => setCert({ ...cert, to: e.target.value })} disabled={cert.type !== 'Sick Leave'} /></Field>
              <Field label="Remarks" className="md:col-span-3"><Textarea rows={2} value={cert.remarks} onChange={e => setCert({ ...cert, remarks: e.target.value })} /></Field>
              <div><Button onClick={() => printPreview('Medical certificate', <CertDoc />)}><FileBadge />Generate certificate</Button></div>
            </div>}
          </div>
        </div>
      </div>
    </>
  )
}
