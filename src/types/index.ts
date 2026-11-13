export type Role = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'lab' | 'accountant' | 'hr'

export interface User {
  id: string; username: string; name: string; role: Role; email: string; phone: string
  photo?: string; doctorId?: string; department?: string
}

export interface Patient {
  id: string; name: string; dob: string; gender: 'Male' | 'Female' | 'Other'; photo?: string
  phone: string; email?: string; address?: string
  emergencyName?: string; emergencyPhone?: string; emergencyRelation?: string
  blood: string; allergies: string; chronic: string
  insProvider?: string; insPolicy?: string; insCoverage?: number
  idType?: string; idNo?: string; referral: string; category: string
  department: string; status: 'Active' | 'Admitted' | 'Discharged' | 'Deceased'
  regDate: string; familyOf?: string
}

export interface Doctor {
  id: string; name: string; dept: string; specialization: string; qualification: string
  experience: number; fee: number; phone: string; days: string; from: string; to: string
  status: string; bio: string; rating: number
}

export interface Appointment {
  id: string; patientId: string; patientName: string; doctorId: string; dept: string
  start: string; end: string; type: 'Appointment' | 'Walk-in' | 'Online'
  status: 'Booked' | 'Confirmed' | 'Checked-in' | 'Completed' | 'Cancelled' | 'No-show' | 'Blocked'
  reason?: string; sms?: boolean; email?: boolean; recurring?: string
}

export interface Token {
  id: string; no: string; patientId?: string; patientName: string; dept: string; doctorId?: string
  priority: 'Normal' | 'Emergency' | 'Elderly' | 'VIP'
  status: 'Waiting' | 'Called' | 'In-Consultation' | 'Completed' | 'Skipped'
  createdAt: string; calledAt?: string; doneAt?: string
}

export interface Bed {
  id: string; floor: number; ward: string; type: string; rate: number
  status: 'Available' | 'Occupied' | 'Reserved' | 'Maintenance' | 'Cleaning'
  patientId?: string; patientName?: string; doctor?: string; admitDate?: string; expDischarge?: string
}

export interface Batch { batch: string; expiry: string; qty: number; purchase: number }
export interface Medicine {
  id: string; name: string; generic: string; manufacturer: string; category: string; form: string
  hsn: string; barcode: string; mrp: number; tax: number; reorder: number; controlled: boolean; batches: Batch[]
}

export interface Payment { mode: string; amount: number; ref?: string }
export interface BillItem { desc: string; cat: string; qty: number; rate: number; dept?: string }
export interface Bill {
  id: string; date: string; patientId: string; patientName: string; type: string; dept: string; doctorId?: string
  items: BillItem[]; subtotal: number; discount: number; tax: number; total: number; paid: number
  payments: Payment[]; status: 'Paid' | 'Partial' | 'Unpaid' | 'Cancelled'; cancelReason?: string; by?: string
}

export interface LabParam { name: string; unit: string; low: number; high: number; critLow?: number; critHigh?: number }
export interface LabTest { code: string; name: string; price: number; tat: number; sample: string; params: LabParam[] }
export interface LabOrder {
  id: string; patientId: string; patientName: string; doctorId: string; test: string
  priority: 'Routine' | 'Urgent' | 'STAT'
  status: 'Ordered' | 'Collected' | 'In-Process' | 'Completed' | 'Approved'
  orderedAt: string; collectedAt?: string; completedAt?: string; approvedBy?: string
  results?: Record<string, string>; remarks?: string; attachment?: string
}

export interface Notification { id: string; title: string; body: string; type: string; at: string; read: boolean; link?: string }
export type DB = Record<string, any>
