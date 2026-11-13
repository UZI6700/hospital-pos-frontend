import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Clock, PanelLeftClose, PanelLeftOpen, Search, Star } from 'lucide-react'
import { LEAVES, NAV } from '@/app/nav'
import { useAuth, useDB, useSettings, useUI } from '@/app/store'
import { cn } from '@/utils'

export function Sidebar({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation()
  const { collapsed: c0, favorites, recents, toggleFav, set } = useUI()
  const collapsed = c0 && !mobile
  const role = useAuth(s => s.user!.role), perms = useDB(s => s.db.permissions[role]) || {}, hospital = useSettings().hospital
  const loc = useLocation(), [q, setQ] = useState(''), [open, setOpen] = useState<Record<string, boolean>>({})
  const can = (k: string) => perms[k]?.includes('View')
  const items = useMemo(() => {
    const s = q.trim().toLowerCase()
    return NAV.filter(n => can(n.key)).map(n => !s || n.label.toLowerCase().includes(s) ? n : { ...n, children: n.children?.filter(c => c.label.toLowerCase().includes(s)) }).filter(n => !s || n.label.toLowerCase().includes(s) || n.children?.length)
  }, [q, perms]) // eslint-disable-line
  const favs = LEAVES.filter(l => favorites.includes(l.path) && can(l.key))
  const link = ({ isActive }: { isActive: boolean }) => cn('group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors', isActive ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')
  const StarBtn = ({ path }: { path: string }) => (
    <button aria-label={favorites.includes(path) ? 'Unpin' : 'Pin to favourites'} aria-pressed={favorites.includes(path)} onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFav(path) }} className={cn('ml-auto rounded p-0.5 opacity-0 transition focus:opacity-100 group-hover:opacity-100', favorites.includes(path) && 'opacity-100')}>
      <Star className={cn('h-3.5 w-3.5', favorites.includes(path) ? 'fill-amber-400 text-amber-400' : '')} />
    </button>
  )
  return (
    <aside className={cn('flex h-full shrink-0 flex-col glass-sidebar transition-[width] duration-200', collapsed ? 'w-[68px]' : 'w-64')} aria-label="Main navigation">
      <div className="flex h-14 items-center gap-2.5 border-b px-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-2xl font-bold leading-none text-white">+</span>
        {!collapsed && <div className="min-w-0"><div className="truncate text-sm font-bold text-slate-900 dark:text-white">MediCore HMS</div><div className="truncate text-[11px] muted">{hospital.name}</div></div>}
      </div>
      {!collapsed && (
        <div className="relative p-3 pb-1"><Search className="pointer-events-none absolute left-5 top-5 h-4 w-4 text-slate-400" /><input aria-label={t('Search menu…')} value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search menu…')} className="input h-8 pl-8 text-xs" /></div>
      )}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 pt-2">
        {!collapsed && !q && favs.length > 0 && (
          <div className="mb-2"><div className="mb-1 flex items-center gap-1 px-2 text-[10px] font-semibold uppercase tracking-wider muted"><Star className="h-3 w-3" />{t('Pinned')}</div>
            {favs.map(f => <NavLink key={f.path} to={f.path} end onClick={onNavigate} className={link}><f.icon className="h-4 w-4 shrink-0" /><span className="truncate">{t(f.label)}</span><StarBtn path={f.path} /></NavLink>)}</div>
        )}
        {!collapsed && !q && recents.length > 0 && (
          <div className="mb-2"><div className="mb-1 flex items-center gap-1 px-2 text-[10px] font-semibold uppercase tracking-wider muted"><Clock className="h-3 w-3" />{t('Recent')}</div>
            <div className="flex flex-wrap gap-1 px-1">{recents.slice(0, 4).map(r => <NavLink key={r.path} to={r.path} onClick={onNavigate} className="max-w-full truncate rounded-full border px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">{t(r.label)}</NavLink>)}</div></div>
        )}
        {!collapsed && !q && <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider muted">Modules</div>}
        {items.map(n => {
          const active = n.children?.some(c => loc.pathname.startsWith(c.path))
          const isOpen = !!q || (open[n.key] ?? active)
          if (!n.children) return <NavLink key={n.key} to={n.path!} end={n.path === '/'} onClick={onNavigate} title={collapsed ? n.label : undefined} className={link}><n.icon className="h-[18px] w-[18px] shrink-0" />{!collapsed && <><span className="truncate">{t(n.label)}</span><StarBtn path={n.path!} /></>}</NavLink>
          if (collapsed) return <NavLink key={n.key} to={n.children[0].path} title={n.label} className={() => link({ isActive: !!active })}><n.icon className="h-[18px] w-[18px] shrink-0" /></NavLink>
          return (
            <div key={n.key}>
              <button aria-expanded={isOpen} onClick={() => setOpen(o => ({ ...o, [n.key]: !isOpen }))} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800', active ? 'text-primary dark:text-blue-400' : 'text-slate-600 dark:text-slate-300')}>
                <n.icon className="h-[18px] w-[18px] shrink-0" /><span className="truncate">{t(n.label)}</span><ChevronDown className={cn('ml-auto h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && <div className="ml-[18px] mt-0.5 space-y-0.5 border-l pl-2.5">{n.children.map(c => <NavLink key={c.path} to={c.path} end={c.path === '/patients'} onClick={onNavigate} className={({ isActive }) => cn(link({ isActive }), 'py-1.5 text-[13px]')}><span className="truncate">{t(c.label)}</span><StarBtn path={c.path} /></NavLink>)}</div>}
            </div>
          )
        })}
      </nav>
      {!mobile && <button onClick={() => set({ collapsed: !c0 })} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="flex h-10 items-center gap-2 border-t px-5 text-xs muted hover:bg-slate-50 dark:hover:bg-slate-800">{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" />Collapse</>}</button>}
    </aside>
  )
}
