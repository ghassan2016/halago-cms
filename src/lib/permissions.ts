// ===== RBAC: مصفوفة الصلاحيات (دور × وحدة) =====
// مصدر الحقيقة الوحيد للصلاحيات — يُستخدم في الـ nav (العرض) والـ API (الفرض).

export const MODULES = [
  "dashboard",
  "map",
  "heatmap",
  "dispatch",
  "drivers",
  "shifts",
  "vehicles",
  "users",
  "trips",
  "scheduled",
  "sos",
  "support",
  "fraud",
  "blocklist",
  "reviews",
  "vendors",
  "finance",
  "withdrawals",
  "earnings",
  "promotions",
  "referrals",
  "pricing",
  "notifications",
  "templates",
  "cancellations",
  "reports",
  "audit",
  "admins",
  "settings",
] as const;

export type ModuleKey = (typeof MODULES)[number];

export const ROLES = ["super_admin", "operations", "finance", "support"] as const;
export type Role = (typeof ROLES)[number];

/** الوحدات المسموحة لكل دور. super_admin يملك كل شيء. */
export const ROLE_MODULES: Record<string, ModuleKey[]> = {
  super_admin: [...MODULES],
  operations: [
    "dashboard",
    "map",
    "heatmap",
    "dispatch",
    "drivers",
    "shifts",
    "vehicles",
    "users",
    "trips",
    "scheduled",
    "sos",
    "fraud",
    "blocklist",
    "reviews",
    "vendors",
    "notifications",
    "templates",
    "cancellations",
    "reports",
  ],
  finance: ["dashboard", "finance", "withdrawals", "earnings", "promotions", "referrals", "pricing", "reports"],
  support: [
    "dashboard",
    "dispatch",
    "users",
    "drivers",
    "trips",
    "scheduled",
    "sos",
    "support",
    "blocklist",
    "reviews",
    "notifications",
    "templates",
  ],
  // التاجر لا يملك أي وحدة إدارية — له بوّابته الخاصة (انظر VENDOR_NAV)
  vendor: [],
};

/** هل يملك الدور صلاحية الوصول لهذه الوحدة؟ */
export function canAccess(role: string | undefined, mod: ModuleKey): boolean {
  if (!role) return false;
  if (role === "super_admin") return true;
  return (ROLE_MODULES[role] ?? []).includes(mod);
}
