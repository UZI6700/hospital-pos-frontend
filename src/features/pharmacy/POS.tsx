import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, ClipboardList, Minus, Plus, Printer, Repeat2, RotateCcw, ScanBarcode, Search, ShieldAlert, ShoppingCart, Trash2, Undo2 } from 'lucide-react'
import { dbx, printPreview, toast, useAuth, useColl, useDB, useSettings } from '@/app/store'
import { PatientSearch, PaymentPanel, Resource } from '@/components/common'
import { Badge, Button, DataTable, Empty, Field, Input, Modal, PageHeader, Section, Select, Tabs } from '@/components/ui'
import { useDebounce } from '@/hooks'
import { cn, daysTo, fDate, fDT, money, nowISO, sum, today, uid } from '@/utils'
import type { Medicine } from '@/types'

const fefo = (m: Medicine) => [...m.batches].filter(b => b.qty > 0 && daysTo(b.expiry) > 0).sort((a, b) => a.expiry.localeCompare(b.expiry))
const stock = (m: Medicine) => sum(fefo(m), b => b.qty)

export function Receipt({ sale }: { sale: any }) {
  const h = useSettings().hospital
  return (
    <div>
      <div style={{ textAlign: 'center' }}><b style={{ fontSize: 13 }}>{h.name}</b><br />PHARMACY<br />{h.address}<br />Ph: {h.phone}<br />GSTIN: {h.gst}</div>
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      <div>Bill: {sale.id}<br />Date: {fDT(sale.at || sale.date)}<br />Patient: {sale.patientName}{sale.rxId && <><br />Rx: {sale.rxId}</>}{sale.doctor && <><br />Dr: {sale.doctor}</>}</div>
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      {sale.items.map((i: any, k: number) => <div key={k} style={{ marginBottom: 4 }}><div>{i.name}</div><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{i.qty} × {i.mrp.toFixed(2)}{i.disc ? ` −${i.disc}%` : ''} [{i.batch}]</span><span>{(i.qty * i.mrp * (1 - (i.disc || 0) / 100)).toFixed(2)}</span></div>{i.instr && <div style={{ fontSize: 10 }}>↳ {i.instr}</div>}</div>)}
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      {[['Subtotal', sale.subtotal], ['Discount', -sale.discount], ['GST', sale.tax]].map(([l, v]) => <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{l}</span><span>{Number(v).toFixed(2)}</span></div>)}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13 }}><span>TOTAL</span><span>{money(sale.total)}</span></div>
      <div>Paid by: {sale.payments.map((p: any) => `${p.mode} ${p.amount}`).join(', ')}</div>
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      <div style={{ textAlign: 'center', fontSize: 10 }}>Medicines once sold can be returned within 7 days with bill.<br />Get well soon!</div>
    </div>
  )
}

export default function PharmacyPOS() {
  const user = useAuth(s => s.user)!, { add, update } = useDB()
  const meds = useColl<Medicine>('medicines'), rxs = useColl('prescriptions'), sales = useColl('pharmacySales')
  const [tab, setTab] = useState('pos'), [q, setQ] = useState(''), dq = useDebounce(q, 150), [code, setCode] = useState(''), scan = useRef<HTMLInputElement>(null)
  const [cart, setCart] = useState<any[]>([]), [billDisc, setBillDisc] = useState(0), [cust, setCust] = useState({ name: 'Walk-in customer', id: '' }), [rx, setRx] = useState<any>(null), [cs, setCs] = useState({ doctor: '', rxNo: '' })
  const [pay, setPay] = useState(false), [alt, setAlt] = useState<Medicine | null>(null), [ret, setRet] = useState<any | null>(null)
  const hits = useMemo(() => { const s = dq.trim().toLowerCase(); return (s ? meds.filter(m => `${m.name} ${m.generic} ${m.id} ${m.barcode} ${m.category}`.toLowerCase().includes(s)) : meds).slice(0, 24) }, [dq, meds])
  const addItem = (m: Medicine, qty = 1, instr = '') => {
    const b = fefo(m)[0]
    if (!b) { toast.error(`${m.name} is out of stock`); setAlt(m); return }
    setCart(c => { const ex = c.find(i => i.medId === m.id && i.batch === b.batch); if (ex) return c.map(i => (i === ex ? { ...i, qty: Math.min(b.qty, i.qty + qty) } : i)); return [...c, { medId: m.id, name: m.name, generic: m.generic, batch: b.batch, expiry: b.expiry, max: b.qty, qty: Math.min(qty, b.qty), mrp: m.mrp, disc: 0, tax: m.tax, controlled: m.controlled, instr }] })
    if (daysTo(b.expiry) <= 30) toast.warning(`${m.name} batch ${b.batch} expires in ${daysTo(b.expiry)} days`)
  }
  const onScan = (e: React.FormEvent) => { e.preventDefault(); const m = meds.find(x => x.barcode === code.trim() || x.id === code.trim().toUpperCase()); if (m) { addItem(m); toast.success(`Scanned: ${m.name}`) } else toast.error(`No medicine found for barcode ${code}`); setCode('') }
  const loadRx = (id: string) => {
    const r: any = rxs.find((x: any) => x.id === id); setRx(r || null); if (!r) return
    setCust({ name: r.patientName, id: r.patientId }); setCs({ doctor: r.doctor, rxNo: r.id })
    const missing: string[] = []
    r.items.forEach((it: any) => { const m = meds.find(x => x.name === it.drug); const n = (parseInt(it.duration) || 1) * (/TDS/.test(it.freq) ? 3 : /BD/.test(it.freq) ? 2 : /QID/.test(it.freq) ? 4 : 1); if (m && stock(m) > 0) addItem(m, n, `${it.dose} ${it.freq.split(' ')[0]} × ${it.duration}${it.instr ? ` · ${it.instr}` : ''}`); else missing.push(it.drug) })
    missing.length ? toast.warning(`Not available: ${missing.join(', ')}`) : toast.success(`Prescription ${r.id} loaded`)
  }
  const upd = (i: number, p: any) => setCart(c => c.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const gross = sum(cart, i => i.qty * i.mrp), itemDisc = sum(cart, i => i.qty * i.mrp * i.disc / 100), bd = (gross - itemDisc) * billDisc / 100
  const tax = sum(cart, i => i.qty * i.mrp * (1 - i.disc / 100) * (1 - billDisc / 100) * i.tax / 100), total = +(gross - itemDisc - bd + tax).toFixed(2)
  const hasCS = cart.some(i => i.controlled), csOk = !hasCS || (cs.doctor.trim() && cs.rxNo.trim())
  const checkout = (payments: any[]) => {
    const fresh = dbx().db.medicines as Medicine[]
    cart.forEach(i => { const m = fresh.find(x => x.id === i.medId)!; update('medicines', m.id, { batches: m.batches.map(b => (b.batch === i.batch ? { ...b, qty: Math.max(0, b.qty - i.qty) } : b)) }) })
    const sale = { id: dbx().nextNo('sale'), date: today(), at: nowISO(), patientName: cust.name, patientId: cust.id, rxId: rx?.id, doctor: cs.doctor, items: cart, subtotal: +gross.toFixed(2), discount: +(itemDisc + bd).toFixed(2), tax: +tax.toFixed(2), total, payments, by: user.name }
    add('pharmacySales', sale)
    cart.filter(i => i.controlled).forEach(i => add('controlledLog', { id: uid('CS'), date: today(), medicine: i.name, qty: i.qty, patient: cust.name, doctor: cs.doctor, rxNo: cs.rxNo, by: user.name }))
    if (rx) update('prescriptions', rx.id, { status: 'Dispensed' })
    setPay(false); setCart([]); setRx(null); setBillDisc(0); setCust({ name: 'Walk-in customer', id: '' }); setCs({ doctor: '', rxNo: '' })
    toast.success(`Sale ${sale.id} completed`); printPreview(`Receipt ${sale.id}`, <Receipt sale={sale} />, true); scan.current?.focus()
  }
  const doReturn = () => {
    const it = ret.sale.items[ret.idx], qty = Number(ret.qty)
    if (!ret.reason.trim()) return toast.error('Reason is required'); if (qty < 1 || qty > it.qty) return toast.error('Invalid quantity')
    const m = (dbx().db.medicines as Medicine[]).find(x => x.name === it.name)
    if (m && ret.restock) update('medicines', m.id, { batches: m.batches.map(b => (b.batch === it.batch ? { ...b, qty: b.qty + qty } : b)) })
    add('pharmacyReturns', { id: uid('RET'), date: today(), saleId: ret.sale.id, item: it.name, qty, amount: +(qty * it.mrp * (1 - (it.disc || 0) / 100) * (1 + it.tax / 100)).toFixed(2), type: ret.type, reason: ret.reason })
    toast.success(`${ret.type} recorded${ret.restock ? ' and stock updated' : ''}`); setRet(null)
  }
  const alts = alt ? meds.filter(m => m.generic === alt.generic && m.id !== alt.id) : []
  const pending = rxs.filter((r: any) => r.status === 'Pending')
  return (
    <>
      <PageHeader title="Pharmacy POS" desc="Scan, search or load a prescription · batches are picked first-expiry-first-out (FEFO)" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'pos', label: 'Point of sale', icon: ShoppingCart }, { id: 'sales', label: 'Sales history' }, { id: 'returns', label: 'Returns & exchange', icon: Undo2 }, { id: 'cs', label: 'Controlled substance register', icon: ShieldAlert }]} />
      {tab === 'pos' && (
        <div className="grid gap-4 xl:grid-cols-5">
          <div className="space-y-3 xl:col-span-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <form onSubmit={onScan} className="relative"><ScanBarcode className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><input ref={scan} autoFocus aria-label="Barcode scanner input" className="input pl-8 font-mono" placeholder="Scan barcode + Enter" value={code} onChange={e => setCode(e.target.value)} /></form>
              <div className="relative"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><input aria-label="Search medicine" className="input pl-8" placeholder="Name / generic / code…" value={q} onChange={e => setQ(e.target.value)} /></div>
              <Select aria-label="Load prescription" value={rx?.id || ''} onChange={e => loadRx(e.target.value)} placeholder={`Load prescription (${pending.length} pending)`} options={pending.map((r: any) => ({ value: r.id, label: `${r.id} · ${r.patientName}` }))} />
            </div>
            <div className="grid max-h-[calc(100vh-290px)] min-h-[300px] gap-2 overflow-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {hits.map(m => { const st = stock(m), b = fefo(m)[0]; return (
                <div key={m.id} className={cn('card flex flex-col p-3 transition hover:shadow-md', !st && 'opacity-60')}>
                  <div className="flex items-start justify-between gap-1"><div className="min-w-0"><div className="truncate text-sm font-semibold">{m.name}</div><div className="truncate text-xs muted">{m.generic} · {m.form}</div></div>{m.controlled && <Badge tone="purple"><ShieldAlert className="h-3 w-3" />CS</Badge>}</div>
                  <div className="mt-2 flex items-center justify-between text-xs"><span className="text-base font-bold text-primary dark:text-blue-400">{money(m.mrp)}</span><Badge tone={!st ? 'red' : st < m.reorder ? 'amber' : 'green'}>{st ? `${st} in stock` : 'Out of stock'}</Badge></div>
                  <div className="mt-1 truncate font-mono text-[10px] muted">{m.barcode}{b && <> · {b.batch} exp {fDate(b.expiry)}</>}</div>
                  <div className="mt-2 flex gap-1"><Button size="sm" className="flex-1" disabled={!st} onClick={() => addItem(m)}><Plus />Add</Button><Button size="sm" variant="outline" aria-label={`Generic substitutes for ${m.name}`} title="Generic substitutes" onClick={() => setAlt(m)}><Repeat2 /></Button></div>
                </div>) })}
              {!hits.length && <div className="col-span-full"><Empty text="No medicine found" /></div>}
            </div>
          </div>

          <Section className="xl:col-span-2" pad={false} title={<span className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Cart ({cart.length})</span>} actions={cart.length > 0 && <Button variant="ghost" size="xs" onClick={() => { setCart([]); setRx(null) }}><RotateCcw />Clear</Button>}>
            <div className="space-y-2 border-b p-3">
              {cust.id ? <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-1.5 text-sm dark:bg-blue-500/10"><span><b>{cust.name}</b> <span className="font-mono text-xs muted">{cust.id}</span></span><Button variant="ghost" size="xs" onClick={() => setCust({ name: 'Walk-in customer', id: '' })}>Change</Button></div> : <PatientSearch placeholder="Link patient (optional) — walk-in by default" onSelect={p => setCust({ name: p.name, id: p.id })} />}
              {rx && <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"><ClipboardList className="h-4 w-4" />Linked to prescription <b>{rx.id}</b> by {rx.doctor}</div>}
            </div>
            <ul className="max-h-[38vh] divide-y overflow-auto">
              {cart.map((i, k) => (
                <li key={i.medId + i.batch} className="p-3">
                  <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-sm font-semibold">{i.name}{i.controlled && <Badge tone="purple" className="ml-1">Controlled</Badge>}</div><div className="text-[11px] muted">Batch {i.batch} · exp {fDate(i.expiry)} · GST {i.tax}%</div></div><Button variant="ghost" size="icon" aria-label={`Remove ${i.name}`} className="text-red-600" onClick={() => setCart(cart.filter((_, j) => j !== k))}><Trash2 /></Button></div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex items-center rounded-lg border"><Button variant="ghost" size="icon" aria-label="Decrease quantity" onClick={() => upd(k, { qty: Math.max(1, i.qty - 1) })}><Minus /></Button><input aria-label="Quantity" type="number" min={1} max={i.max} value={i.qty} onChange={e => upd(k, { qty: Math.max(1, Math.min(i.max, Number(e.target.value) || 1)) })} className="w-12 bg-transparent text-center text-sm font-semibold outline-none" /><Button variant="ghost" size="icon" aria-label="Increase quantity" disabled={i.qty >= i.max} onClick={() => upd(k, { qty: i.qty + 1 })}><Plus /></Button></div>
                    <span className="text-xs muted">× {money(i.mrp)}</span>
                    <label className="flex items-center gap-1 text-xs muted">Disc<input aria-label="Item discount percent" type="number" min={0} max={100} value={i.disc} onChange={e => upd(k, { disc: Math.min(100, Math.max(0, Number(e.target.value))) })} className="input h-7 w-14 px-1.5 text-xs" />%</label>
                    <span className="ml-auto text-sm font-bold">{money(i.qty * i.mrp * (1 - i.disc / 100))}</span>
                  </div>
                  <input aria-label="Dosage instructions" value={i.instr} onChange={e => upd(k, { instr: e.target.value })} placeholder="Dosage instructions (printed on receipt)…" className="mt-1.5 w-full rounded border-0 bg-slate-50 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-600 dark:bg-slate-800" />
                </li>))}
              {!cart.length && <Empty text="Cart is empty — scan or add medicines" icon={ShoppingCart} />}
            </ul>
            {hasCS && <div className="border-t bg-violet-50 p-3 dark:bg-violet-500/10"><div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-violet-800 dark:text-violet-300"><ShieldAlert className="h-4 w-4" />Controlled substance — prescriber details are mandatory</div><div className="grid grid-cols-2 gap-2"><Input aria-label="Prescribing doctor" placeholder="Prescribing doctor *" value={cs.doctor} onChange={e => setCs({ ...cs, doctor: e.target.value })} /><Input aria-label="Prescription number" placeholder="Prescription no. *" value={cs.rxNo} onChange={e => setCs({ ...cs, rxNo: e.target.value })} /></div></div>}
            <div className="space-y-1 border-t p-3 text-sm">
              <div className="flex justify-between"><span className="muted">Subtotal</span><span>{money(gross)}</span></div>
              <div className="flex justify-between"><span className="muted">Item discounts</span><span>− {money(itemDisc)}</span></div>
              <div className="flex items-center justify-between"><label className="flex items-center gap-2 muted">Bill discount<input aria-label="Bill discount percent" type="number" min={0} max={50} value={billDisc} onChange={e => setBillDisc(Math.min(50, Math.max(0, Number(e.target.value))))} className="input h-7 w-16 px-1.5 text-xs" />%</label><span>− {money(bd)}</span></div>
              <div className="flex justify-between"><span className="muted">GST</span><span>{money(tax)}</span></div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span className="text-primary dark:text-blue-400">{money(total)}</span></div>
              <Button size="lg" variant="success" className="mt-2 w-full" disabled={!cart.length || !csOk} onClick={() => setPay(true)}>Pay {money(total)}</Button>
              {!csOk && <p className="flex items-center justify-center gap-1 text-xs text-red-600"><AlertTriangle className="h-3 w-3" />Enter prescriber details to sell controlled medicines</p>}
            </div>
          </Section>
        </div>
      )}
      {tab === 'sales' && <Section pad={false}><DataTable rows={sales} exportName="Pharmacy sales" cols={[{ key: 'id', label: 'Bill', className: 'font-mono text-xs' }, { key: 'date', label: 'Date', render: (r: any) => fDate(r.date) }, { key: 'patientName', label: 'Customer' }, { key: 'items', label: 'Items', val: (r: any) => r.items.map((i: any) => i.name).join(', '), render: (r: any) => <span className="text-xs">{r.items.map((i: any) => `${i.name} ×${i.qty}`).join(', ')}</span> }, { key: 'total', label: 'Total', render: (r: any) => money(r.total) }, { key: 'pay', label: 'Mode', val: (r: any) => r.payments.map((p: any) => p.mode).join(' + ') , render: (r: any) => r.payments.map((p: any) => p.mode).join(' + ') }]}
        actions={(r: any) => <><Button size="xs" variant="outline" onClick={() => printPreview(`Receipt ${r.id}`, <Receipt sale={r} />, true)}><Printer />Receipt</Button><Button size="xs" variant="outline" onClick={() => setRet({ sale: r, idx: 0, qty: 1, type: 'Return', reason: '', restock: true })}><Undo2 />Return</Button></>} /></Section>}
      {tab === 'returns' && <Section pad={false}><Resource coll="pharmacyReturns" name="Return" prefix="RET" canAdd={false} canEdit={false} cols={[{ key: 'date', label: 'Date', type: 'date' }, { key: 'saleId', label: 'Bill no.' }, { key: 'item', label: 'Medicine' }, { key: 'qty', label: 'Qty', type: 'number' }, { key: 'amount', label: 'Refund', type: 'money' }, { key: 'type', label: 'Type', type: 'status', options: ['Return', 'Exchange'] }, { key: 'reason', label: 'Reason' }]} /></Section>}
      {tab === 'cs' && <Section pad={false} title="Schedule H1 / narcotic register" desc="Every controlled-drug sale is logged automatically with prescriber details"><Resource coll="controlledLog" name="Entry" prefix="CS" canAdd={false} canEdit={false} canDelete={false} cols={[{ key: 'date', label: 'Date', type: 'date' }, { key: 'medicine', label: 'Medicine' }, { key: 'qty', label: 'Qty', type: 'number' }, { key: 'patient', label: 'Patient' }, { key: 'doctor', label: 'Prescriber' }, { key: 'rxNo', label: 'Rx no.' }, { key: 'by', label: 'Dispensed by' }]} /></Section>}

      <Modal open={pay} onClose={() => setPay(false)} title="Payment">{pay && <PaymentPanel total={total} onPay={checkout} modes={['Cash', 'Card', 'UPI', 'Wallet', 'Insurance', 'Credit']} label="Complete sale & print receipt" />}</Modal>
      <Modal open={!!alt} onClose={() => setAlt(null)} title={`Generic substitutes — ${alt?.generic}`}>
        {alt && <ul className="divide-y">{alts.map(m => <li key={m.id} className="flex items-center gap-3 py-2.5"><div className="flex-1"><div className="text-sm font-semibold">{m.name}</div><div className="text-xs muted">{m.manufacturer} · {stock(m)} in stock</div></div><div className="text-right"><div className="font-bold">{money(m.mrp)}</div>{m.mrp < alt.mrp && <Badge tone="green">Save {Math.round((1 - m.mrp / alt.mrp) * 100)}%</Badge>}</div><Button size="sm" disabled={!stock(m)} onClick={() => { addItem(m); setAlt(null) }}><Plus />Add</Button></li>)}{!alts.length && <Empty text="No alternative brand with the same generic composition" />}</ul>}
      </Modal>
      <Modal open={!!ret} onClose={() => setRet(null)} size="sm" title={`Return / exchange — ${ret?.sale.id}`} footer={<><Button variant="outline" onClick={() => setRet(null)}>Cancel</Button><Button onClick={doReturn}>Process</Button></>}>
        {ret && <div className="grid grid-cols-2 gap-3">
          <Field label="Item" className="col-span-2"><Select value={ret.idx} onChange={e => setRet({ ...ret, idx: Number(e.target.value) })} options={ret.sale.items.map((i: any, k: number) => ({ value: String(k), label: `${i.name} (sold ${i.qty})` }))} /></Field>
          <Field label="Quantity"><Input type="number" min={1} max={ret.sale.items[ret.idx].qty} value={ret.qty} onChange={e => setRet({ ...ret, qty: e.target.value })} /></Field>
          <Field label="Type"><Select value={ret.type} onChange={e => setRet({ ...ret, type: e.target.value })} options={['Return', 'Exchange']} /></Field>
          <Field label="Reason" required className="col-span-2"><Select value={ret.reason} onChange={e => setRet({ ...ret, reason: e.target.value })} placeholder="Select reason…" options={['Doctor changed prescription', 'Adverse reaction', 'Wrong item dispensed', 'Damaged packaging', 'Patient discharged / expired', 'Excess quantity']} /></Field>
          <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-blue-800" checked={ret.restock} onChange={e => setRet({ ...ret, restock: e.target.checked })} />Return item to saleable stock (same batch)</label>
        </div>}
      </Modal>
    </>
  )
}
