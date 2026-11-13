import { Activity, Ambulance, BarChart3, BedDouble, Brush, Building2, CalendarDays, CreditCard, Droplets, FlaskConical, LayoutDashboard, MessageSquare, Package, Pill, ScanLine, Scissors, Settings, Siren, Stethoscope, UserCog, Users, Utensils } from 'lucide-react'

export interface NavItem { key: string; label: string; icon: any; path?: string; children?: { label: string; path: string }[] }

/** `key` doubles as the module id used by the role/permission matrix. */
export const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { key: 'patients', label: 'Patients', icon: Users, children: [{ label: 'Patient Directory', path: '/patients' }, { label: 'New Registration', path: '/patients/new' }] },
  { key: 'opd', label: 'OPD', icon: CalendarDays, children: [{ label: 'Appointments', path: '/opd/appointments' }, { label: 'Token Queue', path: '/opd/queue' }, { label: 'Consultation', path: '/opd/consultation' }] },
  { key: 'ipd', label: 'IPD', icon: BedDouble, children: [{ label: 'Admission', path: '/ipd/admission' }, { label: 'Bed Management', path: '/ipd/beds' }, { label: 'Care Sheets', path: '/ipd/care' }, { label: 'Discharge', path: '/ipd/discharge' }] },
  { key: 'emergency', label: 'Emergency', icon: Siren, path: '/emergency' },
  { key: 'pharmacy', label: 'Pharmacy', icon: Pill, children: [{ label: 'Medicine POS', path: '/pharmacy/pos' }, { label: 'Inventory', path: '/pharmacy/inventory' }] },
  { key: 'laboratory', label: 'Laboratory', icon: FlaskConical, path: '/laboratory' },
  { key: 'radiology', label: 'Radiology', icon: ScanLine, path: '/radiology' },
  { key: 'ot', label: 'Operation Theatre', icon: Scissors, path: '/ot' },
  { key: 'billing', label: 'Billing', icon: CreditCard, children: [{ label: 'Billing POS', path: '/billing/pos' }, { label: 'Bills & Payments', path: '/billing/bills' }, { label: 'Insurance & TPA', path: '/billing/insurance' }, { label: 'Financial Reports', path: '/billing/reports' }] },
  { key: 'inventory', label: 'Inventory & Assets', icon: Package, path: '/inventory' },
  { key: 'hr', label: 'HR & Staff', icon: UserCog, path: '/hr' },
  { key: 'doctors', label: 'Doctors', icon: Stethoscope, path: '/doctors' },
  { key: 'bloodbank', label: 'Blood Bank', icon: Droplets, path: '/blood-bank' },
  { key: 'diet', label: 'Diet & Kitchen', icon: Utensils, path: '/diet' },
  { key: 'housekeeping', label: 'Housekeeping', icon: Brush, path: '/housekeeping' },
  { key: 'ambulance', label: 'Ambulance', icon: Ambulance, path: '/ambulance' },
  { key: 'reports', label: 'Reports & Analytics', icon: BarChart3, path: '/reports' },
  { key: 'communication', label: 'Communication', icon: MessageSquare, path: '/communication' },
  { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
]
export const MODULES = NAV.map(n => ({ key: n.key, label: n.label }))
export const LEAVES = NAV.flatMap(n => (n.children ? n.children.map(c => ({ ...c, key: n.key, icon: n.icon, parent: n.label })) : [{ label: n.label, path: n.path!, key: n.key, icon: n.icon, parent: '' }]))
export const labelFor = (path: string) => {
  const hit = [...LEAVES].sort((a, b) => b.path.length - a.path.length).find(l => (l.path === '/' ? path === '/' : path === l.path || path.startsWith(l.path + '/')))
  if (path === '/profile') return 'My Profile'
  if (/^\/patients\/PT-/.test(path)) return `Patient ${path.split('/')[2]}`
  return hit?.label || 'Page'
}
export const HOME: Record<string, string> = { pharmacist: '/', lab: '/', accountant: '/', hr: '/' }
export { Activity, Building2 }
