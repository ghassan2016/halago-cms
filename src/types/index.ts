// ===== أنواع البيانات (تطابق Prisma) =====

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number;
  to?: number;
}

export interface Driver {
  id: number;
  name: string;
  email?: string | null;
  phone: string;
  avatar?: string | null;
  status: "pending" | "approved" | "rejected" | "suspended" | string;
  available: boolean;
  vehicleType: string;
  carMake?: string | null;
  carModel?: string | null;
  plateNumber?: string | null;
  rating: number;
  totalTrips: number;
  walletBalance: number;
  city?: string | null;
  createdAt: string;
  completed_trips?: number;
  trips?: Trip[];
  withdrawals?: Withdrawal[];
  documents?: DriverDocument[];
}

export interface DriverDocument {
  id: number;
  driverId: number;
  type: "license" | "registration" | "insurance" | "id_card" | string;
  fileUrl?: string | null;
  number?: string | null;
  status: "pending" | "approved" | "rejected" | string;
  note?: string | null;
  expiryDate?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface Customer {
  id: number;
  name: string;
  email?: string | null;
  phone: string;
  avatar?: string | null;
  active: boolean;
  walletBalance: number;
  rating: number;
  totalTrips: number;
  city?: string | null;
  createdAt: string;
  trips?: Trip[];
}

export interface Vendor {
  id: number;
  name: string;
  category: string;
  logo?: string | null;
  status: string;
  commission: number;
  rating: number;
  address?: string | null;
  phone?: string | null;
  createdAt: string;
  _count?: { products: number; trips: number };
}

export interface Trip {
  id: number;
  number: string;
  type: "ride" | "delivery" | string;
  status: string;
  customerId?: number | null;
  driverId?: number | null;
  vendorId?: number | null;
  pickupAddress?: string | null;
  dropAddress?: string | null;
  distance: number;
  duration: number;
  fare: number;
  commission: number;
  paymentMethod: string;
  paymentStatus: string;
  rating?: number | null;
  scheduledAt?: string | null;
  createdAt: string;
  customer?: Partial<Customer> | null;
  driver?: Partial<Driver> | null;
  vendor?: Partial<Vendor> | null;
}

export interface Product {
  id: number;
  vendorId: number;
  name: string;
  price: number;
  image?: string | null;
  category?: string | null;
  available: boolean;
  createdAt: string;
}

export interface Review {
  id: number;
  tripId?: number | null;
  tripNo?: string | null;
  fromType: string;
  fromId?: number | null;
  fromName?: string | null;
  toType: string;
  toId?: number | null;
  toName?: string | null;
  stars: number;
  comment?: string | null;
  hidden: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  actorId?: number | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  entity: string;
  entityId?: number | null;
  meta?: string | null;
  createdAt: string;
}

export interface Transaction {
  id: number;
  type: string;
  amount: number;
  actorType: string;
  actorId?: number | null;
  refId?: number | null;
  status: string;
  createdAt: string;
}

export interface Promo {
  id: number;
  code: string;
  type: "percentage" | "fixed" | string;
  value: number;
  maxDiscount?: number | null;
  minOrder: number;
  usageLimit: number;
  usedCount: number;
  service: string;
  validFrom: string;
  validTo: string;
  status: string;
  createdAt: string;
}

export interface Withdrawal {
  id: number;
  driverId: number;
  amount: number;
  method: string;
  status: "pending" | "approved" | "rejected" | string;
  note?: string | null;
  createdAt: string;
  driver?: Partial<Driver> | null;
}

export interface DashboardStats {
  total_users: number;
  total_drivers: number;
  total_trips: number;
  total_earnings: number;
  online_drivers: number;
  pending_drivers: number;
  today_trips: number;
  today_earnings: number;
  completed_trips: number;
  chart: { date: string; trips: number; earnings: number }[];
  type_distribution: { name: string; value: number }[];
  recent_trips: Trip[];
  sos_open?: number;
  support_urgent?: number;
  scheduled_today?: number;
  active_shifts?: number;
}
