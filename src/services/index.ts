import { api, unwrap } from "@/lib/api";
import type { PaginationMeta } from "@/types";

export interface ListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  type?: string;
  scheduled?: boolean;
}

export interface ListResult<T> {
  data: T[];
  meta: PaginationMeta | null;
}

/** غلاف عام لجلب قائمة مرقّمة من نقطة API */
async function getList<T>(path: string, params: ListParams = {}): Promise<ListResult<T>> {
  const res = await api.get(path, {
    params: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 15,
      search: params.search || undefined,
      status: params.status || undefined,
      type: params.type || undefined,
      scheduled: params.scheduled ? "true" : undefined,
    },
  });
  return { data: res.data?.data ?? [], meta: res.data?.meta ?? null };
}

// ===== Auth =====
export async function login(email: string, password: string) {
  const res = await api.post("/auth/login", { email, password });
  return unwrap(res.data);
}
export async function logout() {
  try {
    await api.post("/auth/logout");
  } catch {
    /* تجاهل */
  }
}
export async function fetchMe() {
  const res = await api.get("/auth/me");
  return unwrap(res.data);
}

// ===== Dashboard =====
export async function getDashboard() {
  const res = await api.get("/dashboard");
  return res.data?.data ?? {};
}

// ===== Drivers =====
import type { Driver, Customer, Trip, Vendor, Promo, Withdrawal, Transaction } from "@/types";

export const getDrivers = (p?: ListParams) => getList<Driver>("/drivers", p);
export const getDriver = async (id: number | string) => unwrap<Driver>((await api.get(`/drivers/${id}`)).data);

export interface LiveDriver {
  id: number;
  name: string;
  lat: number;
  lng: number;
  vehicleType: string;
  rating: number;
  city?: string | null;
  phone?: string;
}
export const getLiveDrivers = async () => unwrap<LiveDriver[]>((await api.get("/drivers/live")).data);
export const updateDriver = async (id: number | string, body: Record<string, unknown>) =>
  unwrap<Driver>((await api.patch(`/drivers/${id}`, body)).data);

// ===== Driver Documents (KYC) =====
export const getAvailableDrivers = async () =>
  unwrap<{ id: number; name: string; phone: string; available: boolean; rating: number; city?: string | null; vehicleType: string }[]>(
    (await api.get("/drivers/available")).data
  );
export const reviewDriverDocument = async (id: number, status: "approved" | "rejected", note?: string) =>
  (await api.patch(`/driver-documents/${id}`, { status, note })).data;

// ===== Customers =====
export const getCustomers = (p?: ListParams) => getList<Customer>("/customers", p);
export const getCustomer = async (id: number | string) =>
  unwrap<Customer>((await api.get(`/customers/${id}`)).data);
export const updateCustomer = async (id: number | string, body: Record<string, unknown>) =>
  unwrap<Customer>((await api.patch(`/customers/${id}`, body)).data);

// ===== Trips =====
export const getTrips = (p?: ListParams) => getList<Trip>("/trips", p);
export const getTrip = async (id: number | string) => unwrap<Trip>((await api.get(`/trips/${id}`)).data);
export const cancelTrip = async (id: number | string) =>
  (await api.patch(`/trips/${id}`, { action: "cancel" })).data;
export const reassignTrip = async (id: number | string, driverId: number) =>
  (await api.patch(`/trips/${id}`, { action: "reassign", driverId })).data;
export const refundTrip = async (id: number | string) =>
  (await api.patch(`/trips/${id}`, { action: "refund" })).data;

// ===== Vendors =====
export const getVendors = (p?: ListParams) => getList<Vendor>("/vendors", p);

// ===== Finance =====
export async function getTransactions(p?: ListParams) {
  const res = await api.get("/transactions", {
    params: { page: p?.page ?? 1, per_page: p?.per_page ?? 15, type: p?.type || undefined },
  });
  return {
    transactions: (res.data?.data?.transactions ?? []) as Transaction[],
    totals: (res.data?.data?.totals ?? {}) as Record<string, number>,
    meta: res.data?.meta ?? null,
  };
}

// ===== Withdrawals =====
export const getWithdrawals = (p?: ListParams) => getList<Withdrawal>("/withdrawals", p);
export const updateWithdrawal = async (id: number | string, status: "approved" | "rejected") =>
  (await api.patch(`/withdrawals/${id}`, { status })).data;

// ===== Promos =====
export const getPromos = (p?: ListParams) => getList<Promo>("/promos", p);
export const createPromo = async (body: Record<string, unknown>) => unwrap<Promo>((await api.post("/promos", body)).data);
export const updatePromo = async (id: number | string, body: Record<string, unknown>) =>
  unwrap<Promo>((await api.patch(`/promos/${id}`, body)).data);
export const deletePromo = async (id: number | string) => (await api.delete(`/promos/${id}`)).data;

// ===== Vendors detail =====
export const getVendor = async (id: number | string) => unwrap<Vendor>((await api.get(`/vendors/${id}`)).data);

// ===== Settings =====
export async function getSettings() {
  return (await api.get("/settings")).data?.data ?? {};
}
export async function saveSettings(body: Record<string, string>) {
  return (await api.put("/settings", body)).data;
}

// ===== Admins (RBAC) =====
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}
export const getAdmins = async () => unwrap<AdminUser[]>((await api.get("/admins")).data);
export const createAdmin = async (body: Record<string, unknown>) =>
  unwrap<AdminUser>((await api.post("/admins", body)).data);
export const updateAdmin = async (id: number, body: Record<string, unknown>) =>
  unwrap<AdminUser>((await api.patch(`/admins/${id}`, body)).data);
export const deleteAdmin = async (id: number) => (await api.delete(`/admins/${id}`)).data;

// ===== Notifications =====
export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  audience: string;
  recipients: number;
  sentBy?: string | null;
  createdAt: string;
}
export const getNotifications = (p?: ListParams) => getList<NotificationItem>("/notifications", p);
export const sendNotification = async (body: Record<string, unknown>) =>
  unwrap<NotificationItem>((await api.post("/notifications", body)).data);

// ===== Account =====
export const changePassword = async (current: string, next: string) =>
  (await api.patch("/account/password", { current, next })).data;

// ===== Pricing =====
export interface PricingRule {
  id: number;
  vehicleType: string;
  serviceType: string;
  distanceUnit: string;
  baseFare: number;
  bookingFee: number;
  perKm: number;
  perMinute: number;
  waitPerMinute: number;
  freeWaitMinutes: number;
  minimumFare: number;
  cancellationFee: number;
  taxPercent: number;
  currency: string;
  active: boolean;
}
export interface SurgeRule {
  id: number;
  name: string;
  days: string;
  startHour: number;
  endHour: number;
  multiplier: number;
  active: boolean;
}
export const getPricingRules = async () => unwrap<PricingRule[]>((await api.get("/pricing/rules")).data);
export const savePricingRules = async (rules: Partial<PricingRule>[]) =>
  unwrap<PricingRule[]>((await api.put("/pricing/rules", { rules })).data);

export const getSurgeRules = async () => unwrap<SurgeRule[]>((await api.get("/pricing/surge")).data);
export const createSurgeRule = async (body: Record<string, unknown>) =>
  unwrap<SurgeRule>((await api.post("/pricing/surge", body)).data);
export const updateSurgeRule = async (id: number, body: Record<string, unknown>) =>
  (await api.patch(`/pricing/surge/${id}`, body)).data;
export const deleteSurgeRule = async (id: number) => (await api.delete(`/pricing/surge/${id}`)).data;

export const estimateFare = async (body: Record<string, unknown>) =>
  unwrap<any>((await api.post("/pricing/estimate", body)).data);

export const getDemand = async () => unwrap<any>((await api.get("/pricing/demand")).data);

// ===== Zones =====
export interface Zone {
  id: number;
  name: string;
  city: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  priceMultiplier: number;
  active: boolean;
}
export const getZones = async () => unwrap<Zone[]>((await api.get("/zones")).data);
export const createZone = async (body: Record<string, unknown>) => unwrap<Zone>((await api.post("/zones", body)).data);
export const updateZone = async (id: number, body: Record<string, unknown>) =>
  (await api.patch(`/zones/${id}`, body)).data;
export const deleteZone = async (id: number) => (await api.delete(`/zones/${id}`)).data;

// ===== Vehicle Classes =====
export interface VehicleClass {
  id: number;
  key: string;
  name: string;
  multiplier: number;
  capacity: number;
  active: boolean;
  sortOrder: number;
}
export const getVehicleClasses = async () => unwrap<VehicleClass[]>((await api.get("/vehicle-classes")).data);
export const createVehicleClass = async (body: Record<string, unknown>) =>
  unwrap<VehicleClass>((await api.post("/vehicle-classes", body)).data);
export const updateVehicleClass = async (id: number, body: Record<string, unknown>) =>
  (await api.patch(`/vehicle-classes/${id}`, body)).data;
export const deleteVehicleClass = async (id: number) => (await api.delete(`/vehicle-classes/${id}`)).data;

// ===== Extra Fees =====
export interface ExtraFee {
  id: number;
  key: string;
  name: string;
  amount: number;
  active: boolean;
}
export const getExtraFees = async () => unwrap<ExtraFee[]>((await api.get("/extra-fees")).data);
export const createExtraFee = async (body: Record<string, unknown>) =>
  unwrap<ExtraFee>((await api.post("/extra-fees", body)).data);
export const updateExtraFee = async (id: number, body: Record<string, unknown>) =>
  (await api.patch(`/extra-fees/${id}`, body)).data;
export const deleteExtraFee = async (id: number) => (await api.delete(`/extra-fees/${id}`)).data;

// ===== Reviews =====
import type { Review, Product, AuditLog } from "@/types";

export interface ReviewsParams extends ListParams {
  stars?: number;
  hidden?: "true" | "false";
}
export async function getReviews(p: ReviewsParams = {}) {
  const res = await api.get("/reviews", {
    params: {
      page: p.page ?? 1,
      per_page: p.per_page ?? 15,
      search: p.search || undefined,
      stars: p.stars || undefined,
      hidden: p.hidden || undefined,
    },
  });
  const d = res.data?.data ?? {};
  return {
    reviews: (d.reviews ?? []) as Review[],
    avgStars: (d.avgStars ?? 0) as number,
    totalReviews: (d.totalReviews ?? 0) as number,
    meta: res.data?.meta ?? null,
  };
}
export const setReviewHidden = async (id: number, hidden: boolean) =>
  (await api.patch(`/reviews/${id}`, { hidden })).data;

// ===== Vendor Products (Menu) =====
export const getVendorProducts = async (vendorId: number | string) =>
  unwrap<Product[]>((await api.get(`/vendors/${vendorId}/products`)).data);
export const createProduct = async (vendorId: number | string, body: Record<string, unknown>) =>
  unwrap<Product>((await api.post(`/vendors/${vendorId}/products`, body)).data);
export const updateProduct = async (id: number, body: Record<string, unknown>) =>
  unwrap<Product>((await api.patch(`/products/${id}`, body)).data);
export const deleteProduct = async (id: number) => (await api.delete(`/products/${id}`)).data;

// ===== Audit Logs =====
export interface AuditParams extends ListParams {
  entity?: string;
}
export async function getAuditLogs(p: AuditParams = {}) {
  const res = await api.get("/audit-logs", {
    params: {
      page: p.page ?? 1,
      per_page: p.per_page ?? 20,
      search: p.search || undefined,
      entity: p.entity || undefined,
    },
  });
  return { data: (res.data?.data ?? []) as AuditLog[], meta: res.data?.meta ?? null };
}

// ===== Vendor Portal (الدور vendor) =====
export interface MyVendor extends Vendor {
  _stats?: { products: number; orders: number; revenue: number };
}
export const getMyVendor = async () => unwrap<MyVendor>((await api.get("/my/vendor")).data);

export const getMyProducts = async () => unwrap<Product[]>((await api.get("/my/products")).data);
export const createMyProduct = async (body: Record<string, unknown>) =>
  unwrap<Product>((await api.post("/my/products", body)).data);
export const updateMyProduct = async (id: number, body: Record<string, unknown>) =>
  unwrap<Product>((await api.patch(`/my/products/${id}`, body)).data);
export const deleteMyProduct = async (id: number) => (await api.delete(`/my/products/${id}`)).data;

export const getMyOrders = (p?: ListParams) => getList<Trip>("/my/orders", p);

// ===== SOS / Emergency =====
export interface SosAlert {
  id: number;
  reporterType: string;
  reporterId?: number | null;
  reporterName?: string | null;
  reporterPhone?: string | null;
  tripId?: number | null;
  tripNumber?: string | null;
  lat?: number | null;
  lng?: number | null;
  city?: string | null;
  reason: string;
  severity: string;
  status: string;
  note?: string | null;
  resolution?: string | null;
  handlerId?: number | null;
  handlerName?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface SosListParams extends ListParams {
  severity?: string;
  reason?: string;
}
export async function getSosAlerts(p: SosListParams = {}) {
  const res = await api.get("/sos", {
    params: {
      page: p.page ?? 1,
      per_page: p.per_page ?? 15,
      search: p.search || undefined,
      status: p.status || undefined,
      severity: p.severity || undefined,
      reason: p.reason || undefined,
    },
  });
  const d = res.data?.data ?? {};
  return {
    alerts: (d.alerts ?? []) as SosAlert[],
    openCount: (d.openCount ?? 0) as number,
    criticalCount: (d.criticalCount ?? 0) as number,
    meta: res.data?.meta ?? null,
  };
}
export const ackSosAlert = async (id: number) =>
  unwrap<SosAlert>((await api.patch(`/sos/${id}`, { action: "ack" })).data);
export const resolveSosAlert = async (id: number, resolution: string) =>
  unwrap<SosAlert>((await api.patch(`/sos/${id}`, { action: "resolve", resolution })).data);
export const dismissSosAlert = async (id: number) =>
  unwrap<SosAlert>((await api.patch(`/sos/${id}`, { action: "dismiss" })).data);

// ===== Support Tickets =====
export interface TicketMessage {
  id: number;
  ticketId: number;
  senderType: string;
  senderId?: number | null;
  senderName?: string | null;
  body: string;
  createdAt: string;
}
export interface SupportTicket {
  id: number;
  number: string;
  subject: string;
  body: string;
  category: string;
  priority: string;
  status: string;
  reporterType: string;
  reporterId?: number | null;
  reporterName?: string | null;
  reporterEmail?: string | null;
  reporterPhone?: string | null;
  tripId?: number | null;
  tripNumber?: string | null;
  assigneeId?: number | null;
  assigneeName?: string | null;
  lastReplyBy?: string | null;
  lastReplyAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
}
export interface SupportListParams extends ListParams {
  priority?: string;
  mine?: boolean;
}
export async function getSupportTickets(p: SupportListParams = {}) {
  const res = await api.get("/support", {
    params: {
      page: p.page ?? 1,
      per_page: p.per_page ?? 15,
      search: p.search || undefined,
      status: p.status || undefined,
      priority: p.priority || undefined,
      mine: p.mine ? "true" : undefined,
    },
  });
  const d = res.data?.data ?? {};
  return {
    tickets: (d.tickets ?? []) as SupportTicket[],
    openCount: (d.openCount ?? 0) as number,
    urgentCount: (d.urgentCount ?? 0) as number,
    meta: res.data?.meta ?? null,
  };
}
export const getSupportTicket = async (id: number | string) =>
  unwrap<SupportTicket>((await api.get(`/support/${id}`)).data);
export const replySupportTicket = async (id: number | string, body: string) =>
  unwrap<TicketMessage>((await api.post(`/support/${id}/messages`, { body })).data);
export const updateSupportTicket = async (id: number | string, body: Record<string, unknown>) =>
  unwrap<SupportTicket>((await api.patch(`/support/${id}`, body)).data);

// ===== Scheduled Rides =====
export interface ScheduledListParams extends ListParams {
  range?: "all" | "today" | "week" | "unassigned";
}
export async function getScheduledTrips(p: ScheduledListParams = {}) {
  const res = await api.get("/scheduled", {
    params: {
      page: p.page ?? 1,
      per_page: p.per_page ?? 15,
      search: p.search || undefined,
      range: p.range || undefined,
    },
  });
  const d = res.data?.data ?? {};
  return {
    trips: (d.trips ?? []) as Trip[],
    todayCount: (d.todayCount ?? 0) as number,
    weekCount: (d.weekCount ?? 0) as number,
    unassignedCount: (d.unassignedCount ?? 0) as number,
    meta: res.data?.meta ?? null,
  };
}

// ===== Driver Shifts =====
export interface DriverShift {
  id: number;
  driverId: number;
  startedAt: string;
  endedAt?: string | null;
  durationMin: number;
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalEarnings: number;
  totalKm: number;
  city?: string | null;
  status: string;
  driver?: { id: number; name: string; phone?: string; vehicleType?: string; rating?: number };
}
export interface ShiftsListParams extends ListParams {
  range?: "all" | "active" | "today";
}
export async function getShifts(p: ShiftsListParams = {}) {
  const res = await api.get("/shifts", {
    params: {
      page: p.page ?? 1,
      per_page: p.per_page ?? 15,
      search: p.search || undefined,
      range: p.range || undefined,
    },
  });
  const d = res.data?.data ?? {};
  return {
    shifts: (d.shifts ?? []) as DriverShift[],
    activeCount: (d.activeCount ?? 0) as number,
    todayCount: (d.todayCount ?? 0) as number,
    avgDuration: (d.avgDuration ?? 0) as number,
    totalEarnings: (d.totalEarnings ?? 0) as number,
    meta: res.data?.meta ?? null,
  };
}

// ===== Heatmap =====
export interface HeatPoint {
  lat: number;
  lng: number;
  weight: number;
}
export interface HeatCity {
  name: string;
  count: number;
}
// ===== Fraud Detection =====
export interface FraudFlag {
  id: number;
  subjectType: string;
  subjectId: number;
  subjectRef?: string | null;
  reason: string;
  score: number;
  severity: string;
  status: string;
  evidence?: string | null;
  note?: string | null;
  handlerId?: number | null;
  handlerName?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface FraudListParams extends ListParams {
  severity?: string;
  subjectType?: string;
  reason?: string;
}
export async function getFraudFlags(p: FraudListParams = {}) {
  const res = await api.get("/fraud", {
    params: {
      page: p.page ?? 1,
      per_page: p.per_page ?? 15,
      search: p.search || undefined,
      status: p.status || undefined,
      severity: p.severity || undefined,
      subjectType: p.subjectType || undefined,
      reason: p.reason || undefined,
    },
  });
  const d = res.data?.data ?? {};
  return {
    flags: (d.flags ?? []) as FraudFlag[],
    openCount: (d.openCount ?? 0) as number,
    highCount: (d.highCount ?? 0) as number,
    confirmedCount: (d.confirmedCount ?? 0) as number,
    meta: res.data?.meta ?? null,
  };
}
export const scanFraud = async () =>
  unwrap<{ scanned: number; created: number }>((await api.post("/fraud/scan")).data);
export const reviewFraud = async (id: number) =>
  unwrap<FraudFlag>((await api.patch(`/fraud/${id}`, { action: "review" })).data);
export const confirmFraud = async (id: number, note?: string) =>
  unwrap<FraudFlag>((await api.patch(`/fraud/${id}`, { action: "confirm", note })).data);
export const dismissFraud = async (id: number, note?: string) =>
  unwrap<FraudFlag>((await api.patch(`/fraud/${id}`, { action: "dismiss", note })).data);

// ===== Bulk Operations =====
export interface BulkResult {
  updated: number;
  failed: number;
}
export const bulkUpdateDrivers = async (ids: number[], action: "approve" | "suspend") =>
  unwrap<BulkResult>((await api.post("/drivers/bulk", { ids, action })).data);
export const bulkUpdateWithdrawals = async (ids: number[], action: "approve" | "reject") =>
  unwrap<BulkResult>((await api.post("/withdrawals/bulk", { ids, action })).data);

// ===== Referrals =====
export interface ReferralCode {
  id: number;
  code: string;
  ownerType: string;
  ownerId: number;
  ownerName?: string | null;
  usageCount: number;
  rewardPerUse: number;
  active: boolean;
  createdAt: string;
}
export interface Referral {
  id: number;
  codeId: number;
  code: string;
  referrerType: string;
  referrerId: number;
  referrerName?: string | null;
  refereeType: string;
  refereeId: number;
  refereeName?: string | null;
  status: string;
  reward: number;
  rewardedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}
export interface ReferralListParams extends ListParams {
  ownerType?: string;
}
export async function getReferrals(p: ReferralListParams = {}) {
  const res = await api.get("/referrals", {
    params: {
      page: p.page ?? 1,
      per_page: p.per_page ?? 15,
      search: p.search || undefined,
      status: p.status || undefined,
    },
  });
  const d = res.data?.data ?? {};
  return {
    referrals: (d.referrals ?? []) as Referral[],
    totalReferrals: (d.totalReferrals ?? 0) as number,
    completedReferrals: (d.completedReferrals ?? 0) as number,
    totalRewards: (d.totalRewards ?? 0) as number,
    meta: res.data?.meta ?? null,
  };
}
export async function getReferralCodes(p: ReferralListParams = {}) {
  const res = await api.get("/referral-codes", {
    params: {
      page: p.page ?? 1,
      per_page: p.per_page ?? 15,
      search: p.search || undefined,
      ownerType: p.ownerType || undefined,
    },
  });
  return {
    codes: (res.data?.data?.codes ?? []) as ReferralCode[],
    meta: res.data?.meta ?? null,
  };
}
export const rewardReferral = async (id: number) =>
  unwrap<Referral>((await api.patch(`/referrals/${id}`, { action: "reward" })).data);
export const cancelReferral = async (id: number) =>
  unwrap<Referral>((await api.patch(`/referrals/${id}`, { action: "cancel" })).data);
export const toggleReferralCode = async (id: number, active: boolean) =>
  unwrap<ReferralCode>((await api.patch(`/referral-codes/${id}`, { active })).data);

// ===== Vehicle Inspections =====
export interface VehicleInspection {
  id: number;
  driverId: number;
  type: string;
  odometerKm?: number | null;
  items?: string | null;
  photos?: string | null;
  notes?: string | null;
  damageScore: number;
  status: string;
  reviewerId?: number | null;
  reviewerName?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  driver?: { id: number; name: string; phone?: string; carMake?: string | null; carModel?: string | null; plateNumber?: string | null };
}
export interface InspectionsListParams extends ListParams {}
export async function getInspections(p: InspectionsListParams = {}) {
  const res = await api.get("/inspections", {
    params: {
      page: p.page ?? 1,
      per_page: p.per_page ?? 15,
      search: p.search || undefined,
      status: p.status || undefined,
      type: p.type || undefined,
    },
  });
  const d = res.data?.data ?? {};
  return {
    inspections: (d.inspections ?? []) as VehicleInspection[],
    submittedCount: (d.submittedCount ?? 0) as number,
    approvedCount: (d.approvedCount ?? 0) as number,
    flaggedCount: (d.flaggedCount ?? 0) as number,
    avgDamage: (d.avgDamage ?? 0) as number,
    meta: res.data?.meta ?? null,
  };
}
export const reviewInspection = async (id: number, action: "approve" | "flag" | "reject") =>
  unwrap<VehicleInspection>((await api.patch(`/inspections/${id}`, { action })).data);

// ===== Cancellation Reasons =====
export interface CancellationReason {
  id: number;
  key: string;
  labelAr: string;
  labelEn: string;
  audience: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
}
export const getCancellationReasons = async () =>
  unwrap<CancellationReason[]>((await api.get("/cancellation-reasons")).data);
export const createCancellationReason = async (body: Record<string, unknown>) =>
  unwrap<CancellationReason>((await api.post("/cancellation-reasons", body)).data);
export const updateCancellationReason = async (id: number, body: Record<string, unknown>) =>
  unwrap<CancellationReason>((await api.patch(`/cancellation-reasons/${id}`, body)).data);
export const deleteCancellationReason = async (id: number) =>
  (await api.delete(`/cancellation-reasons/${id}`)).data;

// ===== Blocklist =====
export interface BlockedEntity {
  id: number;
  kind: string;
  value: string;
  reason?: string | null;
  blockedById?: number | null;
  blockedByName?: string | null;
  active: boolean;
  expiresAt?: string | null;
  createdAt: string;
}
export interface BlocklistListParams extends ListParams {
  kind?: string;
}
export async function getBlocklist(p: BlocklistListParams = {}) {
  const res = await api.get("/blocklist", {
    params: {
      page: p.page ?? 1,
      per_page: p.per_page ?? 15,
      search: p.search || undefined,
      status: p.status || undefined,
      kind: p.kind || undefined,
    },
  });
  const d = res.data?.data ?? {};
  return {
    entries: (d.entries ?? []) as BlockedEntity[],
    totalBlocked: (d.totalBlocked ?? 0) as number,
    activeBlocks: (d.activeBlocks ?? 0) as number,
    expiredCount: (d.expiredCount ?? 0) as number,
    meta: res.data?.meta ?? null,
  };
}
export const createBlocklist = async (body: Record<string, unknown>) =>
  unwrap<BlockedEntity>((await api.post("/blocklist", body)).data);
export const removeBlocklist = async (id: number) =>
  (await api.delete(`/blocklist/${id}`)).data;

// ===== Notification Templates =====
export interface NotificationTemplate {
  id: number;
  key: string;
  name: string;
  title: string;
  body: string;
  audience: string;
  variables?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
export const getTemplates = async () =>
  unwrap<NotificationTemplate[]>((await api.get("/templates")).data);
export const createTemplate = async (body: Record<string, unknown>) =>
  unwrap<NotificationTemplate>((await api.post("/templates", body)).data);
export const updateTemplate = async (id: number, body: Record<string, unknown>) =>
  unwrap<NotificationTemplate>((await api.patch(`/templates/${id}`, body)).data);
export const deleteTemplate = async (id: number) =>
  (await api.delete(`/templates/${id}`)).data;

// ===== Earnings =====
export interface EarningsRow {
  driverId: number;
  driverName: string;
  city?: string | null;
  vehicleType?: string;
  rating: number;
  completedTrips: number;
  gross: number;
  commission: number;
  net: number;
  payouts: number;
  balance: number;
}
export interface EarningsTotals {
  totalEarnings: number;
  totalCommission: number;
  totalPayouts: number;
  avgEarnings: number;
  driversCount: number;
}
export async function getEarnings(range: "week" | "month" | "all" = "month", search = "") {
  const res = await api.get("/earnings", { params: { range, search: search || undefined } });
  const d = res.data?.data ?? {};
  return {
    totals: (d.totals ?? {}) as EarningsTotals,
    rows: (d.rows ?? []) as EarningsRow[],
    top: (d.top ?? []) as EarningsRow[],
  };
}

// ===== Currencies =====
export interface Currency {
  id: number;
  code: string;
  name: string;
  nameAr: string;
  symbol: string;
  fxRate: number;
  isBase: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: string;
}
export const getCurrencies = async () => unwrap<Currency[]>((await api.get("/currencies")).data);
export const createCurrency = async (body: Record<string, unknown>) =>
  unwrap<Currency>((await api.post("/currencies", body)).data);
export const updateCurrency = async (id: number, body: Record<string, unknown>) =>
  unwrap<Currency>((await api.patch(`/currencies/${id}`, body)).data);
export const deleteCurrency = async (id: number) => (await api.delete(`/currencies/${id}`)).data;

export async function getHeatmap(range: "day" | "week" | "month" | "all" = "week") {
  const res = await api.get("/heatmap", { params: { range } });
  const d = res.data?.data ?? {};
  return {
    points: (d.points ?? []) as HeatPoint[],
    cities: (d.cities ?? []) as HeatCity[],
    total: (d.total ?? 0) as number,
    topCity: (d.topCity ?? null) as HeatCity | null,
  };
}
