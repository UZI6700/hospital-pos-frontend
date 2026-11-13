import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BedDouble, Printer, Save } from 'lucide-react'
import { notify, printPreview, toast, useColl, useDB } from '@/app/store'
import { PatientBanner, PatientSearch, PaymentPanel, SignaturePad } from '@/components/common'
import { Letterhead } from '@/components/common/overlays'
import { Button, Check, Checklist, Field, Input, Modal, PageHeader, Section, Select, Textarea } from '@/components/ui'
import { dOff, fDate, money, today, uid } from '@/utils'
import { BED_TYPES } from '@/utils/constants'
import { BedMap } from './Beds'

const PRE = ['Identity & ID proof verified', 'Insurance / pre-authorization checked', 'Allergies recorded and wrist band tagged', 'Baseline vitals recorded', 'Valuables handed over to attendant', 'Admission orders received from doctor', 'Attendant briefed on visiting policy']
const CONSENTS = ['General consent for admission and treatment', 'Consent for investigations and procedures', 'Financial responsibility / estimate acknowledged', 'Consent to share information with insurer / TPA']

export default function Admission() {
  const nav = useNavigate(), [sp] = useSearchParams(), { add, update, nextNo } = useDB()
  const patients = useColl('patients'), doctors = useColl('doctors'), beds = useColl('beds'), list = useColl('admissions')
  const [patient, setPatient] = useState<any>(null), [bedType, setBedType] = useState('All'), [pay, setPay] = useState(false)
  const [f, setF] = useState<any>({ doctorId: doctors[0].id, type: 'Planned', expDays: 3, bedId: sp.get('bed') || '', diagnosis: '', advance: 10000, pre: {}, consents: {}, sign: '', signedBy: '', attendant: '' })
  useEffect(() => { const p = patients.find((x: any) => x.id === sp.get('patient')); if (p) setPatient(p) }, []) // eslint-disable-line
  const doc: any = doctors.find((d: any) => d.id === f.doctorId), bed: any = beds.find((b: any) => b.id === f.bedId)
  const errors = [!patient && 'Select a patient', patient?.status === 'Admitted' && 'Patient is already admitted', !bed && 'Select a bed', !f.diagnosis.trim() && 'Enter provisional diagnosis', !CONSENTS.every(c => f.consents[c]) && 'All consents must be accepted', !f.sign && 'Digital signature is required'].filter(Boolean) as string[]

  const ConsentDoc = () => (
    <Letterhead title="Admission & Consent Form" meta={[['Patient', `${patient?.name} (${patient?.id})`], ['Date', fDate(today())], ['Admitting doctor', doc.name], ['Bed', `${bed?.id || '—'} · ${bed?.ward || ''}`], ['Admission type', f.type], ['Diagnosis', f.diagnosis]]}>
      <ol style={{ paddingLeft: 18, listStyle: 'decimal', lineHeight: 1.9 }}>{CONSENTS.map(c => <li key={c}>{f.consents[c] ? '☑' : '☐'} {c}</li>)}</ol>
      <p style={{ marginTop: 12 }}>I, <b>{f.signedBy || patient?.name}</b>, have read and understood the above and give my consent voluntarily.</p>
      {f.sign && <img src={f.sign} alt="Signature" style={{ height: 70, marginTop: 8, borderBottom: '1px solid #111' }} />}<div>Signature of patient / attendant</div>
    </Letterhead>
  )
  const admit = (payments: any[]) => {
    const id = nextNo('admission'), paid = payments.reduce((t, p) => t + p.amount, 0)
    add('admissions', { id, patientId: patient.id, patientName: patient.name, bedId: bed.id, ward: bed.ward, doctorId: doc.id, doctor: doc.name, dept: doc.dept, type: f.type, admitDate: today(), expDays: Number(f.expDays), status: 'Admitted', advance: paid, diagnosis: f.diagnosis, attendant: f.attendant, consentSign: f.sign, preChecklist: f.pre })
    update('beds', bed.id, { status: 'Occupied', patientId: patient.id, patientName: patient.name, doctor: doc.name, admitDate: today(), expDischarge: dOff(Number(f.expDays)) })
    update('patients', patient.id, { status: 'Admitted' })
    if (paid > 0) add('advances', { id: uid('ADV'), date: today(), patientId: patient.id, patient: patient.name, amount: paid, used: 0, mode: payments.map(p => p.mode).join(' + '), status: 'Available' })
    notify(f.type === 'Emergency' ? 'Emergency admission' : 'New admission', `${patient.name} admitted to ${bed.id} (${bed.ward}) under ${doc.name}`, f.type === 'Emergency' ? 'emergency' : 'bed', '/ipd/beds')
    toast.success(`Admitted — ${id} · Bed ${bed.id}`); setPay(false); nav(`/ipd/care?patient=${patient.id}`)
  }
  return (
    <>
      <PageHeader title="Patient Admission" desc={`${list.filter((a: any) => a.status === 'Admitted').length} patients currently admitted`} actions={<><Button variant="outline" disabled={!patient} onClick={() => printPreview('Consent form', <ConsentDoc />)}><Printer />Consent form</Button>
        <Button disabled={errors.length > 0} title={errors.join(' · ')} onClick={() => setPay(true)}><Save />Collect advance & admit</Button></>} />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-1">
          <Section title="1 · Patient">{patient ? <PatientBanner p={patient} onClear={() => setPatient(null)} /> : <PatientSearch autoFocus onSelect={setPatient} />}</Section>
          <Section title="2 · Admission details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Admitting doctor" required className="col-span-2"><Select value={f.doctorId} onChange={e => setF({ ...f, doctorId: e.target.value })} options={doctors.map((d: any) => ({ value: d.id, label: d.name }))} /></Field>
              <Field label="Department" className="col-span-2"><Input readOnly disabled value={doc.dept} /></Field>
              <Field label="Admission type"><Select value={f.type} onChange={e => setF({ ...f, type: e.target.value })} options={['Planned', 'Emergency', 'Transfer']} /></Field>
              <Field label="Expected stay (days)"><Input type="number" min={1} value={f.expDays} onChange={e => setF({ ...f, expDays: e.target.value })} /></Field>
              <Field label="Provisional diagnosis" required className="col-span-2"><Textarea rows={2} value={f.diagnosis} onChange={e => setF({ ...f, diagnosis: e.target.value })} /></Field>
              <Field label="Attendant name & phone" className="col-span-2"><Input value={f.attendant} onChange={e => setF({ ...f, attendant: e.target.value })} /></Field>
            </div>
          </Section>
          <Section title="4 · Pre-admission checklist"><Checklist items={PRE} value={f.pre} onChange={pre => setF({ ...f, pre })} /></Section>
        </div>
        <div className="space-y-4 xl:col-span-2">
          <Section title="3 · Bed selection" desc="Only available (green) beds can be selected" actions={<><Select aria-label="Bed type" className="h-8 w-40 text-xs" value={bedType} onChange={e => setBedType(e.target.value)} options={['All', ...BED_TYPES]} />{bed && <span className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-primary dark:bg-blue-500/10 dark:text-blue-300"><BedDouble className="h-3.5 w-3.5" />{bed.id} · {bed.type} · {money(bed.rate)}/day</span>}</>}>
            <div className="max-h-[420px] overflow-auto pr-1"><BedMap type={bedType} selected={f.bedId} onPick={b => setF({ ...f, bedId: b.id })} /></div>
          </Section>
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="5 · Consent forms"><div className="space-y-2">{CONSENTS.map(c => <Check key={c} label={c} checked={!!f.consents[c]} onChange={v => setF({ ...f, consents: { ...f.consents, [c]: v } })} />)}</div>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setF({ ...f, consents: Object.fromEntries(CONSENTS.map(c => [c, true])) })}>Accept all</Button></Section>
            <Section title="6 · Digital signature"><Field label="Signed by (patient / attendant)"><Input value={f.signedBy} onChange={e => setF({ ...f, signedBy: e.target.value })} placeholder={patient?.name} /></Field><div className="mt-3"><SignaturePad value={f.sign} onChange={sign => setF({ ...f, sign })} /></div></Section>
          </div>
          <Section title="7 · Advance payment" desc={bed ? `Estimated room charges: ${money(bed.rate * Number(f.expDays))} for ${f.expDays} day(s)` : 'Select a bed to see the estimate'}>
            <div className="flex flex-wrap items-end gap-3"><Field label="Advance amount"><Input type="number" min={0} step={500} className="w-44" value={f.advance} onChange={e => setF({ ...f, advance: Number(e.target.value) })} /></Field>{[5000, 10000, 25000, 50000].map(a => <Button key={a} variant="outline" size="sm" onClick={() => setF({ ...f, advance: a })}>{money(a)}</Button>)}</div>
            {errors.length > 0 && <ul className="mt-3 list-inside list-disc text-xs text-amber-700 dark:text-amber-400">{errors.map(e => <li key={e}>{e}</li>)}</ul>}
          </Section>
        </div>
      </div>
      <Modal open={pay} onClose={() => setPay(false)} title="Advance payment collection" size="md">{pay && (f.advance > 0 ? <PaymentPanel total={f.advance} onPay={admit} label="Receive advance & admit patient" /> : <Button className="w-full" size="lg" onClick={() => admit([])}>Admit without advance</Button>)}</Modal>
    </>
  )
}
