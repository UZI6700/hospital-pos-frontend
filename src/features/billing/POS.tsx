import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Package, Plus, Printer, Receipt, Search, ShieldCheck, Trash2, Wallet } from 'lucide-react'
import { confirmAction, dbx, printPreview, toast, useAuth, useColl, useDB, useSettings } from '@/app/store'
import { InvoiceDoc, PatientBanner, PatientSearch, PaymentPanel } from '@/components/common'
import { Badge, Button, Empty, Field, Input, Modal, PageHeader, Section, Select } from '@/components/ui'
import { cn, money, sum, today, uid } from '@/utils'
import { GOVT_SCHEMES, RATE_MULT } from '@/utils/constants'
import type { Bill, Patient } from '@/types'

export default function BillingPOS() {
  const [sp] = useSearchParams(), user = useAuth(s => s.user)!, st = useSettings(), { add, update } = useDB()
  const patients = useColl<Patient>('patients'), services = useColl('services'), packages = useColl('packages'), doctors = useColl('doctors'), advances = useColl('advances'), bills = useColl<Bill>('bills')
  const [p, setP] = useState<Patient | null>(null), [items, setItems] = useState<any[]>([]), [q, setQ] = useState(''), [cat, setCat] = useState('All')
  const [disc, setDisc] = useState(0), [discOk, setDiscOk] = useState(0), [discReason, setDiscReason] = useState(''), [type, setType] = useState('OPD'), [doctorId, setDoctorId] = useState(doctors[0]?.id || '')
  const [payer, setPayer] = useState('Self'), [scheme, setScheme] = useState(GOVT_SCHEMES[0]), [useAdv, setUseAdv] = useState(false), [pay, setPay] = useState(false), [mode, setMode] = useState('Detailed'), [last, setLast] = useState<Bill | null>(null)
  useEffect(() => { const id = sp.get('patient'); if (id) setP(patients.find(x => x.id === id) || null) }, [sp]) // eslint-disable-line
  const mult = p ? RATE_MULT[p.category] ?? 1 : 1
  const cats = ['All', ...new Set(services.map((s: any) => s.category))] as string[]
  const hits = useMemo(() => services.filter((s: any) => (cat === 'All' || s.category === cat) && s.name.toLowerCase().includes(q.toLowerCase())), [services, q, cat])
  const addSvc = (s: any) => setItems(it => { const ex = it.find(i => i.desc === s.name); return ex ? it.map(i => (i === ex ? { ...i, qty: i.qty + 1 } : i)) : [...it, { desc: s.name, cat: s.category, qty: 1, rate: Math.round(s.rate * mult), dept: s.dept }] })
  const addPkg = (k: any) => { setItems(it => [...it, { desc: `${k.name} (Package)`, cat: 'Package', qty: 1, rate: k.price, dept: 'IPD' }]); setType('IPD'); toast.success('Package added') }
  const upd = (i: number, patch: any) => setItems(it => it.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const subtotal = sum(items, i => i.qty * i.rate), discount = Math.round(subtotal * disc / 100), tax = Math.round((subtotal - discount) * st.taxRate / 100), total = subtotal - discount + tax
  const adv = p ? advances.filter((a: any) => a.patientId === p.id && a.status === 'Available') : [], advBal = sum(adv, (a: any) => a.amount - (a.used || 0)), advUse = useAdv ? Math.min(advBal, total) : 0, due = total - advUse
  const needAuth = disc > st.discountThreshold && discOk < disc
  const authorize = () => confirmAction({ title: 'Discount authorisation required', message: `A ${disc}% discount exceeds the ${st.discountThreshold}% limit. Supervisor PIN and reason are required.`, auth: true, reason: true, confirmLabel: 'Authorise', onConfirm: r => { setDiscOk(disc); setDiscReason(r || ''); toast.success('Discount authorised') } })
  const outstanding = p ? sum(bills.filter(b => b.patientId === p.id && b.status !== 'Cancelled'), b => b.total - b.paid) : 0
  const finish = (payments: any[]) => {
    let left = advUse; const pays = [...payments]
    if (advUse > 0) { adv.forEach((a: any) => { if (left <= 0) return; const take = Math.min(left, a.amount - (a.used || 0)); left -= take; update('advances', a.id, { used: (a.used || 0) + take, status: (a.used || 0) + take >= a.amount ? 'Adjusted' : 'Available' }) }); pays.unshift({ mode: 'Advance', amount: advUse }) }
    const paid = Math.min(total, sum(pays, x => x.amount))
    const bill: any = { id: dbx().nextNo('bill'), date: today(), patientId: p!.id, patientName: p!.name, type, dept: (doctors.find((d: any) => d.id === doctorId) as any)?.dept || 'General Medicine', doctorId, items, subtotal, discount, discountPct: disc, discountReason: discReason, tax, total, paid, payments: pays, payer, scheme: payer === 'Govt Scheme' ? scheme : undefined, status: paid >= total ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid', by: user.name }
    add('bills', bill)
    const cash = sum(payments.filter(x => x.mode === 'Cash'), x => x.amount), drawer: any = (dbx().db.cashDrawer as any[]).find(d => d.date === today() && d.status === 'Open')
    if (cash && drawer) update('cashDrawer', drawer.id, { collected: drawer.collected + cash })
    if (payer === 'Insurance / TPA' && p!.insProvider) add('claims', { id: uid('CLM'), date: today(), patient: p!.name, provider: p!.insProvider, billNo: bill.id, claimed: total - paid, approved: 0, copay: paid, settled: 0, status: 'Submitted' })
    setPay(false); setLast(bill); setItems([]); setDisc(0); setDiscOk(0); setUseAdv(false)
    toast.success(`Invoice ${bill.id} generated`); printPreview(`Invoice ${bill.id}`, <InvoiceDoc bill={bill} mode={mode} />)
  }
  return (
    <>
      <PageHeader title="Billing POS" desc="Service billing with rate cards, packages, discounts, tax and multi-mode payments" actions={last && <Button variant="outline" onClick={() => printPreview(`Invoice ${last.id}`, <InvoiceDoc bill={last} mode={mode} duplicate />)}><Printer />Reprint {last.id}</Button>} />
      <div className="mb-4">{p ? <PatientBanner p={p} onClear={() => { setP(null); setItems([]) }} extra={<div className="flex flex-wrap gap-1.5">{mult !== 1 && <Badge tone="purple">Rate card: {p.category} ×{mult}</Badge>}{advBal > 0 && <Badge tone="green"><Wallet className="h-3 w-3" />Advance {money(advBal)}</Badge>}{outstanding > 0 && <Badge tone="red">Outstanding {money(outstanding)}</Badge>}</div>} /> : <PatientSearch autoFocus onSelect={setP} />}</div>
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="space-y-4 xl:col-span-2">
          <Section title="Services & charges" pad={false}>
            <div className="space-y-2 border-b p-3"><div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><input aria-label="Search services" className="input pl-8" placeholder="Search service / charge…" value={q} onChange={e => setQ(e.target.value)} /></div>
              <div className="flex flex-wrap gap-1">{cats.map(c => <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)} className={cn('rounded-full px-2.5 py-1 text-xs font-medium transition', cat === c ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')}>{c}</button>)}</div></div>
            <ul className="max-h-80 divide-y overflow-auto">{hits.map((s: any) => <li key={s.id}><button disabled={!p} onClick={() => addSvc(s)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-blue-500/10"><span className="flex-1">{s.name}<span className="block text-[11px] muted">{s.category} · {s.dept}</span></span><span className="font-semibold">{money(Math.round(s.rate * mult))}</span><Plus className="h-4 w-4 text-primary" /></button></li>)}{!hits.length && <Empty text="No matching service" />}</ul>
          </Section>
          <Section title={<span className="flex items-center gap-2"><Package className="h-4 w-4" />Package billing</span>} pad={false}>
            <ul className="divide-y">{packages.filter((k: any) => k.status === 'Active').map((k: any) => <li key={k.id} className="flex items-center gap-2 px-3 py-2 text-sm"><span className="flex-1"><b>{k.name}</b><span className="block text-[11px] muted">{k.includes}</span></span><span className="font-semibold">{money(k.price)}</span><Button size="xs" variant="outline" disabled={!p} onClick={() => addPkg(k)}>Add</Button></li>)}</ul>
          </Section>
        </div>

        <Section className="xl:col-span-3" pad={false} title={<span className="flex items-center gap-2"><Receipt className="h-4 w-4" />Invoice</span>} actions={<div className="flex gap-2"><Select aria-label="Bill type" className="h-8 w-28 text-xs" value={type} onChange={e => setType(e.target.value)} options={['OPD', 'IPD', 'Emergency', 'Day Care']} /><Select aria-label="Invoice format" className="h-8 w-28 text-xs" value={mode} onChange={e => setMode(e.target.value)} options={['Detailed', 'Summary']} /></div>}>
          {!p ? <Empty text="Search and select a patient to start billing" /> : <>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase muted dark:bg-slate-800/50"><tr><th className="px-3 py-2">Service</th><th className="w-20">Qty</th><th className="w-28">Rate</th><th className="w-24 text-right">Amount</th><th className="w-10" /></tr></thead>
              <tbody className="divide-y">{items.map((i, k) => <tr key={k}><td className="px-3 py-1.5">{i.desc}<span className="block text-[11px] muted">{i.cat}</span></td><td><Input aria-label="Quantity" type="number" min={1} className="h-8" value={i.qty} onChange={e => upd(k, { qty: Math.max(1, Number(e.target.value)) })} /></td><td><Input aria-label="Rate" type="number" min={0} className="h-8" value={i.rate} onChange={e => upd(k, { rate: Math.max(0, Number(e.target.value)) })} /></td><td className="text-right font-semibold">{money(i.qty * i.rate)}</td><td><Button variant="ghost" size="icon" aria-label="Remove line" className="text-red-600" onClick={() => setItems(items.filter((_, j) => j !== k))}><Trash2 /></Button></td></tr>)}</tbody></table>{!items.length && <Empty text="Add services or a package from the left" />}</div>
            <div className="grid gap-4 border-t p-4 md:grid-cols-2">
              <div className="space-y-3">
                <Field label="Consultant / doctor"><Select value={doctorId} onChange={e => setDoctorId(e.target.value)} options={doctors.map((d: any) => ({ value: d.id, label: `${d.name} · ${d.dept}` }))} /></Field>
                <Field label="Payer"><Select value={payer} onChange={e => setPayer(e.target.value)} options={['Self', 'Insurance / TPA', 'Corporate', 'Govt Scheme']} /></Field>
                {payer === 'Govt Scheme' && <Field label="Scheme"><Select value={scheme} onChange={e => setScheme(e.target.value)} options={GOVT_SCHEMES} /></Field>}
                {payer === 'Insurance / TPA' && <p className="rounded-lg bg-blue-50 p-2 text-xs text-blue-900 dark:bg-blue-500/10 dark:text-blue-200">{p.insProvider ? <>Insurer: <b>{p.insProvider}</b> · Policy {p.insPolicy}. Collect the co-pay now (partial payment) — the balance is raised as a claim automatically.</> : 'No insurance on file for this patient — update the patient profile first.'}</p>}
                <Field label={`Discount % (limit ${st.discountThreshold}% without approval)`}><div className="flex gap-2"><Input type="number" min={0} max={100} value={disc} onChange={e => setDisc(Math.min(100, Math.max(0, Number(e.target.value))))} />{needAuth ? <Button variant="outline" onClick={authorize}><ShieldCheck />Authorise</Button> : disc > st.discountThreshold && <Badge tone="green">Authorised</Badge>}</div></Field>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="muted">Subtotal</span><span>{money(subtotal)}</span></div>
                <div className="flex justify-between"><span className="muted">Discount ({disc}%)</span><span>− {money(discount)}</span></div>
                <div className="flex justify-between"><span className="muted">Tax ({st.taxRate}%)</span><span>{money(tax)}</span></div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span>{money(total)}</span></div>
                {advBal > 0 && <label className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-2 py-1.5 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200"><span className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-emerald-700" checked={useAdv} onChange={e => setUseAdv(e.target.checked)} />Adjust advance ({money(advBal)})</span><span>− {money(advUse)}</span></label>}
                <div className="flex justify-between text-base font-bold text-primary dark:text-blue-400"><span>Payable now</span><span>{money(due)}</span></div>
                <Button size="lg" variant="success" className="mt-2 w-full" disabled={!items.length || needAuth} onClick={() => (due <= 0 ? finish([]) : setPay(true))}>{due <= 0 ? 'Generate invoice' : `Collect ${money(due)}`}</Button>
                {needAuth && <p className="text-center text-xs text-red-600">Discount above threshold needs supervisor authorisation (demo PIN 1234)</p>}
                <Button variant="ghost" size="sm" className="w-full" disabled={!items.length || needAuth} onClick={() => finish([])}>Save as credit bill (pay later)</Button>
              </div>
            </div></>}
        </Section>
      </div>
      <Modal open={pay} onClose={() => setPay(false)} title={`Payment — ${money(due)}`}>{pay && <PaymentPanel total={due} onPay={finish} allowPartial label="Complete payment & print invoice" />}</Modal>
    </>
  )
}
