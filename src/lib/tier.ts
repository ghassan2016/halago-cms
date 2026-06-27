// تصنيف السائقين: برونز → سلفر → جولد → بلاتينيوم
// يُحتسب من التقييم وعدد الرحلات، ويُستخدم في أولوية الحجوزات المجدولة والمسابقات.

export type DriverTier = "bronze" | "silver" | "gold" | "platinum";

export const TIERS: { key: DriverTier; minRating: number; minTrips: number; rank: number }[] = [
  { key: "platinum", minRating: 4.8, minTrips: 500, rank: 4 },
  { key: "gold", minRating: 4.5, minTrips: 200, rank: 3 },
  { key: "silver", minRating: 4.2, minTrips: 50, rank: 2 },
  { key: "bronze", minRating: 0, minTrips: 0, rank: 1 },
];

export function computeTier(rating: number, totalTrips: number): DriverTier {
  for (const t of TIERS) {
    if (rating >= t.minRating && totalTrips >= t.minTrips) return t.key;
  }
  return "bronze";
}

export function tierRank(tier: string): number {
  return TIERS.find((t) => t.key === tier)?.rank ?? 1;
}
