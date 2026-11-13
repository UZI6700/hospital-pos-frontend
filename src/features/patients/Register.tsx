import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera, RotateCcw, Save, Upload, UserRound } from 'lucide-react'
import { printPreview, toast, useColl, useDB } from '@/app/store'
import { Button, Field, Input, Modal, PageHeader, Section, Select, Textarea } from '@/components/ui'
import { ageOf, today } from '@/utils'
import { BLOOD, CATEGORIES, DEPARTMENTS } from '@/utils/constants'
import { PatientCard } from './Directory'

const schema = z.object({
  name: z.string().trim().min(2, 'Full name is required'),
  dob: z.string().min(1, 'Date of birth is required').refine(v => v <= today(), 'Date of birth cannot be in the future'),
  gender: z.enum(['Male', 'Female', 'Other']),
  phone: z.string().trim().regex(/^\+?[\d\s-]{7,16}$/, 'Enter a valid contact number'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  address: z.string().optional(),
  emergencyName: z.string().optional(), emergencyPhone: z.string().optional(), emergencyRelation: z.string().optional(),
  blood: z.string().min(1, 'Select blood group'), allergies: z.string().optional(), chronic: z.string().optional(),
  insProvider: z.string().optional(), insPolicy: z.string().optional(), insCoverage: z.coerce.number().min(0).optional(),
  idType: z.string().optional(), idNo: z.string().optional(),
  referral: z.string(), category: z.string(), department: z.string(), familyOf: z.string().optional(),
}).refine(v => v.category !== 'Insurance' || (!!v.insProvider && !!v.insPolicy), { path: ['insProvider'], message: 'Insurance provider and policy number are required for Insurance category' })
type Form = z.infer<typeof schema>

function Webcam({ open, onClose, onCapture }: { open: boolean; onClose: () => void; onCapture: (d: string) => void }) {
  const video = useRef<HTMLVideoElement>(null), [err, setErr] = useState('')
  useEffect(() => {
    if (!open) return
    let stream: MediaStream | undefined
    setErr('')
    navigator.mediaDevices?.getUserMedia({ video: { width: 480, height: 480, facingMode: 'user' } })
      .then(s => { stream = s; if (video.current) { video.current.srcObject = s; video.current.play() } })
      .catch(() => setErr('Camera not available or permission denied. You can upload a photo instead.'))
    if (!navigator.mediaDevices) setErr('Camera is not supported in this browser context. You can upload a photo instead.')
    return () => stream?.getTracks().forEach(t => t.stop())
  }, [open])
  const snap = () => {
    const v = video.current!, c = document.createElement('canvas'), s = Math.min(v.videoWidth, v.videoHeight)
    c.width = c.height = 240
    c.getContext('2d')!.drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, 0, 0, 240, 240)
    onCapture(c.toDataURL('image/jpeg', 0.8)); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Capture patient photo" size="sm" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={snap} disabled={!!err}><Camera />Capture</Button></>}>
      {err ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{err}</p> : <video ref={video} muted playsInline className="mx-auto aspect-square w-full max-w-xs rounded-xl bg-black object-cover" />}
    </Modal>
  )
}

export default function Register() {
  const { id } = useParams(), nav = useNavigate(), { add, update, nextNo } = useDB(), patients = useColl('patients')
  const existing: any = id ? patients.find((p: any) => p.id === id) : null
  const [photo, setPhoto] = useState<string>(existing?.photo || ''), [cam, setCam] = useState(false), file = useRef<HTMLInputElement>(null)
  const nextId = useDB(s => { const n = s.db.settings.numbering.patient; return `${n.prefix}${String(n.next).padStart(n.pad, '0')}` })
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: existing || { gender: 'Male', blood: '', referral: 'Self', category: 'General', department: 'General Medicine', idType: 'CNIC', insCoverage: 0 },
  })
  const dob = watch('dob'), category = watch('category')
  const E = (k: keyof Form) => errors[k]?.message as string | undefined
  const onUpload = (f?: File) => { if (!f) return; const r = new FileReader(); r.onload = () => setPhoto(r.result as string); r.readAsDataURL(f) }
  const submit = handleSubmit(v => {
    if (existing) { update('patients', existing.id, { ...v, photo }); toast.success('Patient details updated'); return nav(`/patients/${existing.id}`) }
    const dup: any = patients.find((p: any) => p.phone.replace(/\D/g, '') === v.phone.replace(/\D/g, '') && p.name.toLowerCase() === v.name.toLowerCase())
    if (dup) return toast.warning(`Possible duplicate: ${dup.name} (${dup.id}) already registered with this phone number`)
    const pid = nextNo('patient'), p: any = { ...v, id: pid, photo, status: 'Active', regDate: today() }
    add('patients', p); toast.success(`Patient registered — ${pid}`)
    printPreview(`Patient card ${pid}`, <PatientCard p={p} />); nav(`/patients/${pid}`)
  }, () => toast.error('Please fix the highlighted fields'))
  return (
    <form onSubmit={submit} noValidate>
      <PageHeader title={existing ? `Edit Patient — ${existing.id}` : 'New Patient Registration'} desc="Fields marked * are mandatory" actions={<><Button variant="outline" onClick={() => { reset(); setPhoto('') }}><RotateCcw />Reset</Button><Button type="submit" disabled={isSubmitting}><Save />{existing ? 'Save changes' : 'Register patient'}</Button></>} />
      <div className="grid gap-4 xl:grid-cols-4">
        <Section title="Photo & ID" className="xl:col-span-1">
          <div className="flex flex-col items-center gap-3">
            {photo ? <img src={photo} alt="Patient" className="h-36 w-36 rounded-2xl object-cover ring-4 ring-slate-100 dark:ring-slate-800" /> : <div className="flex h-36 w-36 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"><UserRound className="h-16 w-16" /></div>}
            <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setCam(true)}><Camera />Webcam</Button><Button variant="outline" size="sm" onClick={() => file.current?.click()}><Upload />Upload</Button></div>
            <input ref={file} type="file" accept="image/*" hidden onChange={e => onUpload(e.target.files?.[0])} />
          </div>
          <div className="mt-4 space-y-3">
            <Field label="Patient ID (auto-generated)"><Input readOnly disabled value={existing?.id || nextId} className="font-mono" /></Field>
            <Field label="Category"><Select {...register('category')} options={CATEGORIES} /></Field>
            <Field label="Department"><Select {...register('department')} options={DEPARTMENTS} /></Field>
            <Field label="Referral source"><Select {...register('referral')} options={['Self', 'Doctor referral', 'Hospital transfer', 'Online', 'Camp / Outreach']} /></Field>
          </div>
        </Section>
        <div className="space-y-4 xl:col-span-3">
          <Section title="Demographics">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Full name" required error={E('name')} className="lg:col-span-2"><Input autoFocus {...register('name')} aria-invalid={!!errors.name} /></Field>
              <Field label="Date of birth" required error={E('dob')}><Input type="date" max={today()} {...register('dob')} /></Field>
              <Field label="Age (auto)"><Input readOnly disabled value={dob ? `${ageOf(dob)} years` : ''} /></Field>
              <Field label="Gender" required><Select {...register('gender')} options={['Male', 'Female', 'Other']} /></Field>
              <Field label="Contact number" required error={E('phone')}><Input inputMode="tel" placeholder="+92 300 1234567" {...register('phone')} /></Field>
              <Field label="Email" error={E('email')} className="lg:col-span-2"><Input type="email" {...register('email')} /></Field>
              <Field label="Address" className="sm:col-span-2 lg:col-span-4"><Textarea rows={2} {...register('address')} /></Field>
            </div>
          </Section>
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Emergency contact">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Contact name" className="sm:col-span-2"><Input {...register('emergencyName')} /></Field>
                <Field label="Phone"><Input inputMode="tel" {...register('emergencyPhone')} /></Field>
                <Field label="Relationship"><Select {...register('emergencyRelation')} placeholder="Select…" options={['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Friend', 'Other']} /></Field>
              </div>
            </Section>
            <Section title="Medical information">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Blood group" required error={E('blood')}><Select {...register('blood')} placeholder="Select…" options={BLOOD} /></Field>
                <Field label="Known allergies" hint="Shown as a red alert on all clinical screens"><Input placeholder="e.g. Penicillin" {...register('allergies')} className="border-red-300 focus:border-red-600 focus:ring-red-600/20" /></Field>
                <Field label="Chronic conditions" className="sm:col-span-2"><Input placeholder="e.g. Diabetes, Hypertension" {...register('chronic')} /></Field>
              </div>
            </Section>
            <Section title="Insurance details" desc={category === 'Insurance' ? 'Required for Insurance category' : 'Optional'}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Provider" error={E('insProvider')} required={category === 'Insurance'} className="sm:col-span-2"><Input {...register('insProvider')} /></Field>
                <Field label="Policy number" required={category === 'Insurance'}><Input {...register('insPolicy')} /></Field>
                <Field label="Coverage amount" error={E('insCoverage')}><Input type="number" min={0} {...register('insCoverage')} /></Field>
              </div>
            </Section>
            <Section title="Identification & family">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="ID proof type"><Select {...register('idType')} options={['CNIC', 'Aadhar', 'Passport', 'Driving License', 'Voter ID', 'PAN']} /></Field>
                <Field label="ID number"><Input {...register('idNo')} /></Field>
                <Field label="Link to family member (Patient ID)" className="sm:col-span-2" hint="Links family records for shared history and billing"><Input placeholder="PT-000001" list="family-ids" {...register('familyOf')} /><datalist id="family-ids">{patients.slice(0, 50).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</datalist></Field>
              </div>
            </Section>
          </div>
        </div>
      </div>
      <Webcam open={cam} onClose={() => setCam(false)} onCapture={setPhoto} />
    </form>
  )
}
