import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, PackageCheck, PackageMinus, PackagePlus, Printer, ShoppingBag, Truck } from 'lucide-react'
import { confirmAction, printPreview, toast, useAuth, useColl, useDB } from '@/app/store'
import { Barcode, Resource } from '@/components/common'
import { Letterhead, Sign } from '@/components/common/overlays'
import { Badge, Button, DataTable, Field, Input, Modal, PageHeader, Section, Select, Stat, Status, Tabs } from '@/components/ui'
import { cn, daysTo, dOff, fDate, money, sum, today, uid } from '@/utils'
import type { Medicine } from '@/types'

const total = (m: Medicine) => sum(m.batches, b => b.qty)

export default function PharmacyInventory() {
  const user = useAuth(s => s.user)!, { add, update } = useDB()
  const meds = useColl<Medicine>('medicines'), suppliers = useColl('suppliers'), sales = useColl('pharmacySales'), transfers = useColl('stockTransfers')
  const [tab, setTab] = useState('master'), [win, setWin] = useState(90), [adj, setAdj] = useState<any | null>(null)
  const [si, setSi] = useState<any>({ medId: '', batch: '', expiry: dOff(365), qty: 100, mrp: 0, purchase: 0, supplier: '', invoice: '' })
  const batches = useMemo(() => meds.flatMap(m => m.batches.map(b => ({ ...b, id: `${m.id}-${b.batch}`, medId: m.id, name: m.name, generic: m.generic, mrp: m.mrp, days: daysTo(b.expiry), value: b.qty * b.purchase }))), [meds])
  const low = meds.filter(m => total(m) < m.reorder), expiring = batches.filter(b => b.days <= win && b.qty > 0).sort((a, b) => a.days - b.days)
  const out = useMemo(() => [...sales.flatMap((s: any) => s.items.map((i: any, k: number) => ({ id: `${s.id}-${k}`, date: s.date, item: i.name, batch: i.batch, qty: i.qty, type: 'Sale', ref: s.id, to: s.patientName }))), ...transfers.map((t: any) => ({ id: t.id, date: t.date, item: t.item, batch: '—', qty: t.qty, type: 'Transfer', ref: t.id, to: t.to }))].sort((a, b) => b.date.localeCompare(a.date)), [sales, transfers])
  const stockIn = () => {
    const m = meds.find(x => x.id === si.medId)
    if (!m || !si.batch.trim() || si.qty <= 0) return toast.error('Select medicine and enter batch number & quantity')
    if (daysTo(si.expiry) <= 0) return toast.error('Expiry date must be in the future')
    const ex = m.batches.find(b => b.batch === si.batch)
    update('medicines', m.id, { mrp: Number(si.mrp) || m.mrp, batches: ex ? m.batches.map(b => (b === ex ? { ...b, qty: b.qty + Number(si.qty) } : b)) : [...m.batches, { batch: si.batch.trim(), expiry: si.expiry, qty: Number(si.qty), purchase: Number(si.purchase) || +(m.mrp * 0.7).toFixed(2) }] })
    add('stockIns', { id: uid('GRN'), date: today(), medicine: m.name, batch: si.batch, expiry: si.expiry, qty: Number(si.qty), mrp: Number(si.mrp) || m.mrp, purchase: Number(si.purchase), supplier: si.supplier, invoice: si.invoice, by: user.name })
    toast.success(`Stock received: ${m.name} × ${si.qty}`); setSi({ ...si, batch: '', qty: 100, invoice: '' })
  }
  const applyAdj = () => {
    const m = meds.find(x => x.id === adj.medId)!, q = Number(adj.qty)
    if (!adj.reason.trim() || !q) return toast.error('Enter quantity and reason')
    const delta = adj.type === 'Write-off' ? -Math.abs(q) : q
    update('medicines', m.id, { batches: m.batches.map(b => (b.batch === adj.batch ? { ...b, qty: Math.max(0, b.qty + delta) } : b)) })
    add('stockAdjustments', { id: uid('ADJ'), date: today(), medicine: m.name, batch: adj.batch, type: adj.type, qty: delta, reason: adj.reason, by: user.name })
    toast.success('Stock adjusted'); setAdj(null)
  }
  const createPO = (m: Medicine) => { add('purchaseOrders', { id: uid('PO'), date: today(), supplier: suppliers[0]?.name || '', items: `${m.name} ×${m.reorder * 3}`, amount: Math.round(m.reorder * 3 * m.mrp * 0.7), expected: dOff(5), status: 'Draft' }); toast.success(`Draft purchase order created for ${m.name}`); setTab('po') }
  const PODoc = ({ po }: { po: any }) => <Letterhead title="Purchase Order" meta={[['PO No', po.id], ['Date', fDate(po.date)], ['Supplier', po.supplier], ['Expected delivery', fDate(po.expected)]]}><table><thead><tr><th>#</th><th>Item</th><th>Qty</th></tr></thead><tbody>{String(po.items).split(',').map((x, i) => { const [n, q] = x.split('×'); return <tr key={i}><td>{i + 1}</td><td>{n.trim()}</td><td>{q || '—'}</td></tr> })}</tbody></table><p style={{ textAlign: 'right', marginTop: 8 }}><b>Order value: {money(po.amount)}</b></p><Sign label="Purchase Officer" /></Letterhead>
  return (
    <>
      <PageHeader title="Pharmacy Inventory" desc="Medicine master, batches, purchases and stock control" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={PackageCheck} label="Medicines (SKUs)" value={meds.length} sub={`${batches.length} batches`} /><Stat icon={ShoppingBag} label="Stock value (cost)" value={money(Math.round(sum(batches, b => b.value)))} tone="green" />
        <Stat icon={AlertTriangle} label="Below reorder level" value={low.length} tone="red" onClick={() => setTab('low')} /><Stat icon={CalendarClock} label="Expiring ≤ 90 days" value={batches.filter(b => b.days <= 90 && b.qty > 0).length} tone="amber" onClick={() => setTab('expiry')} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'master', label: 'Medicine master' }, { id: 'batches', label: 'Batch-wise stock' }, { id: 'in', label: 'Stock-in', icon: PackagePlus }, { id: 'out', label: 'Stock-out', icon: PackageMinus }, { id: 'expiry', label: 'Expiry alerts', badge: batches.filter(b => b.days <= 30 && b.qty > 0).length }, { id: 'low', label: 'Low stock', badge: low.length }, { id: 'adj', label: 'Adjustments' }, { id: 'transfer', label: 'Transfers' }, { id: 'sup', label: 'Suppliers', icon: Truck }, { id: 'po', label: 'Purchase orders' }]} />
      <Section pad={false}>
        {tab === 'master' && <Resource coll="medicines" name="Medicine" prefix="MED" onAdd={i => update('medicines', i.id, { batches: [], controlled: i.schedule === 'Controlled', barcode: i.barcode || `890${Date.now().toString().slice(-7)}` })} cols={[
          { key: 'name', label: 'Name', required: true }, { key: 'generic', label: 'Generic', required: true }, { key: 'manufacturer', label: 'Manufacturer' }, { key: 'category', label: 'Category' }, { key: 'form', label: 'Form', type: 'select', options: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Inhaler', 'Infusion', 'Sachet', 'Solution', 'Ointment'] },
          { key: 'hsn', label: 'HSN' }, { key: 'barcode', label: 'Barcode', table: false }, { key: 'mrp', label: 'MRP', type: 'money' }, { key: 'tax', label: 'GST %', type: 'number', def: 12 }, { key: 'reorder', label: 'Reorder lvl', type: 'number', def: 100 },
          { key: 'stock', label: 'Stock', form: false, render: (m: any) => <Badge tone={total(m) < m.reorder ? 'red' : 'green'}>{total(m)}</Badge> }, { key: 'controlled', label: 'Sched.', form: false, render: (m: any) => (m.controlled ? <Badge tone="purple">Controlled</Badge> : '—') }]}
          actions={(m: any) => <Button size="xs" variant="outline" onClick={() => printPreview(`Barcode ${m.name}`, <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, fontWeight: 700 }}>{m.name}</div><Barcode value={m.barcode} /><div style={{ fontSize: 10 }}>MRP {money(m.mrp)}</div></div>, true)}>Barcode</Button>} />}
        {tab === 'batches' && <DataTable rows={batches} exportName="Batch-wise stock report" cols={[{ key: 'name', label: 'Medicine' }, { key: 'batch', label: 'Batch', className: 'font-mono text-xs' }, { key: 'expiry', label: 'Expiry', render: (b: any) => <span className={cn(b.days <= 30 ? 'font-semibold text-red-600' : b.days <= 90 ? 'text-amber-600' : '')}>{fDate(b.expiry)}</span> }, { key: 'days', label: 'Days left' }, { key: 'qty', label: 'Qty' }, { key: 'purchase', label: 'Cost', render: (b: any) => money(b.purchase) }, { key: 'mrp', label: 'MRP', render: (b: any) => money(b.mrp) }, { key: 'value', label: 'Value', render: (b: any) => money(Math.round(b.value)) }]}
          actions={(b: any) => <Button size="xs" variant="outline" onClick={() => setAdj({ medId: b.medId, name: b.name, batch: b.batch, type: 'Write-off', qty: '', reason: '' })}>Adjust / write-off</Button>} />}
        {tab === 'in' && <div>
          <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Medicine" required className="lg:col-span-2"><Select value={si.medId} onChange={e => { const m = meds.find(x => x.id === e.target.value); setSi({ ...si, medId: e.target.value, mrp: m?.mrp || 0, purchase: m ? +(m.mrp * 0.7).toFixed(2) : 0 }) }} placeholder="Select medicine…" options={meds.map(m => ({ value: m.id, label: `${m.name} (${m.generic})` }))} /></Field>
            <Field label="Supplier"><Select value={si.supplier} onChange={e => setSi({ ...si, supplier: e.target.value })} placeholder="Select…" options={suppliers.map((s: any) => s.name)} /></Field>
            <Field label="Supplier invoice no."><Input value={si.invoice} onChange={e => setSi({ ...si, invoice: e.target.value })} /></Field>
            <Field label="Batch no." required><Input value={si.batch} onChange={e => setSi({ ...si, batch: e.target.value.toUpperCase() })} /></Field>
            <Field label="Expiry date" required><Input type="date" min={today()} value={si.expiry} onChange={e => setSi({ ...si, expiry: e.target.value })} /></Field>
            <Field label="Quantity" required><Input type="number" min={1} value={si.qty} onChange={e => setSi({ ...si, qty: Number(e.target.value) })} /></Field>
            <div className="grid grid-cols-2 gap-2"><Field label="MRP"><Input type="number" step="0.01" value={si.mrp} onChange={e => setSi({ ...si, mrp: e.target.value })} /></Field><Field label="Purchase price"><Input type="number" step="0.01" value={si.purchase} onChange={e => setSi({ ...si, purchase: e.target.value })} /></Field></div>
            <div className="flex items-end gap-3 lg:col-span-4"><Button onClick={stockIn}><PackagePlus />Receive stock</Button>{si.mrp > 0 && <span className="text-xs muted">Margin: {Math.round((1 - si.purchase / si.mrp) * 100)}% · Line value: {money(si.qty * si.purchase)}</span>}</div>
          </div>
          <Resource coll="stockIns" name="Purchase entry" prefix="GRN" canAdd={false} canEdit={false} cols={[{ key: 'date', label: 'Date', type: 'date' }, { key: 'medicine', label: 'Medicine' }, { key: 'batch', label: 'Batch' }, { key: 'expiry', label: 'Expiry', type: 'date' }, { key: 'qty', label: 'Qty', type: 'number' }, { key: 'purchase', label: 'Cost', type: 'money' }, { key: 'mrp', label: 'MRP', type: 'money' }, { key: 'supplier', label: 'Supplier' }, { key: 'invoice', label: 'Invoice' }]} />
        </div>}
        {tab === 'out' && <DataTable rows={out} exportName="Stock-out report" cols={[{ key: 'date', label: 'Date', render: (r: any) => fDate(r.date) }, { key: 'item', label: 'Medicine' }, { key: 'batch', label: 'Batch' }, { key: 'qty', label: 'Qty' }, { key: 'type', label: 'Type', render: (r: any) => <Badge tone={r.type === 'Sale' ? 'green' : 'blue'}>{r.type}</Badge> }, { key: 'ref', label: 'Reference' }, { key: 'to', label: 'Issued to' }]} />}
        {tab === 'expiry' && <DataTable rows={expiring} exportName={`Expiry report ${win} days`} toolbar={<div className="flex rounded-lg border p-0.5">{[30, 60, 90].map(d => <button key={d} aria-pressed={win === d} onClick={() => setWin(d)} className={cn('rounded-md px-3 py-1 text-xs font-medium', win === d ? 'bg-primary text-white' : 'muted')}>{d} days</button>)}</div>}
          cols={[{ key: 'name', label: 'Medicine' }, { key: 'batch', label: 'Batch' }, { key: 'expiry', label: 'Expiry', render: (b: any) => fDate(b.expiry) }, { key: 'days', label: 'Status', render: (b: any) => <Badge tone={b.days <= 0 ? 'red' : b.days <= 30 ? 'red' : b.days <= 60 ? 'amber' : 'blue'}>{b.days <= 0 ? 'Expired' : `${b.days} days left`}</Badge> }, { key: 'qty', label: 'Qty' }, { key: 'value', label: 'Value at risk', render: (b: any) => money(Math.round(b.value)) }]}
          actions={(b: any) => <Button size="xs" variant="outline" onClick={() => setAdj({ medId: b.medId, name: b.name, batch: b.batch, type: 'Write-off', qty: b.qty, reason: b.days <= 0 ? 'Expired' : 'Near expiry – return to supplier' })}>Write-off</Button>} empty={`No batches expiring within ${win} days`} />}
        {tab === 'low' && <DataTable rows={low} exportName="Low stock report" cols={[{ key: 'name', label: 'Medicine' }, { key: 'generic', label: 'Generic' }, { key: 'stock', label: 'In stock', val: (m: any) => total(m), render: (m: any) => <Badge tone="red">{total(m)}</Badge> }, { key: 'reorder', label: 'Reorder level' }, { key: 'suggest', label: 'Suggested order', val: (m: any) => m.reorder * 3, render: (m: any) => m.reorder * 3 }]} actions={(m: any) => <Button size="xs" onClick={() => createPO(m)}>Create PO</Button>} empty="All medicines above reorder level" />}
        {tab === 'adj' && <Resource coll="stockAdjustments" name="Adjustment" prefix="ADJ" canAdd={false} canEdit={false} cols={[{ key: 'date', label: 'Date', type: 'date' }, { key: 'medicine', label: 'Medicine' }, { key: 'batch', label: 'Batch' }, { key: 'type', label: 'Type', type: 'status', options: ['Write-off', 'Adjustment'] }, { key: 'qty', label: 'Qty ±', type: 'number' }, { key: 'reason', label: 'Reason' }, { key: 'by', label: 'By' }]} />}
        {tab === 'transfer' && <Resource coll="stockTransfers" name="Transfer" prefix="TRF" cols={[{ key: 'date', label: 'Date', type: 'date' }, { key: 'item', label: 'Item', type: 'select', options: meds.map(m => m.name), required: true }, { key: 'qty', label: 'Qty', type: 'number', required: true }, { key: 'from', label: 'From', def: 'Main Pharmacy' }, { key: 'to', label: 'To department', type: 'select', options: ['ICU', 'Emergency', 'OT Store', 'General Ward A', 'General Ward B', 'NICU', 'OPD Pharmacy'] }, { key: 'status', label: 'Status', type: 'status', options: ['Pending', 'Issued', 'Received'] }, { key: 'by', label: 'By', def: user.name }]} />}
        {tab === 'sup' && <Resource coll="suppliers" name="Supplier" prefix="SUP" cols={[{ key: 'name', label: 'Supplier', required: true }, { key: 'contact', label: 'Contact person' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'gst', label: 'GSTIN' }, { key: 'terms', label: 'Payment terms' }, { key: 'rating', label: 'Rating', type: 'number' }, { key: 'status', label: 'Status', type: 'status', options: ['Active', 'Inactive'] }]} />}
        {tab === 'po' && <Resource coll="purchaseOrders" name="Purchase order" prefix="PO" cols={[{ key: 'date', label: 'Date', type: 'date' }, { key: 'supplier', label: 'Supplier', type: 'select', options: suppliers.map((s: any) => s.name), required: true }, { key: 'items', label: 'Items (Name ×Qty, …)', type: 'textarea', required: true }, { key: 'amount', label: 'Amount', type: 'money' }, { key: 'expected', label: 'Expected', type: 'date' }, { key: 'status', label: 'Status', type: 'status', options: ['Draft', 'Ordered', 'Received', 'Cancelled'] }]}
          actions={(po: any) => <><Button size="xs" variant="outline" onClick={() => printPreview(`PO ${po.id}`, <PODoc po={po} />)}><Printer />Print</Button>{po.status === 'Draft' && <Button size="xs" onClick={() => { update('purchaseOrders', po.id, { status: 'Ordered' }); toast.success('PO sent to supplier') }}>Send</Button>}{po.status === 'Ordered' && <Button size="xs" variant="success" onClick={() => confirmAction({ title: 'Mark PO as received?', message: 'Enter the batches under Stock-in to update inventory.', onConfirm: () => { update('purchaseOrders', po.id, { status: 'Received' }); setTab('in') } })}>Receive</Button>}</>} />}
      </Section>
      <Modal open={!!adj} onClose={() => setAdj(null)} size="sm" title={`Stock adjustment — ${adj?.name}`} footer={<><Button variant="outline" onClick={() => setAdj(null)}>Cancel</Button><Button onClick={applyAdj}>Apply</Button></>}>
        {adj && <div className="grid grid-cols-2 gap-3"><Field label="Batch"><Input readOnly disabled value={adj.batch} /></Field><Field label="Type"><Select value={adj.type} onChange={e => setAdj({ ...adj, type: e.target.value })} options={['Write-off', 'Adjustment']} /></Field><Field label={adj.type === 'Write-off' ? 'Quantity to remove' : 'Quantity (+/−)'}><Input type="number" value={adj.qty} onChange={e => setAdj({ ...adj, qty: e.target.value })} /></Field><Field label="Reason" required><Select value={adj.reason} onChange={e => setAdj({ ...adj, reason: e.target.value })} placeholder="Select…" options={['Expired', 'Breakage', 'Near expiry – return to supplier', 'Physical count correction', 'Theft / loss', 'Recalled by manufacturer']} /></Field></div>}
      </Modal>
    </>
  )
}
