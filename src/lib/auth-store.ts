"use client";

import { create } from "zustand";

export interface Profile {
  id: number | string;
  name: string;
  email: string;
  role?: string;
  avatar?: string | null;
  vendorId?: number | null;
}

interface AuthState {
  profile: Profile | null;
  hydrated: boolean;
  setProfile: (profile: Profile | null) => void;
  setHydrated: (v: boolean) => void;
}

/**
 * حالة المصادقة في الواجهة (الـ profile فقط).
 * الجلسة الحقيقية محفوظة في كوكي httpOnly يديرها الخادم —
 * هذا المخزن لعرض اسم/صورة المستخدم في الواجهة فقط.
 */
export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  hydrated: false,
  setProfile: (profile) => set({ profile }),
  setHydrated: (v) => set({ hydrated: v }),
}));
