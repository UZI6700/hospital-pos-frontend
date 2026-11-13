import type { LabTest, Role } from '@/types'

export const ROLES: { id: Role; label: string; username: string }[] = [
  { id: 'admin', label: 'Admin', username: 'admin' },
  { id: 'doctor', label: 'Doctor', username: 'doctor' },
  { id: 'nurse', label: 'Nurse', username: 'nurse' },
  { id: 'receptionist', label: 'Receptionist', username: 'reception' },
  { id: 'pharmacist', label: 'Pharmacist', username: 'pharmacist' },
  { id: 'lab', label: 'Lab Technician', username: 'lab' },
  { id: 'accountant', label: 'Accountant', username: 'accounts' },
  { id: 'hr', label: 'HR', username: 'hr' },
]
export const ACTIONS = ['View', 'Create', 'Edit', 'Delete', 'Print', 'Export']
export const DEPARTMENTS = ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'Neurology', 'Dermatology', 'ENT', 'Ophthalmology', 'Emergency']
export const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
export const CATEGORIES = ['General', 'VIP', 'Staff', 'Insurance', 'Government scheme']
export const RATE_MULT: Record<string, number> = { General: 1, VIP: 1.5, Staff: 0.5, Insurance: 1.1, 'Government scheme': 0.8 }
export const PAY_MODES = ['Cash', 'Card', 'UPI', 'Wallet', 'Cheque', 'Insurance', 'Corporate Credit', 'Govt Scheme']
export const GOVT_SCHEMES = ['CGHS', 'ESI', 'Ayushman Bharat', 'Sehat Sahulat']
export const BED_TYPES = ['General', 'Semi-Private', 'Private', 'ICU', 'NICU', 'PICU', 'Isolation']
export const BED_COLOR: Record<string, string> = {
  Available: 'bg-emerald-500 border-emerald-600', Occupied: 'bg-red-500 border-red-600', Reserved: 'bg-amber-400 border-amber-500',
  Maintenance: 'bg-slate-400 border-slate-500', Cleaning: 'bg-blue-500 border-blue-600',
}
export const APPT_COLOR: Record<string, string> = {
  Booked: '#2563eb', Confirmed: '#0d9488', 'Checked-in': '#7c3aed', Completed: '#16a34a', Cancelled: '#dc2626', 'No-show': '#64748b', Blocked: '#94a3b8',
}
export const TRIAGE: Record<string, { label: string; cls: string }> = {
  Red: { label: 'Immediate', cls: 'bg-red-600 text-white' }, Yellow: { label: 'Urgent', cls: 'bg-amber-400 text-black' },
  Green: { label: 'Minor', cls: 'bg-emerald-600 text-white' }, Black: { label: 'Deceased', cls: 'bg-black text-white' },
}

export const ICD10: [string, string][] = [
  ['A09', 'Infectious gastroenteritis and colitis'], ['A90', 'Dengue fever'], ['B34.9', 'Viral infection, unspecified'], ['B50.9', 'Plasmodium falciparum malaria'],
  ['E03.9', 'Hypothyroidism, unspecified'], ['E11.9', 'Type 2 diabetes mellitus without complications'], ['E11.65', 'Type 2 diabetes with hyperglycemia'], ['E66.9', 'Obesity, unspecified'], ['E78.5', 'Hyperlipidemia, unspecified'],
  ['D50.9', 'Iron deficiency anemia'], ['F32.9', 'Major depressive disorder'], ['F41.1', 'Generalized anxiety disorder'], ['G43.9', 'Migraine, unspecified'], ['G40.9', 'Epilepsy, unspecified'],
  ['H10.9', 'Conjunctivitis, unspecified'], ['H66.9', 'Otitis media, unspecified'], ['I10', 'Essential (primary) hypertension'], ['I20.9', 'Angina pectoris, unspecified'], ['I21.9', 'Acute myocardial infarction'],
  ['I25.10', 'Atherosclerotic heart disease'], ['I50.9', 'Heart failure, unspecified'], ['I63.9', 'Cerebral infarction'], ['J00', 'Acute nasopharyngitis (common cold)'], ['J02.9', 'Acute pharyngitis'],
  ['J06.9', 'Acute upper respiratory infection'], ['J18.9', 'Pneumonia, unspecified organism'], ['J20.9', 'Acute bronchitis'], ['J45.909', 'Asthma, uncomplicated'], ['J44.9', 'COPD, unspecified'],
  ['K21.9', 'Gastro-esophageal reflux disease'], ['K29.70', 'Gastritis, unspecified'], ['K35.80', 'Acute appendicitis'], ['K80.20', 'Gallstones without obstruction'], ['L20.9', 'Atopic dermatitis'],
  ['L50.9', 'Urticaria, unspecified'], ['M17.9', 'Osteoarthritis of knee'], ['M54.5', 'Low back pain'], ['N18.9', 'Chronic kidney disease'], ['N39.0', 'Urinary tract infection'],
  ['O80', 'Normal delivery'], ['R05', 'Cough'], ['R50.9', 'Fever, unspecified'], ['R51', 'Headache'], ['S52.5', 'Fracture of lower end of radius'], ['S82.2', 'Fracture of shaft of tibia'], ['Z00.0', 'General medical examination'],
]

export const INTERACTIONS: [string, string, 'Major' | 'Moderate', string][] = [
  ['Warfarin', 'Aspirin', 'Major', 'Increased risk of bleeding'],
  ['Warfarin', 'Ibuprofen', 'Major', 'NSAIDs increase anticoagulant effect and GI bleed risk'],
  ['Aspirin', 'Ibuprofen', 'Moderate', 'Ibuprofen may reduce cardioprotective effect of aspirin'],
  ['Atorvastatin', 'Clarithromycin', 'Major', 'Raised statin levels – risk of rhabdomyolysis'],
  ['Isosorbide Dinitrate', 'Sildenafil', 'Major', 'Severe hypotension'],
  ['Ciprofloxacin', 'Warfarin', 'Moderate', 'May potentiate anticoagulant effect'],
  ['Tramadol', 'Alprazolam', 'Major', 'CNS and respiratory depression'],
  ['Morphine', 'Alprazolam', 'Major', 'Profound sedation, respiratory depression'],
  ['Metformin', 'Ciprofloxacin', 'Moderate', 'Risk of dysglycemia'],
  ['Telmisartan', 'Losartan', 'Moderate', 'Duplicate ARB therapy – hyperkalemia risk'],
  ['Azithromycin', 'Warfarin', 'Moderate', 'May increase INR'],
]

const p = (name: string, unit: string, low: number, high: number, critLow?: number, critHigh?: number) => ({ name, unit, low, high, critLow, critHigh })
export const LAB_TESTS: LabTest[] = [
  { code: 'CBC', name: 'Complete Blood Count', price: 350, tat: 4, sample: 'EDTA Blood', params: [p('Hemoglobin', 'g/dL', 12, 17, 7, 20), p('WBC Count', '×10³/µL', 4, 11, 2, 30), p('Platelets', '×10³/µL', 150, 450, 50, 1000), p('RBC Count', '×10⁶/µL', 4.2, 5.9), p('Hematocrit', '%', 36, 50)] },
  { code: 'LFT', name: 'Liver Function Test', price: 700, tat: 6, sample: 'Serum', params: [p('Bilirubin Total', 'mg/dL', 0.2, 1.2, undefined, 15), p('SGPT (ALT)', 'U/L', 7, 56, undefined, 1000), p('SGOT (AST)', 'U/L', 10, 40, undefined, 1000), p('ALP', 'U/L', 44, 147), p('Albumin', 'g/dL', 3.5, 5.5)] },
  { code: 'KFT', name: 'Kidney Function Test', price: 650, tat: 6, sample: 'Serum', params: [p('Urea', 'mg/dL', 15, 45, undefined, 200), p('Creatinine', 'mg/dL', 0.6, 1.3, undefined, 7.5), p('Uric Acid', 'mg/dL', 3.5, 7.2)] },
  { code: 'LIPID', name: 'Lipid Profile', price: 800, tat: 8, sample: 'Serum (Fasting)', params: [p('Total Cholesterol', 'mg/dL', 0, 200), p('Triglycerides', 'mg/dL', 0, 150, undefined, 1000), p('HDL', 'mg/dL', 40, 100), p('LDL', 'mg/dL', 0, 130)] },
  { code: 'FBS', name: 'Fasting Blood Sugar', price: 120, tat: 2, sample: 'Fluoride Plasma', params: [p('Glucose (Fasting)', 'mg/dL', 70, 100, 50, 400)] },
  { code: 'HBA1C', name: 'HbA1c', price: 550, tat: 6, sample: 'EDTA Blood', params: [p('HbA1c', '%', 4, 5.6, undefined, 14)] },
  { code: 'TSH', name: 'Thyroid Profile', price: 600, tat: 12, sample: 'Serum', params: [p('TSH', 'µIU/mL', 0.4, 4.0, 0.01, 100), p('T3', 'ng/dL', 80, 200), p('T4', 'µg/dL', 5.1, 14.1)] },
  { code: 'ELEC', name: 'Serum Electrolytes', price: 450, tat: 3, sample: 'Serum', params: [p('Sodium', 'mEq/L', 135, 145, 120, 160), p('Potassium', 'mEq/L', 3.5, 5.1, 2.5, 6.5), p('Chloride', 'mEq/L', 98, 107)] },
  { code: 'CRP', name: 'C-Reactive Protein', price: 500, tat: 4, sample: 'Serum', params: [p('CRP', 'mg/L', 0, 6)] },
]
export const IMAGING = ['X-Ray Chest PA', 'X-Ray Knee AP/Lat', 'CT Brain Plain', 'CT Abdomen', 'MRI Brain', 'MRI Lumbar Spine', 'Ultrasound Abdomen', 'Ultrasound Pelvis', 'ECG', '2D Echo']
export const COMPLAINT_TEMPLATES = ['Fever for 3 days', 'Cough with expectoration', 'Headache', 'Chest pain', 'Abdominal pain', 'Shortness of breath', 'Vomiting / loose motions', 'Joint pain', 'Generalised weakness', 'Burning micturition', 'Dizziness', 'Skin rash']
export const FREQ = ['OD (once daily)', 'BD (twice daily)', 'TDS (thrice daily)', 'QID (four times)', 'HS (at bedtime)', 'SOS (as needed)', 'STAT']
