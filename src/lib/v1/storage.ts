// مخزن الملفات — في dev يحفظ في public/uploads/، في production يرفع لـ R2/S3
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

export interface UploadResult {
  url: string; // متاح عبر https://<app>/uploads/<filename>
  filename: string;
  size: number;
}

/** يحفظ Blob/File في الـ filesystem. اسم الملف عشوائي يبقى السرّ. */
export async function saveLocalFile(
  buffer: Buffer,
  ext: string,
  prefix: string,
): Promise<UploadResult> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin";
  const rand = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join("");
  const filename = `${prefix}-${Date.now()}-${rand}.${cleanExt}`;
  const path = join(UPLOAD_DIR, filename);
  await writeFile(path, buffer);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    url: `${baseUrl}/uploads/${filename}`,
    filename,
    size: buffer.length,
  };
}

/** قراءة File من FormData لـ Buffer */
export async function fileToBuffer(file: File): Promise<Buffer> {
  const arr = await file.arrayBuffer();
  return Buffer.from(arr);
}

export function fileExtension(file: File): string {
  const name = file.name || "";
  const dot = name.lastIndexOf(".");
  if (dot >= 0) return name.slice(dot + 1);
  // fallback من mime
  const mime = file.type || "";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("pdf")) return "pdf";
  return "bin";
}

export const ALLOWED_DOC_EXTS = new Set(["png", "jpg", "jpeg", "webp", "pdf"]);
export const MAX_DOC_SIZE = 8 * 1024 * 1024; // 8 MB
