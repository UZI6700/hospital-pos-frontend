import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AArrowDown, AArrowUp, Bell, CheckCheck, ChevronRight, Contrast, Home, Keyboard, Languages, LogOut, Menu, Moon, Search, Sun, User as UserIcon, X } from 'lucide-react'
import { LEAVES, labelFor } from '@/app/nav'
import { toast, useAuth, useColl, useDB, useSettings, useUI } from '@/app/store'
import { Avatar, Badge, Button, Modal, PageSkeleton } from '@/components/ui'
import { useDebounce, useHotkeys, useIdleTimeout } from '@/hooks'
import { LANGS } from '@/services/i18n'
import { startRealtime, stopRealtime } from '@/services/socket'
import { ageOf, cn, fDT } from '@/utils'
import { ROLES } from '@/utils/constants'
import { Sidebar } from './Sidebar'

const SHORTCUTS: [string, string, string?][] = [['Ctrl + K', 'Global patient / module search'], ['Alt + N', 'New patient registration', '/patients/new'], ['Alt + B', 'Billing POS', '/billing/pos'], ['Alt + M', 'Pharmacy POS', '/pharmacy/pos'], ['Alt + Q', 'Token queue', '/opd/queue'], ['Alt + A', 'Appointments', '/opd/appointments'], ['Alt + E', 'Emergency', '/emergency'], ['Alt + H', 'Dashboard', '/'], ['Shift + ?', 'Keyboard shortcuts'], ['Esc', 'Close dialog']]
const NTONE: Record<string, string> = { critical: 'red', emergency: 'red', stock: 'amber', payment: 'amber', discharge: 'green', bed: 'green', appointment: 'blue' }

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate(), patients = useColl('patients'), role = useAuth(s => s.user!.role), perms = useDB(s => s.db.permissions[role])
  const [q, setQ] = useState(''), dq = useDebounce(q, 150), [hi, setHi] = useState(0)
  useEffect(() => { if (open) { setQ(''); setHi(0) } }, [open])
  const results = useMemo(() => {
    const s = dq.trim().toLowerCase()
    const mods = LEAVES.filter(l => perms[l.key]?.includes('View') && (!s || l.label.toLowerCase().includes(s) || l.parent.toLowerCase().includes(s))).slice(0, s ? 6 : 8).map(l => ({ kind: 'Module', title: l.label, sub: l.parent, path: l.path }))
    const pts = s ? patients.filter((p: any) => p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s) || p.phone.replace(/\s/g, '').includes(s)).slice(0, 7).map((p: any) => ({ kind: 'Patient', title: p.name, sub: `${p.id} · ${ageOf(p.dob)}y ${p.gender} · ${p.phone}`, path: `/patients/${p.id}` })) : []
    return [...pts, ...mods]
  }, [dq, patients, perms])
  const go = (r: any) => { nav(r.path); onClose() }
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/50 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Global search" className="card w-full max-w-xl animate-scale-in overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 border-b px-4"><Search className="h-4 w-4 text-slate-400" />
          <input autoFocus value={q} onChange={e => { setQ(e.target.value); setHi(0) }} placeholder="Search patients by name, ID, phone — or jump to a module…" className="h-12 flex-1 bg-transparent text-sm outline-none" aria-label="Global search"
            onKeyDown={e => { if (e.key === 'Escape') onClose(); else if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(results.length - 1, h + 1)) } else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(0, h - 1)) } else if (e.key === 'Enter' && results[hi]) go(results[hi]) }} />
          <kbd className="rounded border px-1.5 text-[10px] muted">Esc</kbd></div>
        <ul role="listbox" className="max-h-[50vh] overflow-auto p-1.5">
          {results.map((r, i) => <li key={r.kind + r.path} role="option" aria-selected={i === hi} onMouseEnter={() => setHi(i)} onClick={() => go(r)} className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2', i === hi && 'bg-blue-50 dark:bg-blue-500/10')}>
            <Badge tone={r.kind === 'Patient' ? 'blue' : 'slate'}>{r.kind}</Badge><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{r.title}</div>{r.sub && <div className="truncate text-xs muted">{r.sub}</div>}</div><ChevronRight className="h-4 w-4 muted" /></li>)}
          {!results.length && <li className="px-3 py-6 text-center text-sm muted">No results</li>}
        </ul>
      </div>
    </div>
  )
}

function NotificationBell() {
  const { t } = useTranslation(), nav = useNavigate(), list = useColl('notifications'), { update } = useDB()
  const [open, setOpen] = useState(false), ref = useRef<HTMLDivElement>(null)
  const unread = list.filter((n: any) => !n.read).length
  useEffect(() => { const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])
  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" aria-label={`${t('Notifications')} (${unread} unread)`} aria-expanded={open} onClick={() => setOpen(o => !o)} className="relative"><Bell />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}</Button>
      {open && (
        <div className="card fixed inset-x-2 top-14 z-40 animate-scale-in shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b px-4 py-2.5"><span className="text-sm font-semibold">{t('Notifications')}</span><Button variant="ghost" size="xs" onClick={() => list.filter((n: any) => !n.read).forEach((n: any) => update('notifications', n.id, { read: true }))}><CheckCheck />Mark all read</Button></div>
          <ul className="max-h-[60vh] divide-y overflow-auto">
            {list.slice(0, 25).map((n: any) => (
              <li key={n.id}><button onClick={() => { update('notifications', n.id, { read: true }); setOpen(false); if (n.link) nav(n.link) }} className={cn('flex w-full gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50', !n.read && 'bg-blue-50/60 dark:bg-blue-500/5')}>
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-blue-600')} />
                <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-sm font-medium">{n.title}</span><Badge tone={NTONE[n.type] || 'slate'}>{n.type}</Badge></span><span className="block text-xs text-slate-600 dark:text-slate-300">{n.body}</span><span className="text-[11px] muted">{fDT(n.at)}</span></span>
              </button></li>))}
          </ul>
          <Link to="/communication" onClick={() => setOpen(false)} className="block border-t px-4 py-2 text-center text-xs font-medium text-primary dark:text-blue-400">Open notification centre</Link>
        </div>
      )}
    </div>
  )
}

export default function AppLayout() {
  const { t, i18n } = useTranslation()
  const user = useAuth(s => s.user), logout = useAuth(s => s.logout), ui = useUI(), settings = useSettings()
  const loc = useLocation(), nav = useNavigate()
  const [drawer, setDrawer] = useState(false), [search, setSearch] = useState(false), [help, setHelp] = useState(false), [menu, setMenu] = useState(false), [idleLeft, setIdleLeft] = useState<number | null>(null)

  useEffect(() => { if (user) ui.visit({ path: loc.pathname, label: labelFor(loc.pathname) }) }, [loc.pathname]) // eslint-disable-line
  useEffect(() => { i18n.changeLanguage(ui.lang) }, [ui.lang, i18n])
  useEffect(() => { if (!user) return; startRealtime(); return stopRealtime }, [user?.id]) // eslint-disable-line
  useIdleTimeout(settings.sessionTimeout || 15, () => { if (useAuth.getState().user) { logout(); toast.warning('Session expired due to inactivity') } }, setIdleLeft)
  useHotkeys({
    'ctrl+k': () => setSearch(true), 'alt+n': () => nav('/patients/new'), 'alt+b': () => nav('/billing/pos'), 'alt+m': () => nav('/pharmacy/pos'), 'alt+q': () => nav('/opd/queue'),
    'alt+a': () => nav('/opd/appointments'), 'alt+e': () => nav('/emergency'), 'alt+h': () => nav('/'), 'shift+?': () => setHelp(true),
  })
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />

  const crumbs = loc.pathname.split('/').filter(Boolean)
  const leaf = LEAVES.find(l => l.path === loc.pathname)
  const iconBtn = 'hidden sm:inline-flex'
  return (
    <div className="flex h-screen overflow-hidden">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-white">Skip to content</a>
      <div className="hidden lg:block"><Sidebar /></div>
      {drawer && <div className="fixed inset-0 z-50 flex lg:hidden"><div className="animate-slide-in"><Sidebar mobile onNavigate={() => setDrawer(false)} /></div><button aria-label="Close menu" className="flex-1 bg-slate-900/50" onClick={() => setDrawer(false)} /></div>}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 glass-header px-3 sm:px-4">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setDrawer(true)}><Menu /></Button>
          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm md:flex">
            <Link to="/" aria-label="Home" className="muted hover:text-primary"><Home className="h-4 w-4" /></Link>
            {leaf?.parent && <><ChevronRight className="h-3.5 w-3.5 muted" /><span className="muted">{t(leaf.parent)}</span></>}
            {crumbs.length > 0 && <><ChevronRight className="h-3.5 w-3.5 muted" /><span className="truncate font-medium text-slate-900 dark:text-white" aria-current="page">{t(labelFor(loc.pathname))}</span></>}
          </nav>
          <button onClick={() => setSearch(true)} className="ml-auto flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-500 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800 md:ml-4 md:mr-auto" aria-label="Open global search (Ctrl+K)">
            <Search className="h-4 w-4 shrink-0" /><span className="flex-1 truncate text-left">{t('Search patients, modules…')}</span><kbd className="hidden rounded border bg-white px-1.5 text-[10px] dark:bg-slate-900 sm:block">Ctrl K</kbd>
          </button>
          <div className="flex items-center gap-0.5">
            <label className={cn(iconBtn, 'relative items-center')}><Languages className="pointer-events-none absolute left-2 h-4 w-4 muted" /><select aria-label="Language" value={ui.lang} onChange={e => ui.set({ lang: e.target.value })} className="h-8 cursor-pointer appearance-none rounded-lg bg-transparent pl-7 pr-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800">{LANGS.map(l => <option key={l.id} value={l.id} className="text-black">{l.label}</option>)}</select></label>
            <Button variant="ghost" size="icon" className={iconBtn} aria-label="Decrease font size" onClick={() => ui.set({ fontScale: Math.max(0.875, +(ui.fontScale - 0.0625).toFixed(4)) })}><AArrowDown /></Button>
            <Button variant="ghost" size="icon" className={iconBtn} aria-label="Increase font size" onClick={() => ui.set({ fontScale: Math.min(1.25, +(ui.fontScale + 0.0625).toFixed(4)) })}><AArrowUp /></Button>
            <Button variant="ghost" size="icon" className={iconBtn} aria-label="Toggle high contrast" aria-pressed={ui.contrast} onClick={() => ui.set({ contrast: !ui.contrast })}><Contrast className={ui.contrast ? 'text-amber-500' : ''} /></Button>
            <Button variant="ghost" size="icon" aria-label="Toggle dark mode" aria-pressed={ui.dark} onClick={() => ui.set({ dark: !ui.dark })}>{ui.dark ? <Sun /> : <Moon />}</Button>
            <Button variant="ghost" size="icon" className={iconBtn} aria-label="Keyboard shortcuts" onClick={() => setHelp(true)}><Keyboard /></Button>
            <NotificationBell />
            <div className="relative ml-1">
              <button onClick={() => setMenu(m => !m)} aria-haspopup="menu" aria-expanded={menu} className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <Avatar name={user.name} src={user.photo} size={32} /><span className="hidden text-left leading-tight xl:block"><span className="block max-w-[120px] truncate text-xs font-semibold">{user.name}</span><span className="block text-[11px] muted">{ROLES.find(r => r.id === user.role)?.label}</span></span>
              </button>
              {menu && <><button className="fixed inset-0 z-30 cursor-default" aria-hidden tabIndex={-1} onClick={() => setMenu(false)} />
                <div role="menu" className="card absolute right-0 z-40 mt-2 w-56 animate-scale-in p-1 shadow-xl">
                  <div className="border-b px-3 py-2"><div className="truncate text-sm font-semibold">{user.name}</div><div className="truncate text-xs muted">{user.email}</div></div>
                  <Link role="menuitem" to="/profile" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><UserIcon className="h-4 w-4" />{t('My Profile')}</Link>
                  <div className="flex items-center gap-1 px-2 py-1 sm:hidden"><Button variant="ghost" size="icon" aria-label="Smaller text" onClick={() => ui.set({ fontScale: Math.max(0.875, ui.fontScale - 0.0625) })}><AArrowDown /></Button><Button variant="ghost" size="icon" aria-label="Larger text" onClick={() => ui.set({ fontScale: Math.min(1.25, ui.fontScale + 0.0625) })}><AArrowUp /></Button><Button variant="ghost" size="icon" aria-label="High contrast" onClick={() => ui.set({ contrast: !ui.contrast })}><Contrast /></Button>
                    <select aria-label="Language" value={ui.lang} onChange={e => ui.set({ lang: e.target.value })} className="input h-8 w-24 text-xs">{LANGS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}</select></div>
                  <button role="menuitem" onClick={() => { logout(); nav('/login') }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><LogOut className="h-4 w-4" />{t('Sign out')}</button>
                </div></>}
            </div>
          </div>
        </header>

        {ui.tabs.length > 1 && (
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b glass px-2 pt-1.5" role="tablist" aria-label="Open pages">
            {ui.tabs.map(tb => { const active = tb.path === loc.pathname; return (
              <div key={tb.path} className={cn('group flex items-center rounded-t-lg border border-b-0 text-xs', active ? 'bg-slate-50 font-semibold text-primary dark:bg-slate-950 dark:text-blue-400' : 'border-transparent text-slate-500 hover:bg-white/70 dark:hover:bg-slate-800')}>
                <Link role="tab" aria-selected={active} to={tb.path} className="max-w-[150px] truncate py-1.5 pl-3 pr-1">{t(tb.label)}</Link>
                <button aria-label={`Close ${tb.label}`} onClick={() => { ui.closeTab(tb.path); if (active) { const rest = ui.tabs.filter(x => x.path !== tb.path); nav(rest[rest.length - 1]?.path || '/') } }} className="mr-1 rounded p-0.5 opacity-50 hover:bg-slate-200 hover:opacity-100 dark:hover:bg-slate-700"><X className="h-3 w-3" /></button>
              </div>) })}
          </div>
        )}

        <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto p-3 sm:p-5">
          <div key={loc.pathname} className="mx-auto max-w-[1600px] animate-fade-in"><Suspense fallback={<PageSkeleton />}><Outlet /></Suspense></div>
        </main>
      </div>

      <CommandPalette open={search} onClose={() => setSearch(false)} />
      <Modal open={help} onClose={() => setHelp(false)} title="Keyboard shortcuts" size="sm">
        <ul className="divide-y text-sm">{SHORTCUTS.map(([k, d]) => <li key={k} className="flex items-center justify-between py-2"><span>{d}</span><kbd className="rounded border bg-slate-50 px-2 py-0.5 font-mono text-xs dark:bg-slate-800">{k}</kbd></li>)}</ul>
      </Modal>
      <Modal open={idleLeft != null} onClose={() => setIdleLeft(null)} title="Session about to expire" size="sm" footer={<><Button variant="outline" onClick={() => { logout(); nav('/login') }}>Sign out now</Button><Button onClick={() => setIdleLeft(null)}>Stay signed in</Button></>}>
        <p className="text-sm">You have been inactive. For patient data security you will be signed out automatically in <b className="text-red-600">{idleLeft}s</b>.</p>
      </Modal>
    </div>
  )
}
