import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, BedDouble, CalendarPlus, FileText, IdCard, Pencil, Printer, Receipt, Stethoscope, Trash2, Upload, Users } from 'lucide-react'
import { confirmAction, printPreview, toast, useColl, useDB } from '@/app/store'
import { InvoiceDoc } from '@/components/common'
import { Avatar, Badge, Button, DataTable, Empty, KV, PageHeader, Section, Status, Tabs } from '@/components/ui'
import { ageOf, fDate, fDT, money, sum, uid, nowISO } from '@/utils'
import { LAB_TESTS } from '@/utils/constants'
import { PatientCard } from './Directory'
import { LabReportDoc } from '@/features/laboratory'

export default function Profile() {
  const { id } = useParams(), nav = useNavigate(), { add, remove, update } = useDB(), file = useRef<HTMLInputElement>(null)
  const [patients, appts, adm, cons, rx, labs, bills, claims, docs, er] = ['patients', 'appointments', 'admissions', 'consultations', 'prescriptions', 'labOrders', 'bills', 'claims', 'documents', 'emergency'].map(useColl)
  const p: any = patients.find((x: any) => x.id === id), [tab, setTab] = useState('timeline')
  const timeline = useMemo(() => !p ? [] : [
    { at: p.regDate, type: 'Registration', text: `Registered as ${p.category} patient · ${p.referral}`, tone: 'slate' },
    ...appts.filter((a: any) => a.patientId === p.id).map((a: any) => ({ at: a.start, type: 'OPD Visit', text: `${a.reason} · ${a.dept} · ${a.status}`, tone: 'blue' })),
    ...cons.filter((c: any) => c.patientId === p.id).map((c: any) => ({ at: c.date, type: 'Consultation', text: `${c.doctor}: ${c.diagnosis?.join('; ') || c.complaints}`, tone: 'green' })),
    ...adm.filter((a: any) => a.patientId === p.id).map((a: any) => ({ at: a.admitDate, type: 'Admission', text: `${a.ward} (${a.bedId}) · ${a.diagnosis} · ${a.status}`, tone: 'purple' })),
    ...labs.filter((l: any) => l.patientId === p.id).map((l: any) => ({ at: l.orderedAt, type: 'Lab', text: `${l.test} · ${l.status}`, tone: 'amber' })),
    ...er.filter((e: any) => e.patientId === p.id).map((e: any) => ({ at: e.arrival, type: 'Emergency', text: e.complaint, tone: 'red' })),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at))), [p, appts, cons, adm, labs, er])
  if (!p) return <Empty text={`Patient ${id} not found`} />
  const myBills = bills.filter((b: any) => b.patientId === p.id), myRx = rx.filter((r: any) => r.patientId === p.id), myLabs = labs.filter((l: any) => l.patientId === p.id), myDocs = docs.filter((d: any) => d.patientId === p.id)
  const family = patients.filter((x: any) => x.id !== p.id && (x.id === p.familyOf || x.familyOf === p.id || (p.familyOf && x.familyOf === p.familyOf)))
  const due = sum(myBills.filter((b: any) => b.status !== 'Cancelled'), (b: any) => b.total - b.paid)
  const upload = (f?: File) => { if (!f) return; if (f.size > 1.5e6) return toast.error('File too large (max 1.5 MB in demo)'); const r = new FileReader(); r.onload = () => { add('documents', { id: uid('DOC'), patientId: p.id, name: f.name, type: f.type, size: f.size, data: r.result, at: nowISO() }); toast.success('Document uploaded') }; r.readAsDataURL(f) }
  return (
    <>
      <PageHeader title="Patient Profile" desc="360° view of the patient record" actions={<>
        <Button variant="outline" onClick={() => printPreview(`Patient card ${p.id}`, <PatientCard p={p} />)}><IdCard />Print card</Button><Button variant="outline" onClick={() => nav(`/patients/${p.id}/edit`)}><Pencil />Edit</Button>
        <Button variant="outline" onClick={() => nav(`/billing/pos?patient=${p.id}`)}><Receipt />New bill</Button><Button variant="outline" onClick={() => nav(`/ipd/admission?patient=${p.id}`)}><BedDouble />Admit</Button><Button onClick={() => nav(`/opd/queue?patient=${p.id}`)}><CalendarPlus />New visit</Button></>} />
      {(p.allergies || p.chronic) && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border-2 border-red-500 bg-red-50 px-4 py-3 text-red-800 dark:bg-red-500/10 dark:text-red-200">
          <AlertTriangle className="h-6 w-6 shrink-0 text-red-600" /><div className="text-sm"><b className="uppercase tracking-wide">Medical alerts</b>{p.allergies && <div><b>Allergies:</b> {p.allergies}</div>}{p.chronic && <div><b>Chronic conditions:</b> {p.chronic}</div>}</div>
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-4">
        <Section className="xl:col-span-1">
          <div className="flex flex-col items-center text-center"><Avatar name={p.name} src={p.photo} size={96} /><h2 className="mt-3 text-lg font-bold">{p.name}</h2><div className="font-mono text-sm muted">{p.id}</div>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5"><Status v={p.status} /><Badge>{p.category}</Badge><Badge tone="red">{p.blood}</Badge></div></div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
            <KV k="Age / Gender" v={`${ageOf(p.dob)} yrs / ${p.gender}`} /><KV k="Date of birth" v={fDate(p.dob)} /><KV k="Phone" v={p.phone} /><KV k="Registered" v={fDate(p.regDate)} />
            <KV k="Email" v={<span className="break-all">{p.email}</span>} className="col-span-2" /><KV k="Address" v={p.address} className="col-span-2" />
            <KV k="Emergency contact" v={p.emergencyName && `${p.emergencyName} (${p.emergencyRelation || '—'}) · ${p.emergencyPhone}`} className="col-span-2" />
            <KV k={p.idType || 'ID proof'} v={p.idNo} /><KV k="Referral" v={p.referral} />
            <KV k="Insurance" v={p.insProvider ? `${p.insProvider} · ${p.insPolicy} · cover ${money(p.insCoverage)}` : 'Not insured'} className="col-span-2" />
            <KV k="Outstanding dues" v={<span className={due > 0 ? 'text-red-600' : 'text-emerald-600'}>{money(due)}</span>} className="col-span-2" />
          </dl>
          <div className="mt-4 border-t pt-4"><h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase muted"><Users className="h-3.5 w-3.5" />Linked family members</h4>
            {family.length ? <ul className="space-y-2">{family.map((f: any) => <li key={f.id}><Link to={`/patients/${f.id}`} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><Avatar name={f.name} size={28} /><span className="text-sm">{f.name}<span className="block font-mono text-[11px] muted">{f.id}</span></span></Link></li>)}</ul> : <p className="text-xs muted">No family members linked. Use Edit to link a record.</p>}</div>
        </Section>
        <div className="card xl:col-span-3">
          <div className="px-4 pt-2"><Tabs value={tab} onChange={setTab} className="mb-0" tabs={[{ id: 'timeline', label: 'Visit history' }, { id: 'rx', label: 'Prescriptions', badge: myRx.filter((r: any) => r.status === 'Pending').length }, { id: 'labs', label: 'Lab reports' }, { id: 'bills', label: 'Billing' }, { id: 'claims', label: 'Insurance claims' }, { id: 'docs', label: 'Documents' }]} /></div>
          {tab === 'timeline' && <ol className="relative m-5 ml-7 space-y-4 border-l-2 pl-6">{timeline.map((t, i) => <li key={i} className="relative"><span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white bg-primary dark:border-slate-900" /><div className="flex flex-wrap items-center gap-2"><Badge tone={t.tone}>{t.type}</Badge><span className="text-xs muted">{t.at?.length > 10 ? fDT(t.at) : fDate(t.at)}</span></div><p className="mt-0.5 text-sm">{t.text}</p></li>)}</ol>}
          {tab === 'rx' && <div className="divide-y">{myRx.map((r: any) => <div key={r.id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><span className="font-mono text-xs muted">{r.id}</span> · <b>{r.doctor}</b> · <span className="text-sm muted">{fDate(r.date)}</span></div><Status v={r.status} /></div><p className="text-xs muted">{r.diagnosis}</p><ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">{r.items.map((it: any, i: number) => <li key={i} className="rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/50"><b>{it.drug}</b> — {it.dose}, {it.freq}, {it.duration}{it.instr && <span className="muted"> · {it.instr}</span>}</li>)}</ul></div>)}{!myRx.length && <Empty text="No prescriptions on record" />}</div>}
          {tab === 'labs' && <DataTable rows={myLabs} searchable={false} cols={[{ key: 'id', label: 'Order', className: 'font-mono text-xs' }, { key: 'test', label: 'Test', render: (r: any) => LAB_TESTS.find(t => t.code === r.test)?.name }, { key: 'orderedAt', label: 'Ordered', render: (r: any) => fDT(r.orderedAt) }, { key: 'priority', label: 'Priority', render: (r: any) => <Status v={r.priority} /> }, { key: 'status', label: 'Status', render: (r: any) => <Status v={r.status} /> }]} actions={(r: any) => r.results && <Button size="xs" variant="outline" onClick={() => printPreview(`Lab report ${r.id}`, <LabReportDoc order={r} />)}><Printer />Report</Button>} empty="No lab orders" />}
          {tab === 'bills' && <DataTable rows={myBills} searchable={false} exportName={`Bills ${p.id}`} cols={[{ key: 'id', label: 'Invoice', className: 'font-mono text-xs' }, { key: 'date', label: 'Date', render: (r: any) => fDate(r.date) }, { key: 'type', label: 'Type' }, { key: 'total', label: 'Total', render: (r: any) => money(r.total) }, { key: 'paid', label: 'Paid', render: (r: any) => money(r.paid) }, { key: 'status', label: 'Status', render: (r: any) => <Status v={r.status} /> }]} actions={(r: any) => <Button size="xs" variant="outline" onClick={() => printPreview(`Invoice ${r.id}`, <InvoiceDoc bill={r} duplicate />)}><Printer />Print</Button>} empty="No bills" />}
          {tab === 'claims' && <DataTable rows={claims.filter((c: any) => c.patient === p.name)} searchable={false} cols={[{ key: 'id', label: 'Claim' }, { key: 'date', label: 'Date', render: (r: any) => fDate(r.date) }, { key: 'provider', label: 'Provider' }, { key: 'claimed', label: 'Claimed', render: (r: any) => money(r.claimed) }, { key: 'approved', label: 'Approved', render: (r: any) => money(r.approved) }, { key: 'status', label: 'Status', render: (r: any) => <Status v={r.status} /> }]} empty="No insurance claims" />}
          {tab === 'docs' && (
            <div className="p-4">
              <button onClick={() => file.current?.click()} className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed p-6 text-sm muted transition hover:border-primary hover:text-primary"><Upload className="h-6 w-6" />Upload X-rays, reports or scanned documents<span className="text-xs">Images or PDF · max 1.5 MB</span></button>
              <input ref={file} type="file" accept="image/*,application/pdf" hidden onChange={e => { upload(e.target.files?.[0]); e.target.value = '' }} />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{myDocs.map((d: any) => (
                <div key={d.id} className="overflow-hidden rounded-xl border">
                  <a href={d.data} target="_blank" rel="noreferrer" download={d.name} className="flex h-32 items-center justify-center bg-slate-100 dark:bg-slate-800">{d.type.startsWith('image') ? <img src={d.data} alt={d.name} className="h-full w-full object-cover" /> : <FileText className="h-10 w-10 muted" />}</a>
                  <div className="flex items-center gap-2 p-2"><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium">{d.name}</div><div className="text-[11px] muted">{fDT(d.at)} · {(d.size / 1024).toFixed(0)} KB</div></div><Button variant="ghost" size="icon" aria-label="Delete document" className="text-red-600" onClick={() => confirmAction({ title: 'Delete document?', message: d.name, danger: true, onConfirm: () => remove('documents', d.id) })}><Trash2 /></Button></div>
                </div>))}</div>
              {!myDocs.length && <p className="mt-3 text-center text-xs muted">No documents uploaded yet.</p>}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
