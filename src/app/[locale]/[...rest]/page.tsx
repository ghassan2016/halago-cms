import { notFound } from "next/navigation";

// أي مسار غير معروف داخل اللغة → صفحة 404 ضمن التخطيط
export default function CatchAll() {
  notFound();
}
