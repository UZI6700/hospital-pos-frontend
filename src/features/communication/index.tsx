import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Megaphone, MessageCircle, Send, Smartphone } from 'lucide-react'
import { toast, useAuth, useColl, useDB, useSettings } from '@/app/store'
import { Resource } from '@/components/common'
import { Avatar, Badge, Button, Check, Empty, Field, Input, PageHeader, Section, Select, Stat, Tabs, Textarea } from '@/components/ui'
import { cn, fDate, fDT, fTime, nowISO, uid } from '@/utils'

const NT: Record<string, string> = { critical: 'red', emergency: 'red', stock: 'amber', discharge: 'green', payment: 'amber', bed: 'blue', appointment: 'blue' }
const CHANNELS = ['Nursing Station A', 'ICU', 'Pharmacy', 'Lab', 'Reception', 'All Staff']

export default function Communication() {
  const nav = useNavigate(), user = useAuth(s => s.user)!, st = useSettings(), { add, update, setSettings } = useDB()
  const notes = useColl('notifications'), msgs = useColl('messages'), anns = useColl('announcements'), tpls = useColl('msgTemplates'), patients = useColl('patients')
  const [tab, setTab] = useState('notif'), [peer, setPeer] = useState(CHANNELS[0]), [text, setText] = useState(''), end = useRef<HTMLDivElement>(null)
  const [bulk, setBulk] = useState({ channel: 'SMS', tpl: '', audience: 'Patients with appointments today', body: '' })
  const unread = notes.filter((n: any) => !n.read).length
  const thread = useMemo(() => msgs.filter((m: any) => m.to === peer || m.from === peer || (peer === 'All Staff' && m.to === 'All Staff')).sort((a: any, b: any) => a.at.localeCompare(b.at)), [msgs, peer])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [thread.length])
  const send = (e: React.FormEvent) => { e.preventDefault(); if (!text.trim()) return; add('messages', { id: uid('MSG'), from: user.name, to: peer, text: text.trim(), at: nowISO() }); setText('') }
  const sendBulk = () => {
    if (!bulk.body.trim()) return toast.error('Message body is empty')
    const key = bulk.channel.toLowerCase() as 'sms' | 'email' | 'whatsapp'
    if (!st.channels[key]) return toast.error(`${bulk.channel} gateway is disabled — enable it below`)
    const to = patients.slice(0, bulk.audience.startsWith('All') ? 25 : 8)
    to.forEach((p: any) => add('commsLog', { id: uid('CM'), at: nowISO(), channel: bulk.channel, to: p.name, template: bulk.tpl || 'Custom message', status: 'Queued' }))
    toast.success(`${to.length} ${bulk.channel} messages queued`); setTab('log')
  }
  return (
    <>
      <PageHeader title="Communication" desc="Notifications, internal chat, announcements and patient messaging" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat icon={Bell} label="Unread notifications" tone="red" value={unread} /><Stat icon={MessageCircle} label="Messages" value={msgs.length} /><Stat icon={Megaphone} label="Announcements" tone="purple" value={anns.length} /><Stat icon={Smartphone} label="Gateways enabled" tone="green" value={Object.values(st.channels).filter(Boolean).length} sub="SMS · Email · WhatsApp" /></div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'notif', label: 'Notification centre', badge: unread || undefined }, { id: 'chat', label: 'Internal messaging' }, { id: 'ann', label: 'Announcements' }, { id: 'send', label: 'SMS / Email / WhatsApp' }, { id: 'tpl', label: 'Templates' }, { id: 'log', label: 'Delivery log' }]} />
      {tab === 'notif' && <Section pad={false} title="All notifications" actions={<Button size="sm" variant="outline" disabled={!unread} onClick={() => notes.filter((n: any) => !n.read).forEach((n: any) => update('notifications', n.id, { read: true }))}><CheckCheck />Mark all read</Button>}>
        <ul className="divide-y">{notes.map((n: any) => <li key={n.id}><button onClick={() => { update('notifications', n.id, { read: true }); if (n.link) nav(n.link) }} className={cn('flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800', !n.read && 'bg-blue-50/60 dark:bg-blue-500/5')}><span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{n.title}</span><Badge tone={NT[n.type] || 'slate'}>{n.type}</Badge></div><p className="text-sm text-slate-600 dark:text-slate-300">{n.body}</p></div><time className="shrink-0 text-xs muted">{fDT(n.at)}</time></button></li>)}{!notes.length && <Empty text="No notifications" />}</ul></Section>}
      {tab === 'chat' && <div className="card grid h-[calc(100vh-330px)] min-h-[420px] grid-cols-1 overflow-hidden md:grid-cols-[220px_1fr]">
        <ul className="flex gap-1 overflow-auto border-b p-2 md:block md:space-y-1 md:border-b-0 md:border-r">{CHANNELS.map(c => <li key={c}><button onClick={() => setPeer(c)} aria-current={peer === c} className={cn('flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-2 py-2 text-left text-sm transition', peer === c ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800')}><Avatar name={c} size={26} />{c}</button></li>)}</ul>
        <div className="flex min-h-0 flex-col"><div className="border-b px-4 py-2 text-sm font-semibold">{peer}</div>
          <div className="flex-1 space-y-2 overflow-auto p-4" aria-live="polite">{thread.map((m: any) => { const me = m.from === user.name; return <div key={m.id} className={cn('flex', me && 'justify-end')}><div className={cn('max-w-[75%] rounded-2xl px-3 py-2 text-sm', me ? 'rounded-br-sm bg-primary text-white' : 'rounded-bl-sm bg-slate-100 dark:bg-slate-800')}>{!me && <div className="text-[11px] font-semibold opacity-70">{m.from}</div>}{m.text}<div className={cn('mt-0.5 text-right text-[10px]', me ? 'text-blue-100' : 'muted')}>{fTime(m.at)}</div></div></div> })}{!thread.length && <Empty text="No messages yet — say hello" icon={MessageCircle} />}<div ref={end} /></div>
          <form onSubmit={send} className="flex gap-2 border-t p-3"><Input aria-label="Message" placeholder={`Message ${peer}…`} value={text} onChange={e => setText(e.target.value)} /><Button type="submit" aria-label="Send"><Send /></Button></form></div>
      </div>}
      {tab === 'ann' && <div className="grid gap-4 lg:grid-cols-3"><div className="space-y-3">{anns.slice(0, 4).map((a: any) => <article key={a.id} className={cn('card border-l-4 p-4', a.priority === 'High' ? 'border-l-red-600' : 'border-l-primary')}><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{a.title}</h3>{a.priority === 'High' && <Badge tone="red">Important</Badge>}</div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a.body}</p><p className="mt-2 text-xs muted">{a.by} · {fDate(a.date)}</p></article>)}</div>
        <Section pad={false} className="lg:col-span-2" title="Manage announcements"><Resource coll="announcements" name="Announcement" prefix="ANN" cols={[{ key: 'title', label: 'Title', required: true }, { key: 'body', label: 'Message', type: 'textarea', required: true }, { key: 'by', label: 'Posted by', def: user.name }, { key: 'date', label: 'Date', type: 'date' }, { key: 'priority', label: 'Priority', type: 'status', options: ['Normal', 'High'] }]} /></Section></div>}
      {tab === 'send' && <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Compose bulk message" className="lg:col-span-2"><div className="grid gap-3 sm:grid-cols-2">
          <Field label="Channel"><Select value={bulk.channel} onChange={e => setBulk({ ...bulk, channel: e.target.value })} options={['SMS', 'Email', 'WhatsApp']} /></Field>
          <Field label="Audience"><Select value={bulk.audience} onChange={e => setBulk({ ...bulk, audience: e.target.value })} options={['Patients with appointments today', 'Patients with outstanding bills', 'Admitted patients (attendants)', 'All patients (opted-in)']} /></Field>
          <Field label="Template" className="sm:col-span-2"><Select value={bulk.tpl} onChange={e => { const t: any = tpls.find((x: any) => x.name === e.target.value); setBulk({ ...bulk, tpl: e.target.value, body: t?.body || bulk.body, channel: t?.channel || bulk.channel }) }} placeholder="Custom message" options={tpls.map((t: any) => t.name)} /></Field>
          <Field label="Message" hint="Variables: {name} {doctor} {date} {time} {amount} {bill} {link}" className="sm:col-span-2"><Textarea rows={4} value={bulk.body} onChange={e => setBulk({ ...bulk, body: e.target.value })} /></Field>
          <div className="flex items-center gap-3 sm:col-span-2"><Button onClick={sendBulk}><Send />Queue messages</Button><span className="text-xs muted">{bulk.body.length} characters{bulk.channel === 'SMS' && ` · ${Math.max(1, Math.ceil(bulk.body.length / 160))} SMS segment(s)`}</span></div></div></Section>
        <Section title="Gateways" desc="Credentials are configured in Settings › Integrations"><div className="space-y-3">{(['sms', 'email', 'whatsapp'] as const).map(k => <Check key={k} label={<span className="capitalize">{k === 'sms' ? 'SMS' : k} gateway enabled</span>} checked={!!st.channels[k]} onChange={v => setSettings({ channels: { ...st.channels, [k]: v } })} />)}<p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">Frontend demo: messages are queued in the delivery log. Actual sending is done by the backend gateway.</p></div></Section></div>}
      {tab === 'tpl' && <Section pad={false}><Resource coll="msgTemplates" name="Template" prefix="TPL" cols={[{ key: 'name', label: 'Template', required: true }, { key: 'channel', label: 'Channel', type: 'select', options: ['SMS', 'Email', 'WhatsApp'] }, { key: 'body', label: 'Body', type: 'textarea', required: true }]} /></Section>}
      {tab === 'log' && <Section pad={false}><Resource coll="commsLog" name="Message" prefix="CM" canAdd={false} canEdit={false} cols={[{ key: 'at', label: 'Sent at', render: (r: any) => fDT(r.at) }, { key: 'channel', label: 'Channel', type: 'status' }, { key: 'to', label: 'Recipient' }, { key: 'template', label: 'Template' }, { key: 'status', label: 'Status', type: 'status' }]} /></Section>}
    </>
  )
}
