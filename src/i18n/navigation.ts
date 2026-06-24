import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// روابط وملاحة واعية باللغة (تضيف بادئة اللغة تلقائياً)
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
