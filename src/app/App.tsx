import { lazy, Suspense, useEffect } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { ConfirmHost, PrintHost, Toaster } from '@/components/common/overlays'
import { Button, PageSkeleton } from '@/components/ui'
import { useAuth, useDB, useUI } from './store'

/* Every feature is code-split and lazy-loaded per route. */
const lz = (imp: () => Promise<any>, name = 'default') => lazy(() => imp().then(m => ({ default: m[name] })))
const auth = () => import('@/features/auth/AuthPages')
const Login = lz(auth, 'Login'), Forgot = lz(auth, 'Forgot'), Reset = lz(auth, 'Reset'), Profile = lz(auth, 'Profile')
const Dashboard = lz(() => import('@/features/dashboard'))
const PatientDirectory = lz(() => import('@/features/patients/Directory'))
const PatientRegister = lz(() => import('@/features/patients/Register'))
const PatientProfile = lz(() => import('@/features/patients/Profile'))
const Appointments = lz(() => import('@/features/opd/Appointments'))
const Queue = lz(() => import('@/features/opd/Queue'))
const DisplayBoard = lz(() => import('@/features/opd/Queue'), 'DisplayBoard')
const Consultation = lz(() => import('@/features/opd/Consultation'))
const Admission = lz(() => import('@/features/ipd/Admission'))
const Beds = lz(() => import('@/features/ipd/Beds'))
const CareSheets = lz(() => import('@/features/ipd/CareSheets'))
const Discharge = lz(() => import('@/features/ipd/Discharge'))
const Emergency = lz(() => import('@/features/emergency'))
const PharmacyPOS = lz(() => import('@/features/pharmacy/POS'))
const PharmacyInventory = lz(() => import('@/features/pharmacy/Inventory'))
const Laboratory = lz(() => import('@/features/laboratory'))
const Radiology = lz(() => import('@/features/radiology'))
const OT = lz(() => import('@/features/ot'))
const BillingPOS = lz(() => import('@/features/billing/POS'))
const Bills = lz(() => import('@/features/billing/Bills'))
const Insurance = lz(() => import('@/features/billing/Insurance'))
const FinReports = lz(() => import('@/features/billing/FinReports'))
const Inventory = lz(() => import('@/features/inventory'))
const HR = lz(() => import('@/features/hr'))
const Doctors = lz(() => import('@/features/doctors'))
const BloodBank = lz(() => import('@/features/blood-bank'))
const Diet = lz(() => import('@/features/diet'))
const Housekeeping = lz(() => import('@/features/housekeeping'))
const AmbulancePage = lz(() => import('@/features/ambulance'))
const Reports = lz(() => import('@/features/reports'))
const Communication = lz(() => import('@/features/communication'))
const SettingsPage = lz(() => import('@/features/settings'))
const Portal = lz(() => import('@/features/portal'))

/** Route guard driven by the role → module permission matrix (Settings › Roles & Permissions). */
function G({ m, children }: { m: string; children: JSX.Element }) {
  const role = useAuth(s => s.user?.role), ok = useDB(s => (role ? s.db.permissions[role]?.[m]?.includes('View') : false))
  if (ok) return children
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <ShieldX className="h-12 w-12 text-red-500" /><h1 className="text-xl font-bold">Access denied</h1>
      <p className="max-w-sm text-sm muted">Your role does not have permission to view this module. Contact your administrator if you need access.</p>
      <Link to="/"><Button>Back to dashboard</Button></Link>
    </div>
  )
}
const NotFound = () => <div className="py-24 text-center"><h1 className="text-5xl font-bold text-primary">404</h1><p className="mt-2 muted">This page does not exist.</p><Link to="/"><Button className="mt-4">Go home</Button></Link></div>

export default function App() {
  const { dark, contrast, fontScale } = useUI()
  useEffect(() => {
    const el = document.documentElement
    el.classList.toggle('dark', dark); el.classList.toggle('hc', contrast); el.style.fontSize = `${16 * fontScale}px`
  }, [dark, contrast, fontScale])
  const full = <div className="p-6"><PageSkeleton /></div>
  return (
    <>
      <Suspense fallback={full}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<Forgot />} />
          <Route path="/reset-password" element={<Reset />} />
          <Route path="/portal" element={<Portal />} />
          <Route path="/display" element={<DisplayBoard />} />
          <Route element={<AppLayout />}>
            <Route index element={<G m="dashboard"><Dashboard /></G>} />
            <Route path="profile" element={<Profile />} />
            <Route path="patients" element={<G m="patients"><PatientDirectory /></G>} />
            <Route path="patients/new" element={<G m="patients"><PatientRegister /></G>} />
            <Route path="patients/:id" element={<G m="patients"><PatientProfile /></G>} />
            <Route path="patients/:id/edit" element={<G m="patients"><PatientRegister /></G>} />
            <Route path="opd/appointments" element={<G m="opd"><Appointments /></G>} />
            <Route path="opd/queue" element={<G m="opd"><Queue /></G>} />
            <Route path="opd/consultation" element={<G m="opd"><Consultation /></G>} />
            <Route path="ipd/admission" element={<G m="ipd"><Admission /></G>} />
            <Route path="ipd/beds" element={<G m="ipd"><Beds /></G>} />
            <Route path="ipd/care" element={<G m="ipd"><CareSheets /></G>} />
            <Route path="ipd/discharge" element={<G m="ipd"><Discharge /></G>} />
            <Route path="emergency" element={<G m="emergency"><Emergency /></G>} />
            <Route path="pharmacy/pos" element={<G m="pharmacy"><PharmacyPOS /></G>} />
            <Route path="pharmacy/inventory" element={<G m="pharmacy"><PharmacyInventory /></G>} />
            <Route path="laboratory" element={<G m="laboratory"><Laboratory /></G>} />
            <Route path="radiology" element={<G m="radiology"><Radiology /></G>} />
            <Route path="ot" element={<G m="ot"><OT /></G>} />
            <Route path="billing/pos" element={<G m="billing"><BillingPOS /></G>} />
            <Route path="billing/bills" element={<G m="billing"><Bills /></G>} />
            <Route path="billing/insurance" element={<G m="billing"><Insurance /></G>} />
            <Route path="billing/reports" element={<G m="billing"><FinReports /></G>} />
            <Route path="inventory" element={<G m="inventory"><Inventory /></G>} />
            <Route path="hr" element={<G m="hr"><HR /></G>} />
            <Route path="doctors" element={<G m="doctors"><Doctors /></G>} />
            <Route path="blood-bank" element={<G m="bloodbank"><BloodBank /></G>} />
            <Route path="diet" element={<G m="diet"><Diet /></G>} />
            <Route path="housekeeping" element={<G m="housekeeping"><Housekeeping /></G>} />
            <Route path="ambulance" element={<G m="ambulance"><AmbulancePage /></G>} />
            <Route path="reports" element={<G m="reports"><Reports /></G>} />
            <Route path="communication" element={<G m="communication"><Communication /></G>} />
            <Route path="settings" element={<G m="settings"><SettingsPage /></G>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster /><ConfirmHost /><PrintHost />
    </>
  )
}
