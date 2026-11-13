import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { addDays, addMinutes, addMonths, addWeeks, format } from 'date-fns'
import { Ban, Bell, CalendarPlus, Footprints, Ticket, Trash2 } from 'lucide-react'
import { confirmAction, toast, useColl, useDB } from '@/app/store'
import { PatientBanner, PatientSearch } from '@/components/common'
import { Button, Check, Field, Input, Modal, PageHeader, Select, Status, Textarea } from '@/components/ui'
import { fDT, uid } from '@/utils'
import { APPT_COLOR } from '@/utils/constants'

const STATUSES = ['Booked', 'Confirmed', 'Checked-in', 'Completed', 'Cancelled', 'No-show']
const local = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm")

export default function Appointments() {
  const nav = useNavigate(), { add, update, remove } = useDB()
  const appts = useColl('appointments'), doctors = useColl('doctors'), patients = useColl('patients'), commsOn = useDB(s => s.db.settings.channels)
  const [doc, setDoc] = useState(''), [form, setForm] = useState<any | null>(null), [err, setErr] = useState('')
  const events = useMemo(() => appts.filter((a: any) => !doc || a.doctorId === doc).map((a: any) => ({
    id: a.id, title: a.status === 'Blocked' ? `⛔ ${a.reason || 'Blocked'}` : `${a.patientName} · ${doctors.find((d: any) => d.id === a.doctorId)?.name.replace('Dr. ', 'Dr ')}`,
    start: a.start, end: a.end, backgroundColor: APPT_COLOR[a.status], borderColor: APPT_COLOR[a.status], editable: !['Completed', 'Cancelled'].includes(a.status),
  })), [appts, doc, doctors])
  const open = (start: Date, type = 'Appointment') => { setErr(''); setForm({ start: local(start), duration: 30, doctorId: doc || doctors[0].id, type, status: type === 'Walk-in' ? 'Checked-in' : 'Booked', reason: '', sms: true, email: false, recurring: 'None', count: 4, patient: null }) }
  const clash = (f: any, start: Date, end: Date) => appts.some((a: any) => a.id !== f.id && a.doctorId === f.doctorId && !['Cancelled', 'No-show'].includes(a.status) && new Date(a.start) < end && new Date(a.end) > start)
  const send = (a: any) => {
    if (a.status === 'Blocked') return
    ;[a.sms && commsOn.sms && 'SMS', a.email && commsOn.email && 'Email'].filter(Boolean).forEach(ch => add('commsLog', { id: uid('CM'), at: new Date().toISOString(), channel: ch, to: a.patientName, template: 'Appointment reminder', status: 'Sent' }))
  }
  const save = () => {
    const f = form, blocked = f.status === 'Blocked'
    if (!blocked && !f.patient && !f.id) return setErr('Select a patient')
    const start = new Date(f.start), end = addMinutes(start, Number(f.duration))
    if (clash(f, start, end)) return setErr('This doctor already has an appointment or blocked slot at that time')
    const d: any = doctors.find((x: any) => x.id === f.doctorId)
    const base = { doctorId: f.doctorId, dept: d.dept, type: f.type, status: f.status, reason: f.reason, sms: f.sms, email: f.email, recurring: f.recurring }
    if (f.id) { update('appointments', f.id, { ...base, start: start.toISOString(), end: end.toISOString() }); toast.success('Appointment updated') }
    else {
      const n = f.recurring === 'None' || blocked ? 1 : Math.max(1, Math.min(12, Number(f.count)))
      const step = (i: number) => (f.recurring === 'Daily' ? addDays(start, i) : f.recurring === 'Weekly' ? addWeeks(start, i) : f.recurring === 'Monthly' ? addMonths(start, i) : start)
      for (let i = 0; i < n; i++) { const s = step(i), a = { ...base, id: uid('APT'), patientId: f.patient?.id || '', patientName: f.patient?.name || 'Blocked slot', start: s.toISOString(), end: addMinutes(s, Number(f.duration)).toISOString() }; add('appointments', a); if (i === 0) send(a) }
      toast.success(blocked ? 'Slot blocked for online booking' : n > 1 ? `${n} recurring appointments booked` : 'Appointment booked' + (f.sms || f.email ? ' — notification sent' : ''))
    }
    setForm(null)
  }
  const edit = (id: string) => { const a: any = appts.find((x: any) => x.id === id); if (!a) return; setErr(''); setForm({ ...a, start: local(new Date(a.start)), duration: Math.round((+new Date(a.end) - +new Date(a.start)) / 6e4), patient: patients.find((p: any) => p.id === a.patientId) || null, count: 1 }) }
  return (
    <>
      <PageHeader title="Appointment Scheduling" desc="Click or drag on the calendar to book · drag an appointment to reschedule" actions={<>
        <Select aria-label="Doctor filter" className="w-52" value={doc} onChange={e => setDoc(e.target.value)} placeholder="All doctors" options={doctors.map((d: any) => ({ value: d.id, label: `${d.name} · ${d.dept}` }))} />
        <Button variant="outline" onClick={() => { open(new Date()); setForm((f: any) => ({ ...f, status: 'Blocked', type: 'Online', reason: 'Online slot blocked' })) }}><Ban />Block slot</Button>
        <Button variant="outline" onClick={() => open(new Date(), 'Walk-in')}><Footprints />Walk-in</Button>
        <Button onClick={() => open(addMinutes(new Date(), 30))}><CalendarPlus />Book appointment</Button></>} />
      <div className="mb-3 flex flex-wrap gap-3 text-xs">{Object.entries(APPT_COLOR).map(([k, c]) => <span key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{k}</span>)}</div>
      <div className="card p-3">
        <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView={window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek'} headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          events={events} editable selectable selectMirror nowIndicator allDaySlot={false} slotMinTime="08:00:00" slotMaxTime="20:00:00" slotDuration="00:30:00" height="auto" dayMaxEvents={3} eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
          select={i => open(i.start)} dateClick={i => i.view.type === 'dayGridMonth' && open(new Date(i.date.setHours(10)))} eventClick={i => edit(i.event.id)}
          eventDrop={i => { const a: any = appts.find((x: any) => x.id === i.event.id); if (clash(a, i.event.start!, i.event.end!)) { i.revert(); return toast.error('Slot conflict — doctor is not free at that time') } update('appointments', a.id, { start: i.event.start!.toISOString(), end: i.event.end!.toISOString() }); send({ ...a }); toast.success(`Rescheduled to ${fDT(i.event.start!.toISOString())}`) }}
          eventResize={i => update('appointments', i.event.id, { end: i.event.end!.toISOString() })} />
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? `Appointment ${form.id}` : form?.status === 'Blocked' ? 'Block slot (online booking)' : form?.type === 'Walk-in' ? 'Walk-in quick booking' : 'Book appointment'}
        footer={<>{form?.id && <Button variant="ghost" className="mr-auto text-red-600" onClick={() => confirmAction({ title: 'Delete appointment?', danger: true, onConfirm: () => { remove('appointments', form.id); setForm(null); toast.success('Appointment deleted') } })}><Trash2 />Delete</Button>}
          {form?.id && form.patient && <Button variant="outline" onClick={() => { update('appointments', form.id, { status: 'Checked-in' }); nav(`/opd/queue?patient=${form.patient.id}`) }}><Ticket />Check-in & token</Button>}
          <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>{form?.id ? 'Save' : 'Confirm'}</Button></>}>
        {form && (
          <div className="space-y-3">
            {form.status !== 'Blocked' && (form.patient ? <PatientBanner p={form.patient} onClear={form.id ? undefined : () => setForm({ ...form, patient: null })} /> : <PatientSearch autoFocus onSelect={p => { setErr(''); setForm({ ...form, patient: p }) }} />)}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Doctor" required><Select value={form.doctorId} onChange={e => setForm({ ...form, doctorId: e.target.value })} options={doctors.map((d: any) => ({ value: d.id, label: `${d.name} · ${d.dept} (${d.from}–${d.to})` }))} /></Field>
              <Field label="Date & time" required><Input type="datetime-local" step={900} value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} /></Field>
              <Field label="Duration"><Select value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} options={['15', '30', '45', '60', '120', '240'].map(v => ({ value: v, label: `${v} min` }))} /></Field>
              {form.status !== 'Blocked' && <><Field label="Type"><Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} options={['Appointment', 'Walk-in', 'Online']} /></Field>
                <Field label="Status"><Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} options={STATUSES} /></Field>
                {!form.id && <Field label="Repeat"><div className="flex gap-2"><Select value={form.recurring} onChange={e => setForm({ ...form, recurring: e.target.value })} options={['None', 'Daily', 'Weekly', 'Monthly']} />{form.recurring !== 'None' && <Input aria-label="Occurrences" type="number" min={2} max={12} className="w-20" value={form.count} onChange={e => setForm({ ...form, count: e.target.value })} />}</div></Field>}</>}
              <Field label="Reason / notes" className="sm:col-span-2"><Textarea rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></Field>
            </div>
            {form.status !== 'Blocked' && <div className="flex flex-wrap items-center gap-4 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50"><span className="flex items-center gap-1.5 text-xs font-medium muted"><Bell className="h-3.5 w-3.5" />Notify patient</span><Check label="SMS" checked={form.sms} onChange={v => setForm({ ...form, sms: v })} /><Check label="Email" checked={form.email} onChange={v => setForm({ ...form, email: v })} />{form.id && <Status v={form.status} />}</div>}
            {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
          </div>
        )}
      </Modal>
    </>
  )
}
