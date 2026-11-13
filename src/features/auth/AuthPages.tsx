import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Activity, Camera, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck, Smartphone, UserRound } from 'lucide-react'
import { toast, useAuth, useColl, useDB, useSettings } from '@/app/store'
import { Avatar, Badge, Button, Field, Input, PageHeader, Section, Tabs } from '@/components/ui'
import { ROLES } from '@/utils/constants'
import { cn, fDT } from '@/utils'

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  const h = useSettings().hospital
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5" /><div className="absolute -bottom-32 -left-16 h-[28rem] w-[28rem] rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-3xl font-bold leading-none text-primary">+</span><div><div className="text-lg font-bold">MediCore HMS</div><div className="text-xs text-blue-200">{h.name}</div></div></div>
        <div className="relative"><h2 className="text-3xl font-bold leading-tight text-white">One point of service for the entire hospital.</h2><p className="mt-3 max-w-md text-blue-100">Registration, OPD, IPD, pharmacy, laboratory, billing and administration — unified, fast and secure.</p>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3 text-center">{[['22', 'Modules'], ['8', 'Staff roles'], ['24×7', 'Real-time']].map(([a, b]) => <div key={b} className="rounded-xl bg-white/10 p-3"><div className="text-2xl font-bold">{a}</div><div className="text-xs text-blue-100">{b}</div></div>)}</div></div>
        <div className="relative flex items-center gap-2 text-xs text-blue-200"><ShieldCheck className="h-4 w-4" />Role-based access · Audit logged · Session timeout protected</div>
      </div>
      <div className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-6 flex items-center gap-2 lg:hidden"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-2xl font-bold leading-none text-white">+</span><span className="font-bold">MediCore HMS</span></div>
          <h1 className="text-2xl font-bold">{title}</h1><p className="mb-6 text-sm muted">{sub}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

const loginSchema = z.object({ username: z.string().min(1, 'Username is required'), password: z.string().min(6, 'Password must be at least 6 characters') })
export function Login() {
  const nav = useNavigate(), loc = useLocation() as any, users = useColl('users'), { login } = useAuth(), { update } = useDB()
  const [mode, setMode] = useState('password'), [show, setShow] = useState(false), [err, setErr] = useState('')
  const [phone, setPhone] = useState(''), [sent, setSent] = useState(false), [otp, setOtp] = useState(''), [otpRole, setOtpRole] = useState('admin')
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { username: 'admin', password: 'demo123' } })
  const enter = (u: any) => {
    login({ id: u.id, username: u.username, name: u.name, role: u.role, email: u.email, phone: u.phone, doctorId: u.doctorId, photo: u.photo })
    update('users', u.id, { lastLogin: new Date().toISOString() })
    toast.success(`Welcome back, ${u.name}`); nav(loc.state?.from && loc.state.from !== '/login' ? loc.state.from : '/', { replace: true })
  }
  const submit = handleSubmit(async v => {
    await new Promise(r => setTimeout(r, 400))
    const u: any = users.find((x: any) => x.username === v.username.trim().toLowerCase())
    if (!u || v.password !== 'demo123') return setErr('Invalid username or password')
    if (u.status !== 'Active') return setErr('This account is disabled. Contact the administrator.')
    enter(u)
  })
  return (
    <Shell title="Sign in" sub="Use your staff credentials to access the hospital system.">
      <Tabs value={mode} onChange={m => { setMode(m); setErr('') }} tabs={[{ id: 'password', label: 'Password', icon: Lock }, { id: 'otp', label: 'Mobile OTP', icon: Smartphone }]} />
      {mode === 'password' ? (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Username" error={errors.username?.message} required><Input autoComplete="username" {...register('username')} /></Field>
          <Field label="Password" error={errors.password?.message} required>
            <div className="relative"><Input type={show ? 'text' : 'password'} autoComplete="current-password" {...register('password')} className="pr-9" /><button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(s => !s)} className="absolute right-2.5 top-2.5 muted">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
          </Field>
          {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</p>}
          <div className="flex justify-end"><Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline dark:text-blue-400">Forgot password?</Link></div>
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
        </form>
      ) : (
        <div className="space-y-4">
          <Field label="Registered mobile number" required><Input inputMode="tel" placeholder="+92 300 0000000" value={phone} onChange={e => setPhone(e.target.value)} /></Field>
          <Field label="Sign in as"><select className="input" value={otpRole} onChange={e => setOtpRole(e.target.value)}>{ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></Field>
          {sent && <Field label="6-digit OTP" required hint="Demo OTP: 123456"><Input inputMode="numeric" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} className="text-center text-lg tracking-[.5em]" autoFocus /></Field>}
          {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</p>}
          {!sent ? <Button size="lg" className="w-full" onClick={() => { if (phone.replace(/\D/g, '').length < 7) return setErr('Enter a valid mobile number'); setErr(''); setSent(true); toast.info('OTP sent via SMS (demo: 123456)') }}>Send OTP</Button>
            : <Button size="lg" className="w-full" onClick={() => (otp === '123456' ? enter(users.find((u: any) => u.role === otpRole)) : setErr('Incorrect OTP'))}>Verify & sign in</Button>}
        </div>
      )}
      <div className="mt-6 rounded-xl border border-dashed p-3">
        <p className="mb-2 text-xs font-semibold muted">Demo accounts — click to fill (password: demo123)</p>
        <div className="flex flex-wrap gap-1.5">{ROLES.map(r => <button key={r.id} type="button" onClick={() => { setMode('password'); setValue('username', r.username); setValue('password', 'demo123'); setOtpRole(r.id) }} className="rounded-full border px-2.5 py-1 text-xs font-medium transition hover:border-primary hover:bg-blue-50 hover:text-primary dark:hover:bg-blue-500/10">{r.label}</button>)}</div>
      </div>
      <p className="mt-4 text-center text-sm muted">Are you a patient? <Link to="/portal" className="font-medium text-primary hover:underline dark:text-blue-400">Open Patient Portal</Link></p>
    </Shell>
  )
}

export function Forgot() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors }, getValues } = useForm<{ email: string }>({ resolver: zodResolver(z.object({ email: z.string().email('Enter a valid email address') })) })
  return (
    <Shell title="Forgot password" sub="We'll email you a secure link to reset your password.">
      {sent ? (
        <div className="space-y-4 text-center"><Mail className="mx-auto h-12 w-12 text-emerald-600" /><p className="text-sm">If an account exists for <b>{getValues('email')}</b>, a reset link has been sent. The link expires in 30 minutes.</p>
          <Link to="/reset-password?token=demo"><Button className="w-full">Open reset link (demo)</Button></Link><Link to="/login" className="block text-sm text-primary hover:underline dark:text-blue-400">Back to sign in</Link></div>
      ) : (
        <form onSubmit={handleSubmit(() => setSent(true))} className="space-y-4" noValidate>
          <Field label="Work email" error={errors.email?.message} required><Input type="email" placeholder="you@medicore.org" {...register('email')} /></Field>
          <Button type="submit" size="lg" className="w-full">Send reset link</Button>
          <Link to="/login" className="block text-center text-sm text-primary hover:underline dark:text-blue-400">Back to sign in</Link>
        </form>
      )}
    </Shell>
  )
}

const usePwSchema = () => {
  const p = useSettings().password
  return z.object({
    password: z.string().min(p.minLength, `At least ${p.minLength} characters`).refine(v => !p.upper || /[A-Z]/.test(v), 'Must include an uppercase letter').refine(v => !p.number || /\d/.test(v), 'Must include a number').refine(v => !p.special || /[^A-Za-z0-9]/.test(v), 'Must include a special character'),
    confirm: z.string(),
  }).refine(v => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })
}
function Strength({ v }: { v: string }) {
  const score = [v.length >= 8, /[A-Z]/.test(v), /\d/.test(v), /[^A-Za-z0-9]/.test(v)].filter(Boolean).length
  return <div className="mt-1.5 flex items-center gap-2"><div className="flex flex-1 gap-1">{[0, 1, 2, 3].map(i => <span key={i} className={cn('h-1 flex-1 rounded-full', i < score ? ['bg-red-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-600'][score - 1] : 'bg-slate-200 dark:bg-slate-700')} />)}</div><span className="text-[11px] muted">{['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score]}</span></div>
}

export function Reset() {
  const nav = useNavigate(), [sp] = useSearchParams(), schema = usePwSchema()
  const { register, handleSubmit, watch, formState: { errors } } = useForm<{ password: string; confirm: string }>({ resolver: zodResolver(schema) })
  if (!sp.get('token')) return <Shell title="Reset link invalid" sub="This reset link is missing or has expired."><Link to="/forgot-password"><Button className="w-full">Request a new link</Button></Link></Shell>
  return (
    <Shell title="Set a new password" sub="Choose a strong password you haven't used before.">
      <form onSubmit={handleSubmit(() => { toast.success('Password updated. Please sign in.'); nav('/login') })} className="space-y-4" noValidate>
        <Field label="New password" error={errors.password?.message} required><Input type="password" autoComplete="new-password" {...register('password')} /><Strength v={watch('password') || ''} /></Field>
        <Field label="Confirm password" error={errors.confirm?.message} required><Input type="password" autoComplete="new-password" {...register('confirm')} /></Field>
        <Button type="submit" size="lg" className="w-full"><KeyRound />Update password</Button>
      </form>
    </Shell>
  )
}

export function Profile() {
  const { user, update } = useAuth(), db = useDB(), audit = useColl('audit'), schema = usePwSchema(), file = useRef<HTMLInputElement>(null)
  const info = useForm({ defaultValues: { name: user!.name, email: user!.email, phone: user!.phone }, resolver: zodResolver(z.object({ name: z.string().min(2, 'Name is required'), email: z.string().email('Invalid email'), phone: z.string().min(7, 'Invalid phone number') })) })
  const pw = useForm<{ current: string; password: string; confirm: string }>({ resolver: zodResolver(schema.and(z.object({ current: z.string().min(1, 'Enter your current password') }))) })
  const onPhoto = (f?: File) => { if (!f) return; const r = new FileReader(); r.onload = () => { update({ photo: r.result as string }); db.update('users', user!.id, { photo: r.result }); toast.success('Profile photo updated') }; r.readAsDataURL(f) }
  if (!user) return null
  return (
    <>
      <PageHeader title="My Profile" desc="Manage your personal information, photo and password." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Section className="lg:col-span-1">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative"><Avatar name={user.name} src={user.photo} size={112} /><button aria-label="Change profile photo" onClick={() => file.current?.click()} className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow ring-4 ring-white dark:ring-slate-900"><Camera className="h-4 w-4" /></button></div>
            <input ref={file} type="file" accept="image/*" hidden onChange={e => onPhoto(e.target.files?.[0])} />
            <div><div className="text-lg font-semibold">{user.name}</div><div className="text-sm muted">@{user.username}</div></div>
            <Badge tone="blue"><UserRound className="h-3 w-3" />{ROLES.find(r => r.id === user.role)?.label}</Badge>
            {user.photo && <Button variant="ghost" size="sm" onClick={() => update({ photo: undefined })}>Remove photo</Button>}
          </div>
          <div className="mt-5 border-t pt-4"><h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase muted"><Activity className="h-3.5 w-3.5" />My recent activity</h4>
            <ul className="space-y-1.5 text-xs">{audit.filter((a: any) => a.user === user.name).slice(0, 6).map((a: any) => <li key={a.id} className="flex justify-between gap-2"><span>{a.action} · {a.module} <span className="muted">{a.ref}</span></span><span className="shrink-0 muted">{fDT(a.at)}</span></li>)}{!audit.some((a: any) => a.user === user.name) && <li className="muted">No activity recorded yet.</li>}</ul></div>
        </Section>
        <div className="space-y-4 lg:col-span-2">
          <Section title="Contact information">
            <form className="grid gap-3 sm:grid-cols-2" noValidate onSubmit={info.handleSubmit(v => { update(v); db.update('users', user.id, v); toast.success('Profile saved') })}>
              <Field label="Full name" error={info.formState.errors.name?.message} required><Input {...info.register('name')} /></Field>
              <Field label="Username"><Input value={user.username} disabled readOnly /></Field>
              <Field label="Email" error={info.formState.errors.email?.message} required><Input type="email" {...info.register('email')} /></Field>
              <Field label="Phone" error={info.formState.errors.phone?.message} required><Input {...info.register('phone')} /></Field>
              <div className="sm:col-span-2"><Button type="submit">Save changes</Button></div>
            </form>
          </Section>
          <Section title="Change password">
            <form className="grid gap-3 sm:grid-cols-2" noValidate onSubmit={pw.handleSubmit(v => { if (v.current !== 'demo123') return pw.setError('current', { message: 'Current password is incorrect' }); toast.success('Password changed successfully'); pw.reset() })}>
              <Field label="Current password" error={pw.formState.errors.current?.message} required className="sm:col-span-2"><Input type="password" autoComplete="current-password" {...pw.register('current')} /></Field>
              <Field label="New password" error={pw.formState.errors.password?.message} required><Input type="password" autoComplete="new-password" {...pw.register('password')} /><Strength v={pw.watch('password') || ''} /></Field>
              <Field label="Confirm new password" error={pw.formState.errors.confirm?.message} required><Input type="password" autoComplete="new-password" {...pw.register('confirm')} /></Field>
              <div className="sm:col-span-2"><Button type="submit"><KeyRound />Update password</Button></div>
            </form>
          </Section>
        </div>
      </div>
    </>
  )
}
