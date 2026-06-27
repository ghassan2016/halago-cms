import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ERRORS, okV1, requireV1Auth } from "@/lib/v1/api";
import {
  ALLOWED_DOC_EXTS,
  MAX_DOC_SIZE,
  fileExtension,
  fileToBuffer,
  saveLocalFile,
} from "@/lib/v1/storage";

const VALID_TYPES = ["license", "registration", "insurance", "id_card", "criminal_record"];

/**
 * POST /api/v1/driver/documents
 * multipart/form-data:
 *   type:       license | registration | insurance | id_card
 *   file:       الصورة (jpg/png/pdf, max 8MB)
 *   number?:    رقم الوثيقة
 *   expiryDate?: YYYY-MM-DD
 */
export async function POST(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "driver" });
  if ("error" in auth) return auth.error;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return ERRORS.validation("صيغة الطلب غير صحيحة (يجب multipart)");
  }

  const type = String(form.get("type") || "");
  if (!VALID_TYPES.includes(type)) {
    return ERRORS.validation("نوع الوثيقة غير صالح");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return ERRORS.validation("الملف مطلوب");
  }
  if (file.size > MAX_DOC_SIZE) {
    return ERRORS.validation("حجم الملف يتجاوز 8 ميجا");
  }
  const ext = fileExtension(file);
  if (!ALLOWED_DOC_EXTS.has(ext)) {
    return ERRORS.validation("صيغة غير مدعومة (PNG/JPG/PDF)");
  }

  const number = (form.get("number")?.toString() || "").trim() || null;
  const expiryStr = form.get("expiryDate")?.toString() || "";
  const expiryDate = expiryStr ? new Date(expiryStr) : null;
  if (expiryDate && Number.isNaN(expiryDate.getTime())) {
    return ERRORS.validation("تاريخ الانتهاء غير صالح");
  }

  try {
    const buffer = await fileToBuffer(file);
    const saved = await saveLocalFile(
      buffer,
      ext,
      `driver-${auth.session.userId}-${type}`,
    );

    // upsert على (driverId, type) — رفع جديد يستبدل القديم
    const doc = await prisma.driverDocument.upsert({
      where: {
        driverId_type: {
          driverId: auth.session.userId,
          type,
        },
      },
      create: {
        driverId: auth.session.userId,
        type,
        fileUrl: saved.url,
        number,
        expiryDate,
        status: "pending",
      },
      update: {
        fileUrl: saved.url,
        number,
        expiryDate,
        status: "pending",
        note: null,
        reviewedAt: null,
      },
    });

    return okV1({
      id: String(doc.id),
      type: doc.type,
      status: doc.status,
      fileUrl: doc.fileUrl,
      number: doc.number,
      expiryDate: doc.expiryDate,
    });
  } catch (err) {
    return ERRORS.serverError(err);
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireV1Auth(req, { role: "driver" });
  if ("error" in auth) return auth.error;

  const docs = await prisma.driverDocument.findMany({
    where: { driverId: auth.session.userId },
    orderBy: { type: "asc" },
  });

  return okV1({
    documents: docs.map((d) => ({
      id: String(d.id),
      type: d.type,
      status: d.status,
      fileUrl: d.fileUrl,
      number: d.number,
      expiryDate: d.expiryDate,
      note: d.note,
    })),
  });
}
