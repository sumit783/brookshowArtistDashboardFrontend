// API Client with mock adapter pattern
// Replace mock implementations with real API calls when backend is ready

import { config } from "../config";
import {
  Artist,
  Service,
  Booking,
  CalendarBlock,
  MediaItem,
  LoginCredentials,
  AuthUser,
} from "../types";
import {
  mockArtist,
  mockServices,
  mockBookings,
  mockCalendarBlocks,
  mockMediaItems,
} from "./mockData";

// Simulated network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock Auth
export const authApi = {
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser; token: string }> {
    await delay(500);
    
    // Demo login - accepts any credentials
    if (credentials.email && credentials.password) {
      return {
        user: {
          id: "user-1",
          email: credentials.email,
          role: "artist",
          artistId: mockArtist.id,
        },
        token: "mock-jwt-token",
      };
    }
    
    throw new Error("Invalid credentials");
  },
  
  async logout(): Promise<void> {
    await delay(200);
    // Clear localStorage
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  },
  
  async getCurrentUser(): Promise<AuthUser | null> {
    await delay(200);
    const user = localStorage.getItem("auth_user");
    return user ? JSON.parse(user) : null;
  },
};

// Mock Artists API
export const artistsApi = {
  async getById(id: string): Promise<Artist> {
    await delay(300);
    if (id === mockArtist.id) {
      return { ...mockArtist };
    }
    throw new Error("Artist not found");
  },
  
  async update(id: string, data: Partial<Artist>): Promise<Artist> {
    await delay(500);
    return { ...mockArtist, ...data };
  },
};

// Mock Services API
export const servicesApi = {
  async getByArtist(artistId: string): Promise<Service[]> {
    await delay(300);
    return [...mockServices];
  },
  
  async create(service: Omit<Service, "id">): Promise<Service> {
    await delay(500);
    return { ...service, id: `service-${Date.now()}` };
  },
  
  async update(id: string, data: Partial<Service>): Promise<Service> {
    await delay(500);
    const service = mockServices.find((s) => s.id === id);
    if (!service) throw new Error("Service not found");
    return { ...service, ...data };
  },
  
  async delete(id: string): Promise<void> {
    await delay(300);
    // In real app, would delete from backend
  },
};

// Mock Bookings API
export const bookingsApi = {
  async getByArtist(artistId: string): Promise<Booking[]> {
    await delay(400);
    return [...mockBookings];
  },
  
  async getById(id: string): Promise<Booking> {
    await delay(300);
    const booking = mockBookings.find((b) => b.id === id);
    if (!booking) throw new Error("Booking not found");
    return { ...booking };
  },
  
  async create(booking: Omit<Booking, "id" | "createdAt" | "updatedAt">): Promise<Booking> {
    await delay(500);
    return {
      ...booking,
      id: `booking-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
  
  async updateStatus(id: string, status: Booking["status"]): Promise<Booking> {
    await delay(400);
    const booking = mockBookings.find((b) => b.id === id);
    if (!booking) throw new Error("Booking not found");
    return { ...booking, status, updatedAt: new Date().toISOString() };
  },
  
  async delete(id: string): Promise<void> {
    await delay(300);
  },
};

// Mock Calendar API
export const calendarApi = {
  async getByArtist(artistId: string): Promise<CalendarBlock[]> {
    await delay(300);
    return [...mockCalendarBlocks];
  },
  
  async create(block: Omit<CalendarBlock, "id">): Promise<CalendarBlock> {
    await delay(400);
    return { ...block, id: `block-${Date.now()}` };
  },
  
  async delete(id: string): Promise<void> {
    await delay(300);
  },
};

// Mock Media API
export const mediaApi = {
  async getByArtist(artistId: string): Promise<MediaItem[]> {
    await delay(300);
    return [...mockMediaItems];
  },
  
  async upload(artistId: string, file: File): Promise<MediaItem> {
    await delay(1000); // Simulate upload time
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          id: `media-${Date.now()}`,
          artistId,
          type: file.type.startsWith("video") ? "video" : "image",
          url: "",
          dataUrl: reader.result as string,
          fileName: file.name,
          fileSize: file.size,
          order: 0,
          uploadedAt: new Date().toISOString(),
          syncStatus: "pending",
        });
      };
      reader.readAsDataURL(file);
    });
  },
  
  async updateOrder(artistId: string, mediaIds: string[]): Promise<void> {
    await delay(300);
  },
  
  async delete(id: string): Promise<void> {
    await delay(300);
  },
};

// Export combined API client
export const apiClient = {
  auth: authApi,
  artists: artistsApi,
  services: servicesApi,
  bookings: bookingsApi,
  calendar: calendarApi,
  media: mediaApi,
};
