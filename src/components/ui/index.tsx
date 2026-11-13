import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download, Inbox, Search, X } from 'lucide-react'
import { cn, TONE, toneOf } from '@/utils'
import { useDebounce } from '@/hooks'
import { exportCSV, exportPDF, exportXLSX } from '@/utils/export'
import { toast } from '@/app/store'

/* ───────── Button ───────── */
const VARIANT = {
  primary: 'bg-primary text-white hover:bg-primary-dark shadow-sm',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  outline: 'border border-white/30 dark:border-white/15 bg-white/30 dark:bg-slate-800/30 text-slate-700 hover:bg-white/50 dark:hover:bg-slate-800/50',
  ghost: 'text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-800/60',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
}
const SIZE = { xs: 'h-7 px-2 text-xs', sm: 'h-8 px-3 text-xs', md: 'h-9 px-4 text-sm', lg: 'h-11 px-5 text-base', icon: 'h-8 w-8' }
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANT; size?: keyof typeof SIZE }
export const Button = forwardRef<HTMLButtonElement, BtnProps>(({ className, variant = 'primary', size = 'md', type = 'button', ...p }, ref) => (
  <button ref={ref} type={type} className={cn('inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-all active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4', VARIANT[variant], SIZE[size], className)} {...p} />
))

/* ───────── Form controls ───────── */
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => <input ref={ref} className={cn('input', className)} {...p} />)
export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => <textarea ref={ref} className={cn('input', className)} {...p} />)
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { options?: (string | { value: string; label: string })[]; placeholder?: string }>(({ className, options, placeholder, children, ...p }, ref) => (
  <select ref={ref} className={cn('input pr-8', className)} {...p}>
    {placeholder != null && <option value="">{placeholder}</option>}
    {options?.map(o => typeof o === 'string' ? <option key={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    {children}
  </select>
))
export function Field({ label, error, required, className, hint, children }: { label: string; error?: string; required?: boolean; className?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}{required && <span className="text-red-600" aria-hidden> *</span>}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] muted">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}
export function Check({ label, checked, onChange, className }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-2 text-sm', className)}>
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-blue-800" />
      <span className={checked ? 'text-slate-500 line-through decoration-slate-400' : ''}>{label}</span>
    </label>
  )
}
export function Checklist({ items, value, onChange, cols = 1 }: { items: string[]; value: Record<string, boolean>; onChange: (v: Record<string, boolean>) => void; cols?: number }) {
  const done = items.filter(i => value?.[i]).length
  return (
    <div>
      <div className="mb-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(done / items.length) * 100}%` }} /></div><span className="text-xs muted">{done}/{items.length}</span></div>
      <div className={cn('grid gap-2', cols === 2 && 'sm:grid-cols-2')}>{items.map(i => <Check key={i} label={i} checked={!!value?.[i]} onChange={v => onChange({ ...value, [i]: v })} />)}</div>
    </div>
  )
}

/* ───────── Display ───────── */
export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('card', className)} {...p} />
export function Section({ title, desc, actions, children, className, pad = true }: { title?: React.ReactNode; desc?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cn('card', className)}>
      {(title || actions) && <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"><div><h3 className="text-sm font-semibold">{title}</h3>{desc && <p className="text-xs muted">{desc}</p>}</div><div className="flex flex-wrap items-center gap-2">{actions}</div></header>}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  )
}
export function Badge({ tone = 'slate', className, children }: { tone?: string; className?: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', TONE[tone] || TONE.slate, className)}>{children}</span>
}
export const Status = ({ v }: { v: any }) => (v === '' || v == null ? <span className="muted">—</span> : <Badge tone={toneOf(v)}>{String(v)}</Badge>)
export const Skeleton = ({ className }: { className?: string }) => <div className={cn('skeleton h-4', className)} aria-hidden />
export function PageSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-7 w-56" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-72 rounded-xl lg:col-span-2" /><Skeleton className="h-72 rounded-xl" /></div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
export function Empty({ text = 'Nothing to show yet', icon: Icon = Inbox }: { text?: string; icon?: any }) {
  return <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm muted"><Icon className="h-8 w-8 opacity-50" />{text}</div>
}
export function Avatar({ name, src, size = 36, className }: { name: string; src?: string; size?: number; className?: string }) {
  const hue = [...name].reduce((t, c) => t + c.charCodeAt(0), 0) % 360
  return src ? <img src={src} alt={name} style={{ width: size, height: size }} className={cn('shrink-0 rounded-full object-cover', className)} />
    : <span aria-hidden style={{ width: size, height: size, background: `hsl(${hue} 55% 42%)`, fontSize: size * 0.38 }} className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', className)}>{name.replace(/^Dr\.?\s*/i, '').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()}</span>
}
const STAT_TONE: Record<string, string> = { blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400', green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', red: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400', amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', purple: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400', slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' }
export function Stat({ icon: Icon, label, value, sub, tone = 'blue', onClick }: { icon?: any; label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string; onClick?: () => void }) {
  const C: any = onClick ? 'button' : 'div'
  return (
    <C onClick={onClick} className={cn('glass-card flex items-center gap-3 text-left transition', onClick && 'hover:-translate-y-0.5 hover:shadow-md')}>
      {Icon && <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', STAT_TONE[tone])}><Icon className="h-5 w-5" /></span>}
      <span className="min-w-0"><span className="block truncate text-xs font-medium muted">{label}</span><span className="block text-xl font-bold leading-tight text-slate-900 dark:text-white">{value}</span>{sub && <span className="block truncate text-[11px] muted">{sub}</span>}</span>
    </C>
  )
}
export function PageHeader({ title, desc, actions }: { title: string; desc?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-xl font-bold tracking-tight">{title}</h1>{desc && <p className="text-sm muted">{desc}</p>}</div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
export function KV({ k, v, className }: { k: string; v: React.ReactNode; className?: string }) {
  return <div className={className}><dt className="text-[11px] font-medium uppercase tracking-wide muted">{k}</dt><dd className="text-sm font-medium">{v || '—'}</dd></div>
}

/* ───────── Tabs ───────── */
export type TabDef = { id: string; label: string; icon?: any; badge?: number | string }
export function Tabs({ tabs, value, onChange, className }: { tabs: TabDef[]; value: string; onChange: (id: string) => void; className?: string }) {
  return (
    <div role="tablist" className={cn('mb-4 flex gap-1 overflow-x-auto border-b', className)}>
      {tabs.map(t => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={cn('-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition', value === t.id ? 'border-primary text-primary dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}>
          {t.icon && <t.icon className="h-4 w-4" />}{t.label}
          {t.badge != null && t.badge !== 0 && <span className="rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-300">{t.badge}</span>}
        </button>
      ))}
    </div>
  )
}

/* ───────── Modal ───────── */
const MSIZE = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl', full: 'max-w-[96vw]' }
export function Modal({ open, onClose, title, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; size?: keyof typeof MSIZE }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', h)
    setTimeout(() => (ref.current?.querySelector('input,select,textarea,button:not([aria-label="Close"])') as HTMLElement | null)?.focus(), 30)
    return () => { window.removeEventListener('keydown', h); prev?.focus?.() }
  }, [open]) // eslint-disable-line
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-md sm:p-6" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} className={cn('glass-panel my-auto w-full animate-scale-in shadow-xl', MSIZE[size])}>
        <header className="flex items-center justify-between gap-3 border-b px-5 py-3"><h2 className="text-base font-semibold">{title}</h2><Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}><X /></Button></header>
        <div className="max-h-[72vh] overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t bg-slate-50 px-5 py-3 dark:bg-slate-900/60">{footer}</footer>}
      </div>
    </div>
  )
}

/* ───────── DataTable ───────── */
export type Col<T = any> = { key: string; label: string; render?: (r: T) => React.ReactNode; val?: (r: T) => any; className?: string; sort?: boolean }
interface TableProps<T> { rows: T[]; cols: Col<T>[]; actions?: (r: T) => React.ReactNode; pageSize?: number; searchable?: boolean; exportName?: string; toolbar?: React.ReactNode; onRow?: (r: T) => void; empty?: string; rowClass?: (r: T) => string; dense?: boolean }
export function DataTable<T extends Record<string, any>>({ rows, cols, actions, pageSize = 10, searchable = true, exportName, toolbar, onRow, empty, rowClass, dense }: TableProps<T>) {
  const [q, setQ] = useState(''), dq = useDebounce(q, 200)
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [page, setPage] = useState(0), [menu, setMenu] = useState(false)
  const get = (c: Col<T>, r: T) => (c.val ? c.val(r) : r[c.key])
  const filtered = useMemo(() => {
    let out = rows
    if (dq) { const s = dq.toLowerCase(); out = out.filter(r => cols.some(c => String(get(c, r) ?? '').toLowerCase().includes(s))) }
    if (sort) { const c = cols.find(x => x.key === sort.key)!; out = [...out].sort((a, b) => { const x = get(c, a), y = get(c, b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true })) * sort.dir }) }
    return out
  }, [rows, dq, sort]) // eslint-disable-line
  useEffect(() => setPage(0), [dq, rows.length])
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)), view = filtered.slice(page * pageSize, (page + 1) * pageSize)
  const doExport = async (kind: string) => {
    setMenu(false)
    const ec = cols.map(c => ({ label: c.label, get: (r: any) => get(c, r) }))
    try { await (kind === 'CSV' ? exportCSV : kind === 'Excel' ? exportXLSX : exportPDF)(exportName!, ec, filtered); toast.success(`${kind} export ready (${filtered.length} rows)`) } catch { toast.error('Export failed') }
  }
  return (
    <div>
      {(searchable || toolbar || exportName) && (
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          {searchable && <div className="relative w-full sm:w-64"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><input aria-label="Search table" value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="input pl-8" /></div>}
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">{toolbar}
            {exportName && <div className="relative"><Button variant="outline" size="sm" onClick={() => setMenu(m => !m)} aria-haspopup="menu" aria-expanded={menu}><Download />Export<ChevronDown /></Button>
              {menu && <div role="menu" className="card absolute right-0 z-20 mt-1 w-32 animate-scale-in p-1 shadow-lg">{['PDF', 'Excel', 'CSV'].map(k => <button key={k} role="menuitem" onClick={() => doExport(k)} className="block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800">{k}</button>)}</div>}</div>}
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>{cols.map(c => (
              <th key={c.key} scope="col" className={cn('whitespace-nowrap px-4 py-2.5 font-semibold', c.className)} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
                <button className="inline-flex items-center gap-1 uppercase" onClick={() => setSort(s => s?.key === c.key ? (s.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 })}>{c.label}{sort?.key === c.key && (sort.dir === 1 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</button>
              </th>))}
              {actions && <th scope="col" className="px-4 py-2.5 text-right font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {view.map((r, i) => (
              <tr key={r.id ?? i} onClick={onRow ? () => onRow(r) : undefined} className={cn('transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40', onRow && 'cursor-pointer', rowClass?.(r))}>
                {cols.map(c => <td key={c.key} className={cn('px-4', dense ? 'py-1.5' : 'py-2.5', c.className)}>{c.render ? c.render(r) : (r[c.key] === '' || r[c.key] == null ? <span className="muted">—</span> : String(r[c.key]))}</td>)}
                {actions && <td className="px-4 py-1.5" onClick={e => e.stopPropagation()}><div className="flex items-center justify-end gap-1">{actions(r)}</div></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {!view.length && <Empty text={empty || (q ? 'No matching records' : 'No records yet')} />}
      </div>
      {filtered.length > pageSize && (
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs muted">
          <span>{page * pageSize + 1}–{Math.min(filtered.length, (page + 1) * pageSize)} of {filtered.length}</span>
          <div className="flex items-center gap-1"><Button variant="outline" size="icon" aria-label="Previous page" disabled={!page} onClick={() => setPage(p => p - 1)}><ChevronLeft /></Button><span className="px-2">Page {page + 1} / {pages}</span><Button variant="outline" size="icon" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight /></Button></div>
        </div>
      )}
    </div>
  )
}

/* ───────── Virtual list (windowed rendering for large lists) ───────── */
export function VirtualList<T>({ items, rowHeight, height, render }: { items: T[]; rowHeight: number; height: number; render: (item: T, index: number) => React.ReactNode }) {
  const [top, setTop] = useState(0)
  const start = Math.max(0, Math.floor(top / rowHeight) - 4), end = Math.min(items.length, start + Math.ceil(height / rowHeight) + 8)
  return (
    <div style={{ height, overflowY: 'auto' }} onScroll={e => setTop(e.currentTarget.scrollTop)} role="list" tabIndex={0}>
      <div style={{ height: items.length * rowHeight, position: 'relative' }}>
        {items.slice(start, end).map((it, i) => <div key={start + i} role="listitem" style={{ position: 'absolute', top: (start + i) * rowHeight, height: rowHeight, left: 0, right: 0 }}>{render(it, start + i)}</div>)}
      </div>
    </div>
  )
}
