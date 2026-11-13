import { useRef, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import { AlertTriangle, CheckCircle2, Info, Printer, ShieldAlert, X, XCircle } from 'lucide-react'
import { useOverlay, useSettings } from '@/app/store'
import { Button, Field, Input, Modal, Textarea } from '@/components/ui'
import { cn, fDT, nowISO } from '@/utils'

const ICON = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info }
const TCOLOR = { success: 'text-emerald-600', error: 'text-red-600', warning: 'text-amber-600', info: 'text-blue-600' }

export function Toaster() {
  const { toasts, dismiss } = useOverlay()
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite" role="status">
      {toasts.map(t => { const I = ICON[t.type]; return (
        <div key={t.id} className="card pointer-events-auto flex animate-slide-in items-start gap-2.5 p-3 shadow-lg">
          <I className={cn('mt-0.5 h-5 w-5 shrink-0', TCOLOR[t.type])} /><p className="flex-1 text-sm">{t.msg}</p>
          <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="muted hover:text-slate-900 dark:hover:text-white"><X className="h-4 w-4" /></button>
        </div>) })}
    </div>
  )
}

/** Confirmation modal for destructive / sensitive actions; optionally captures a reason and a supervisor PIN. */
export function ConfirmHost() {
  const { confirm, setConfirm } = useOverlay()
  const [reason, setReason] = useState(''), [pin, setPin] = useState(''), [err, setErr] = useState('')
  const close = () => { setConfirm(null); setReason(''); setPin(''); setErr('') }
  if (!confirm) return null
  const ok = () => {
    if (confirm.reason && !reason.trim()) return setErr('Please enter a reason')
    if (confirm.auth && pin !== '1234') return setErr('Invalid supervisor PIN (demo PIN: 1234)')
    confirm.onConfirm(reason); close()
  }
  return (
    <Modal open onClose={close} size="sm" title={<span className="flex items-center gap-2">{confirm.auth ? <ShieldAlert className="h-5 w-5 text-amber-600" /> : <AlertTriangle className={cn('h-5 w-5', confirm.danger ? 'text-red-600' : 'text-amber-600')} />}{confirm.title}</span>}
      footer={<><Button variant="outline" onClick={close}>Cancel</Button><Button variant={confirm.danger ? 'danger' : 'primary'} onClick={ok}>{confirm.confirmLabel || 'Confirm'}</Button></>}>
      <div className="space-y-3">
        {confirm.message && <p className="text-sm text-slate-600 dark:text-slate-300">{confirm.message}</p>}
        {confirm.reason && <Field label="Reason" required><Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} /></Field>}
        {confirm.auth && <Field label="Supervisor authorization PIN" required hint="Demo PIN: 1234"><Input type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && ok()} /></Field>}
        {err && <p role="alert" className="text-xs text-red-600">{err}</p>}
      </div>
    </Modal>
  )
}

/** Print preview: every printable document is shown here first, then sent to the printer via react-to-print. */
export function PrintHost() {
  const { print, setPrint } = useOverlay()
  const ref = useRef<HTMLDivElement>(null)
  const doPrint = useReactToPrint({ contentRef: ref, documentTitle: print?.title })
  if (!print) return null
  return (
    <Modal open onClose={() => setPrint(null)} size={print.thermal ? 'sm' : 'lg'} title={`Print preview – ${print.title}`}
      footer={<><Button variant="outline" onClick={() => setPrint(null)}>Close</Button><Button onClick={() => doPrint()}><Printer />Print</Button></>}>
      <div className="overflow-x-auto rounded-lg bg-slate-200 p-3 dark:bg-slate-800">
        <div ref={ref} className={cn('print-sheet mx-auto shadow', print.thermal ? 'thermal p-3' : 'w-full max-w-[210mm] p-8')}>{print.content}</div>
      </div>
    </Modal>
  )
}

/** Hospital letterhead + footer used by all printable documents. */
export function Letterhead({ title, children, meta }: { title: string; children: React.ReactNode; meta?: [string, any][] }) {
  const st = useSettings(), h = st.hospital
  return (
    <div>
      {st.print.header && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '2px solid #1E40AF', paddingBottom: 8 }}>
          {st.print.showLogo && <div style={{ width: 44, height: 44, borderRadius: 10, background: '#1E40AF', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700 }}>+</div>}
          <div style={{ flex: 1 }}><div style={{ fontSize: 18, fontWeight: 700, color: '#1E40AF' }}>{h.name}</div><div style={{ fontSize: 11 }}>{h.address} · {h.phone} · {h.email}</div><div style={{ fontSize: 10, color: '#475569' }}>Reg. No: {h.license} · GSTIN: {h.gst}</div></div>
        </div>
      )}
      <h2 style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, margin: '12px 0', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</h2>
      {meta && <table className="plain" style={{ marginBottom: 10 }}><tbody>{Array.from({ length: Math.ceil(meta.length / 2) }, (_, i) => <tr key={i}>{[meta[i * 2], meta[i * 2 + 1]].map((m, j) => m ? <td key={j} style={{ width: '50%' }}><b>{m[0]}:</b> {m[1] || '—'}</td> : <td key={j} />)}</tr>)}</tbody></table>}
      {children}
      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569', borderTop: '1px solid #cbd5e1', paddingTop: 6 }}><span>{st.print.footer}</span><span>Printed: {fDT(nowISO())}</span></div>
    </div>
  )
}
export const Sign = ({ label = 'Authorised Signatory', name }: { label?: string; name?: string }) => (
  <div style={{ marginTop: 40, textAlign: 'right' }}><div style={{ display: 'inline-block', borderTop: '1px solid #111', paddingTop: 4, minWidth: 180, textAlign: 'center' }}>{name && <div style={{ fontWeight: 600 }}>{name}</div>}{label}</div></div>
)
