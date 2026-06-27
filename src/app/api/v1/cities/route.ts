import { okV1 } from "@/lib/v1/api";

// المدن المدعومة — في النسخة الأولى ثابتة، لاحقاً من model Zone
const CITIES = [
  { key: "riyadh", nameAr: "الرياض", nameEn: "Riyadh", lat: 24.7136, lng: 46.6753 },
  { key: "jeddah", nameAr: "جدة", nameEn: "Jeddah", lat: 21.4858, lng: 39.1925 },
  { key: "dammam", nameAr: "الدمام", nameEn: "Dammam", lat: 26.4207, lng: 50.0888 },
  { key: "makkah", nameAr: "مكة المكرّمة", nameEn: "Makkah", lat: 21.3891, lng: 39.8579 },
  { key: "madinah", nameAr: "المدينة المنوّرة", nameEn: "Madinah", lat: 24.4709, lng: 39.6121 },
  { key: "taif", nameAr: "الطائف", nameEn: "Taif", lat: 21.2854, lng: 40.4232 },
  { key: "khobar", nameAr: "الخبر", nameEn: "Khobar", lat: 26.2796, lng: 50.2083 },
  { key: "abha", nameAr: "أبها", nameEn: "Abha", lat: 18.2164, lng: 42.5053 },
];

export async function GET() {
  return okV1({ cities: CITIES });
}
