import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

/** English strings are used as keys; add a locale by supplying a translation map. */
const hi: Record<string, string> = {
  Dashboard: 'डैशबोर्ड', Patients: 'मरीज़', 'Patient Directory': 'मरीज़ सूची', 'New Registration': 'नया पंजीकरण', OPD: 'ओपीडी', Appointments: 'अपॉइंटमेंट', 'Token Queue': 'टोकन कतार', Consultation: 'परामर्श',
  IPD: 'आईपीडी', Admission: 'भर्ती', 'Bed Management': 'बेड प्रबंधन', 'Care Sheets': 'देखभाल शीट', Discharge: 'डिस्चार्ज', Emergency: 'आपातकालीन', Pharmacy: 'फार्मेसी', 'Medicine POS': 'दवा बिक्री', Inventory: 'इन्वेंटरी',
  Laboratory: 'प्रयोगशाला', Radiology: 'रेडियोलॉजी', 'Operation Theatre': 'ऑपरेशन थिएटर', Billing: 'बिलिंग', 'Billing POS': 'बिलिंग पीओएस', 'Bills & Payments': 'बिल और भुगतान', 'Insurance & TPA': 'बीमा और टीपीए', 'Financial Reports': 'वित्तीय रिपोर्ट',
  'Inventory & Assets': 'इन्वेंटरी और संपत्ति', 'HR & Staff': 'मानव संसाधन', Doctors: 'डॉक्टर', 'Blood Bank': 'ब्लड बैंक', 'Diet & Kitchen': 'आहार और रसोई', Housekeeping: 'हाउसकीपिंग', Ambulance: 'एम्बुलेंस', 'Reports & Analytics': 'रिपोर्ट और विश्लेषण',
  Communication: 'संचार', Settings: 'सेटिंग्स', 'Search patients, modules…': 'मरीज़ या मॉड्यूल खोजें…', Pinned: 'पिन किए गए', Recent: 'हाल के', 'Search menu…': 'मेनू खोजें…', 'Sign out': 'साइन आउट', 'My Profile': 'मेरी प्रोफ़ाइल', 'Good day': 'नमस्ते', Notifications: 'सूचनाएँ',
}
const ur: Record<string, string> = {
  Dashboard: 'ڈیش بورڈ', Patients: 'مریض', 'Patient Directory': 'مریضوں کی فہرست', 'New Registration': 'نئی رجسٹریشن', OPD: 'او پی ڈی', Appointments: 'اپائنٹمنٹس', 'Token Queue': 'ٹوکن قطار', Consultation: 'مشاورت',
  IPD: 'آئی پی ڈی', Admission: 'داخلہ', 'Bed Management': 'بیڈ مینجمنٹ', 'Care Sheets': 'کیئر شیٹس', Discharge: 'ڈسچارج', Emergency: 'ایمرجنسی', Pharmacy: 'فارمیسی', 'Medicine POS': 'ادویات کی فروخت', Inventory: 'انوینٹری',
  Laboratory: 'لیبارٹری', Radiology: 'ریڈیالوجی', 'Operation Theatre': 'آپریشن تھیٹر', Billing: 'بلنگ', 'Billing POS': 'بلنگ پی او ایس', 'Bills & Payments': 'بل اور ادائیگیاں', 'Insurance & TPA': 'انشورنس', 'Financial Reports': 'مالیاتی رپورٹس',
  'Inventory & Assets': 'انوینٹری اور اثاثے', 'HR & Staff': 'ایچ آر', Doctors: 'ڈاکٹرز', 'Blood Bank': 'بلڈ بینک', 'Diet & Kitchen': 'خوراک اور کچن', Housekeeping: 'ہاؤس کیپنگ', Ambulance: 'ایمبولینس', 'Reports & Analytics': 'رپورٹس',
  Communication: 'رابطہ', Settings: 'ترتیبات', 'Search patients, modules…': 'مریض یا ماڈیول تلاش کریں…', Pinned: 'پن شدہ', Recent: 'حالیہ', 'Search menu…': 'مینو تلاش کریں…', 'Sign out': 'سائن آؤٹ', 'My Profile': 'میری پروفائل', 'Good day': 'خوش آمدید', Notifications: 'اطلاعات',
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: {} }, hi: { translation: hi }, ur: { translation: ur } },
  lng: 'en', fallbackLng: 'en', keySeparator: false, nsSeparator: false, interpolation: { escapeValue: false },
})
export const LANGS = [{ id: 'en', label: 'English' }, { id: 'hi', label: 'हिन्दी' }, { id: 'ur', label: 'اردو' }]
export default i18n
