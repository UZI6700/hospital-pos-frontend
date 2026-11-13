import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, addDays, differenceInYears, parseISO } from 'date-fns'

export const cn = (...a: any[]) => twMerge(clsx(a))
export const uid = (p = 'ID') => `${p}-${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 4)}`.toUpperCase()
export const today = () => format(new Date(), 'yyyy-MM-dd')
export const dOff = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd')
export const nowISO = () => new Date().toISOString()

let CUR = '₹'
let DF = 'dd MMM yyyy'
export const setLocale = (cur: string, df: string) => { CUR = cur; DF = df }
export const money = (n: any) => `${CUR}${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const safe = (d: string | undefined, f: string) => { if (!d) return '—'; try { return format(parseISO(d), f) } catch { return d } }
export const fDate = (d?: string) => safe(d, DF)
export const fDT = (d?: string) => safe(d, `${DF}, hh:mm a`)
export const fTime = (d?: string) => safe(d, 'hh:mm a')
export const ageOf = (dob?: string) => { if (!dob) return 0; try { return differenceInYears(new Date(), parseISO(dob)) } catch { return 0 } }
export const bmiOf = (w?: any, h?: any) => (Number(w) && Number(h) ? +(Number(w) / (Number(h) / 100) ** 2).toFixed(1) : 0)
export const initials = (n = '') => n.replace(/^Dr\.?\s*/i, '').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()
export const sum = <T,>(a: T[], f: (x: T) => any) => a.reduce((t, x) => t + (Number(f(x)) || 0), 0)
export const groupSum = <T,>(rows: T[], key: (r: T) => string, val: (r: T) => number = () => 1) => {
  const m = new Map<string, number>()
  rows.forEach(r => m.set(key(r), (m.get(key(r)) || 0) + val(r)))
  return [...m.entries()].map(([name, value]) => ({ name, value: Math.round(value) }))
}
export const daysTo = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5)

const G = ['available', 'completed', 'paid', 'approved', 'active', 'present', 'confirmed', 'inspected', 'issued', 'settled', 'dispensed', 'delivered', 'received', 'given', 'compatible', 'normal', 'on duty', 'done', 'sent', 'minor', 'success', 'processed', 'eligible', 'operational', 'closed', 'stable']
const R = ['cancelled', 'critical', 'rejected', 'overdue', 'expired', 'occupied', 'absent', 'stat', 'immediate', 'emergency', 'unpaid', 'no-show', 'missed', 'incompatible', 'failed', 'out of stock', 'breakdown', 'deceased', 'high', 'inactive', 'written off']
const Y = ['pending', 'reserved', 'urgent', 'partial', 'on leave', 'waiting', 'low', 'late', 'elderly', 'draft', 'requested', 'ordered', 'due', 'on trip', 'medium', 'open', 'scheduled', 'queried']
const B = ['in-progress', 'booked', 'cleaning', 'checked-in', 'submitted', 'in-process', 'collected', 'called', 'in-consultation', 'admitted', 'vip', 'routine', 'in transit', 'in surgery', 'reported', 'new', 'under review', 'preparing']
export const toneOf = (s: any): string => {
  const v = String(s ?? '').toLowerCase()
  if (G.some(k => v === k || v.startsWith(k))) return 'green'
  if (R.some(k => v === k || v.startsWith(k))) return 'red'
  if (Y.some(k => v === k || v.startsWith(k))) return 'amber'
  if (B.some(k => v === k || v.startsWith(k))) return 'blue'
  return 'slate'
}
export const TONE: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400',
  red: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400',
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300',
  purple: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-400',
}

export const beep = () => {
  try {
    const C = (window as any).AudioContext || (window as any).webkitAudioContext
    const ctx = new C()
    ;[880, 1100].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.value = f; o.connect(g); g.connect(ctx.destination)
      g.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.25)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.22)
      o.start(ctx.currentTime + i * 0.25); o.stop(ctx.currentTime + i * 0.25 + 0.25)
    })
  } catch { /* audio unavailable */ }
}
export const speak = (text: string) => { try { window.speechSynthesis?.speak(new SpeechSynthesisUtterance(text)) } catch { /* noop */ } }
