import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BedDouble, Brush, CheckCircle2, ClipboardList, LogOut, UserPlus, Wrench } from 'lucide-react'
import { confirmAction, notify, toast, useColl, useDB } from '@/app/store'
import { Badge, Button, KV, Modal, PageHeader, Section, Select, Status } from '@/components/ui'
import { cn, fDate, money } from '@/utils'
import { BED_COLOR, BED_TYPES } from '@/utils/constants'
import type { Bed } from '@/types'

const STATUSES = ['Available', 'Occupied', 'Reserved', 'Maintenance', 'Cleaning'] as const

/** Visual floor map. In `onPick` mode it acts as a bed selector (only available beds are clickable). */
export function BedMap({ onPick, selected, type = 'All', onOpen, draggable }: { onPick?: (b: Bed) => void; selected?: string; type?: string; onOpen?: (b: Bed) => void; draggable?: boolean }) {
  const beds = useColl<Bed>('beds'), { update } = useDB(), admissions = useColl('admissions')
  const [drag, setDrag] = useState<string | null>(null), [over, setOver] = useState<string | null>(null)
  const floors = useMemo(() => {
    const m = new Map<number, Map<string, Bed[]>>()
    beds.filter(b => type === 'All' || b.type === type).forEach(b => { if (!m.has(b.floor)) m.set(b.floor, new Map()); const w = m.get(b.floor)!; w.set(b.ward, [...(w.get(b.ward) || []), b]) })
    return [...m.entries()].sort((a, b) => a[0] - b[0])
  }, [beds, type])
  const transfer = (fromId: string, to: Bed) => {
    const from = beds.find(b => b.id === fromId)!
    if (to.status !== 'Available') return toast.error(`${to.id} is not available for transfer`)
    confirmAction({ title: 'Transfer patient?', message: `Move ${from.patientName} from ${from.id} (${from.ward}) to ${to.id} (${to.ward})? The old bed will be sent for cleaning.`, confirmLabel: 'Transfer', onConfirm: () => {
      update('beds', to.id, { status: 'Occupied', patientId: from.patientId, patientName: from.patientName, doctor: from.doctor, admitDate: from.admitDate, expDischarge: from.expDischarge })
      update('beds', from.id, { status: 'Cleaning', patientId: undefined, patientName: undefined, doctor: undefined, admitDate: undefined, expDischarge: undefined })
      const adm: any = admissions.find((a: any) => a.patientId === from.patientId && a.status === 'Admitted'); if (adm) update('admissions', adm.id, { bedId: to.id, ward: to.ward })
      notify('Bed transfer', `${from.patientName} moved ${from.id} → ${to.id}`, 'bed', '/ipd/beds'); toast.success('Patient transferred')
    } })
  }
  return (
    <div className="space-y-4">
      {floors.map(([floor, wards]) => (
        <div key={floor}>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider muted"><span className="rounded bg-slate-200 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">Floor {floor}</span></h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {[...wards.entries()].map(([ward, list]) => (
              <div key={ward} className="rounded-xl border bg-slate-50/60 p-3 dark:bg-slate-900/40">
                <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold">{ward}</span><span className="text-xs muted">{list.filter(b => b.status === 'Available').length} free / {list.length}</span></div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {list.map(b => {
                    const pickable = !onPick || b.status === 'Available'
                    return (
                      <div key={b.id} className="group relative">
                        <button type="button" disabled={!pickable} aria-label={`Bed ${b.id}, ${b.type}, ${b.status}${b.patientName ? `, ${b.patientName}` : ''}`}
                          draggable={draggable && b.status === 'Occupied'} onDragStart={e => { setDrag(b.id); e.dataTransfer.effectAllowed = 'move' }} onDragEnd={() => { setDrag(null); setOver(null) }}
                          onDragOver={e => { if (drag && drag !== b.id) { e.preventDefault(); setOver(b.id) } }} onDragLeave={() => setOver(null)} onDrop={e => { e.preventDefault(); if (drag) transfer(drag, b); setDrag(null); setOver(null) }}
                          onClick={() => (onPick ? onPick(b) : onOpen?.(b))}
                          className={cn('flex h-14 w-full flex-col items-center justify-center rounded-lg border-b-4 text-white shadow-sm transition', BED_COLOR[b.status], pickable ? 'hover:-translate-y-0.5 hover:shadow-md' : 'cursor-not-allowed opacity-40', selected === b.id && 'ring-4 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900', over === b.id && (b.status === 'Available' ? 'scale-110 ring-4 ring-emerald-300' : 'ring-4 ring-red-300'), drag === b.id && 'opacity-50')}>
                          <BedDouble className="h-4 w-4" /><span className="font-mono text-[11px] font-bold">{b.id}</span>
                        </button>
                        <div role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-52 -translate-x-1/2 rounded-lg bg-slate-900 p-2.5 text-left text-xs text-white shadow-xl group-hover:block dark:bg-slate-700">
                          <div className="flex justify-between font-semibold"><span>{b.id} · {b.type}</span><span>{b.status}</span></div>
                          {b.patientName ? <><div className="mt-1">{b.patientName}</div><div className="text-slate-300">{b.doctor}</div><div className="text-slate-300">Admitted: {fDate(b.admitDate)}</div><div className="text-slate-300">Exp. discharge: {fDate(b.expDischarge)}</div></> : <div className="mt-1 text-slate-300">{money(b.rate)} / day</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Beds() {
  const nav = useNavigate(), beds = useColl<Bed>('beds'), { update, add } = useDB()
  const [type, setType] = useState('All'), [open, setOpen] = useState<Bed | null>(null)
  const cur = open ? beds.find(b => b.id === open.id)! : null
  const scoped = beds.filter(b => type === 'All' || b.type === type)
  const setStatus = (b: Bed, status: string) => {
    update('beds', b.id, { status })
    if (status === 'Cleaning') add('hkTasks', { id: `HK-${Date.now().toString(36).toUpperCase()}`, date: new Date().toISOString().slice(0, 10), area: b.id, task: 'Bed cleaning & disinfection', assignedTo: '', shift: 'Morning', priority: 'Urgent', status: 'Pending' })
    if (status === 'Available') notify('Bed availability', `${b.id} (${b.ward}) is now available`, 'bed', '/ipd/beds')
    toast.success(`${b.id} marked ${status}`); setOpen(null)
  }
  return (
    <>
      <PageHeader title="Bed Management" desc="Hover a bed for details · drag an occupied bed onto a free bed to transfer the patient" actions={<><Select aria-label="Bed type" className="w-44" value={type} onChange={e => setType(e.target.value)} options={['All', ...BED_TYPES]} /><Button onClick={() => nav('/ipd/admission')}><UserPlus />New admission</Button></>} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-live="polite">
        <div className="card p-3"><div className="text-xs muted">Total beds</div><div className="text-2xl font-bold">{scoped.length}</div><div className="text-[11px] muted">{Math.round((scoped.filter(b => b.status === 'Occupied').length / (scoped.length || 1)) * 100)}% occupancy</div></div>
        {STATUSES.map(s => <div key={s} className="card flex items-center gap-3 p-3"><span className={cn('h-9 w-2 rounded-full', BED_COLOR[s])} /><div><div className="text-xs muted">{s === 'Cleaning' ? 'Being cleaned' : s === 'Maintenance' ? 'Under maintenance' : s}</div><div className="text-2xl font-bold">{scoped.filter(b => b.status === s).length}</div></div></div>)}
      </div>
      <Section><BedMap type={type} draggable onOpen={setOpen} /></Section>
      <Modal open={!!cur} onClose={() => setOpen(null)} size="sm" title={<span className="flex items-center gap-2">Bed {cur?.id} <Status v={cur?.status} /></span>}>
        {cur && <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3"><KV k="Ward" v={cur.ward} /><KV k="Floor" v={cur.floor} /><KV k="Type" v={cur.type} /><KV k="Rate / day" v={money(cur.rate)} />
            {cur.patientName && <><KV k="Patient" v={cur.patientName} className="col-span-2" /><KV k="Doctor" v={cur.doctor} className="col-span-2" /><KV k="Admitted" v={fDate(cur.admitDate)} /><KV k="Expected discharge" v={fDate(cur.expDischarge)} /></>}</dl>
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {cur.status === 'Occupied' ? <><Button size="sm" onClick={() => nav(`/ipd/care?patient=${cur.patientId}`)}><ClipboardList />Care sheet</Button><Button size="sm" variant="outline" onClick={() => nav(`/ipd/discharge?patient=${cur.patientId}`)}><LogOut />Discharge</Button><Badge>Drag the bed on the map to transfer</Badge></> : <>
              {cur.status === 'Available' && <Button size="sm" onClick={() => nav(`/ipd/admission?bed=${cur.id}`)}><UserPlus />Admit patient</Button>}
              {cur.status !== 'Available' && <Button size="sm" variant="success" onClick={() => setStatus(cur, 'Available')}><CheckCircle2 />Mark available</Button>}
              {cur.status !== 'Reserved' && <Button size="sm" variant="outline" onClick={() => setStatus(cur, 'Reserved')}>Reserve</Button>}
              {cur.status !== 'Cleaning' && <Button size="sm" variant="outline" onClick={() => setStatus(cur, 'Cleaning')}><Brush />Send for cleaning</Button>}
              {cur.status !== 'Maintenance' && <Button size="sm" variant="outline" onClick={() => setStatus(cur, 'Maintenance')}><Wrench />Maintenance</Button>}</>}
          </div>
        </div>}
      </Modal>
    </>
  )
}
