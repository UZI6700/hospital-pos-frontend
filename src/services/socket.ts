import { io, type Socket } from 'socket.io-client'
import { db, notify, toast } from '@/app/store'

/**
 * Real-time notifications.
 * With VITE_SOCKET_URL set, connects to the Socket.io server and listens for `notification` events
 * ({ title, body, type, link }). Without it, a simulator emits realistic hospital events so the
 * notification centre can be demonstrated offline.
 */
let socket: Socket | null = null
let timer: ReturnType<typeof setInterval> | null = null

const push = (n: { title: string; body: string; type: string; link?: string }) => {
  notify(n.title, n.body, n.type, n.link)
  ;(n.type === 'critical' || n.type === 'emergency' ? toast.warning : toast.info)(`${n.title}: ${n.body}`)
}

const simulate = () => {
  const d = db()
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
  const p = pick(d.patients as any[]).name
  const free = (d.beds as any[]).filter(b => b.status === 'Available')
  const low = (d.medicines as any[]).filter(m => m.batches.reduce((t: number, b: any) => t + b.qty, 0) < m.reorder)
  push(pick([
    { title: 'Critical lab result', body: `${p}: Hemoglobin 6.2 g/dL (critical low)`, type: 'critical', link: '/laboratory' },
    { title: 'Emergency admission', body: 'New emergency case registered – Triage YELLOW', type: 'emergency', link: '/emergency' },
    { title: 'Low stock alert', body: `${low.length ? pick(low).name : 'IV Cannula 20G'} is below reorder level`, type: 'stock', link: '/pharmacy/inventory' },
    { title: 'Appointment reminder', body: `${p} has an appointment in 15 minutes`, type: 'appointment', link: '/opd/appointments' },
    { title: 'Discharge ready', body: `${p} has been cleared for discharge`, type: 'discharge', link: '/ipd/discharge' },
    { title: 'Bed availability', body: `${free.length} beds currently available`, type: 'bed', link: '/ipd/beds' },
    { title: 'Payment overdue', body: `Outstanding balance pending for ${p}`, type: 'payment', link: '/billing/bills' },
  ]))
}

export function startRealtime() {
  stopRealtime()
  const url = import.meta.env.VITE_SOCKET_URL
  if (url) {
    socket = io(url, { transports: ['websocket'] })
    socket.on('notification', push)
  } else {
    timer = setInterval(simulate, 75_000)
  }
}
export function stopRealtime() {
  socket?.disconnect(); socket = null
  if (timer) clearInterval(timer); timer = null
}
