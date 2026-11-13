import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Eraser, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { confirmAction, toast, useColl, useDB } from '@/app/store'
import { Avatar, Badge, Button, Col, DataTable, Field, Input, Modal, Select, Status, Textarea } from '@/components/ui'
import { useDebounce } from '@/hooks'
import { ageOf, cn, fDate, money, sum, today, uid } from '@/utils'
import { PAY_MODES } from '@/utils/constants'
import { Letterhead, Sign } from './overlays'
import type { Bill, Patient, Payment } from '@/types'

/* ───────── Patient search / banner ───────── */
export function PatientSearch({ onSelect, placeholder = 'Search patient by name, ID or phone…', autoFocus, className }: { onSelect: (p: Patient) => void; placeholder?: string; autoFocus?: boolean; className?: string }) {
  const patients = useColl<Patient>('patients')
  const [q, setQ] = useState(''), dq = useDebounce(q, 200), [open, setOpen] = useState(false), [hi, setHi] = useState(0)
  const res = useMemo(() => { const s = dq.trim().toLowerCase(); return s ? patients.filter(p => p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s) || p.phone.replace(/\s/g, '').includes(s.replace(/\s/g, ''))).slice(0, 8) : [] }, [dq, patients])
  const choose = (p: Patient) => { onSelect(p); setQ(''); setOpen(false) }
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
      <input role="combobox" aria-expanded={open && res.length > 0} aria-controls="pt-results" aria-label="Patient search" autoFocus={autoFocus} value={q} placeholder={placeholder} className="input pl-8"
        onChange={e => { setQ(e.target.value); setOpen(true); setHi(0) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(res.length - 1, h + 1)) } else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(0, h - 1)) } else if (e.key === 'Enter' && res[hi]) { e.preventDefault(); choose(res[hi]) } }} />
      {open && dq && (
        <ul id="pt-results" role="listbox" className="card absolute z-30 mt-1 max-h-72 w-full animate-scale-in overflow-auto p-1 shadow-xl">
          {res.length ? res.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === hi} onMouseDown={() => choose(p)} onMouseEnter={() => setHi(i)} className={cn('flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5', i === hi && 'bg-blue-50 dark:bg-blue-500/10')}>
              <Avatar name={p.name} src={p.photo} size={28} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{p.name}</div><div className="truncate text-xs muted">{p.id} · {ageOf(p.dob)}y {p.gender[0]} · {p.phone}</div></div>
              {p.allergies && <Badge tone="red">Allergy</Badge>}
            </li>)) : <li className="px-3 py-2 text-sm muted">No patient found</li>}
        </ul>
      )}
    </div>
  )
}
export function PatientBanner({ p, onClear, extra }: { p: Patient; onClear?: () => void; extra?: React.ReactNode }) {
  return (
    <div className="card flex flex-wrap items-center gap-3 p-3">
      <Avatar name={p.name} src={p.photo} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{p.name}</span><Badge tone="blue">{p.id}</Badge><Badge>{p.category}</Badge><Badge tone="red">{p.blood}</Badge></div>
        <div className="text-xs muted">{ageOf(p.dob)} yrs · {p.gender} · {p.phone}{p.insProvider ? ` · ${p.insProvider}` : ''}</div>
        {(p.allergies || p.chronic) && <div className="mt-1 flex flex-wrap gap-1.5">{p.allergies && <span className="inline-flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold text-white"><AlertTriangle className="h-3 w-3" />ALLERGY: {p.allergies}</span>}{p.chronic && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">{p.chronic}</span>}</div>}
      </div>
      {extra}{onClear && <Button variant="ghost" size="icon" aria-label="Clear patient" onClick={onClear}><X /></Button>}
    </div>
  )
}

/* ───────── Generic CRUD resource (table + add/edit form + delete confirm + export) ───────── */
export type RCol = { key: string; label: string; type?: 'text' | 'number' | 'money' | 'date' | 'time' | 'select' | 'status' | 'textarea'; options?: string[] | 'patients' | 'doctors' | 'employees'; table?: boolean; form?: boolean; required?: boolean; render?: (r: any) => React.ReactNode; def?: any }
interface ResourceProps { coll: string; cols: RCol[]; prefix: string; name: string; filter?: (r: any) => boolean; actions?: (r: any) => React.ReactNode; canAdd?: boolean; canEdit?: boolean; canDelete?: boolean; toolbar?: React.ReactNode; pageSize?: number; onAdd?: (item: any) => void; rowClass?: (r: any) => string }
export function Resource({ coll, cols, prefix, name, filter, actions, canAdd = true, canEdit = true, canDelete = true, toolbar, pageSize, onAdd, rowClass }: ResourceProps) {
  const all = useColl(coll), { add, update, remove } = useDB()
  const names = { patients: useColl('patients'), doctors: useColl('doctors'), employees: useColl('employees') }
  const rows = useMemo(() => (filter ? all.filter(filter) : all), [all, filter])
  const [edit, setEdit] = useState<any | null>(null), [errs, setErrs] = useState<Record<string, string>>({})
  const opts = (c: RCol): string[] => (typeof c.options === 'string' ? names[c.options].map((x: any) => x.name) : c.options || [])
  const formCols = cols.filter(c => c.form !== false)
  const blank = () => Object.fromEntries(formCols.map(c => [c.key, c.def ?? (c.type === 'date' ? today() : c.type === 'number' || c.type === 'money' ? 0 : (c.type === 'select' || c.type === 'status') && Array.isArray(c.options) ? c.options[0] : '')]))
  const save = () => {
    const e: Record<string, string> = {}
    formCols.forEach(c => { if (c.required && (edit[c.key] === '' || edit[c.key] == null)) e[c.key] = `${c.label} is required` })
    setErrs(e); if (Object.keys(e).length) return
    const data = { ...edit }; formCols.forEach(c => { if (c.type === 'number' || c.type === 'money') data[c.key] = Number(data[c.key]) || 0 })
    if (data.id) { update(coll, data.id, data); toast.success(`${name} updated`) }
    else { const item = { ...data, id: uid(prefix) }; add(coll, item); onAdd?.(item); toast.success(`${name} added`) }
    setEdit(null)
  }
  const tcols: Col[] = cols.filter(c => c.table !== false && c.key !== 'id').map(c => ({
    key: c.key, label: c.label,
    render: c.render || (c.type === 'money' ? (r: any) => money(r[c.key]) : c.type === 'date' ? (r: any) => fDate(r[c.key]) : c.type === 'status' ? (r: any) => <Status v={r[c.key]} /> : undefined),
  }))
  return (
    <>
      <DataTable rows={rows} cols={[{ key: 'id', label: 'ID', className: 'font-mono text-xs' }, ...tcols]} exportName={name} pageSize={pageSize} rowClass={rowClass}
        toolbar={<>{toolbar}{canAdd && <Button size="sm" onClick={() => { setErrs({}); setEdit(blank()) }}><Plus />Add {name}</Button>}</>}
        actions={r => <>{actions?.(r)}{canEdit && <Button variant="ghost" size="icon" aria-label={`Edit ${r.id}`} onClick={() => { setErrs({}); setEdit({ ...r }) }}><Pencil /></Button>}{canDelete && <Button variant="ghost" size="icon" aria-label={`Delete ${r.id}`} className="text-red-600" onClick={() => confirmAction({ title: `Delete ${name}?`, message: `${r.id} will be permanently removed.`, danger: true, confirmLabel: 'Delete', onConfirm: () => { remove(coll, r.id); toast.success(`${name} deleted`) } })}><Trash2 /></Button>}</>} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`${edit?.id ? 'Edit' : 'Add'} ${name}`} footer={<><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
        {edit && <div className="grid gap-3 sm:grid-cols-2">{formCols.map(c => (
          <Field key={c.key} label={c.label} required={c.required} error={errs[c.key]} className={c.type === 'textarea' ? 'sm:col-span-2' : ''}>
            {c.type === 'select' || c.type === 'status' ? <Select value={edit[c.key] ?? ''} onChange={e => setEdit({ ...edit, [c.key]: e.target.value })} options={opts(c)} placeholder={typeof c.options === 'string' ? 'Select…' : undefined} />
              : c.type === 'textarea' ? <Textarea rows={2} value={edit[c.key] ?? ''} onChange={e => setEdit({ ...edit, [c.key]: e.target.value })} />
                : <Input type={c.type === 'money' ? 'number' : c.type || 'text'} value={edit[c.key] ?? ''} onChange={e => setEdit({ ...edit, [c.key]: e.target.value })} />}
          </Field>))}</div>}
      </Modal>
    </>
  )
}

/* ───────── Payment panel (split payments, cash change) ───────── */
export function PaymentPanel({ total, onPay, modes = PAY_MODES, allowPartial, label = 'Complete Payment' }: { total: number; onPay: (payments: Payment[]) => void; modes?: string[]; allowPartial?: boolean; label?: string }) {
  const [rows, setRows] = useState<Payment[]>([{ mode: 'Cash', amount: +total.toFixed(2), ref: '' }]), [tendered, setTendered] = useState('')
  useEffect(() => setRows(r => (r.length === 1 ? [{ ...r[0], amount: +total.toFixed(2) }] : r)), [total])
  const paid = sum(rows, r => r.amount), balance = +(total - paid).toFixed(2), cash = sum(rows.filter(r => r.mode === 'Cash'), r => r.amount)
  const change = Number(tendered) - cash
  const set = (i: number, p: Partial<Payment>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const REF: Record<string, string> = { Card: 'Terminal txn / last 4 digits', UPI: 'UPI reference', Wallet: 'Wallet txn ID', Cheque: 'Cheque no. / bank', Insurance: 'TPA / claim no.', 'Corporate Credit': 'Company / PO ref', 'Govt Scheme': 'Scheme (CGHS / ESI / Ayushman) & card no.' }
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-500/10"><div className="text-xs muted">Amount payable</div><div className="text-2xl font-bold text-primary dark:text-blue-300">{money(total)}</div></div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-2">
          <Select aria-label="Payment mode" className="col-span-4" value={r.mode} onChange={e => set(i, { mode: e.target.value })} options={modes} />
          <Input aria-label="Amount" className="col-span-3" type="number" min={0} value={r.amount} onChange={e => set(i, { amount: Number(e.target.value) })} />
          <Input aria-label="Reference" className="col-span-4" placeholder={REF[r.mode] || 'Reference (optional)'} value={r.ref || ''} onChange={e => set(i, { ref: e.target.value })} disabled={r.mode === 'Cash'} />
          <Button variant="ghost" size="icon" aria-label="Remove payment" className="col-span-1" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, j) => j !== i))}><X /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setRows([...rows, { mode: 'Card', amount: Math.max(0, balance), ref: '' }])}><Plus />Split payment</Button>
      {cash > 0 && <div className="grid grid-cols-2 gap-2"><Field label="Cash tendered"><Input type="number" value={tendered} onChange={e => setTendered(e.target.value)} placeholder={String(cash)} /></Field><Field label="Change to return"><div className={cn('flex h-9 items-center rounded-lg border px-3 text-sm font-semibold', change < 0 && tendered ? 'text-red-600' : 'text-emerald-600')}>{tendered ? money(change) : '—'}</div></Field></div>}
      <div className="flex items-center justify-between text-sm"><span>Paid: <b>{money(paid)}</b></span><span className={balance > 0.009 ? 'text-amber-600' : balance < -0.009 ? 'text-red-600' : 'text-emerald-600'}>{balance > 0.009 ? `Balance due: ${money(balance)}` : balance < -0.009 ? `Excess: ${money(-balance)}` : 'Fully settled'}</span></div>
      <Button className="w-full" size="lg" variant="success" disabled={balance < -0.009 || (!allowPartial && balance > 0.009)} onClick={() => onPay(rows.filter(r => r.amount > 0))}>{label}</Button>
      {!allowPartial && balance > 0.009 && <p className="text-center text-xs muted">Add another mode to settle the remaining balance.</p>}
    </div>
  )
}

/* ───────── Barcode (Code-39 style rendering for labels) ───────── */
export function Barcode({ value, height = 40, showText = true }: { value: string; height?: number; showText?: boolean }) {
  const bars = useMemo(() => { const out: number[] = [1, 0, 1, 0]; for (const ch of `*${value}*`) { const c = ch.charCodeAt(0); for (let i = 6; i >= 0; i--) out.push((c >> i) & 1, i % 3 === 0 ? 0 : 1) } return out }, [value])
  return (
    <div style={{ display: 'inline-block', textAlign: 'center', background: '#fff', padding: 4 }}>
      <svg width={bars.length * 1.4} height={height} role="img" aria-label={`Barcode ${value}`}>{bars.map((b, i) => (b ? <rect key={i} x={i * 1.4} y={0} width={1.4} height={height} fill="#000" /> : null))}</svg>
      {showText && <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: '#000' }}>{value}</div>}
    </div>
  )
}

/* ───────── Signature pad (digital consent) ───────── */
export function SignaturePad({ value, onChange, height = 120 }: { value?: string; onChange: (dataUrl: string) => void; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null), drawing = useRef(false)
  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return [(e.clientX - r.left) * (ref.current!.width / r.width), (e.clientY - r.top) * (ref.current!.height / r.height)] }
  const start = (e: React.PointerEvent) => { drawing.current = true; const ctx = ref.current!.getContext('2d')!; const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#0f172a' }
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const ctx = ref.current!.getContext('2d')!; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke() }
  const end = () => { if (drawing.current) { drawing.current = false; onChange(ref.current!.toDataURL()) } }
  const clear = () => { ref.current!.getContext('2d')!.clearRect(0, 0, 600, height); onChange('') }
  return (
    <div>
      <canvas ref={ref} width={600} height={height} aria-label="Signature pad" className="w-full touch-none rounded-lg border-2 border-dashed border-slate-300 bg-white" style={{ height }} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
      <div className="mt-1 flex items-center justify-between text-xs muted"><span>{value ? '✓ Signature captured' : 'Sign above using mouse, finger or stylus'}</span><Button variant="ghost" size="xs" onClick={clear}><Eraser />Clear</Button></div>
    </div>
  )
}

/* ───────── Printable invoice ───────── */
export function InvoiceDoc({ bill, mode = 'Detailed', duplicate }: { bill: Bill; mode?: string; duplicate?: boolean }) {
  const cats = useMemo(() => { const m = new Map<string, number>(); bill.items.forEach(i => m.set(i.cat, (m.get(i.cat) || 0) + i.qty * i.rate)); return [...m.entries()] }, [bill])
  return (
    <Letterhead title={`${bill.status === 'Cancelled' ? 'Cancelled ' : ''}Invoice${duplicate ? ' (Duplicate Copy)' : ''}`} meta={[['Invoice No', bill.id], ['Date', fDate(bill.date)], ['Patient', `${bill.patientName} (${bill.patientId})`], ['Department', bill.dept], ['Bill Type', bill.type], ['Status', bill.status]]}>
      <table>
        <thead><tr><th>#</th><th>{mode === 'Summary' ? 'Category' : 'Description'}</th>{mode !== 'Summary' && <><th>Qty</th><th>Rate</th></>}<th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
        <tbody>{mode === 'Summary' ? cats.map(([c, a], i) => <tr key={c}><td>{i + 1}</td><td>{c}</td><td style={{ textAlign: 'right' }}>{money(a)}</td></tr>)
          : bill.items.map((it, i) => <tr key={i}><td>{i + 1}</td><td>{it.desc}<span style={{ color: '#64748b' }}> · {it.cat}</span></td><td>{it.qty}</td><td>{money(it.rate)}</td><td style={{ textAlign: 'right' }}>{money(it.qty * it.rate)}</td></tr>)}</tbody>
      </table>
      <table className="plain" style={{ marginTop: 8, marginLeft: 'auto', width: '45%' }}><tbody>
        <tr><td>Subtotal</td><td style={{ textAlign: 'right' }}>{money(bill.subtotal)}</td></tr>
        <tr><td>Discount</td><td style={{ textAlign: 'right' }}>− {money(bill.discount)}</td></tr>
        <tr><td>Tax</td><td style={{ textAlign: 'right' }}>{money(bill.tax)}</td></tr>
        <tr><td><b>Grand Total</b></td><td style={{ textAlign: 'right' }}><b>{money(bill.total)}</b></td></tr>
        <tr><td>Paid{bill.payments.length ? ` (${bill.payments.map(p => p.mode).join(', ')})` : ''}</td><td style={{ textAlign: 'right' }}>{money(bill.paid)}</td></tr>
        <tr><td><b>Balance Due</b></td><td style={{ textAlign: 'right' }}><b>{money(bill.total - bill.paid)}</b></td></tr>
      </tbody></table>
      {bill.cancelReason && <p style={{ marginTop: 8 }}><b>Cancellation reason:</b> {bill.cancelReason}</p>}
      <Sign label="Cashier / Authorised Signatory" name={bill.by} />
    </Letterhead>
  )
}
