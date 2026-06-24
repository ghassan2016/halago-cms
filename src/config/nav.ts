import {
  LayoutDashboard,
  Car,
  Users,
  Route,
  Store,
  Wallet,
  ArrowDownToLine,
  Ticket,
  BarChart3,
  Settings,
  MapPin,
  Bell,
  ShieldCheck,
  BadgeDollarSign,
  Star,
  ScrollText,
  Package,
  AlertOctagon,
  LifeBuoy,
  CalendarClock,
  Timer,
  Flame,
  ShieldAlert,
  Gift,
  Wrench,
  Ban,
  FileText,
  MessageSquareText,
  CircleSlash,
  Coins,
  Radio,
  Play,
  type LucideIcon,
} from "lucide-react";

import { canAccess, type ModuleKey } from "@/lib/permissions";

export interface NavItem {
  key: string; // مفتاح الترجمة في nav.* (+ مفتاح الوحدة لعناصر الإدارة)
  href: string; // بدون بادئة اللغة
  icon: LucideIcon;
}

/** قائمة بوّابة التاجر (الدور vendor) — منفصلة عن قائمة الإدارة */
export const VENDOR_NAV: NavItem[] = [
  { key: "myStore", href: "/my-store", icon: Store },
  { key: "myMenu", href: "/my-menu", icon: Package },
  { key: "myOrders", href: "/my-orders", icon: Route },
];

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/", icon: LayoutDashboard },
  { key: "map", href: "/map", icon: MapPin },
  { key: "heatmap", href: "/heatmap", icon: Flame },
  { key: "dispatch", href: "/dispatch", icon: Radio },
  { key: "sos", href: "/sos", icon: AlertOctagon },
  { key: "drivers", href: "/drivers", icon: Car },
  { key: "shifts", href: "/shifts", icon: Timer },
  { key: "vehicles", href: "/vehicles", icon: Wrench },
  { key: "users", href: "/users", icon: Users },
  { key: "trips", href: "/trips", icon: Route },
  { key: "scheduled", href: "/scheduled", icon: CalendarClock },
  { key: "support", href: "/support", icon: LifeBuoy },
  { key: "fraud", href: "/fraud", icon: ShieldAlert },
  { key: "blocklist", href: "/blocklist", icon: Ban },
  { key: "reviews", href: "/reviews", icon: Star },
  { key: "vendors", href: "/vendors", icon: Store },
  { key: "finance", href: "/finance", icon: Wallet },
  { key: "withdrawals", href: "/withdrawals", icon: ArrowDownToLine },
  { key: "earnings", href: "/earnings", icon: Coins },
  { key: "promotions", href: "/promotions", icon: Ticket },
  { key: "referrals", href: "/referrals", icon: Gift },
  { key: "pricing", href: "/pricing", icon: BadgeDollarSign },
  { key: "notifications", href: "/notifications", icon: Bell },
  { key: "templates", href: "/templates", icon: MessageSquareText },
  { key: "cancellations", href: "/cancellations", icon: CircleSlash },
  { key: "reports", href: "/reports", icon: BarChart3 },
  { key: "audit", href: "/audit-logs", icon: ScrollText },
  { key: "admins", href: "/admins", icon: ShieldCheck },
  { key: "settings", href: "/settings", icon: Settings },
];

/** تصفية عناصر القائمة حسب صلاحيات دور المستخدم (RBAC) */
export function navForRole(role?: string): NavItem[] {
  if (role === "vendor") return VENDOR_NAV;
  return NAV_ITEMS.filter((item) => canAccess(role, item.key as ModuleKey));
}
