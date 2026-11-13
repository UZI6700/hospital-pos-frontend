/* Deterministic demo dataset – stands in for the backend until real APIs are wired up. */
import { dOff, today } from './index'
import { ACTIONS, BLOOD, CATEGORIES, DEPARTMENTS, LAB_TESTS, ROLES, IMAGING } from './constants'

let s = 20240611
const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 }
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)]
const ri = (a: number, b: number) => Math.floor(rnd() * (b - a + 1)) + a
const pad = (n: number, l = 4) => String(n).padStart(l, '0')
const iso = (dayOff: number, h = 9, m = 0) => { const d = new Date(); d.setDate(d.getDate() + dayOff); d.setHours(h, m, 0, 0); return d.toISOString() }
const rows = (keys: string, data: any[][], prefix?: string) => data.map((r, i) => {
  const o: any = prefix ? { id: `${prefix}-${pad(i + 1, 3)}` } : {}
  keys.split(',').forEach((k, j) => { o[k] = r[j] })
  return o
})

const MALE = ['Aarav', 'Imran', 'Rahul', 'Bilal', 'Vikram', 'Hamza', 'Arjun', 'Usman', 'Rohan', 'Faisal', 'Sanjay', 'Zain', 'Karan', 'Ahmed', 'Deepak', 'Saad', 'Manoj', 'Tariq', 'Nikhil', 'Omar']
const FEMALE = ['Ayesha', 'Priya', 'Fatima', 'Ananya', 'Zara', 'Neha', 'Sana', 'Kavita', 'Maryam', 'Pooja', 'Hina', 'Sunita', 'Noor', 'Meera', 'Amna', 'Divya', 'Rabia', 'Sneha', 'Iqra', 'Lakshmi']
const LAST = ['Khan', 'Sharma', 'Malik', 'Patel', 'Ahmed', 'Singh', 'Hussain', 'Gupta', 'Qureshi', 'Reddy', 'Sheikh', 'Verma', 'Butt', 'Nair', 'Chaudhry', 'Joshi', 'Raza', 'Mehta', 'Siddiqui', 'Iyer']
const CITIES = ['Islamabad', 'Rawalpindi', 'Lahore', 'Delhi', 'Mumbai', 'Karachi', 'Pune', 'Peshawar']
const ALLERGY = ['', '', '', '', 'Penicillin', 'Sulfa drugs', 'Peanuts', 'Aspirin', 'Latex', 'Iodine contrast', 'Dust, Pollen']
const CHRONIC = ['', '', '', 'Diabetes Type 2', 'Hypertension', 'Asthma', 'Hypothyroidism', 'CKD Stage 2', 'Diabetes, Hypertension', 'Coronary artery disease']
const INS = ['Star Health', 'HDFC Ergo', 'ICICI Lombard', 'State Life', 'Jubilee Health', 'Niva Bupa']

export function buildSeed() {
  s = 20240611
  const doctors = rows('name,dept,specialization,qualification,experience,fee,from,to,days,rating', [
    ['Dr. Sarah Ahmed', 'General Medicine', 'Internal Medicine', 'MBBS, MD', 14, 600, '09:00', '15:00', 'Mon–Sat', 4.8],
    ['Dr. Rajesh Kumar', 'Cardiology', 'Interventional Cardiology', 'MBBS, MD, DM', 20, 1200, '10:00', '16:00', 'Mon–Fri', 4.9],
    ['Dr. Ali Raza', 'Orthopedics', 'Joint Replacement', 'MBBS, MS (Ortho)', 12, 900, '09:00', '14:00', 'Mon–Sat', 4.6],
    ['Dr. Meena Iyer', 'Pediatrics', 'Neonatology', 'MBBS, DCH, MD', 16, 700, '09:00', '17:00', 'Mon–Sat', 4.9],
    ['Dr. Farah Siddiqui', 'Gynecology', 'Obstetrics & Gynecology', 'MBBS, FCPS', 18, 1000, '11:00', '18:00', 'Mon–Fri', 4.7],
    ['Dr. Anil Mehta', 'Neurology', 'Stroke & Epilepsy', 'MBBS, MD, DM', 22, 1500, '12:00', '18:00', 'Tue–Sat', 4.8],
    ['Dr. Hira Malik', 'Dermatology', 'Clinical Dermatology', 'MBBS, MD', 8, 800, '10:00', '15:00', 'Mon–Thu', 4.5],
    ['Dr. Suresh Nair', 'ENT', 'Head & Neck Surgery', 'MBBS, MS (ENT)', 15, 700, '09:00', '13:00', 'Mon–Sat', 4.4],
    ['Dr. Zainab Qureshi', 'Ophthalmology', 'Cataract & Retina', 'MBBS, MS', 11, 800, '14:00', '19:00', 'Mon–Fri', 4.7],
    ['Dr. Vivek Singh', 'Emergency', 'Emergency Medicine', 'MBBS, MEM', 9, 1000, '00:00', '23:59', 'All days', 4.6],
  ], 'DOC').map((d: any, i) => ({ ...d, phone: `+92 300 55501${pad(i, 2)}`, status: i === 6 ? 'On Leave' : 'Active', bio: `${d.specialization} specialist with ${d.experience}+ years of clinical experience.` }))

  const patients: any[] = Array.from({ length: 240 }, (_, i) => {
    const gender = rnd() > 0.5 ? 'Male' : 'Female'
    const name = `${pick(gender === 'Male' ? MALE : FEMALE)} ${pick(LAST)}`
    const category = rnd() < 0.6 ? 'General' : pick(CATEGORIES)
    const insured = category === 'Insurance' || rnd() < 0.2
    return {
      id: `PT-${pad(i + 1, 6)}`, name, gender, dob: `${ri(1945, 2021)}-${pad(ri(1, 12), 2)}-${pad(ri(1, 28), 2)}`,
      phone: `+92 3${ri(10, 49)} ${ri(1000000, 9999999)}`, email: `${name.toLowerCase().replace(' ', '.')}@mail.com`,
      address: `${ri(1, 220)}, Street ${ri(1, 40)}, ${pick(CITIES)}`, emergencyName: `${pick(MALE)} ${name.split(' ')[1]}`, emergencyPhone: `+92 3${ri(10, 49)} ${ri(1000000, 9999999)}`, emergencyRelation: pick(['Spouse', 'Father', 'Brother', 'Son']),
      blood: pick(BLOOD), allergies: pick(ALLERGY), chronic: pick(CHRONIC), category,
      insProvider: insured ? pick(INS) : '', insPolicy: insured ? `POL${ri(100000, 999999)}` : '', insCoverage: insured ? pick([200000, 500000, 1000000]) : 0,
      idType: pick(['CNIC', 'Aadhar', 'Passport', 'Driving License']), idNo: `${ri(10000, 99999)}-${ri(1000000, 9999999)}`,
      referral: pick(['Self', 'Self', 'Doctor referral', 'Hospital transfer']), department: pick(DEPARTMENTS.slice(0, 9)), status: 'Active',
      regDate: dOff(-ri(0, 400)), familyOf: i % 17 === 5 ? `PT-${pad(i, 6)}` : '',
    }
  })
  patients.slice(0, 6).forEach(p => { p.regDate = today() })

  // Beds & admissions
  const beds: any[] = [], admissions: any[] = [], vitals: any[] = []
  let pi = 20
  ;([[1, 'General Ward A', 'General', 'GA', 12, 1500], [1, 'General Ward B', 'General', 'GB', 10, 1500], [2, 'Semi-Private Wing', 'Semi-Private', 'SP', 8, 3000], [2, 'Private Rooms', 'Private', 'PR', 8, 6000],
  [3, 'ICU', 'ICU', 'ICU', 8, 12000], [3, 'NICU', 'NICU', 'NI', 4, 10000], [3, 'PICU', 'PICU', 'PI', 4, 10000], [3, 'Isolation', 'Isolation', 'ISO', 4, 5000]] as any[]).forEach(([floor, ward, type, pre, n, rate]) => {
    for (let i = 1; i <= n; i++) {
      const r = rnd()
      const status = r < 0.55 ? 'Occupied' : r < 0.8 ? 'Available' : r < 0.87 ? 'Reserved' : r < 0.93 ? 'Cleaning' : 'Maintenance'
      const bed: any = { id: `${pre}-${pad(i, 2)}`, floor, ward, type, rate, status }
      if (status === 'Occupied') {
        const p = patients[pi++], doc = pick(doctors), ago = ri(1, 8)
        p.status = 'Admitted'
        Object.assign(bed, { patientId: p.id, patientName: p.name, doctor: doc.name, admitDate: dOff(-ago), expDischarge: dOff(ri(0, 5)) })
        admissions.push({ id: `ADM-${pad(admissions.length + 1)}`, patientId: p.id, patientName: p.name, bedId: bed.id, ward, doctorId: doc.id, doctor: doc.name, dept: doc.dept, type: pick(['Planned', 'Emergency', 'Transfer']), admitDate: dOff(-ago), expDays: ago + ri(1, 5), status: 'Admitted', advance: pick([5000, 10000, 20000]), diagnosis: pick(['Pneumonia', 'Acute MI', 'Fracture femur', 'Dengue fever', 'Post-op appendectomy', 'Diabetic ketoacidosis', 'Stroke', 'Cellulitis']), dischargeReady: rnd() < 0.2 })
        for (let d = Math.min(ago, 5); d >= 0; d--) vitals.push({ id: `VT-${vitals.length + 1}`, patientId: p.id, at: iso(-d, 8), sys: ri(105, 150), dia: ri(65, 95), temp: +(97 + rnd() * 4).toFixed(1), pulse: ri(62, 110), spo2: ri(91, 99), rr: ri(14, 22), weight: ri(48, 90), height: ri(150, 182) })
      }
      beds.push(bed)
    }
  })

  const APST = ['Booked', 'Confirmed', 'Checked-in', 'Completed']
  const appointments = Array.from({ length: 70 }, (_, i) => {
    const day = ri(-4, 7), h = ri(9, 17), m = pick([0, 30]), p = pick(patients), doc = pick(doctors.slice(0, 9))
    const status = day < 0 ? pick(['Completed', 'Completed', 'Completed', 'No-show', 'Cancelled']) : day === 0 ? pick(APST) : pick(['Booked', 'Confirmed'])
    return { id: `APT-${pad(i + 1)}`, patientId: p.id, patientName: p.name, doctorId: doc.id, dept: doc.dept, start: iso(day, h, m), end: iso(day, h, m + 30), type: pick(['Appointment', 'Appointment', 'Walk-in', 'Online']), status, reason: pick(['Follow-up', 'New consultation', 'Review reports', 'Routine check-up']), sms: true, email: rnd() > 0.5 }
  })

  const tokens = Array.from({ length: 16 }, (_, i) => {
    const p = patients[100 + i], doc = pick(doctors.slice(0, 5))
    const status = i < 6 ? 'Completed' : i === 6 ? 'In-Consultation' : i === 7 ? 'Called' : 'Waiting'
    const mins = (16 - i) * 9
    return { id: `TK-${pad(i + 1)}`, no: `${doc.dept[0]}-${pad(i + 1, 3)}`, patientId: p.id, patientName: p.name, dept: doc.dept, doctorId: doc.id, priority: i === 10 ? 'Emergency' : i === 12 ? 'Elderly' : i === 14 ? 'VIP' : 'Normal', status, createdAt: new Date(Date.now() - mins * 6e4).toISOString(), calledAt: i < 8 ? new Date(Date.now() - (mins - 12) * 6e4).toISOString() : undefined }
  })

  const medicines = ([
    ['Crocin 500mg', 'Paracetamol', 'GSK', 'Analgesic', 'Tablet', 2, 12, false], ['Dolo 650', 'Paracetamol', 'Micro Labs', 'Analgesic', 'Tablet', 3, 12, false], ['Calpol Syrup 60ml', 'Paracetamol', 'GSK', 'Analgesic', 'Syrup', 45, 12, false],
    ['Brufen 400', 'Ibuprofen', 'Abbott', 'NSAID', 'Tablet', 4, 12, false], ['Ecosprin 75', 'Aspirin', 'USV', 'Antiplatelet', 'Tablet', 1.5, 12, false], ['Warf 5', 'Warfarin', 'Cipla', 'Anticoagulant', 'Tablet', 6, 12, false],
    ['Glycomet 500', 'Metformin', 'USV', 'Antidiabetic', 'Tablet', 3, 12, false], ['Atorva 10', 'Atorvastatin', 'Zydus', 'Statin', 'Tablet', 8, 12, false], ['Lipitor 10', 'Atorvastatin', 'Pfizer', 'Statin', 'Tablet', 14, 12, false],
    ['Amlong 5', 'Amlodipine', 'Micro Labs', 'Antihypertensive', 'Tablet', 4, 12, false], ['Telma 40', 'Telmisartan', 'Glenmark', 'Antihypertensive', 'Tablet', 9, 12, false], ['Losar 50', 'Losartan', 'Unichem', 'Antihypertensive', 'Tablet', 7, 12, false],
    ['Augmentin 625', 'Amoxicillin + Clavulanate', 'GSK', 'Antibiotic', 'Tablet', 22, 12, false], ['Mox 500', 'Amoxicillin', 'Sun Pharma', 'Antibiotic', 'Capsule', 8, 12, false], ['Azithral 500', 'Azithromycin', 'Alembic', 'Antibiotic', 'Tablet', 24, 12, false],
    ['Ciplox 500', 'Ciprofloxacin', 'Cipla', 'Antibiotic', 'Tablet', 6, 12, false], ['Claribid 500', 'Clarithromycin', 'Abbott', 'Antibiotic', 'Tablet', 42, 12, false], ['Pan 40', 'Pantoprazole', 'Alkem', 'Antacid', 'Tablet', 9, 12, false],
    ['Omez 20', 'Omeprazole', 'Dr. Reddy\'s', 'Antacid', 'Capsule', 6, 12, false], ['Cetzine 10', 'Cetirizine', 'GSK', 'Antihistamine', 'Tablet', 2, 12, false], ['Allegra 120', 'Fexofenadine', 'Sanofi', 'Antihistamine', 'Tablet', 16, 12, false],
    ['Asthalin Inhaler', 'Salbutamol', 'Cipla', 'Bronchodilator', 'Inhaler', 145, 12, false], ['Thyronorm 50', 'Levothyroxine', 'Abbott', 'Thyroid', 'Tablet', 2, 12, false], ['Lantus 100IU/ml', 'Insulin Glargine', 'Sanofi', 'Antidiabetic', 'Injection', 620, 5, false],
    ['Sorbitrate 5', 'Isosorbide Dinitrate', 'Abbott', 'Antianginal', 'Tablet', 1, 12, false], ['Tramazac 50', 'Tramadol', 'Zydus', 'Opioid Analgesic', 'Capsule', 9, 12, true], ['Alprax 0.5', 'Alprazolam', 'Torrent', 'Anxiolytic', 'Tablet', 3, 12, true],
    ['Morphine 10mg Inj', 'Morphine', 'Neon', 'Opioid Analgesic', 'Injection', 38, 12, true], ['Electral ORS', 'Oral Rehydration Salts', 'FDC', 'Electrolyte', 'Sachet', 22, 5, false], ['Normal Saline 500ml', 'Sodium Chloride 0.9%', 'Baxter', 'IV Fluid', 'Infusion', 48, 5, false],
    ['Betadine 100ml', 'Povidone Iodine', 'Win-Medicare', 'Antiseptic', 'Solution', 110, 18, false], ['Zincovit', 'Multivitamin', 'Apex', 'Supplement', 'Tablet', 7, 18, false],
  ] as any[]).map(([name, generic, manufacturer, category, form, mrp, tax, controlled], i) => {
    const low = i % 9 === 3, soon = i % 7 === 2
    return {
      id: `MED-${pad(i + 1, 3)}`, name, generic, manufacturer, category, form, mrp, tax, controlled, hsn: `3004${ri(10, 99)}`, barcode: `890${pad(1000 + i * 37, 7)}`, reorder: 100,
      batches: [
        { batch: `B${ri(1000, 9999)}`, expiry: soon ? dOff(ri(10, 80)) : dOff(ri(120, 300)), qty: low ? ri(5, 40) : ri(60, 300), purchase: +(mrp * 0.68).toFixed(2) },
        ...(low ? [] : [{ batch: `B${ri(1000, 9999)}`, expiry: dOff(ri(320, 700)), qty: ri(100, 500), purchase: +(mrp * 0.7).toFixed(2) }]),
      ],
    }
  })

  const services = rows('name,category,dept,rate', [
    ['OPD Consultation', 'Consultation', 'General Medicine', 500], ['Specialist Consultation', 'Consultation', 'Cardiology', 1000], ['Emergency Consultation', 'Consultation', 'Emergency', 1000], ['Follow-up Visit', 'Consultation', 'General Medicine', 300],
    ['ECG', 'Procedure', 'Cardiology', 400], ['2D Echo', 'Procedure', 'Cardiology', 2200], ['Dressing', 'Procedure', 'General Medicine', 300], ['Nebulization', 'Procedure', 'Pediatrics', 200], ['Minor Procedure', 'Procedure', 'Orthopedics', 2500], ['Plaster Application', 'Procedure', 'Orthopedics', 1800], ['Physiotherapy Session', 'Procedure', 'Orthopedics', 500],
    ['X-Ray Chest', 'Radiology', 'Radiology', 600], ['Ultrasound Abdomen', 'Radiology', 'Radiology', 1500], ['CT Brain', 'Radiology', 'Radiology', 4500], ['MRI Brain', 'Radiology', 'Radiology', 8000],
    ['CBC', 'Laboratory', 'Laboratory', 350], ['Liver Function Test', 'Laboratory', 'Laboratory', 700], ['Kidney Function Test', 'Laboratory', 'Laboratory', 650], ['Lipid Profile', 'Laboratory', 'Laboratory', 800],
    ['General Ward (per day)', 'Room', 'IPD', 1500], ['Private Room (per day)', 'Room', 'IPD', 6000], ['ICU (per day)', 'Room', 'IPD', 12000], ['Nursing Charges (per day)', 'Room', 'IPD', 500], ['Ambulance (local)', 'Other', 'Emergency', 1200], ['Medical Certificate', 'Other', 'General Medicine', 200],
  ], 'SRV')
  const packages = rows('name,includes,days,price,status', [
    ['Normal Delivery Package', 'Room 2 days, Delivery charges, Nursing, Medicines, Pediatrician visit', 2, 35000, 'Active'], ['C-Section Package', 'Room 4 days, OT, Surgeon, Anesthesia, Medicines', 4, 75000, 'Active'],
    ['Executive Health Checkup', 'CBC, LFT, KFT, Lipid, ECG, X-Ray, Physician consult', 1, 4999, 'Active'], ['Cardiac Checkup', 'ECG, 2D Echo, TMT, Lipid, Cardiologist consult', 1, 6500, 'Active'],
    ['Knee Replacement Package', 'Room 5 days, Implant, OT, Physiotherapy', 5, 185000, 'Active'], ['Cataract Surgery Package', 'Day care, IOL lens, Surgeon', 1, 28000, 'Active'],
  ], 'PKG')

  const MODES = ['Cash', 'Cash', 'Card', 'UPI', 'UPI', 'Insurance']
  const bills = Array.from({ length: 150 }, (_, i) => {
    const p = pick(patients), doc = pick(doctors), n = ri(1, 4), date = dOff(-Math.floor((i / 150) * 30))
    const items = Array.from({ length: n }, () => { const sv: any = pick(services); return { desc: sv.name, cat: sv.category, qty: sv.category === 'Room' ? ri(1, 4) : 1, rate: sv.rate, dept: sv.dept } })
    const subtotal = items.reduce((t, x) => t + x.qty * x.rate, 0), discount = rnd() < 0.2 ? Math.round(subtotal * 0.1) : 0, tax = Math.round((subtotal - discount) * 0.05), total = subtotal - discount + tax
    const r = rnd(), status = r < 0.74 ? 'Paid' : r < 0.86 ? 'Partial' : 'Unpaid', paid = status === 'Paid' ? total : status === 'Partial' ? Math.round(total * 0.4) : 0
    return { id: `INV-${pad(i + 1, 5)}`, date, patientId: p.id, patientName: p.name, type: items.some(x => x.cat === 'Room') ? 'IPD' : 'OPD', dept: doc.dept, doctorId: doc.id, items, subtotal, discount, tax, total, paid, payments: paid ? [{ mode: pick(MODES), amount: paid }] : [], status, by: 'Reception' }
  }).reverse().map((b, i) => ({ ...b, id: `INV-${pad(i + 1, 5)}` })).reverse()

  const labOrders = Array.from({ length: 22 }, (_, i) => {
    const p = i < 8 ? patients[100 + i] : pick(patients), t = pick(LAB_TESTS), doc = pick(doctors)
    const status = i < 5 ? 'Ordered' : i < 9 ? 'Collected' : i < 12 ? 'In-Process' : i < 15 ? 'Completed' : 'Approved'
    const done = i >= 12, results: any = {}
    if (done) t.params.forEach((pm, j) => { const span = pm.high - pm.low; results[pm.name] = String(+(pm.low + span * (rnd() * 1.3 - (j === 0 && i % 3 === 0 ? 0.5 : 0.1))).toFixed(1)) })
    return { id: `LAB-${pad(i + 1)}`, patientId: p.id, patientName: p.name, doctorId: doc.id, doctor: doc.name, test: t.code, priority: i % 7 === 0 ? 'STAT' : i % 4 === 0 ? 'Urgent' : 'Routine', status, orderedAt: iso(done ? -ri(0, 2) : 0, ri(8, 11)), collectedAt: i >= 5 ? iso(done ? -ri(0, 2) : 0, 11, 30) : undefined, completedAt: done ? iso(0, ri(12, 14)) : undefined, results: done ? results : undefined, approvedBy: status === 'Approved' ? 'Dr. P. Menon (Pathologist)' : undefined }
  })

  const radOrders = Array.from({ length: 12 }, (_, i) => { const p = pick(patients), doc = pick(doctors); return { id: `RAD-${pad(i + 1)}`, patientId: p.id, patientName: p.name, doctor: doc.name, study: IMAGING[i % IMAGING.length], modality: IMAGING[i % IMAGING.length].split(' ')[0], priority: i % 5 === 0 ? 'Urgent' : 'Routine', status: i < 4 ? 'Ordered' : i < 7 ? 'Scheduled' : i < 9 ? 'In-Progress' : 'Reported', date: dOff(i < 7 ? ri(0, 2) : -ri(0, 3)), time: `${pad(ri(9, 16), 2)}:00`, equipment: pick(['X-Ray Room 1', 'CT Scanner', 'MRI 1.5T', 'USG Room 2', 'ECG Room']), findings: i >= 9 ? 'No acute abnormality detected. Lung fields clear. Cardiac silhouette normal.' : '', impression: i >= 9 ? 'Normal study.' : '' } })

  const otBookings = Array.from({ length: 10 }, (_, i) => { const p = pick(patients); return { id: `OT-${pad(i + 1)}`, patientId: p.id, patientName: p.name, procedure: pick(['Laparoscopic Appendectomy', 'Total Knee Replacement', 'C-Section', 'Cataract Surgery', 'Hernia Repair', 'CABG', 'Tonsillectomy', 'ORIF Tibia']), surgeon: pick(doctors).name, anesthetist: pick(['Dr. K. Rao', 'Dr. S. Haider', 'Dr. N. Bose']), theatre: pick(['OT-1', 'OT-2', 'OT-3']), date: dOff(ri(-3, 4)), time: `${pad(ri(8, 15), 2)}:00`, duration: pick([60, 90, 120, 180]), anesthesia: pick(['General', 'Spinal', 'Local', 'Epidural']), status: i < 3 ? 'Completed' : i === 3 ? 'In Surgery' : 'Scheduled', preop: {}, equip: {}, intraNotes: '', postNotes: '', outcome: i < 3 ? 'Successful' : '' } })

  const emergency = rows('patientName,age,gender,triage,complaint,mode,mlc,status,doctor,bp,pulse,spo2,temp,gcs', [
    ['Unknown Male', 35, 'Male', 'Red', 'RTA – polytrauma, unconscious', 'Ambulance', true, 'Under Treatment', 'Dr. Vivek Singh', '90/60', 128, 88, 97.2, 8],
    ['Kavita Sharma', 62, 'Female', 'Red', 'Chest pain radiating to left arm', 'Walk-in', false, 'Under Treatment', 'Dr. Rajesh Kumar', '160/100', 110, 93, 98.4, 15],
    ['Bilal Hussain', 28, 'Male', 'Yellow', 'Fracture right forearm after fall', 'Walk-in', false, 'Waiting', 'Dr. Ali Raza', '124/80', 96, 98, 98.6, 15],
    ['Noor Fatima', 6, 'Female', 'Yellow', 'High grade fever with seizure', 'Ambulance', false, 'Under Treatment', 'Dr. Meena Iyer', '100/60', 132, 96, 103.4, 14],
    ['Rohan Gupta', 19, 'Male', 'Green', 'Minor laceration – left hand', 'Walk-in', false, 'Waiting', 'Dr. Vivek Singh', '118/76', 82, 99, 98.4, 15],
    ['Sunita Verma', 45, 'Female', 'Green', 'Acute gastritis, vomiting', 'Walk-in', false, 'Discharged', 'Dr. Vivek Singh', '110/70', 88, 98, 99.0, 15],
    ['Tariq Butt', 71, 'Male', 'Black', 'Brought dead – cardiac arrest', 'Ambulance', true, 'Deceased', 'Dr. Vivek Singh', '—', 0, 0, 0, 3],
  ], 'ER').map((e: any, i) => ({ ...e, arrival: new Date(Date.now() - (i + 1) * 38 * 6e4).toISOString(), mlcNo: e.mlc ? `MLC/${new Date().getFullYear()}/${pad(i + 41, 3)}` : '', notes: '' }))

  const employees = Array.from({ length: 28 }, (_, i) => {
    const g = i % 2 ? MALE : FEMALE, name = `${g[i % 20]} ${LAST[(i * 3) % 20]}`
    const [dept, designation, salary] = pick([['Nursing', 'Staff Nurse', 38000], ['Nursing', 'Head Nurse', 55000], ['Front Office', 'Receptionist', 28000], ['Pharmacy', 'Pharmacist', 42000], ['Laboratory', 'Lab Technician', 36000], ['Accounts', 'Accountant', 48000], ['Housekeeping', 'Supervisor', 26000], ['Administration', 'HR Executive', 45000], ['Radiology', 'Radiographer', 40000], ['Security', 'Guard', 22000]] as any[])
    return { id: `EMP-${pad(i + 1, 3)}`, name, dept, designation, salary, phone: `+92 3${ri(10, 49)} ${ri(1000000, 9999999)}`, email: `${name.toLowerCase().replace(' ', '.')}@medicore.org`, joinDate: dOff(-ri(100, 3000)), shift: pick(['Morning', 'Evening', 'Night']), status: i % 11 === 7 ? 'On Leave' : 'Active', qualification: pick(['B.Sc Nursing', 'GNM', 'B.Pharm', 'DMLT', 'B.Com', 'MBA', 'Graduate']), experience: ri(1, 18), leaveBalance: ri(4, 20) }
  })
  const attendance = employees.map((e: any, i) => ({ id: `ATT-${i + 1}`, employee: e.name, dept: e.dept, date: today(), in: i % 9 === 4 ? '' : `0${ri(7, 9)}:${pad(ri(0, 59), 2)}`, out: '', status: e.status === 'On Leave' ? 'On Leave' : i % 9 === 4 ? 'Absent' : i % 6 === 2 ? 'Late' : 'Present', source: 'Biometric' }))

  const E = employees.map((e: any) => e.name)
  const P = (i: number) => patients[i].name

  const db: any = {
    patients, doctors, beds, admissions, vitals, appointments, tokens, medicines, services, packages, bills, labOrders, radOrders, otBookings, emergency, employees, attendance,
    consultations: [], documents: [], referrals: rows('date,patient,from,to,reason,status', [[dOff(-2), P(3), 'Dr. Sarah Ahmed', 'Dr. Rajesh Kumar', 'Evaluation of chest pain', 'Completed'], [dOff(-1), P(8), 'Dr. Ali Raza', 'Dr. Anil Mehta', 'Nerve conduction study', 'Pending'], [today(), P(12), 'External – City Clinic', 'Dr. Meena Iyer', 'Pediatric review', 'Pending']], 'REF'),
    prescriptions: [0, 1, 2, 3].map(i => ({ id: `RX-${pad(i + 1)}`, patientId: patients[100 + i].id, patientName: patients[100 + i].name, doctor: doctors[i].name, date: today(), diagnosis: ['J06.9 Acute upper respiratory infection', 'I10 Essential hypertension', 'E11.9 Type 2 diabetes', 'K21.9 GERD'][i], status: i === 3 ? 'Dispensed' : 'Pending', items: [[{ drug: 'Azithral 500', dose: '1 tab', freq: 'OD (once daily)', duration: '3 days', instr: 'After food' }, { drug: 'Dolo 650', dose: '1 tab', freq: 'TDS (thrice daily)', duration: '3 days', instr: 'SOS fever' }], [{ drug: 'Amlong 5', dose: '1 tab', freq: 'OD (once daily)', duration: '30 days', instr: 'Morning' }, { drug: 'Ecosprin 75', dose: '1 tab', freq: 'OD (once daily)', duration: '30 days', instr: 'After lunch' }], [{ drug: 'Glycomet 500', dose: '1 tab', freq: 'BD (twice daily)', duration: '30 days', instr: 'With meals' }], [{ drug: 'Pan 40', dose: '1 tab', freq: 'OD (once daily)', duration: '14 days', instr: 'Before breakfast' }]][i] })),
    rxTemplates: [{ id: 'RT-1', name: 'URTI – Adult', items: [{ drug: 'Azithral 500', dose: '1 tab', freq: 'OD (once daily)', duration: '3 days', instr: 'After food' }, { drug: 'Cetzine 10', dose: '1 tab', freq: 'HS (at bedtime)', duration: '5 days', instr: '' }, { drug: 'Dolo 650', dose: '1 tab', freq: 'SOS (as needed)', duration: '3 days', instr: 'For fever' }] }, { id: 'RT-2', name: 'Hypertension starter', items: [{ drug: 'Telma 40', dose: '1 tab', freq: 'OD (once daily)', duration: '30 days', instr: 'Morning' }] }, { id: 'RT-3', name: 'Acid peptic disease', items: [{ drug: 'Pan 40', dose: '1 tab', freq: 'OD (once daily)', duration: '14 days', instr: 'Empty stomach' }] }],
    careNotes: admissions.slice(0, 12).flatMap((a: any, i) => [{ id: `CN-${i}a`, patientId: a.patientId, kind: 'nursing', at: iso(0, 7), by: 'Nurse Priya', text: 'Patient comfortable, slept well. Vitals stable. IV site clean.' }, { id: `CN-${i}b`, patientId: a.patientId, kind: 'rounds', at: iso(0, 9), by: a.doctor, text: 'Clinically improving. Continue current treatment. Review labs tomorrow.' }]),
    mar: admissions.flatMap((a: any, i) => [['Inj. Ceftriaxone 1g', 'IV', '08:00'], ['Tab. Pan 40', 'Oral', '08:00'], ['Tab. Dolo 650', 'Oral', '14:00'], ['Inj. Ceftriaxone 1g', 'IV', '20:00']].map(([drug, route, time], j) => ({ id: `MAR-${i}-${j}`, patientId: a.patientId, patientName: a.patientName, ward: a.ward, bedId: a.bedId, drug, route, time, date: today(), status: j === 0 ? 'Given' : 'Pending', by: j === 0 ? 'Nurse Priya' : '' }))),
    ivFluids: admissions.slice(0, 8).map((a: any, i) => ({ id: `IV-${i}`, patientId: a.patientId, fluid: pick(['Normal Saline 500ml', 'Ringer Lactate 500ml', 'DNS 500ml']), rate: `${pick([60, 80, 100, 125])} ml/hr`, start: iso(0, 6), volume: 500, infused: ri(100, 450), status: 'Running' })),
    pharmacySales: Array.from({ length: 24 }, (_, i) => { const m: any = pick(medicines), qty = ri(5, 20), sub = +(qty * m.mrp).toFixed(2), tax = +(sub * m.tax / 100).toFixed(2); return { id: `PH-${pad(i + 1, 5)}`, date: dOff(-Math.floor(i / 4)), patientName: pick(patients).name, items: [{ name: m.name, batch: m.batches[0].batch, qty, mrp: m.mrp, disc: 0, tax: m.tax }], subtotal: sub, discount: 0, tax, total: +(sub + tax).toFixed(2), payments: [{ mode: pick(MODES), amount: +(sub + tax).toFixed(2) }], by: 'Pharmacist' } }),
    pharmacyReturns: rows('date,saleId,item,qty,amount,type,reason', [[dOff(-1), 'PH-00007', 'Augmentin 625', 4, 88, 'Return', 'Doctor changed prescription'], [dOff(-3), 'PH-00012', 'Asthalin Inhaler', 1, 145, 'Exchange', 'Damaged packaging']], 'RET'),
    controlledLog: rows('date,medicine,qty,patient,doctor,rxNo,by', [[dOff(-1), 'Tramazac 50', 10, P(30), 'Dr. Ali Raza', 'RX-0921', 'Pharmacist'], [dOff(-2), 'Morphine 10mg Inj', 2, P(22), 'Dr. Vivek Singh', 'RX-0902', 'Pharmacist'], [dOff(-4), 'Alprax 0.5', 15, P(45), 'Dr. Anil Mehta', 'RX-0877', 'Pharmacist']], 'CS'),
    suppliers: rows('name,contact,phone,email,gst,terms,rating,status', [['MedSupply Distributors', 'Asif Iqbal', '+92 51 2345678', 'sales@medsupply.com', '07AABCM1234F1Z5', '30 days', 4.5, 'Active'], ['Apex Pharma Wholesale', 'R. Krishnan', '+92 51 8765432', 'orders@apexpharma.com', '07AAECA5678G1Z2', '45 days', 4.2, 'Active'], ['HealthLine Surgicals', 'Sana Mirza', '+92 42 3344556', 'info@healthline.com', '07AADCH9012H1Z9', '15 days', 3.9, 'Active'], ['Global Med Equip', 'J. Fernandes', '+92 21 9988776', 'support@globalmed.com', '27AAGCG3456J1Z1', '60 days', 4.7, 'Active']], 'SUP'),
    purchaseOrders: rows('date,supplier,items,amount,expected,status', [[dOff(-6), 'MedSupply Distributors', 'Dolo 650 ×2000, Pan 40 ×1000', 14500, dOff(-1), 'Received'], [dOff(-2), 'Apex Pharma Wholesale', 'Augmentin 625 ×500, Azithral 500 ×400', 19800, dOff(3), 'Ordered'], [today(), 'MedSupply Distributors', 'Brufen 400 ×1000', 2700, dOff(5), 'Draft']], 'PO'),
    stockAdjustments: rows('date,medicine,batch,type,qty,reason,by', [[dOff(-3), 'Calpol Syrup 60ml', 'B2231', 'Write-off', -6, 'Breakage', 'Pharmacist'], [dOff(-8), 'Betadine 100ml', 'B7781', 'Write-off', -12, 'Expired', 'Pharmacist'], [dOff(-1), 'Zincovit', 'B5510', 'Adjustment', 20, 'Physical count correction', 'Admin']], 'ADJ'),
    stockTransfers: rows('date,item,qty,from,to,status,by', [[dOff(-1), 'Normal Saline 500ml', 40, 'Main Pharmacy', 'ICU', 'Issued', 'Pharmacist'], [today(), 'Morphine 10mg Inj', 5, 'Main Pharmacy', 'OT Store', 'Pending', 'Pharmacist'], [dOff(-2), 'Dolo 650', 200, 'Main Pharmacy', 'Emergency', 'Issued', 'Pharmacist']], 'TRF'),
    preauths: rows('date,patient,provider,policy,procedure,estimate,approved,status,tpa', [[dOff(-3), P(21), 'Star Health', 'POL448120', 'Laparoscopic Appendectomy', 85000, 80000, 'Approved', 'MediAssist'], [dOff(-1), P(24), 'HDFC Ergo', 'POL771203', 'CABG', 420000, 0, 'Under Review', 'Paramount'], [today(), P(27), 'ICICI Lombard', 'POL119823', 'Total Knee Replacement', 210000, 0, 'Submitted', 'Vidal'], [dOff(-5), P(31), 'Niva Bupa', 'POL668120', 'Dengue management', 60000, 45000, 'Partial Approval', 'MediAssist'], [dOff(-7), P(33), 'State Life', 'POL220192', 'Cataract surgery', 30000, 0, 'Rejected', 'In-house']], 'PA'),
    claims: rows('date,patient,provider,billNo,claimed,approved,copay,settled,status', [[dOff(-20), P(40), 'Star Health', 'INV-00021', 92000, 88000, 4000, 88000, 'Settled'], [dOff(-12), P(41), 'HDFC Ergo', 'INV-00044', 145000, 120000, 25000, 0, 'Approved'], [dOff(-8), P(42), 'ICICI Lombard', 'INV-00067', 56000, 0, 0, 0, 'Submitted'], [dOff(-5), P(43), 'Niva Bupa', 'INV-00081', 73000, 50000, 23000, 0, 'Partial Approval'], [dOff(-30), P(44), 'Jubilee Health', 'INV-00009', 38000, 0, 0, 0, 'Rejected'], [dOff(-3), P(46), 'Star Health', 'INV-00102', 210000, 0, 0, 0, 'Queried']], 'CLM').map((c: any) => ({ ...c, docs: {} })),
    advances: admissions.slice(0, 10).map((a: any, i) => ({ id: `ADV-${pad(i + 1)}`, date: a.admitDate, patientId: a.patientId, patient: a.patientName, amount: a.advance, used: 0, mode: pick(['Cash', 'Card', 'UPI']), status: 'Available' })),
    refunds: rows('date,patient,billNo,amount,mode,reason,approvedBy,status', [[dOff(-2), P(50), 'INV-00098', 1500, 'Cash', 'Test cancelled by doctor', 'Admin', 'Processed'], [dOff(-6), P(51), 'INV-00071', 5000, 'Card', 'Excess advance refund', 'Accounts Head', 'Processed'], [today(), P(52), 'INV-00140', 800, 'UPI', 'Duplicate payment', '', 'Pending']], 'RF'),
    creditNotes: rows('date,patient,billNo,amount,reason', [[dOff(-4), P(55), 'INV-00090', 1200, 'Service not rendered']], 'CN'),
    cashDrawer: rows('date,counter,cashier,opening,collected,payouts,closing,status', [[today(), 'Counter 1', 'Reception', 5000, 0, 0, 0, 'Open'], [dOff(-1), 'Counter 1', 'Reception', 5000, 48200, 1500, 51700, 'Closed'], [dOff(-2), 'Counter 1', 'Reception', 5000, 39850, 0, 44850, 'Closed']], 'CD'),
    items: rows('name,category,subCategory,unit,stock,reorder,rate,location', [['Surgical Gloves (Box 100)', 'Medical Supplies', 'Consumables', 'Box', 140, 50, 320, 'Store A1'], ['Syringe 5ml', 'Medical Supplies', 'Consumables', 'Pcs', 2400, 1000, 4, 'Store A2'], ['IV Cannula 20G', 'Medical Supplies', 'Consumables', 'Pcs', 380, 400, 28, 'Store A2'], ['N95 Mask', 'Medical Supplies', 'PPE', 'Pcs', 620, 300, 35, 'Store A3'], ['Suture Vicryl 2-0', 'Surgical Items', 'Sutures', 'Pcs', 85, 100, 240, 'OT Store'], ['Surgical Blade #15', 'Surgical Items', 'Instruments', 'Pcs', 300, 100, 12, 'OT Store'], ['Gauze Roll', 'Medical Supplies', 'Dressing', 'Roll', 190, 80, 45, 'Store A1'], ['Bed Sheet', 'General Supplies', 'Linen', 'Pcs', 260, 100, 380, 'Linen Room'], ['A4 Paper Ream', 'General Supplies', 'Stationery', 'Ream', 22, 30, 290, 'Admin Store'], ['Hand Sanitizer 500ml', 'General Supplies', 'Hygiene', 'Bottle', 96, 60, 150, 'Store A3'], ['ECG Electrodes', 'Medical Supplies', 'Consumables', 'Pack', 45, 50, 180, 'Store A2'], ['Oxygen Mask Adult', 'Medical Supplies', 'Respiratory', 'Pcs', 130, 60, 85, 'Store A3']], 'ITM'),
    itemCategories: rows('category,subCategory,items,status', [['Medical Supplies', 'Consumables', 4, 'Active'], ['Medical Supplies', 'PPE', 1, 'Active'], ['Medical Supplies', 'Dressing', 1, 'Active'], ['Medical Supplies', 'Respiratory', 1, 'Active'], ['Surgical Items', 'Sutures', 1, 'Active'], ['Surgical Items', 'Instruments', 1, 'Active'], ['General Supplies', 'Linen', 1, 'Active'], ['General Supplies', 'Stationery', 1, 'Active'], ['General Supplies', 'Hygiene', 1, 'Active']], 'CAT'),
    requisitions: rows('date,dept,item,qty,requestedBy,priority,status', [[today(), 'ICU', 'IV Cannula 20G', 500, 'Head Nurse ICU', 'Urgent', 'Pending'], [dOff(-1), 'OT', 'Suture Vicryl 2-0', 200, 'OT In-charge', 'Routine', 'Approved'], [dOff(-3), 'Admin', 'A4 Paper Ream', 50, 'Admin Officer', 'Routine', 'PO Raised'], [dOff(-6), 'Emergency', 'ECG Electrodes', 100, 'ER Nurse', 'Urgent', 'Received']], 'PR'),
    invPOs: rows('date,prNo,vendor,item,qty,amount,status', [[dOff(-2), 'PR-003', 'HealthLine Surgicals', 'A4 Paper Ream', 50, 14500, 'Ordered'], [dOff(-5), 'PR-004', 'MedSupply Distributors', 'ECG Electrodes', 100, 18000, 'Received']], 'IPO'),
    grn: rows('date,poNo,vendor,item,qty,invoiceNo,receivedBy,status', [[dOff(-4), 'IPO-002', 'MedSupply Distributors', 'ECG Electrodes', 100, 'MS/2291', 'Store Keeper', 'Received']], 'GRN'),
    issues: rows('date,item,qty,dept,issuedTo,issuedBy', [[today(), 'Surgical Gloves (Box 100)', 10, 'ICU', 'Head Nurse ICU', 'Store Keeper'], [dOff(-1), 'Syringe 5ml', 300, 'Emergency', 'ER Nurse', 'Store Keeper'], [dOff(-1), 'N95 Mask', 50, 'Isolation', 'Ward Sister', 'Store Keeper'], [dOff(-2), 'Bed Sheet', 30, 'General Ward A', 'Housekeeping', 'Store Keeper']], 'ISS'),
    assets: rows('name,category,serial,location,purchaseDate,cost,life,status', [['Ventilator – Dräger Evita', 'Critical Care', 'DRG-EV-88213', 'ICU', dOff(-900), 1450000, 10, 'Operational'], ['MRI 1.5T – Siemens', 'Imaging', 'SIE-MR-10022', 'Radiology', dOff(-1500), 42000000, 12, 'Operational'], ['CT Scanner 64 Slice', 'Imaging', 'GE-CT-55311', 'Radiology', dOff(-1100), 18500000, 10, 'Operational'], ['Defibrillator', 'Emergency', 'PHL-DF-7781', 'Emergency', dOff(-600), 320000, 8, 'Operational'], ['Patient Monitor', 'Critical Care', 'MND-PM-3320', 'ICU', dOff(-400), 185000, 7, 'Under Maintenance'], ['Autoclave', 'Sterilization', 'TUT-AC-1190', 'CSSD', dOff(-2000), 540000, 10, 'Operational'], ['Ultrasound – Voluson', 'Imaging', 'GE-US-4471', 'Radiology', dOff(-750), 2800000, 8, 'Operational'], ['Anesthesia Workstation', 'OT', 'DRG-AN-2218', 'OT-1', dOff(-1300), 1650000, 10, 'Operational']], 'AST'),
    amc: rows('asset,vendor,start,end,cost,lastService,nextService,status', [['MRI 1.5T – Siemens', 'Siemens Healthineers', dOff(-200), dOff(165), 1800000, dOff(-40), dOff(50), 'Active'], ['CT Scanner 64 Slice', 'GE Healthcare', dOff(-340), dOff(25), 950000, dOff(-70), dOff(20), 'Due'], ['Ventilator – Dräger Evita', 'Global Med Equip', dOff(-100), dOff(265), 120000, dOff(-10), dOff(80), 'Active'], ['Autoclave', 'Global Med Equip', dOff(-400), dOff(-35), 45000, dOff(-120), dOff(-30), 'Expired']], 'AMC'),
    leaves: rows('employee,type,from,to,days,reason,status', [[E[2], 'Casual', dOff(2), dOff(3), 2, 'Family function', 'Pending'], [E[5], 'Sick', dOff(-1), dOff(1), 3, 'Viral fever', 'Approved'], [E[9], 'Earned', dOff(10), dOff(17), 8, 'Vacation', 'Pending'], [E[12], 'Casual', dOff(-6), dOff(-6), 1, 'Personal work', 'Rejected']], 'LV'),
    payroll: employees.map((e: any, i) => ({ id: `PAY-${pad(i + 1, 3)}`, employee: e.name, dept: e.dept, month: new Date().toLocaleString('en', { month: 'short', year: 'numeric' }), basic: e.salary, allowances: Math.round(e.salary * 0.25), deductions: Math.round(e.salary * 0.12), net: Math.round(e.salary * 1.13), status: i < 20 ? 'Processed' : 'Pending' })),
    trainings: rows('title,trainer,date,dept,attendees,status', [['BLS / ACLS Certification', 'Dr. Vivek Singh', dOff(6), 'Nursing', 18, 'Scheduled'], ['Fire Safety Drill', 'Safety Officer', dOff(-12), 'All', 64, 'Completed'], ['Infection Control Practices', 'ICN Team', dOff(-30), 'Nursing', 32, 'Completed'], ['HMS Software Orientation', 'IT Team', dOff(2), 'Front Office', 9, 'Scheduled']], 'TRN'),
    appraisals: rows('employee,period,reviewer,score,rating,remarks,status', [[E[0], 'H1', 'Nursing Supt.', 4.5, 'Excellent', 'Consistent performer', 'Completed'], [E[3], 'H1', 'Chief Pharmacist', 3.8, 'Good', 'Improve documentation', 'Completed'], [E[6], 'H1', 'Lab Head', 0, '', '', 'Pending'], [E[8], 'H1', 'Admin Head', 4.1, 'Very Good', '', 'Completed']], 'APR'),
    designations: rows('dept,designation,grade,headcount', [['Nursing', 'Staff Nurse', 'N2', 42], ['Nursing', 'Head Nurse', 'N4', 6], ['Pharmacy', 'Pharmacist', 'P2', 8], ['Laboratory', 'Lab Technician', 'L2', 10], ['Front Office', 'Receptionist', 'F1', 9], ['Accounts', 'Accountant', 'A2', 5], ['Housekeeping', 'Supervisor', 'H2', 4]], 'DSG'),
    doctorLeaves: rows('doctor,from,to,reason,status', [['Dr. Hira Malik', dOff(-1), dOff(3), 'Conference', 'Approved'], ['Dr. Anil Mehta', dOff(9), dOff(10), 'Personal', 'Pending']], 'DL'),
    donors: rows('name,age,gender,blood,phone,lastDonation,donations,status', [['Kamran Ali', 29, 'Male', 'O+', '+92 300 1112233', dOff(-120), 6, 'Eligible'], ['Sneha Joshi', 34, 'Female', 'A+', '+92 301 4445566', dOff(-40), 3, 'Deferred'], ['Waqas Sheikh', 41, 'Male', 'B-', '+92 333 7788990', dOff(-200), 11, 'Eligible'], ['Ritu Verma', 26, 'Female', 'AB+', '+92 345 2233445', dOff(-95), 2, 'Eligible'], ['Farhan Butt', 37, 'Male', 'O-', '+92 321 6677889', dOff(-15), 8, 'Deferred']], 'DNR'),
    bloodStock: BLOOD.map((g, i) => ({ id: `BS-${i}`, group: g, whole: [14, 3, 11, 2, 6, 1, 18, 4][i], prbc: [9, 2, 8, 1, 4, 0, 12, 3][i], ffp: [7, 2, 5, 2, 3, 1, 9, 2][i], platelets: [5, 0, 4, 1, 2, 0, 6, 1][i], expiring: [2, 0, 1, 0, 1, 0, 3, 1][i] })),
    bloodRequests: rows('date,patient,blood,component,units,ward,doctor,priority,status', [[today(), P(21), 'O-', 'PRBC', 2, 'ICU', 'Dr. Vivek Singh', 'Emergency', 'Pending'], [today(), P(24), 'A+', 'Whole Blood', 1, 'General Ward A', 'Dr. Sarah Ahmed', 'Routine', 'Cross-matched'], [dOff(-1), P(26), 'B+', 'Platelets', 4, 'ICU', 'Dr. Rajesh Kumar', 'Urgent', 'Issued'], [dOff(-2), P(28), 'AB+', 'FFP', 2, 'OT-1', 'Dr. Ali Raza', 'Routine', 'Issued']], 'BR'),
    crossmatch: rows('date,requestNo,patient,bagNo,blood,result,technician', [[today(), 'BR-002', P(24), 'BAG-A-2291', 'A+', 'Compatible', 'Lab Tech'], [dOff(-1), 'BR-003', P(26), 'BAG-B-1187', 'B+', 'Compatible', 'Lab Tech'], [dOff(-1), 'BR-003', P(26), 'BAG-B-1190', 'B+', 'Incompatible', 'Lab Tech']], 'XM'),
    bloodIssues: rows('date,requestNo,patient,bagNo,blood,component,issuedTo,issuedBy', [[dOff(-1), 'BR-003', P(26), 'BAG-B-1187', 'B+', 'Platelets', 'Nurse ICU', 'Lab Tech'], [dOff(-2), 'BR-004', P(28), 'BAG-AB-0331', 'AB+', 'FFP', 'OT Nurse', 'Lab Tech']], 'BI'),
    bloodBags: rows('bagNo,blood,component,collected,expiry,donor,status', [['BAG-O-4410', 'O+', 'Whole Blood', dOff(-30), dOff(5), 'Kamran Ali', 'Available'], ['BAG-A-2291', 'A+', 'Whole Blood', dOff(-12), dOff(23), 'Sneha Joshi', 'Reserved'], ['BAG-B-1201', 'B-', 'PRBC', dOff(-38), dOff(4), 'Waqas Sheikh', 'Available'], ['BAG-P-0098', 'O-', 'Platelets', dOff(-4), dOff(1), 'Farhan Butt', 'Available'], ['BAG-AB-0340', 'AB+', 'FFP', dOff(-100), dOff(265), 'Ritu Verma', 'Available'], ['BAG-O-4388', 'O+', 'Whole Blood', dOff(-37), dOff(-2), 'Kamran Ali', 'Expired']], 'BAG'),
    dietPlans: rows('name,calories,breakfast,lunch,dinner,notes', [['Normal', 2200, 'Paratha/Idli, egg, tea', 'Roti, dal, sabzi, rice, salad', 'Roti, chicken/paneer curry, rice', 'Balanced regular diet'], ['Diabetic', 1600, 'Oats, boiled egg, sugar-free tea', 'Multigrain roti, dal, salad', 'Roti, grilled chicken, vegetables', 'No sugar, low GI, small frequent meals'], ['Liquid', 1000, 'Clear soup, juice', 'Dal water, coconut water', 'Vegetable broth, milk', 'Clear & full liquids only'], ['Soft', 1800, 'Porridge, banana', 'Khichdi, curd', 'Soft rice, dal, custard', 'Easy to chew and digest'], ['NPO', 0, '—', '—', '—', 'Nil per oral – IV fluids only'], ['Renal', 1700, 'Bread, egg white', 'Rice, low-potassium veg', 'Roti, lauki sabzi', 'Low salt, protein and potassium restricted']], 'DP'),
    dietOrders: admissions.slice(0, 16).map((a: any, i) => ({ id: `DO-${pad(i + 1)}`, date: today(), patient: a.patientName, patientId: a.patientId, ward: a.ward, bed: a.bedId, plan: pick(['Normal', 'Normal', 'Diabetic', 'Soft', 'Liquid', 'NPO']), meal: pick(['Breakfast', 'Lunch', 'Dinner']), instructions: pick(['', '', 'No salt', 'Allergic to nuts', 'Extra protein']), status: pick(['Pending', 'Preparing', 'Delivered']) })),
    kitchenStock: rows('item,unit,stock,reorder,supplier', [['Rice (Basmati)', 'kg', 180, 50, 'City Grocers'], ['Wheat Flour', 'kg', 120, 60, 'City Grocers'], ['Lentils (Dal)', 'kg', 38, 40, 'City Grocers'], ['Milk', 'L', 60, 40, 'Daily Dairy'], ['Eggs', 'dozen', 22, 15, 'Daily Dairy'], ['Cooking Oil', 'L', 44, 20, 'City Grocers'], ['Chicken', 'kg', 12, 15, 'Fresh Meats']], 'KS'),
    mealTimings: rows('meal,time,cutoff,wards', [['Bed Tea', '06:30', '06:00', 'All'], ['Breakfast', '08:00', '07:00', 'All'], ['Mid-morning', '10:30', '10:00', 'Diabetic / Pediatric'], ['Lunch', '13:00', '11:30', 'All'], ['Evening Tea', '16:30', '16:00', 'All'], ['Dinner', '20:00', '18:30', 'All']], 'MT'),
    hkTasks: rows('date,area,task,assignedTo,shift,priority,status', [[today(), 'General Ward A', 'Routine cleaning & mopping', E[6], 'Morning', 'Routine', 'Completed'], [today(), 'ICU', 'Terminal disinfection – Bed 3', E[13], 'Morning', 'Urgent', 'In-Progress'], [today(), 'PR-04', 'Discharge room preparation', E[6], 'Morning', 'Urgent', 'Pending'], [today(), 'OT-2', 'Post-surgery fumigation', E[20], 'Evening', 'Urgent', 'Pending'], [today(), 'OPD Lobby', 'Floor polishing', E[13], 'Night', 'Routine', 'Pending'], [dOff(-1), 'Emergency', 'Deep cleaning', E[20], 'Night', 'Routine', 'Inspected']], 'HK'),
    laundry: rows('date,ward,item,sent,received,status', [[today(), 'General Ward A', 'Bed sheets', 40, 0, 'Sent'], [today(), 'ICU', 'Patient gowns', 22, 0, 'Sent'], [dOff(-1), 'OT', 'Surgical drapes', 35, 35, 'Received'], [dOff(-1), 'Private Rooms', 'Blankets', 12, 11, 'Partial']], 'LD'),
    waste: rows('date,area,category,bag,weight,collectedBy,disposal', [[today(), 'OT', 'Biomedical – Infectious', 'Yellow', 12.5, 'BioClean Pvt.', 'Incineration'], [today(), 'Laboratory', 'Biomedical – Sharps', 'White', 3.2, 'BioClean Pvt.', 'Autoclave + Shred'], [today(), 'Wards', 'Biomedical – Plastic', 'Red', 18.4, 'BioClean Pvt.', 'Autoclave + Recycle'], [today(), 'Kitchen', 'General', 'Black', 42, 'Municipal', 'Landfill'], [dOff(-1), 'Pharmacy', 'Biomedical – Glass', 'Blue', 6.8, 'BioClean Pvt.', 'Disinfection']], 'WM'),
    ambulances: rows('vehicle,type,driver,phone,status,x,y,fuel,lastService,nextService', [['ISB-1122', 'ALS (ICU on wheels)', 'Naveed Akhtar', '+92 300 9001122', 'Available', 48, 52, 78, dOff(-20), dOff(70)], ['ISB-3344', 'BLS', 'Ramesh Yadav', '+92 300 9003344', 'On Trip', 22, 30, 55, dOff(-45), dOff(45)], ['ISB-5566', 'BLS', 'Shahid Mehmood', '+92 300 9005566', 'On Trip', 72, 68, 34, dOff(-80), dOff(10)], ['ISB-7788', 'Patient Transport', 'Gurpreet Singh', '+92 300 9007788', 'Maintenance', 50, 50, 90, dOff(-2), dOff(88)]], 'AMB'),
    trips: rows('date,vehicle,driver,patient,pickup,destination,km,charge,status', [[today(), 'ISB-3344', 'Ramesh Yadav', P(60), 'G-9 Markaz', 'MediCore Hospital', 12, 1200, 'In Transit'], [today(), 'ISB-5566', 'Shahid Mehmood', P(61), 'MediCore Hospital', 'PIMS', 9, 1000, 'In Transit'], [dOff(-1), 'ISB-1122', 'Naveed Akhtar', P(62), 'Bahria Town', 'MediCore Hospital', 28, 2800, 'Completed'], [dOff(-1), 'ISB-3344', 'Ramesh Yadav', P(63), 'F-10', 'MediCore Hospital', 7, 1000, 'Completed'], [dOff(-2), 'ISB-7788', 'Gurpreet Singh', P(64), 'MediCore Hospital', 'Residence – E-11', 14, 1400, 'Completed']], 'TRP').map((t: any) => ({ ...t, billed: t.status === 'Completed' })),
    ambMaint: rows('date,vehicle,type,cost,vendor,nextDue,status', [[dOff(-2), 'ISB-7788', 'Engine overhaul', 28000, 'City Motors', dOff(88), 'In-Progress'], [dOff(-20), 'ISB-1122', 'Routine service', 6500, 'City Motors', dOff(70), 'Completed'], [dOff(10), 'ISB-5566', 'Routine service', 6500, 'City Motors', dOff(100), 'Scheduled']], 'AMT'),
    fuel: rows('date,vehicle,litres,cost,odometer,filledBy', [[today(), 'ISB-3344', 35, 9450, 48210, 'Ramesh Yadav'], [dOff(-1), 'ISB-1122', 42, 11340, 61020, 'Naveed Akhtar'], [dOff(-3), 'ISB-5566', 30, 8100, 39880, 'Shahid Mehmood']], 'FL'),
    notifications: rows('title,body,type,link', [['Critical lab result', `${labOrders[13].patientName}: Potassium 6.8 mEq/L (critical high)`, 'critical', '/laboratory'], ['Emergency admission', 'RTA polytrauma patient admitted to ER – Triage RED', 'emergency', '/emergency'], ['Low stock alert', 'Brufen 400 is below reorder level', 'stock', '/pharmacy/inventory'], ['Discharge ready', `${admissions[0]?.patientName} is cleared for discharge`, 'discharge', '/ipd/discharge'], ['Payment overdue', '18 bills outstanding for more than 15 days', 'payment', '/billing/bills'], ['Appointment reminder', 'Dr. Rajesh Kumar has 6 appointments today', 'appointment', '/opd/appointments'], ['Bed availability', 'ICU-04 is now available', 'bed', '/ipd/beds']], 'NT').map((n: any, i) => ({ ...n, at: new Date(Date.now() - i * 17 * 6e4).toISOString(), read: i > 3 })),
    messages: rows('from,to,text', [['Dr. Sarah Ahmed', 'Nursing Station A', 'Please repeat vitals for bed GA-03 at 2 PM.'], ['Nursing Station A', 'Dr. Sarah Ahmed', 'Noted doctor. BP was 130/84 at noon.'], ['Pharmacy', 'ICU', 'Morphine stock transferred. Please acknowledge.'], ['Lab', 'Dr. Rajesh Kumar', 'Troponin-I for bed ICU-02 is positive. Report uploaded.'], ['Admin', 'All Staff', 'Fire drill at 4 PM today – Block B.']], 'MSG').map((m: any, i) => ({ ...m, at: new Date(Date.now() - (5 - i) * 23 * 6e4).toISOString() })),
    announcements: rows('title,body,by,date,priority', [['NABH Audit next week', 'All departments to keep documentation and checklists updated before Monday.', 'Medical Superintendent', today(), 'High'], ['Free Diabetes Screening Camp', 'Sunday 9 AM – 1 PM at OPD Block. Volunteers may register with HR.', 'Admin', dOff(-1), 'Normal'], ['New HMS go-live', 'MediCore HMS is now live for all departments. Contact IT helpdesk (ext. 111) for support.', 'IT', dOff(-3), 'Normal']], 'ANN'),
    commsLog: rows('at,channel,to,template,status', [[iso(0, 9, 5), 'SMS', P(100), 'Appointment reminder', 'Delivered'], [iso(0, 9, 40), 'WhatsApp', P(101), 'Lab report ready', 'Delivered'], [iso(0, 10, 12), 'Email', P(102), 'Invoice copy', 'Sent'], [iso(-1, 16, 30), 'SMS', P(103), 'Payment due reminder', 'Failed'], [iso(-1, 11, 0), 'WhatsApp', P(104), 'Discharge summary', 'Delivered']], 'CM'),
    msgTemplates: rows('name,channel,body', [['Appointment reminder', 'SMS', 'Dear {name}, your appointment with {doctor} is on {date} at {time}. – MediCore'], ['Lab report ready', 'WhatsApp', 'Hello {name}, your lab report is ready. Download: {link}'], ['Payment due reminder', 'SMS', 'Dear {name}, an amount of {amount} is due against bill {bill}.'], ['Invoice copy', 'Email', 'Dear {name}, please find attached your invoice {bill}.']], 'TPL'),
    users: ROLES.map((r, i) => ({ id: `USR-${pad(i + 1, 3)}`, username: r.username, name: ['Admin User', 'Dr. Sarah Ahmed', 'Nurse Priya Nair', 'Reception Desk', 'Pharmacist Omar', 'Lab Tech Divya', 'Accounts Mehta', 'HR Manager Sana'][i], role: r.id, email: `${r.username}@medicore.org`, phone: `+92 300 00000${i}${i}`, status: 'Active', lastLogin: iso(0, 8, i * 3), doctorId: r.id === 'doctor' ? 'DOC-001' : undefined })),
    audit: rows('user,action,module,ref,ip', [['Reception Desk', 'Create', 'patients', 'PT-000006', '192.168.1.21'], ['Dr. Sarah Ahmed', 'Create', 'prescriptions', 'RX-0004', '192.168.1.34'], ['Pharmacist Omar', 'Create', 'pharmacySales', 'PH-00024', '192.168.1.40'], ['Accounts Mehta', 'Update', 'bills', 'INV-00148', '192.168.1.52'], ['Admin User', 'Update', 'settings', 'tax', '192.168.1.10'], ['Nurse Priya Nair', 'Update', 'mar', 'MAR-2-0', '192.168.1.61'], ['Lab Tech Divya', 'Update', 'labOrders', 'LAB-0016', '192.168.1.45']], 'AUD').map((a: any, i) => ({ ...a, at: new Date(Date.now() - (i + 1) * 11 * 6e4).toISOString() })),
    branches: rows('name,code,city,address,phone,beds,status', [['MediCore Main Hospital', 'MAIN', 'Islamabad', 'Plot 12, Sector G-8/3', '+92 51 111 633 426', 58, 'Active'], ['MediCore City Clinic', 'CITY', 'Rawalpindi', 'Saddar Road', '+92 51 222 1100', 12, 'Active'], ['MediCore Diagnostics', 'DIAG', 'Lahore', 'Gulberg III', '+92 42 333 2200', 0, 'Active']], 'BR'),
    deptMaster: DEPARTMENTS.map((d, i) => ({ id: `DEP-${pad(i + 1, 3)}`, name: d, head: doctors[i]?.name, type: 'Clinical', ext: 200 + i, status: 'Active' })),
    taxes: rows('name,rate,appliesTo,status', [['GST 5%', 5, 'Services, IV Fluids', 'Active'], ['GST 12%', 12, 'Medicines', 'Active'], ['GST 18%', 18, 'Cosmetic, Supplements', 'Active'], ['Exempt', 0, 'Healthcare services (clinical)', 'Active']], 'TAX'),
    integrations: rows('name,type,endpoint,status', [['Roche Cobas c311', 'Lab equipment (HL7)', 'tcp://10.0.4.21:5000', 'Active'], ['Razorpay / Stripe', 'Payment gateway', 'https://api.gateway.com', 'Active'], ['Twilio SMS', 'SMS gateway', 'https://api.twilio.com', 'Active'], ['SMTP Mail', 'Email', 'smtp.medicore.org:587', 'Active'], ['WhatsApp Business', 'Messaging', 'https://graph.facebook.com', 'Inactive'], ['ZKTeco Biometric', 'Attendance', 'tcp://10.0.2.5:4370', 'Active'], ['PACS / DICOM', 'Imaging', 'dicom://10.0.6.10:104', 'Active']], 'INT'),
    scheduledReports: rows('report,frequency,time,recipients,format,status', [['Daily Collection Report', 'Daily', '21:00', 'cfo@medicore.org', 'PDF', 'Active'], ['Bed Occupancy MIS', 'Weekly', '08:00', 'ms@medicore.org', 'Excel', 'Active'], ['Monthly P&L', 'Monthly', '09:00', 'board@medicore.org', 'PDF', 'Active']], 'SR'),
    feedback: rows('date,patient,rating,category,comment', [[dOff(-1), P(70), 5, 'Doctors', 'Very caring staff and quick service.'], [dOff(-3), P(71), 3, 'Billing', 'Billing counter wait time was long.']], 'FB'),
    radTemplates: rows('name,modality,findings,impression', [['Normal chest PA', 'X-Ray', 'Lung fields are clear. No focal consolidation, effusion or pneumothorax. Cardiac silhouette and mediastinum are normal. Bony thorax intact.', 'Normal chest radiograph.'], ['Normal CT brain', 'CT', 'No acute intracranial haemorrhage, mass effect or midline shift. Ventricles and sulci are age appropriate. Grey-white differentiation preserved.', 'No acute intracranial abnormality.'], ['Normal USG abdomen', 'Ultrasound', 'Liver normal in size and echotexture. Gall bladder, pancreas, spleen and both kidneys are unremarkable. No free fluid.', 'Normal abdominal ultrasound.'], ['Normal ECG', 'ECG', 'Sinus rhythm. Normal axis. PR, QRS and QT intervals within normal limits. No ST-T changes.', 'Normal ECG.']], 'RTP'),
    shifts: {} as Record<string, string>,
    permissions: Object.fromEntries(ROLES.map(r => [r.id, {}])),
    settings: {
      hospital: { name: 'MediCore Multispeciality Hospital', tagline: 'Compassion. Care. Cure.', address: 'Plot 12, Sector G-8/3, Islamabad', phone: '+92 51 111 633 426', email: 'info@medicore.org', license: 'HCE/ISB/2019/0421', gst: '07AABCM1234F1Z5', nabh: 'H-2022-1187' },
      currency: '₹', dateFormat: 'dd MMM yyyy', language: 'en', taxRate: 5, discountThreshold: 10, sessionTimeout: 15,
      numbering: { patient: { prefix: 'PT-', next: 241, pad: 6 }, bill: { prefix: 'INV-', next: 151, pad: 5 }, token: { prefix: 'T-', next: 17, pad: 3 }, admission: { prefix: 'ADM-', next: admissions.length + 1, pad: 4 }, rx: { prefix: 'RX-', next: 5, pad: 4 }, lab: { prefix: 'LAB-', next: 23, pad: 4 }, sale: { prefix: 'PH-', next: 25, pad: 5 } },
      print: { paper: 'A4', header: true, footer: 'This is a computer generated document.', showLogo: true, template: 'Detailed' },
      password: { minLength: 8, upper: true, number: true, special: false, expiryDays: 90, maxAttempts: 5 },
      backup: { frequency: 'Daily', time: '02:00', retention: 30, location: 'Encrypted cloud (S3)', last: iso(0, 2) },
      retention: { records: 10, audit: 3, imaging: 7 },
      ipRestrict: { enabled: false, modules: 'billing, settings', ranges: '192.168.1.0/24' },
      channels: { sms: true, email: true, whatsapp: false },
    },
  }

  // Default role → module permissions
  const all = ['dashboard', 'patients', 'opd', 'ipd', 'emergency', 'pharmacy', 'laboratory', 'radiology', 'ot', 'billing', 'inventory', 'hr', 'doctors', 'bloodbank', 'diet', 'housekeeping', 'ambulance', 'reports', 'communication', 'settings']
  const access: Record<string, string[]> = {
    admin: all, doctor: ['dashboard', 'patients', 'opd', 'ipd', 'emergency', 'laboratory', 'radiology', 'ot', 'bloodbank', 'communication'],
    nurse: ['dashboard', 'patients', 'opd', 'ipd', 'emergency', 'bloodbank', 'diet', 'housekeeping', 'communication'],
    receptionist: ['dashboard', 'patients', 'opd', 'ipd', 'emergency', 'billing', 'ambulance', 'doctors', 'communication'],
    pharmacist: ['dashboard', 'pharmacy', 'inventory', 'communication'], lab: ['dashboard', 'laboratory', 'radiology', 'bloodbank', 'communication'],
    accountant: ['dashboard', 'billing', 'pharmacy', 'reports', 'communication'], hr: ['dashboard', 'hr', 'doctors', 'reports', 'communication'],
  }
  ROLES.forEach(r => all.forEach(m => { db.permissions[r.id][m] = access[r.id].includes(m) ? (r.id === 'admin' ? [...ACTIONS] : ['View', 'Create', 'Edit', 'Print']) : [] }))
  return db
}
