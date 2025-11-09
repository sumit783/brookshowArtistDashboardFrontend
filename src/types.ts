// Type definitions for BrookShow

export interface Artist {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  city: string;
  categories: string[];
  bio: string;
  verified: boolean;
  media: MediaItem[];
  coverImageId?: string;
  createdAt: string;
}

export interface Service {
  id: string;
  artistId: string;
  title: string;
  description: string;
  unit: string;
  price_for_user: number;
  price_for_planner: number;
  advance?: number;
  extras: ServiceExtra[];
  active: boolean;
}

export interface ServiceExtra {
  id: string;
  title: string;
  price: number;
}

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type BookingSource = "user" | "planner";

export interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  clientPhoneMasked: string;
  start: string;
  end: string;
  serviceId: string;
  serviceName: string;
  artistId: string;
  source: BookingSource;
  status: BookingStatus;
  price: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: SyncStatus;
}

export type CalendarBlockType = "busy" | "offline-booking";

export interface CalendarBlock {
  id: string;
  artistId: string;
  start: string;
  end: string;
  type: CalendarBlockType;
  title: string;
  linkedBookingId?: string;
  syncStatus?: SyncStatus;
}

export interface MediaItem {
  id: string;
  artistId: string;
  type: "image" | "video";
  url: string;
  thumbnail?: string;
  dataUrl?: string; // For local files
  fileName: string;
  fileSize?: number;
  order: number;
  uploadedAt: string;
  syncStatus?: SyncStatus;
}

export interface Ticket {
  id: string;
  eventTitle: string;
  eventDate: string;
  buyerName: string;
  buyerEmail: string;
  qrDataUrl: string;
  price: number;
  purchasedAt: string;
}

export type SyncStatus = "pending" | "synced" | "failed";

export interface SyncQueueItem {
  id: string;
  action: "create" | "update" | "delete";
  entity: "booking" | "calendarBlock" | "media" | "service";
  data: any;
  status: SyncStatus;
  retries: number;
  createdAt: string;
  lastAttempt?: string;
  error?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: "artist" | "admin";
  artistId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  phone: string;
  displayName: string;
  countryCode: string;
  role: "artist"; // fixed as artist per requirements
}

export interface RegisterResponseUser {
  email: string;
  phone: string;
  countryCode: string;
  displayName: string;
  role: "artist" | "admin";
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isAdminVerified: boolean;
  isActive: boolean;
  _id: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user: RegisterResponseUser;
}

export interface VerifyOTPPayload {
  email: string;
  otp: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  user: RegisterResponseUser;
  jwtToken: string;
}

export interface EventPricing {
  eventPlannerPrice: number;
  userPrice: number;
  advance: number;
}

export interface ProfilePayload {
  profileImage?: File;
  bio: string;
  category: string[];
  city: string;
  state: string;
  country: string;
  eventPricing: Record<string, EventPricing>;
}
