import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReactNode } from 'react'
import type { DB, User } from '@/types'
import { buildSeed } from '@/utils/seed'
import { nowISO, setLocale, uid } from '@/utils'

/* ───────── Auth ───────── */
interface AuthState { user: User | null; login: (u: User) => void; logout: () => void; update: (p: Partial<User>) => void }
export const useAuth = create<AuthState>()(persist(set => ({
  user: null,
  login: user => set({ user }),
  logout: () => set({ user: null }),
  update: p => set(s => ({ user: s.user ? { ...s.user, ...p } : null })),
}), { name: 'hpos-auth' }))

/* ───────── UI preferences ───────── */
interface Tab { path: string; label: string }
interface UIState {
  dark: boolean; contrast: boolean; fontScale: number; collapsed: boolean; lang: string
  favorites: string[]; recents: Tab[]; tabs: Tab[]
  set: (p: Partial<UIState>) => void; toggleFav: (path: string) => void; visit: (t: Tab) => void; closeTab: (path: string) => void
}
export const useUI = create<UIState>()(persist(set => ({
  dark: false, contrast: false, fontScale: 1, collapsed: false, lang: 'en', favorites: ['/patients/new', '/billing/pos', '/pharmacy/pos'], recents: [], tabs: [],
  set: p => set(p),
  toggleFav: path => set(s => ({ favorites: s.favorites.includes(path) ? s.favorites.filter(f => f !== path) : [...s.favorites, path] })),
  visit: t => set(s => ({
    recents: [t, ...s.recents.filter(r => r.path !== t.path)].slice(0, 5),
    tabs: s.tabs.some(x => x.path === t.path) ? s.tabs : [...s.tabs, t].slice(-8),
  })),
  closeTab: path => set(s => ({ tabs: s.tabs.filter(t => t.path !== path) })),
}), { name: 'hpos-ui' }))

/* ───────── Data (mock backend, persisted to localStorage) ───────── */
interface DBState {
  db: DB
  add: (coll: string, item: any) => void
  update: (coll: string, id: string, patch: any) => void
  remove: (coll: string, id: string) => void
  setSettings: (patch: any) => void
  setKey: (key: string, value: any) => void
  nextNo: (kind: string) => string
  reset: () => void
}
const SILENT = ['audit', 'notifications', 'messages', 'vitals']
const log = (db: DB, action: string, module: string, ref: string) => SILENT.includes(module) ? db.audit
  : [{ id: uid('AUD'), at: nowISO(), user: useAuth.getState().user?.name || 'System', action, module, ref, ip: '192.168.1.10' }, ...db.audit].slice(0, 300)

export const useDB = create<DBState>()(persist((set, get) => ({
  db: buildSeed(),
  add: (coll, item) => set(s => ({ db: { ...s.db, [coll]: [item, ...(s.db[coll] || [])], audit: log(s.db, 'Create', coll, item.id) } })),
  update: (coll, id, patch) => set(s => ({ db: { ...s.db, [coll]: s.db[coll].map((x: any) => x.id === id ? { ...x, ...patch } : x), audit: log(s.db, 'Update', coll, id) } })),
  remove: (coll, id) => set(s => ({ db: { ...s.db, [coll]: s.db[coll].filter((x: any) => x.id !== id), audit: log(s.db, 'Delete', coll, id) } })),
  setSettings: patch => set(s => ({ db: { ...s.db, settings: { ...s.db.settings, ...patch }, audit: log(s.db, 'Update', 'settings', Object.keys(patch).join(',')) } })),
  setKey: (key, value) => set(s => ({ db: { ...s.db, [key]: value } })),
  nextNo: kind => {
    const n = get().db.settings.numbering[kind]
    set(s => ({ db: { ...s.db, settings: { ...s.db.settings, numbering: { ...s.db.settings.numbering, [kind]: { ...n, next: n.next + 1 } } } } }))
    return `${n.prefix}${String(n.next).padStart(n.pad, '0')}`
  },
  reset: () => set({ db: buildSeed() }),
}), { name: 'hpos-db-v1' }))

const syncLocale = () => { const st = useDB.getState().db.settings; setLocale(st.currency, st.dateFormat) }
syncLocale()
useDB.subscribe(syncLocale)

const EMPTY: any[] = []
export const useColl = <T = any>(name: string): T[] => useDB(s => s.db[name] || EMPTY) as T[]
export const useSettings = () => useDB(s => s.db.settings)
export const db = () => useDB.getState().db
export const dbx = () => useDB.getState()

/* ───────── Toasts, confirm dialogs & print preview ───────── */
export interface Toast { id: string; type: 'success' | 'error' | 'warning' | 'info'; msg: string }
export interface ConfirmOpts { title: string; message?: string; danger?: boolean; reason?: boolean; auth?: boolean; confirmLabel?: string; onConfirm: (reason: string) => void }
export interface PrintOpts { title: string; content: ReactNode; thermal?: boolean }
interface OverlayState {
  toasts: Toast[]; confirm: ConfirmOpts | null; print: PrintOpts | null
  push: (type: Toast['type'], msg: string) => void; dismiss: (id: string) => void
  setConfirm: (c: ConfirmOpts | null) => void; setPrint: (p: PrintOpts | null) => void
}
export const useOverlay = create<OverlayState>(set => ({
  toasts: [], confirm: null, print: null,
  push: (type, msg) => { const id = uid('T'); set(s => ({ toasts: [...s.toasts, { id, type, msg }] })); setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4200) },
  dismiss: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  setConfirm: confirm => set({ confirm }), setPrint: print => set({ print }),
}))
export const toast = {
  success: (m: string) => useOverlay.getState().push('success', m), error: (m: string) => useOverlay.getState().push('error', m),
  warning: (m: string) => useOverlay.getState().push('warning', m), info: (m: string) => useOverlay.getState().push('info', m),
}
export const confirmAction = (c: ConfirmOpts) => useOverlay.getState().setConfirm(c)
export const printPreview = (title: string, content: ReactNode, thermal = false) => useOverlay.getState().setPrint({ title, content, thermal })
export const notify = (title: string, body: string, type = 'info', link?: string) =>
  useDB.getState().add('notifications', { id: uid('NT'), title, body, type, link, at: nowISO(), read: false })
