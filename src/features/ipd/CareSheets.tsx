import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Activity, Droplet, Plus, Save, Syringe } from 'lucide-react'
import { toast, useAuth, useColl, useDB } from '@/app/store'
import { PatientBanner } from '@/components/common'
import { LineC } from '@/components/charts'
import { Badge, Button, Check, Empty, Field, Input, PageHeader, Section, Select, Status, Tabs, Textarea } from '@/components/ui'
import { cn, fDT, nowISO, today, uid } from '@/utils'

const FALL: [string, number][] = [['History of falling (last 3 months)', 25], ['Secondary diagnosis', 15], ['Uses ambulatory aid (crutch / walker)', 15], ['IV / heparin lock in place', 20], ['Impaired or weak gait', 20], ['Forgets limitations / confused', 15]]
const FACES = ['😀', '🙂', '🙂', '😐', '😐', '🙁', '🙁', '😣', '😣', '😖', '😭']

export default function CareSheets() {
  const [sp, setSp] = useSearchParams(), user = useAuth(s => s.user)!, { add, update } = useDB()
  const [adm, patients, vitals, notes, mar, iv, diet, plans] = ['admissions', 'patients', 'vitals', 'careNotes', 'mar', 'ivFluids', 'dietOrders', 'dietPlans'].map(useColl)
  const active = adm.filter((a: any) => a.status === 'Admitted')
  const [pid, setPid] = useState(sp.get('patient') || active[0]?.patientId || ''), [tab, setTab] = useState(sp.get('tab') || 'nursing')
  useEffect(() => { if (sp.get('patient')) setSp({}, { replace: true }) }, []) // eslint-disable-line
  const a: any = active.find((x: any) => x.patientId === pid), p: any = patients.find((x: any) => x.id === pid)
  const [text, setText] = useState(''), [v, setV] = useState<any>({ sys: '', dia: '', temp: '', pulse: '', spo2: '', rr: '' })
  const [m, setM] = useState({ drug: '', route: 'Oral', time: '08:00' }), [fl, setFl] = useState({ fluid: 'Normal Saline 500ml', rate: '100 ml/hr', volume: 500 })
  const [pain, setPain] = useState(0), [fall, setFall] = useState<Record<string, boolean>>({}), [wound, setWound] = useState({ site: '', appearance: 'Clean, granulating', dressing: '' }), [dt, setDt] = useState({ plan: 'Normal', meal: 'Lunch', instructions: '' })
  const pv = useMemo(() => vitals.filter((x: any) => x.patientId === pid).sort((x: any, y: any) => x.at.localeCompare(y.at)), [vitals, pid])
  const chart = pv.slice(-12).map((x: any) => ({ name: format(new Date(x.at), 'dd/MM HH:mm'), Systolic: x.sys, Diastolic: x.dia, Pulse: x.pulse, 'SpO₂': x.spo2, Temp: x.temp }))
  const pn = (kind: string) => notes.filter((n: any) => n.patientId === pid && n.kind === kind)
  const note = (kind: string, t: string, extra: any = {}) => { if (!t.trim()) return toast.error('Enter note text'); add('careNotes', { id: uid('CN'), patientId: pid, kind, at: nowISO(), by: user.name, text: t, ...extra }); setText(''); toast.success('Saved') }
  const fallScore = FALL.reduce((t, [k, s]) => t + (fall[k] ? s : 0), 0), fallRisk = fallScore >= 45 ? 'High' : fallScore >= 25 ? 'Medium' : 'Low'
  const NoteList = ({ kind }: { kind: string }) => <ul className="mt-4 divide-y rounded-lg border">{pn(kind).map((n: any) => <li key={n.id} className="px-3 py-2 text-sm"><div className="flex justify-between text-xs muted"><span className="font-semibold text-slate-700 dark:text-slate-200">{n.by}</span><span>{fDT(n.at)}</span></div>{n.score != null && <Badge tone={n.score >= 7 || n.risk === 'High' ? 'red' : n.score >= 4 || n.risk === 'Medium' ? 'amber' : 'green'}>{n.risk ? `${n.risk} risk · ` : 'Pain '}{n.score}{n.risk ? '' : '/10'}</Badge>} {n.text}</li>)}{!pn(kind).length && <Empty text="No entries yet" />}</ul>
  const noteForm = (kind: string, ph: string) => <div><Textarea rows={3} placeholder={ph} value={text} onChange={e => setText(e.target.value)} /><Button className="mt-2" onClick={() => note(kind, text)}><Save />Save entry</Button><NoteList kind={kind} /></div>
  if (!active.length) return <Empty text="No admitted patients" />
  return (
    <>
      <PageHeader title="Patient Care Sheets" desc="Nursing documentation for admitted patients" actions={<Select aria-label="Patient" className="w-72" value={pid} onChange={e => { setPid(e.target.value); setText('') }} options={active.map((x: any) => ({ value: x.patientId, label: `${x.bedId} · ${x.patientName}` }))} />} />
      {p && a && <PatientBanner p={p} extra={<div className="text-right text-xs"><div className="font-semibold">{a.bedId} · {a.ward}</div><div className="muted">{a.doctor} · {a.diagnosis}</div></div>} />}
      <div className="card mt-4">
        <div className="px-4 pt-2"><Tabs className="mb-0" value={tab} onChange={t => { setTab(t); setText('') }} tabs={[{ id: 'nursing', label: 'Nursing notes' }, { id: 'vitals', label: 'Vitals chart' }, { id: 'mar', label: 'MAR', badge: mar.filter((x: any) => x.patientId === pid && x.status === 'Pending').length }, { id: 'iv', label: 'IV fluids' }, { id: 'diet', label: 'Diet chart' }, { id: 'rounds', label: 'Doctor rounds' }, { id: 'pain', label: 'Pain scale' }, { id: 'fall', label: 'Fall risk' }, { id: 'wound', label: 'Wound care' }]} /></div>
        <div className="p-4">
          {tab === 'nursing' && noteForm('nursing', 'Shift notes: general condition, intake/output, observations…')}
          {tab === 'rounds' && noteForm('rounds', 'Doctor round notes: assessment, plan, orders…')}
          {tab === 'vitals' && <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 md:grid-cols-7">{[['sys', 'BP sys'], ['dia', 'BP dia'], ['temp', 'Temp °F'], ['pulse', 'Pulse'], ['spo2', 'SpO₂ %'], ['rr', 'Resp. rate']].map(([k, l]) => <Field key={k} label={l}><Input type="number" value={v[k]} onChange={e => setV({ ...v, [k]: e.target.value })} /></Field>)}
              <div className="flex items-end"><Button className="w-full" onClick={() => { if (!v.sys && !v.temp && !v.pulse) return toast.error('Enter at least one vital sign'); add('vitals', { id: uid('VT'), patientId: pid, at: nowISO(), ...Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Number(x) || 0])) }); setV({ sys: '', dia: '', temp: '', pulse: '', spo2: '', rr: '' }); toast.success('Vitals recorded') }}><Plus />Record</Button></div></div>
            <div className="grid gap-4 lg:grid-cols-2"><Section title="Blood pressure & pulse"><LineC data={chart} keys={['Systolic', 'Diastolic', 'Pulse']} height={220} /></Section><Section title="Temperature & SpO₂"><LineC data={chart} keys={['Temp', 'SpO₂']} height={220} colors={['#DC2626', '#0D9488']} /></Section></div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase muted"><tr><th className="py-1.5">Time</th><th>BP</th><th>Temp</th><th>Pulse</th><th>SpO₂</th><th>RR</th></tr></thead><tbody className="divide-y">{[...pv].reverse().slice(0, 8).map((x: any) => <tr key={x.id}><td className="py-1.5">{fDT(x.at)}</td><td className={cn(x.sys >= 140 && 'font-semibold text-red-600')}>{x.sys}/{x.dia}</td><td className={cn(x.temp >= 100.4 && 'font-semibold text-red-600')}>{x.temp}</td><td className={cn(x.pulse > 100 && 'font-semibold text-red-600')}>{x.pulse}</td><td className={cn(x.spo2 && x.spo2 < 94 && 'font-semibold text-red-600')}>{x.spo2}</td><td>{x.rr || '—'}</td></tr>)}</tbody></table></div>
          </div>}
          {tab === 'mar' && <div>
            <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5"><Input aria-label="Drug" className="col-span-2" placeholder="Drug & dose (e.g. Inj. Pantoprazole 40mg)" value={m.drug} onChange={e => setM({ ...m, drug: e.target.value })} /><Select aria-label="Route" value={m.route} onChange={e => setM({ ...m, route: e.target.value })} options={['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhalation']} /><Input aria-label="Time" type="time" value={m.time} onChange={e => setM({ ...m, time: e.target.value })} />
              <Button onClick={() => { if (!m.drug.trim()) return toast.error('Enter drug'); add('mar', { id: uid('MAR'), patientId: pid, patientName: p.name, ward: a.ward, bedId: a.bedId, ...m, date: today(), status: 'Pending', by: '' }); setM({ ...m, drug: '' }) }}><Plus />Schedule dose</Button></div>
            <table className="w-full text-sm"><thead className="text-left text-xs uppercase muted"><tr><th className="py-1.5">Time</th><th>Medication</th><th>Route</th><th>Status</th><th>Given by</th><th /></tr></thead>
              <tbody className="divide-y">{mar.filter((x: any) => x.patientId === pid).sort((x: any, y: any) => x.time.localeCompare(y.time)).map((x: any) => <tr key={x.id}><td className="py-2 font-mono">{x.time}</td><td className="font-medium">{x.drug}</td><td>{x.route}</td><td><Status v={x.status} /></td><td className="text-xs muted">{x.by || '—'}</td>
                <td className="text-right">{x.status === 'Pending' && <div className="flex justify-end gap-1"><Button size="xs" variant="success" onClick={() => update('mar', x.id, { status: 'Given', by: user.name, givenAt: nowISO() })}><Syringe />Given</Button><Button size="xs" variant="outline" onClick={() => update('mar', x.id, { status: 'Missed', by: user.name })}>Missed</Button></div>}</td></tr>)}</tbody></table>
          </div>}
          {tab === 'iv' && <div>
            <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4"><Select aria-label="Fluid" value={fl.fluid} onChange={e => setFl({ ...fl, fluid: e.target.value })} options={['Normal Saline 500ml', 'Ringer Lactate 500ml', 'DNS 500ml', 'Dextrose 5% 500ml', 'Mannitol 100ml']} /><Input aria-label="Rate" value={fl.rate} onChange={e => setFl({ ...fl, rate: e.target.value })} /><Input aria-label="Volume (ml)" type="number" value={fl.volume} onChange={e => setFl({ ...fl, volume: Number(e.target.value) })} /><Button onClick={() => { add('ivFluids', { id: uid('IV'), patientId: pid, ...fl, start: nowISO(), infused: 0, status: 'Running' }); toast.success('IV fluid started') }}><Droplet />Start infusion</Button></div>
            <ul className="space-y-2">{iv.filter((x: any) => x.patientId === pid).map((x: any) => <li key={x.id} className="rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span><b>{x.fluid}</b> @ {x.rate} <span className="text-xs muted">· started {fDT(x.start)}</span></span><span className="flex items-center gap-2"><Status v={x.status === 'Running' ? 'In-Progress' : x.status} />{x.status === 'Running' && <><Button size="xs" variant="outline" onClick={() => update('ivFluids', x.id, { infused: Math.min(x.volume, x.infused + 100) })}>+100 ml</Button><Button size="xs" variant="success" onClick={() => update('ivFluids', x.id, { infused: x.volume, status: 'Completed' })}>Complete</Button></>}</span></div>
              <div className="mt-2 flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(x.infused / x.volume) * 100}%` }} /></div><span className="text-xs muted">{x.infused}/{x.volume} ml</span></div></li>)}{!iv.some((x: any) => x.patientId === pid) && <Empty text="No IV fluids running" />}</ul>
          </div>}
          {tab === 'diet' && <div>
            <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4"><Select aria-label="Diet plan" value={dt.plan} onChange={e => setDt({ ...dt, plan: e.target.value })} options={plans.map((x: any) => x.name)} /><Select aria-label="Meal" value={dt.meal} onChange={e => setDt({ ...dt, meal: e.target.value })} options={['Breakfast', 'Lunch', 'Dinner']} /><Input aria-label="Special instructions" placeholder="Special instructions" value={dt.instructions} onChange={e => setDt({ ...dt, instructions: e.target.value })} /><Button onClick={() => { add('dietOrders', { id: uid('DO'), date: today(), patient: p.name, patientId: pid, ward: a.ward, bed: a.bedId, ...dt, status: 'Pending' }); toast.success('Diet order sent to kitchen') }}><Plus />Order diet</Button></div>
            <table className="w-full text-sm"><thead className="text-left text-xs uppercase muted"><tr><th className="py-1.5">Date</th><th>Meal</th><th>Plan</th><th>Instructions</th><th>Status</th></tr></thead><tbody className="divide-y">{diet.filter((x: any) => x.patientId === pid).map((x: any) => <tr key={x.id}><td className="py-2">{x.date}</td><td>{x.meal}</td><td><Badge tone={x.plan === 'NPO' ? 'red' : 'blue'}>{x.plan}</Badge></td><td>{x.instructions || '—'}</td><td><Status v={x.status} /></td></tr>)}</tbody></table>
          </div>}
          {tab === 'pain' && <div>
            <p className="mb-2 text-sm font-medium">Numeric pain rating scale (0 = no pain, 10 = worst possible)</p>
            <div className="grid grid-cols-11 gap-1" role="radiogroup" aria-label="Pain score">{FACES.map((f, i) => <button key={i} role="radio" aria-checked={pain === i} onClick={() => setPain(i)} className={cn('flex flex-col items-center rounded-lg border py-2 transition', pain === i ? 'scale-105 border-transparent text-white shadow ' + (i >= 7 ? 'bg-red-600' : i >= 4 ? 'bg-amber-500' : 'bg-emerald-600') : 'hover:bg-slate-50 dark:hover:bg-slate-800')}><span className="text-xl">{f}</span><span className="text-sm font-bold">{i}</span></button>)}</div>
            <div className="mt-3 flex gap-2"><Input aria-label="Pain notes" placeholder="Location, character, intervention given…" value={text} onChange={e => setText(e.target.value)} /><Button onClick={() => note('pain', text || `Pain score ${pain}/10 recorded`, { score: pain })}><Save />Record</Button></div><NoteList kind="pain" />
          </div>}
          {tab === 'fall' && <div className="grid gap-4 lg:grid-cols-2">
            <div><p className="mb-2 text-sm font-medium">Morse Fall Scale</p><div className="space-y-2">{FALL.map(([k, s]) => <label key={k} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"><span className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-blue-800" checked={!!fall[k]} onChange={e => setFall({ ...fall, [k]: e.target.checked })} />{k}</span><Badge>+{s}</Badge></label>)}</div></div>
            <div><div className={cn('rounded-xl p-5 text-center text-white', fallRisk === 'High' ? 'bg-red-600' : fallRisk === 'Medium' ? 'bg-amber-500' : 'bg-emerald-600')}><div className="text-xs uppercase tracking-widest opacity-90">Total score</div><div className="text-5xl font-black">{fallScore}</div><div className="text-lg font-semibold">{fallRisk} risk</div><div className="mt-1 text-xs opacity-90">{fallRisk === 'High' ? 'Bed rails up · fall-risk band · assist with ambulation' : fallRisk === 'Medium' ? 'Standard fall precautions, supervise ambulation' : 'Basic nursing care'}</div></div>
              <Button className="mt-3 w-full" onClick={() => note('fall', `Morse score ${fallScore}: ${Object.keys(fall).filter(k => fall[k]).join('; ') || 'no risk factors'}`, { score: fallScore, risk: fallRisk })}><Save />Save assessment</Button><NoteList kind="fall" /></div>
          </div>}
          {tab === 'wound' && <div>
            <div className="grid gap-2 md:grid-cols-4"><Input aria-label="Wound site" placeholder="Site (e.g. RIF surgical wound)" value={wound.site} onChange={e => setWound({ ...wound, site: e.target.value })} /><Select aria-label="Appearance" value={wound.appearance} onChange={e => setWound({ ...wound, appearance: e.target.value })} options={['Clean, granulating', 'Erythema present', 'Serous discharge', 'Purulent discharge', 'Slough / necrosis', 'Healed']} /><Input aria-label="Dressing" placeholder="Dressing done / next due" value={wound.dressing} onChange={e => setWound({ ...wound, dressing: e.target.value })} />
              <Button onClick={() => { if (!wound.site) return toast.error('Enter wound site'); note('wound', `${wound.site} — ${wound.appearance}. ${wound.dressing}`); setWound({ ...wound, site: '', dressing: '' }) }}><Activity />Save wound note</Button></div><NoteList kind="wound" />
          </div>}
        </div>
      </div>
    </>
  )
}
