import { useState } from 'react'
import { FileCheck2, HandCoins, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { toast, useColl, useDB } from '@/app/store'
import { Resource } from '@/components/common'
import { BarC, PieC } from '@/components/charts'
import { Badge, Button, Checklist, DataTable, Field, Input, Modal, PageHeader, Section, Select, Stat, Status, Tabs } from '@/components/ui'
import { daysTo, fDate, groupSum, money, sum } from '@/utils'
import { GOVT_SCHEMES } from '@/utils/constants'

const DOCS = ['Claim form (signed)', 'Policy copy / e-card', 'Photo ID proof', 'Pre-authorisation letter', 'Discharge summary', 'Final bill with break-up', 'Investigation reports', 'Pharmacy bills & prescriptions', 'Implant stickers / invoices']
const PROVIDERS = ['Star Health', 'HDFC Ergo', 'ICICI Lombard', 'Niva Bupa', 'State Life', 'Jubilee Insurance', ...GOVT_SCHEMES]

export default function Insurance() {
  const { update } = useDB(), pre = useColl('preauths'), claims = useColl('claims')
  const [tab, setTab] = useState('pre'), [open, setOpen] = useState<any | null>(null)
  const recv = claims.filter((c: any) => !['Settled', 'Rejected'].includes(c.status))
  const save = () => { const { id, ...r } = open; const approved = Number(r.approved) || 0, settled = Number(r.settled) || 0; update('claims', id, { ...r, approved, settled, copay: r.status === 'Submitted' ? r.copay : Math.max(0, r.claimed - approved), status: r.status === 'Approved' && approved > 0 && approved < r.claimed ? 'Partially Approved' : r.status }); toast.success('Claim updated'); setOpen(null) }
  return (
    <>
      <PageHeader title="Insurance & TPA" desc="Pre-authorisation, cashless processing, claims and reconciliation" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={ShieldQuestion} label="Pre-auth pending" tone="amber" value={pre.filter((p: any) => !['Approved', 'Rejected'].includes(p.status)).length} /><Stat icon={FileCheck2} label="Claims in process" value={recv.length} />
        <Stat icon={HandCoins} label="Insurance receivable" tone="red" value={money(sum(recv, (c: any) => (c.approved || c.claimed) - c.settled))} /><Stat icon={ShieldCheck} label="Settled (total)" tone="green" value={money(sum(claims, (c: any) => c.settled))} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'pre', label: 'Pre-authorisation' }, { id: 'claims', label: 'Claims' }, { id: 'recon', label: 'Reconciliation' }]} />
      {tab === 'pre' && <Section pad={false} title="Cashless pre-authorisation requests"><Resource coll="preauths" name="Pre-auth request" prefix="PA" cols={[{ key: 'date', label: 'Date', type: 'date' }, { key: 'patient', label: 'Patient', type: 'select', options: 'patients', required: true }, { key: 'provider', label: 'Insurer / scheme', type: 'select', options: PROVIDERS }, { key: 'tpa', label: 'TPA' }, { key: 'policy', label: 'Policy no.', required: true }, { key: 'procedure', label: 'Procedure / diagnosis', required: true }, { key: 'estimate', label: 'Estimate', type: 'money' }, { key: 'approved', label: 'Approved', type: 'money' }, { key: 'status', label: 'Status', type: 'status', options: ['Submitted', 'Under Review', 'Query Raised', 'Approved', 'Rejected'] }]}
        actions={(p: any) => !['Approved', 'Rejected'].includes(p.status) && <><Button size="xs" variant="success" onClick={() => { update('preauths', p.id, { status: 'Approved', approved: p.approved || Math.round(p.estimate * 0.9) }); toast.success('Pre-authorisation approved — cashless admission enabled') }}>Approve</Button><Button size="xs" variant="outline" onClick={() => { update('preauths', p.id, { status: 'Rejected' }); toast.info('Marked rejected') }}>Reject</Button></>} /></Section>}
      {tab === 'claims' && <Section pad={false}><Resource coll="claims" name="Claim" prefix="CLM" cols={[{ key: 'date', label: 'Submitted', type: 'date' }, { key: 'patient', label: 'Patient', type: 'select', options: 'patients', required: true }, { key: 'provider', label: 'Insurer', type: 'select', options: PROVIDERS }, { key: 'billNo', label: 'Bill no.' }, { key: 'claimed', label: 'Claimed', type: 'money' }, { key: 'approved', label: 'Approved', type: 'money' }, { key: 'copay', label: 'Co-pay', type: 'money' }, { key: 'settled', label: 'Settled', type: 'money' }, { key: 'status', label: 'Status', type: 'status', options: ['Submitted', 'Query Raised', 'Approved', 'Partially Approved', 'Rejected', 'Settled'] }]}
        actions={(c: any) => <Button size="xs" variant="outline" onClick={() => setOpen({ docs: {}, ...c })}>Process</Button>} /></Section>}
      {tab === 'recon' && <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Claimed vs approved vs settled by insurer" className="lg:col-span-2"><BarC data={[...new Set(claims.map((c: any) => c.provider))].map(p => { const l = claims.filter((c: any) => c.provider === p); return { name: String(p).split(' ')[0], Claimed: sum(l, (c: any) => c.claimed), Approved: sum(l, (c: any) => c.approved), Settled: sum(l, (c: any) => c.settled) } })} keys={['Claimed', 'Approved', 'Settled']} /></Section>
        <Section title="Claim status"><PieC data={groupSum(claims, (c: any) => c.status)} /></Section>
        <Section title="Receivable ageing & short-settlement" pad={false} className="lg:col-span-3"><DataTable rows={claims} exportName="Insurance reconciliation" cols={[{ key: 'id', label: 'Claim' }, { key: 'patient', label: 'Patient' }, { key: 'provider', label: 'Insurer' }, { key: 'claimed', label: 'Claimed', render: (c: any) => money(c.claimed) }, { key: 'approved', label: 'Approved', render: (c: any) => money(c.approved) }, { key: 'dis', label: 'Disallowed', val: (c: any) => (c.approved ? c.claimed - c.approved : 0), render: (c: any) => (c.approved ? money(c.claimed - c.approved) : '—') }, { key: 'settled', label: 'Settled', render: (c: any) => money(c.settled) }, { key: 'due', label: 'Receivable', val: (c: any) => (c.approved || c.claimed) - c.settled, render: (c: any) => (['Settled', 'Rejected'].includes(c.status) ? '—' : <b className="text-red-600">{money((c.approved || c.claimed) - c.settled)}</b>) }, { key: 'age', label: 'Age', val: (c: any) => -daysTo(c.date), render: (c: any) => <Badge tone={-daysTo(c.date) > 30 ? 'red' : -daysTo(c.date) > 15 ? 'amber' : 'green'}>{-daysTo(c.date)} days</Badge> }, { key: 'status', label: 'Status', render: (c: any) => <Status v={c.status} /> }]} /></Section>
      </div>}
      <Modal open={!!open} onClose={() => setOpen(null)} size="lg" title={`Claim ${open?.id} — ${open?.patient}`} footer={<><Button variant="outline" onClick={() => setOpen(null)}>Close</Button><Button onClick={save}>Save claim</Button></>}>
        {open && <div className="grid gap-4 md:grid-cols-2">
          <div><h4 className="mb-2 text-sm font-semibold">Document checklist</h4><Checklist items={DOCS} value={open.docs || {}} onChange={docs => setOpen({ ...open, docs })} /></div>
          <div className="space-y-3">
            <p className="text-sm">{open.provider} · Bill {open.billNo} · submitted {fDate(open.date)}</p>
            <Field label="Status"><Select value={open.status} onChange={e => setOpen({ ...open, status: e.target.value })} options={['Submitted', 'Query Raised', 'Approved', 'Partially Approved', 'Rejected', 'Settled']} /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Claimed"><Input readOnly disabled value={open.claimed} /></Field><Field label="Approved amount" hint="Less than claimed = partial approval"><Input type="number" value={open.approved} onChange={e => setOpen({ ...open, approved: e.target.value })} /></Field><Field label="Co-pay / patient share"><Input readOnly disabled value={Math.max(0, open.claimed - (Number(open.approved) || open.claimed))} /></Field><Field label="Settled (received)"><Input type="number" value={open.settled} onChange={e => setOpen({ ...open, settled: e.target.value })} /></Field></div>
            <Field label="Settlement UTR / remarks"><Input value={open.utr || ''} onChange={e => setOpen({ ...open, utr: e.target.value })} /></Field>
            {Number(open.approved) > 0 && Number(open.approved) < open.claimed && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">Partial approval: {money(open.claimed - Number(open.approved))} is disallowed and becomes patient co-pay — collect it from Bills & Payments.</p>}
          </div></div>}
      </Modal>
    </>
  )
}
