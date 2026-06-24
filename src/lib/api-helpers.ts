import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth";
import { canAccess, type ModuleKey } from "@/lib/permissions";

/** ردّ ناجح موحّد */
export function ok<T>(data: T, meta?: unknown) {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) });
}

/** ردّ خطأ موحّد */
export function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

/** التحقق من الجلسة — يُستخدم في بداية كل route handler محمي */
export async function requireAuth(): Promise<
  { session: SessionPayload } | { error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { error: fail("غير مصرّح — يرجى تسجيل الدخول", 401) };
  }
  return { session };
}

/** التحقق من الجلسة + الدور (RBAC) */
export async function requireRole(
  roles: string[]
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const auth = await requireAuth();
  if ("error" in auth) return auth;
  if (!roles.includes(auth.session.role)) {
    return { error: fail("لا تملك صلاحية الوصول لهذه العملية", 403) };
  }
  return auth;
}

/** التحقق من الجلسة + صلاحية الوصول لوحدة معيّنة (RBAC حسب الدور) */
export async function requireModule(
  mod: ModuleKey
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const auth = await requireAuth();
  if ("error" in auth) return auth;
  if (!canAccess(auth.session.role, mod)) {
    return { error: fail("لا تملك صلاحية الوصول لهذه الوحدة", 403) };
  }
  return auth;
}

/** التحقق أن المستخدم تاجر (vendor) ومرتبط بمتجر — يُعيد vendorId */
export async function requireVendor(): Promise<
  { session: SessionPayload; vendorId: number } | { error: NextResponse }
> {
  const auth = await requireAuth();
  if ("error" in auth) return auth;
  const vendorId = auth.session.vendorId ? Number(auth.session.vendorId) : 0;
  if (auth.session.role !== "vendor" || !vendorId) {
    return { error: fail("هذه الصفحة مخصّصة لحسابات التجّار", 403) };
  }
  return { session: auth.session, vendorId };
}

/** قراءة بارامترات الترقيم والبحث من الـ URL */
export function parseListParams(url: string) {
  const { searchParams } = new URL(url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") || "15", 10)));
  const search = (searchParams.get("search") || "").trim();
  const status = (searchParams.get("status") || "").trim();
  const type = (searchParams.get("type") || "").trim();
  return { page, perPage, search, status, type, skip: (page - 1) * perPage };
}

/** بناء ميتا الترقيم */
export function buildMeta(total: number, page: number, perPage: number) {
  return {
    current_page: page,
    last_page: Math.max(1, Math.ceil(total / perPage)),
    per_page: perPage,
    total,
    from: total === 0 ? 0 : (page - 1) * perPage + 1,
    to: Math.min(page * perPage, total),
  };
}
