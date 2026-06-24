// قائمة فحص افتراضية تتفرّع منها بنود الفحص الفعلية.
// الـ key مفتاح ثابت للمراجعة المتعدّدة اللغات، والـ category لتقسيم العرض.

export interface ChecklistItem {
  key: string;
  category: "exterior" | "interior" | "engine" | "documents" | "safety";
  label_ar: string;
  label_en: string;
}

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  // الخارجي
  { key: "body_clean", category: "exterior", label_ar: "نظافة الهيكل الخارجي", label_en: "Body cleanliness" },
  { key: "no_dents", category: "exterior", label_ar: "خلو الهيكل من الانبعاجات", label_en: "No dents or damage" },
  { key: "lights", category: "exterior", label_ar: "الأضواء (أمامية/خلفية/إشارات)", label_en: "Lights (front/rear/signals)" },
  { key: "tires", category: "exterior", label_ar: "حالة الإطارات", label_en: "Tire condition" },
  { key: "windows", category: "exterior", label_ar: "سلامة الزجاج (بدون شقوق)", label_en: "Windshield/windows intact" },
  // الداخلي
  { key: "seats", category: "interior", label_ar: "نظافة المقاعد", label_en: "Seat cleanliness" },
  { key: "seatbelts", category: "interior", label_ar: "أحزمة الأمان لكل المقاعد", label_en: "Seatbelts for all seats" },
  { key: "ac", category: "interior", label_ar: "عمل التكييف", label_en: "Air conditioning works" },
  { key: "odor", category: "interior", label_ar: "خلو من الروائح", label_en: "No bad odor" },
  // المحرّك
  { key: "fluids", category: "engine", label_ar: "مستويات السوائل", label_en: "Fluid levels OK" },
  { key: "no_warning_lights", category: "engine", label_ar: "خلو لوحة العدّاد من تحذيرات", label_en: "No warning lights" },
  { key: "brakes", category: "engine", label_ar: "كفاءة المكابح", label_en: "Brakes responsive" },
  // الوثائق
  { key: "registration_valid", category: "documents", label_ar: "استمارة سارية", label_en: "Registration valid" },
  { key: "insurance_valid", category: "documents", label_ar: "تأمين ساري", label_en: "Insurance valid" },
  // السلامة
  { key: "fire_extinguisher", category: "safety", label_ar: "وجود طفاية حريق", label_en: "Fire extinguisher present" },
  { key: "spare_tire", category: "safety", label_ar: "إطار احتياطي", label_en: "Spare tire" },
  { key: "first_aid", category: "safety", label_ar: "حقيبة إسعافات", label_en: "First aid kit" },
];

export function defaultChecklistItems() {
  return DEFAULT_CHECKLIST.map((c) => ({ key: c.key, label: c.label_ar, ok: true, note: null }));
}
