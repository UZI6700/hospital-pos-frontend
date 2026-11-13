import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, Copy, CreditCard, Plus, Printer, Undo2 } from 'lucide-react'
import { confirmAction, dbx, printPreview, toast, useAuth, useColl, useDB } from '@/app/store'
import { InvoiceDoc, PatientBanner, PatientSearch, PaymentPanel, Resource } from '@/components/common'
import { Letterhead, Sign } from '@/components/common/overlays'
import { Button, DataTable, Field, Input, Modal, PageHeader, Section, Select, Stat, Status, Tabs } from '@/components/ui'
import { fDate, money, sum, today, uid } from '@/utils'
import type { Bill } from '@/types'

export default function Bills() {
  const nav = useNavigate(), user = useAuth(s => s.user)!, { add, update } = useDB(), bills = useColl<Bill>('bills'), advances = useColl('advances')
  const [tab, setTab] = useState('bills'), [f, setF] = useState('All'), [pay, setPay] = useState<Bill | null>(null), [adv, setAdv] = useState<any | null>(null), [ref, setRef] = useState<any | null>(null)
  const rows = bills.filter(b => f === 'All' || b.status === f)
  const collect = (payments: any[]) => {
    const b = pay!, got = sum(payments, p => p.amount), paid = Math.min(b.total, b.paid + got)
    update('bills', b.id, { paid, payments: [...b.payments, ...payments], status: paid >= b.total ? 'Paid' : 'Partial' })
    const cash = sum(payments.filter(p => p.mode === 'Cash'), p => p.amount), d: any = (dbx().db.cashDrawer as any[]).find(x => x.date === today() && x.status === 'Open'); if (cash && d) update('cashDrawer', d.id, { collected: d.collected + cash })
    toast.success(`${money(got)} received against ${b.id}`); setPay(null)
    printPreview(`Receipt ${b.id}`, <Letterhead title="Payment Receipt" meta={[['Receipt for', b.id], ['Date', fDate(today())], ['Patient', `${b.patientName} (${b.patientId})`], ['Received by', user.name]]}><table><thead><tr><th>Mode</th><th>Reference</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead><tbody>{payments.map((p, i) => <tr key={i}><td>{p.mode}</td><td>{p.ref || '—'}</td><td style={{ textAlign: 'right' }}>{money(p.amount)}</td></tr>)}</tbody></table><p style={{ marginTop: 8 }}>Bill total {money(b.total)} · Paid to date {money(paid)} · <b>Balance {money(b.total - paid)}</b></p><Sign label="Cashier" name={user.name} /></Letterhead>)
  }
  const cancel = (b: Bill) => confirmAction({ title: `Cancel invoice ${b.id}?`, message: 'The invoice will be marked cancelled and kept in the audit trail. A reason is mandatory.', danger: true, reason: true, auth: true, confirmLabel: 'Cancel invoice', onConfirm: r => { update('bills', b.id, { status: 'Cancelled', cancelReason: r }); if (b.paid > 0) add('refunds', { id: uid('RF'), date: today(), patient: b.patientName, billNo: b.id, amount: b.paid, mode: b.payments[0]?.mode || 'Cash', reason: `Bill cancelled: ${r}`, approvedBy: user.name, status: 'Pending' }); toast.success(`Invoice ${b.id} cancelled${b.paid ? ' — refund request raised' : ''}`) } })
  const doRefund = () => {
    const b = ref.bill as Bill, amt = Number(ref.amount)
    if (!amt || amt > b.paid) return toast.error(`Refund must be between 1 and ${b.paid}`); if (!ref.reason.trim()) return toast.error('Reason is required')
    add('refunds', { id: uid('RF'), date: today(), patient: b.patientName, billNo: b.id, amount: amt, mode: ref.mode, reason: ref.reason, approvedBy: user.name, status: 'Processed' })
    add('creditNotes', { id: uid('CN'), date: today(), patient: b.patientName, billNo: b.id, amount: amt, reason: ref.reason })
    update('bills', b.id, { paid: b.paid - amt, status: b.paid - amt <= 0 ? 'Unpaid' : 'Partial' }); toast.success('Refund processed and credit note issued'); setRef(null)
  }
  return (
    <>
      <PageHeader title="Bills & Payments" desc="Invoices, collections, advances, refunds and credit notes" actions={<><Button variant="outline" onClick={() => setAdv({ patient: null, amount: 5000 })}><Plus />Advance / deposit</Button><Button onClick={() => nav('/billing/pos')}><Plus />New bill</Button></>} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={CreditCard} label="Collected today" tone="green" value={money(sum(bills.filter(b => b.date === today()), b => b.paid))} /><Stat icon={CreditCard} label="Outstanding" tone="red" value={money(sum(bills.filter(b => b.status !== 'Cancelled'), b => b.total - b.paid))} sub={`${bills.filter(b => ['Unpaid', 'Partial'].includes(b.status)).length} bills`} />
        <Stat icon={CreditCard} label="Advances held" tone="amber" value={money(sum(advances.filter((a: any) => a.status === 'Available'), (a: any) => a.amount - (a.used || 0)))} /><Stat icon={Ban} label="Cancelled" tone="slate" value={bills.filter(b => b.status === 'Cancelled').length} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'bills', label: 'Invoices' }, { id: 'adv', label: 'Advances' }, { id: 'refunds', label: 'Refunds' }, { id: 'cn', label: 'Credit notes' }]} />
      <Section pad={false}>
        {tab === 'bills' && <DataTable rows={rows} exportName="Bills" toolbar={<Select aria-label="Status filter" className="h-9 w-32" value={f} onChange={e => setF(e.target.value)} options={['All', 'Paid', 'Partial', 'Unpaid', 'Cancelled']} />}
          cols={[{ key: 'id', label: 'Invoice', className: 'font-mono text-xs' }, { key: 'date', label: 'Date', render: b => fDate(b.date) }, { key: 'patientName', label: 'Patient' }, { key: 'type', label: 'Type' }, { key: 'dept', label: 'Department' }, { key: 'total', label: 'Total', render: b => money(b.total) }, { key: 'paid', label: 'Paid', render: b => money(b.paid) }, { key: 'bal', label: 'Balance', val: b => b.total - b.paid, render: b => (b.status === 'Cancelled' ? '—' : <b className={b.total - b.paid > 0 ? 'text-red-600' : ''}>{money(b.total - b.paid)}</b>) }, { key: 'status', label: 'Status', render: b => <Status v={b.status} /> }]}
          actions={b => <>{['Unpaid', 'Partial'].includes(b.status) && <Button size="xs" variant="success" onClick={() => setPay(b)}>Collect</Button>}<Button size="icon" variant="ghost" aria-label="Print invoice" title="Print (detailed)" onClick={() => printPreview(`Invoice ${b.id}`, <InvoiceDoc bill={b} />)}><Printer /></Button><Button size="icon" variant="ghost" aria-label="Duplicate bill" title="Duplicate copy (summary)" onClick={() => printPreview(`Invoice ${b.id}`, <InvoiceDoc bill={b} mode="Summary" duplicate />)}><Copy /></Button>{b.paid > 0 && b.status !== 'Cancelled' && <Button size="icon" variant="ghost" aria-label="Refund" title="Refund / credit note" onClick={() => setRef({ bill: b, amount: b.paid, mode: 'Cash', reason: '' })}><Undo2 /></Button>}{b.status !== 'Cancelled' && <Button size="icon" variant="ghost" className="text-red-600" aria-label="Cancel bill" title="Cancel bill" onClick={() => cancel(b)}><Ban /></Button>}</>} />}
        {tab === 'adv' && <Resource coll="advances" name="Advance" prefix="ADV" canAdd={false} canEdit={false} canDelete={false} cols={[{ key: 'id', label: 'Receipt' }, { key: 'date', label: 'Date', type: 'date' }, { key: 'patient', label: 'Patient' }, { key: 'amount', label: 'Amount', type: 'money' }, { key: 'used', label: 'Adjusted', type: 'money' }, { key: 'mode', label: 'Mode' }, { key: 'status', label: 'Status', type: 'status' }]} />}
        {tab === 'refunds' && <Resource coll="refunds" name="Refund" prefix="RF" canAdd={false} canDelete={false} cols={[{ key: 'date', label: 'Date', type: 'date' }, { key: 'patient', label: 'Patient' }, { key: 'billNo', label: 'Bill' }, { key: 'amount', label: 'Amount', type: 'money' }, { key: 'mode', label: 'Mode', type: 'select', options: ['Cash', 'Card', 'UPI', 'Cheque', 'Bank transfer'] }, { key: 'reason', label: 'Reason' }, { key: 'approvedBy', label: 'Approved by' }, { key: 'status', label: 'Status', type: 'status', options: ['Pending', 'Processed', 'Rejected'] }]} />}
        {tab === 'cn' && <Resource coll="creditNotes" name="Credit note" prefix="CN" canEdit={false} cols={[{ key: 'id', label: 'Credit note', form: false }, { key: 'date', label: 'Date', type: 'date' }, { key: 'patient', label: 'Patient', type: 'select', options: 'patients', required: true }, { key: 'billNo', label: 'Against bill', required: true }, { key: 'amount', label: 'Amount', type: 'money', required: true }, { key: 'reason', label: 'Reason', required: true }]} />}
      </Section>
      <Modal open={!!pay} onClose={() => setPay(null)} title={`Collect payment — ${pay?.id}`}>{pay && <><p className="mb-3 text-sm">{pay.patientName} · Total {money(pay.total)} · Paid {money(pay.paid)} · <b className="text-red-600">Balance {money(pay.total - pay.paid)}</b></p><PaymentPanel total={pay.total - pay.paid} onPay={collect} allowPartial label="Receive payment" /></>}</Modal>
      <Modal open={!!adv} onClose={() => setAdv(null)} title="Advance / deposit collection">
        {adv && <div className="space-y-3">{adv.patient ? <PatientBanner p={adv.patient} onClear={() => setAdv({ ...adv, patient: null })} /> : <PatientSearch autoFocus onSelect={p => setAdv({ ...adv, patient: p })} />}
          <Field label="Amount"><Input type="number" min={1} value={adv.amount} onChange={e => setAdv({ ...adv, amount: Number(e.target.value) })} /></Field>
          {adv.patient && adv.amount > 0 && <PaymentPanel total={adv.amount} label="Receive advance" onPay={pays => { add('advances', { id: uid('ADV'), date: today(), patientId: adv.patient.id, patient: adv.patient.name, amount: adv.amount, used: 0, mode: pays.map(p => p.mode).join(' + '), status: 'Available' }); toast.success(`Advance of ${money(adv.amount)} received`); setAdv(null); setTab('adv') }} />}</div>}
      </Modal>
      <Modal open={!!ref} onClose={() => setRef(null)} size="sm" title={`Refund — ${ref?.bill.id}`} footer={<><Button variant="outline" onClick={() => setRef(null)}>Cancel</Button><Button variant="danger" onClick={doRefund}>Process refund</Button></>}>
        {ref && <div className="space-y-3"><Field label={`Amount (paid ${money(ref.bill.paid)})`}><Input type="number" value={ref.amount} onChange={e => setRef({ ...ref, amount: e.target.value })} /></Field><Field label="Refund mode"><Select value={ref.mode} onChange={e => setRef({ ...ref, mode: e.target.value })} options={['Cash', 'Card reversal', 'UPI', 'Cheque', 'Bank transfer']} /></Field><Field label="Reason" required><Input value={ref.reason} onChange={e => setRef({ ...ref, reason: e.target.value })} /></Field></div>}
      </Modal>
    </>
  )
}
