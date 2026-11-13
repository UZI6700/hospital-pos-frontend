import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { differenceInCalendarDays } from 'date-fns'
import { FileText, LogOut, Printer, Receipt } from 'lucide-react'
import { confirmAction, dbx, notify, printPreview, toast, useAuth, useColl, useDB } from '@/app/store'
import { InvoiceDoc, PatientBanner } from '@/components/common'
import { Letterhead, Sign } from '@/components/common/overlays'
import { Button, Checklist, Empty, Field, Input, PageHeader, Section, Select, Textarea } from '@/components/ui'
import { ageOf, fDate, money, sum, today, uid } from '@/utils'

const CHECK = ['Discharge order written by doctor', 'Final bill generated and settled', 'Discharge medicines dispensed & explained', 'IV cannula / catheters removed', 'Reports & discharge summary handed over', 'Follow-up appointment given', 'Patient belongings returned', 'Bed handed over to housekeeping']

export default function Discharge() {
  const nav = useNavigate(), [sp] = useSearchParams(), user = useAuth(s => s.user)!, { add, update } = useDB()
  const [adm, patients, beds, bills, advances] = ['admissions', 'patients', 'beds', 'bills', 'advances'].map(useColl)
  const active = adm.filter((a: any) => a.status === 'Admitted')
  const [pid, setPid] = useState(sp.get('patient') || active.find((a: any) => a.dischargeReady)?.patientId || active[0]?.patientId || '')
  const a: any = active.find((x: any) => x.patientId === pid), p: any = patients.find((x: any) => x.id === pid), bed: any = beds.find((b: any) => b.id === a?.bedId)
  const blank = { type: 'Routine', finalDx: '', course: '', condition: 'Stable, afebrile, vitals within normal limits', meds: '', advice: 'Take medicines as prescribed. Report immediately in case of fever, bleeding or breathlessness.', followUp: '', check: {} as Record<string, boolean>, amaReason: '', witness: '', deathTime: '', deathCause: '' }
  const [f, setF] = useState<any>(blank)
  useEffect(() => { setF({ ...blank, finalDx: a?.diagnosis || '' }) }, [pid]) // eslint-disable-line
  const days = a ? Math.max(1, differenceInCalendarDays(new Date(), new Date(a.admitDate))) : 0
  const advance = sum(advances.filter((x: any) => x.patientId === pid && x.status === 'Available'), (x: any) => x.amount - x.used)
  const finalBill: any = bills.find((b: any) => b.admissionId === a?.id)
  const items = useMemo(() => (!a || !bed ? [] : [{ desc: `${bed.type} bed charges (${bed.id})`, cat: 'Room', qty: days, rate: bed.rate, dept: 'IPD' }, { desc: 'Nursing charges', cat: 'Room', qty: days, rate: 500, dept: 'IPD' }, { desc: `Doctor visits – ${a.doctor}`, cat: 'Consultation', qty: days, rate: 800, dept: a.dept }, { desc: 'Medicines & consumables', cat: 'Pharmacy', qty: 1, rate: 1200 * days, dept: 'Pharmacy' }, { desc: 'Investigations', cat: 'Laboratory', qty: 1, rate: 2400, dept: 'Laboratory' }]), [a, bed, days])
  if (!active.length) return <Empty text="No admitted patients to discharge" />
  if (!a || !p) return <Empty text="Select an admitted patient" />

  const genBill = () => {
    const subtotal = sum(items, i => i.qty * i.rate), tax = Math.round(subtotal * dbx().db.settings.taxRate / 100), total = subtotal + tax, used = Math.min(advance, total)
    const bill = { id: dbx().nextNo('bill'), admissionId: a.id, date: today(), patientId: p.id, patientName: p.name, type: 'IPD', dept: a.dept, doctorId: a.doctorId, items, subtotal, discount: 0, tax, total, paid: used, payments: used ? [{ mode: 'Advance adjusted', amount: used }] : [], status: used >= total ? 'Paid' : used > 0 ? 'Partial' : 'Unpaid', by: user.name }
    add('bills', bill)
    let left = used; advances.filter((x: any) => x.patientId === pid && x.status === 'Available').forEach((x: any) => { const take = Math.min(left, x.amount - x.used); left -= take; update('advances', x.id, { used: x.used + take, status: x.used + take >= x.amount ? 'Adjusted' : 'Available' }) })
    setF((s: any) => ({ ...s, check: { ...s.check, [CHECK[1]]: used >= total } }))
    toast.success(`Final bill ${bill.id} generated — ${money(total)} (advance adjusted ${money(used)})`)
  }
  const meta: [string, any][] = [['Patient', `${p.name} (${p.id})`], ['Age / Sex', `${ageOf(p.dob)} yrs / ${p.gender}`], ['Admission No', a.id], ['Ward / Bed', `${a.ward} / ${a.bedId}`], ['Date of admission', fDate(a.admitDate)], ['Date of discharge', fDate(today())], ['Consultant', a.doctor], ['Department', a.dept]]
  const SummaryDoc = () => (
    <Letterhead title="Discharge Summary" meta={meta}>
      {[['Final diagnosis', f.finalDx], ['Course in hospital', f.course], ['Condition at discharge', f.condition], ['Medication at discharge', f.meds], ['Advice & follow-up instructions', f.advice], ['Follow-up date', f.followUp && fDate(f.followUp)]].map(([k, v]) => <div key={k} style={{ marginBottom: 8 }}><b>{k}:</b><div style={{ whiteSpace: 'pre-wrap' }}>{v || '—'}</div></div>)}
      <Sign label="Treating Consultant" name={a.doctor} />
    </Letterhead>
  )
  const CertDoc = () => <Letterhead title="Discharge Certificate" meta={meta}><p style={{ lineHeight: 2, fontSize: 13 }}>This is to certify that <b>{p.name}</b> was admitted to this hospital on <b>{fDate(a.admitDate)}</b> with a diagnosis of <b>{f.finalDx}</b> and has been discharged on <b>{fDate(today())}</b> in <b>{f.condition.toLowerCase()}</b> condition after {days} day(s) of in-patient treatment.</p><Sign label="Medical Superintendent" /></Letterhead>
  const AmaDoc = () => <Letterhead title="Discharge Against Medical Advice (AMA / LAMA)" meta={meta}><p style={{ lineHeight: 1.9 }}>I, <b>{f.witness || p.emergencyName || '________________'}</b> (patient / relative of {p.name}), hereby declare that I am taking the patient out of the hospital <b>against the advice of the treating doctors</b>. The risks and possible consequences, including deterioration of condition and death, have been explained to me in a language I understand. I absolve the hospital, its doctors and staff of all responsibility.</p><p><b>Reason stated:</b> {f.amaReason || '—'}</p><div style={{ display: 'flex', justifyContent: 'space-between' }}><Sign label="Patient / Relative" /><Sign label="Witness" /><Sign label="Doctor on duty" name={a.doctor} /></div></Letterhead>
  const DeathDoc = () => <Letterhead title="Death Certificate (Medical Certification of Cause of Death)" meta={[...meta.slice(0, 5), ['Date & time of death', f.deathTime ? f.deathTime.replace('T', ' ') : '—']]}><p style={{ lineHeight: 1.9 }}>Certified that <b>{p.name}</b>, aged {ageOf(p.dob)} years, expired at this hospital. <br /><b>Immediate cause of death:</b> {f.deathCause || '—'}<br /><b>Antecedent cause / underlying condition:</b> {f.finalDx}</p><Sign label="Certifying Medical Officer" name={a.doctor} /></Letterhead>

  const complete = () => {
    if (!f.finalDx.trim()) return toast.error('Final diagnosis is required')
    if (f.type === 'Routine' && !finalBill) return toast.error('Generate the final bill before discharge')
    if (f.type === 'Death' && (!f.deathTime || !f.deathCause)) return toast.error('Enter time and cause of death')
    confirmAction({ title: `Complete ${f.type === 'Death' ? 'death record' : 'discharge'}?`, message: `${p.name} will be discharged from ${a.bedId}. The bed is released to housekeeping for cleaning.`, danger: f.type !== 'Routine', confirmLabel: 'Complete discharge', onConfirm: () => {
      update('admissions', a.id, { status: 'Discharged', dischargeDate: today(), dischargeType: f.type, summary: f })
      update('beds', a.bedId, { status: 'Cleaning', patientId: undefined, patientName: undefined, doctor: undefined, admitDate: undefined, expDischarge: undefined })
      update('patients', p.id, { status: f.type === 'Death' ? 'Deceased' : 'Discharged' })
      add('hkTasks', { id: uid('HK'), date: today(), area: a.bedId, task: 'Discharge room preparation', assignedTo: '', shift: 'Morning', priority: 'Urgent', status: 'Pending' })
      if (f.followUp) add('appointments', { id: uid('APT'), patientId: p.id, patientName: p.name, doctorId: a.doctorId, dept: a.dept, start: new Date(`${f.followUp}T10:00`).toISOString(), end: new Date(`${f.followUp}T10:30`).toISOString(), type: 'Appointment', status: 'Booked', reason: 'Post-discharge follow-up', sms: true })
      notify('Bed availability', `${a.bedId} released after discharge of ${p.name} — cleaning in progress`, 'bed', '/ipd/beds'); toast.success('Discharge completed'); nav('/ipd/beds')
    } })
  }
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  return (
    <>
      <PageHeader title="Discharge" desc={`${active.filter((x: any) => x.dischargeReady).length} patient(s) marked ready for discharge`} actions={<><Select aria-label="Patient" className="w-72" value={pid} onChange={e => setPid(e.target.value)} options={active.map((x: any) => ({ value: x.patientId, label: `${x.bedId} · ${x.patientName}${x.dischargeReady ? ' ✓ ready' : ''}` }))} /><Button variant={f.type === 'Routine' ? 'success' : 'danger'} onClick={complete}><LogOut />Complete discharge</Button></>} />
      <PatientBanner p={p} extra={<div className="text-right text-xs"><div className="font-semibold">{a.bedId} · {a.ward}</div><div className="muted">Admitted {fDate(a.admitDate)} · Day {days}</div></div>} />
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Section className="xl:col-span-2" title="Discharge summary builder" actions={<><Button size="sm" variant="outline" onClick={() => printPreview('Discharge summary', <SummaryDoc />)}><Printer />Summary</Button><Button size="sm" variant="outline" onClick={() => printPreview('Discharge certificate', <CertDoc />)}><FileText />Certificate</Button></>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Discharge type"><Select value={f.type} onChange={set('type')} options={['Routine', 'Against Medical Advice (AMA)', 'Referred / Transfer', 'Death']} /></Field>
            <Field label="Final diagnosis" required><Input value={f.finalDx} onChange={set('finalDx')} /></Field>
            <Field label="Course in hospital" className="sm:col-span-2"><Textarea rows={3} value={f.course} onChange={set('course')} placeholder="Summary of treatment, procedures and response…" /></Field>
            <Field label="Condition at discharge" className="sm:col-span-2"><Input value={f.condition} onChange={set('condition')} /></Field>
            <Field label="Medication at discharge" className="sm:col-span-2"><Textarea rows={3} value={f.meds} onChange={set('meds')} placeholder={'Tab. Augmentin 625 – 1 BD × 5 days\nTab. Pan 40 – 1 OD × 5 days'} /></Field>
            <Field label="Follow-up instructions" className="sm:col-span-2"><Textarea rows={2} value={f.advice} onChange={set('advice')} /></Field>
            <Field label="Follow-up date"><Input type="date" min={today()} value={f.followUp} onChange={set('followUp')} /></Field>
          </div>
          {f.type.startsWith('Against') && <div className="mt-4 rounded-xl border-2 border-amber-400 bg-amber-50 p-3 dark:bg-amber-500/10"><h4 className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-200">Against Medical Advice form</h4><div className="grid gap-3 sm:grid-cols-2"><Field label="Reason given by patient / relative"><Input value={f.amaReason} onChange={set('amaReason')} /></Field><Field label="Name of person taking responsibility"><Input value={f.witness} onChange={set('witness')} /></Field></div><Button className="mt-3" size="sm" variant="outline" onClick={() => printPreview('AMA form', <AmaDoc />)}><Printer />Print AMA form</Button></div>}
          {f.type === 'Death' && <div className="mt-4 rounded-xl border-2 border-slate-800 bg-slate-100 p-3 dark:bg-slate-800"><h4 className="mb-2 text-sm font-semibold">Death certificate</h4><div className="grid gap-3 sm:grid-cols-2"><Field label="Date & time of death" required><Input type="datetime-local" value={f.deathTime} onChange={set('deathTime')} /></Field><Field label="Immediate cause of death" required><Input value={f.deathCause} onChange={set('deathCause')} /></Field></div><Button className="mt-3" size="sm" variant="outline" onClick={() => printPreview('Death certificate', <DeathDoc />)}><Printer />Print death certificate</Button></div>}
        </Section>
        <div className="space-y-4">
          <Section title="Final bill" actions={finalBill ? <Button size="sm" variant="outline" onClick={() => printPreview(`Invoice ${finalBill.id}`, <InvoiceDoc bill={finalBill} />)}><Printer />Print</Button> : undefined}>
            <ul className="space-y-1 text-sm">{items.map(i => <li key={i.desc} className="flex justify-between gap-2"><span className="truncate">{i.desc} <span className="muted">×{i.qty}</span></span><span>{money(i.qty * i.rate)}</span></li>)}</ul>
            <div className="mt-2 space-y-1 border-t pt-2 text-sm"><div className="flex justify-between font-semibold"><span>Estimated total</span><span>{money(sum(items, i => i.qty * i.rate))}</span></div><div className="flex justify-between text-emerald-600"><span>Advance available</span><span>− {money(advance)}</span></div></div>
            {finalBill ? <div className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"><b>{finalBill.id}</b> generated · balance due {money(finalBill.total - finalBill.paid)}{finalBill.total > finalBill.paid && <Button size="xs" className="ml-2" onClick={() => nav('/billing/bills')}>Collect</Button>}</div> : <Button className="mt-3 w-full" onClick={genBill}><Receipt />Generate final bill</Button>}
          </Section>
          <Section title="Discharge checklist"><Checklist items={CHECK} value={f.check} onChange={check => setF({ ...f, check })} /></Section>
        </div>
      </div>
    </>
  )
}
