import { useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { CalendarPlus, Save, Scissors } from 'lucide-react'
import { toast, useColl, useDB } from '@/app/store'
import { PatientBanner, PatientSearch } from '@/components/common'
import { BarC, PieC } from '@/components/charts'
import { Button, Checklist, DataTable, Field, Input, Modal, PageHeader, Section, Select, Stat, Status, Tabs, Textarea } from '@/components/ui'
import { fDate, groupSum, today, uid } from '@/utils'

const PREOP = ['Informed consent signed', 'Patient identity & surgical site marked', 'NPO status confirmed (≥ 6 hours)', 'Pre-anaesthetic check-up done', 'Blood arranged / cross-matched', 'Investigations reviewed', 'Antibiotic prophylaxis given', 'Jewellery / dentures removed', 'Allergies verified']
const EQUIPL = ['Anaesthesia machine checked', 'Monitors & defibrillator functional', 'Suction apparatus working', 'Instrument set sterile & counted', 'Cautery / diathermy tested', 'OT lights & table checked', 'Implants / special equipment available', 'Emergency drugs tray ready']
const TH = ['OT-1', 'OT-2', 'OT-3'], COLOR: Record<string, string> = { 'OT-1': '#1E40AF', 'OT-2': '#0D9488', 'OT-3': '#7C3AED' }
const blank = { patient: null as any, procedure: '', surgeon: '', anesthetist: 'Dr. K. Rao', theatre: 'OT-1', date: today(), time: '09:00', duration: 90, anesthesia: 'General' }

export default function OT() {
  const { add, update } = useDB(), list = useColl('otBookings'), doctors = useColl('doctors')
  const [tab, setTab] = useState('calendar'), [form, setForm] = useState<any | null>(null), [open, setOpen] = useState<any | null>(null), [sub, setSub] = useState('preop')
  const events = useMemo(() => list.map((b: any) => { const s = new Date(`${b.date}T${b.time}`); return { id: b.id, title: `${b.theatre} · ${b.procedure} — ${b.patientName}`, start: s, end: new Date(+s + b.duration * 6e4), backgroundColor: COLOR[b.theatre], borderColor: COLOR[b.theatre] } }), [list])
  const book = () => {
    const f = form
    if (!f.patient || !f.procedure.trim() || !f.surgeon) return toast.error('Patient, procedure and surgeon are required')
    const s = +new Date(`${f.date}T${f.time}`), e = s + f.duration * 6e4
    if (list.some((b: any) => b.theatre === f.theatre && b.status !== 'Cancelled' && +new Date(`${b.date}T${b.time}`) < e && +new Date(`${b.date}T${b.time}`) + b.duration * 6e4 > s)) return toast.error(`${f.theatre} is already booked during that time`)
    add('otBookings', { id: uid('OT'), patientId: f.patient.id, patientName: f.patient.name, procedure: f.procedure, surgeon: f.surgeon, anesthetist: f.anesthetist, theatre: f.theatre, date: f.date, time: f.time, duration: Number(f.duration), anesthesia: f.anesthesia, status: 'Scheduled', preop: {}, equip: {}, intraNotes: '', postNotes: '', outcome: '', anesRecord: {} })
    toast.success('Operation theatre booked'); setForm(null)
  }
  const cur = open, setCur = (p: any) => setOpen({ ...open, ...p })
  const save = (extra: any = {}) => { const { id, ...r } = { ...open, ...extra }; update('otBookings', id, r); toast.success('OT record saved'); setOpen(null) }
  const hours = TH.map(t => ({ name: t, 'Hours used': +(list.filter((b: any) => b.theatre === t && b.status !== 'Cancelled').reduce((s: number, b: any) => s + b.duration, 0) / 60).toFixed(1), 'Available (8h × 7d)': 56 }))
  const done = list.filter((b: any) => b.status === 'Completed')
  return (
    <>
      <PageHeader title="Operation Theatre" desc="Scheduling, checklists, operative notes and utilisation" actions={<Button onClick={() => setForm({ ...blank, surgeon: doctors[0].name })}><CalendarPlus />Book OT</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat icon={Scissors} label="Surgeries today" value={list.filter((b: any) => b.date === today()).length} /><Stat icon={Scissors} label="In surgery now" tone="red" value={list.filter((b: any) => b.status === 'In Surgery').length} /><Stat icon={Scissors} label="Scheduled (upcoming)" tone="amber" value={list.filter((b: any) => b.status === 'Scheduled').length} /><Stat icon={Scissors} label="Success rate" tone="green" value={`${done.length ? Math.round((done.filter((b: any) => b.outcome !== 'Complication').length / done.length) * 100) : 100}%`} /></div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'calendar', label: 'OT calendar' }, { id: 'list', label: 'Bookings' }, { id: 'util', label: 'Utilisation report' }]} />
      {tab === 'calendar' && <div className="card p-3"><div className="mb-2 flex gap-4 text-xs">{TH.map(t => <span key={t} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR[t] }} />{t}</span>)}</div>
        <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView={window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek'} headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }} events={events} allDaySlot={false} slotMinTime="07:00:00" slotMaxTime="20:00:00" height="auto" nowIndicator selectable
          select={i => setForm({ ...blank, surgeon: doctors[0].name, date: i.startStr.slice(0, 10), time: i.startStr.slice(11, 16) || '09:00' })} eventClick={i => { setSub('preop'); setOpen({ ...list.find((b: any) => b.id === i.event.id) }) }} /></div>}
      {tab === 'list' && <Section pad={false}><DataTable rows={list} exportName="OT bookings" onRow={r => { setSub('preop'); setOpen({ ...r }) }} cols={[{ key: 'id', label: 'Booking', className: 'font-mono text-xs' }, { key: 'date', label: 'Date', render: (r: any) => `${fDate(r.date)} ${r.time}` }, { key: 'theatre', label: 'Theatre' }, { key: 'patientName', label: 'Patient' }, { key: 'procedure', label: 'Procedure' }, { key: 'surgeon', label: 'Surgeon' }, { key: 'anesthetist', label: 'Anaesthetist' }, { key: 'duration', label: 'Est. min' }, { key: 'status', label: 'Status', render: (r: any) => <Status v={r.status} /> }]} /></Section>}
      {tab === 'util' && <div className="grid gap-4 lg:grid-cols-3"><Section title="Theatre utilisation (hours)" className="lg:col-span-2"><BarC data={hours} keys={['Hours used', 'Available (8h × 7d)']} colors={['#1E40AF', '#cbd5e1']} /></Section><Section title="Anaesthesia type"><PieC data={groupSum(list, (b: any) => b.anesthesia)} /></Section><Section title="Surgeries by surgeon" className="lg:col-span-2"><BarC data={groupSum(list, (b: any) => b.surgeon.replace('Dr. ', ''))} horizontal /></Section><Section title="Status"><PieC data={groupSum(list, (b: any) => b.status)} /></Section></div>}

      <Modal open={!!form} onClose={() => setForm(null)} title="OT booking form" footer={<><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button onClick={book}>Confirm booking</Button></>}>
        {form && <div className="space-y-3">{form.patient ? <PatientBanner p={form.patient} onClear={() => setForm({ ...form, patient: null })} /> : <PatientSearch autoFocus onSelect={p => setForm({ ...form, patient: p })} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Procedure" required className="sm:col-span-2"><Input value={form.procedure} onChange={e => setForm({ ...form, procedure: e.target.value })} list="procs" /><datalist id="procs">{['Laparoscopic Appendectomy', 'Laparoscopic Cholecystectomy', 'Total Knee Replacement', 'C-Section', 'Cataract Surgery', 'Hernia Repair', 'CABG', 'Tonsillectomy'].map(p => <option key={p}>{p}</option>)}</datalist></Field>
            <Field label="Surgeon" required><Select value={form.surgeon} onChange={e => setForm({ ...form, surgeon: e.target.value })} options={doctors.map((d: any) => d.name)} /></Field>
            <Field label="Anaesthesiologist"><Select value={form.anesthetist} onChange={e => setForm({ ...form, anesthetist: e.target.value })} options={['Dr. K. Rao', 'Dr. S. Haider', 'Dr. N. Bose']} /></Field>
            <Field label="Theatre"><Select value={form.theatre} onChange={e => setForm({ ...form, theatre: e.target.value })} options={TH} /></Field>
            <Field label="Anaesthesia type"><Select value={form.anesthesia} onChange={e => setForm({ ...form, anesthesia: e.target.value })} options={['General', 'Spinal', 'Epidural', 'Local', 'Regional block', 'Sedation']} /></Field>
            <Field label="Date"><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2"><Field label="Start time"><Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></Field><Field label="Est. duration (min)"><Input type="number" step={15} min={15} value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} /></Field></div>
          </div></div>}
      </Modal>

      <Modal open={!!cur} onClose={() => setOpen(null)} size="lg" title={<span className="flex flex-wrap items-center gap-2">{cur?.procedure}<Status v={cur?.status} /><span className="text-xs font-normal muted">{cur?.patientName} · {cur?.theatre} · {cur && fDate(cur.date)} {cur?.time} · {cur?.surgeon}</span></span>}
        footer={<>{cur?.status === 'Scheduled' && <Button variant="danger" className="mr-auto" onClick={() => { if (PREOP.some(i => !cur.preop?.[i])) return toast.error('Complete the pre-operative checklist before starting surgery'); save({ status: 'In Surgery' }) }}>Start surgery</Button>}{cur?.status === 'In Surgery' && <Button variant="success" className="mr-auto" onClick={() => save({ status: 'Completed', outcome: cur.outcome || 'Successful' })}>Complete surgery</Button>}<Button variant="outline" onClick={() => setOpen(null)}>Close</Button><Button onClick={() => save()}><Save />Save</Button></>}>
        {cur && <><Tabs value={sub} onChange={setSub} tabs={[{ id: 'preop', label: 'Pre-op checklist' }, { id: 'equip', label: 'Equipment' }, { id: 'anes', label: 'Anaesthesia record' }, { id: 'intra', label: 'Intra-operative' }, { id: 'post', label: 'Post-operative' }]} />
          {sub === 'preop' && <Checklist items={PREOP} value={cur.preop || {}} onChange={preop => setCur({ preop })} cols={2} />}
          {sub === 'equip' && <Checklist items={EQUIPL} value={cur.equip || {}} onChange={equip => setCur({ equip })} cols={2} />}
          {sub === 'anes' && <div className="grid gap-3 sm:grid-cols-3">{[['asa', 'ASA grade'], ['induction', 'Induction agent'], ['airway', 'Airway (ETT / LMA size)'], ['start', 'Anaesthesia start'], ['end', 'Anaesthesia end'], ['fluids', 'IV fluids given (ml)'], ['blood', 'Blood loss (ml)'], ['urine', 'Urine output (ml)'], ['recovery', 'Recovery score (Aldrete)']].map(([k, l]) => <Field key={k} label={l}><Input value={cur.anesRecord?.[k] || ''} onChange={e => setCur({ anesRecord: { ...cur.anesRecord, [k]: e.target.value } })} /></Field>)}<Field label="Anaesthesia notes / complications" className="sm:col-span-3"><Textarea rows={2} value={cur.anesRecord?.notes || ''} onChange={e => setCur({ anesRecord: { ...cur.anesRecord, notes: e.target.value } })} /></Field></div>}
          {sub === 'intra' && <Field label="Intra-operative notes"><Textarea rows={8} value={cur.intraNotes} onChange={e => setCur({ intraNotes: e.target.value })} placeholder="Incision, findings, procedure steps, implants used, swab & instrument count, specimens sent…" /></Field>}
          {sub === 'post' && <div className="space-y-3"><Field label="Post-operative notes & orders"><Textarea rows={6} value={cur.postNotes} onChange={e => setCur({ postNotes: e.target.value })} placeholder="Condition on shifting, analgesia, antibiotics, drain care, diet, monitoring…" /></Field><Field label="Outcome"><Select value={cur.outcome || ''} onChange={e => setCur({ outcome: e.target.value })} placeholder="Select…" options={['Successful', 'Complication', 'Converted to open', 'Abandoned']} /></Field></div>}</>}
      </Modal>
    </>
  )
}
