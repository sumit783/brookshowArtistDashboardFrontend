// API Client - Real API endpoints implementation
// All data fetching uses real backend API endpoints

import { config } from "../config";
import {
  Artist,
  Service,
  Booking,
  CalendarBlock,
  MediaItem,
  LoginCredentials,
  AuthUser,
  RegisterPayload,
  RegisterResponse,
  VerifyOTPPayload,
  VerifyOTPResponse,
  ProfilePayload,
} from "../types";
// Removed mock data imports - now using real API endpoints

// Simulated network delay (only used for mock login)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Centralized fetch with headers (x_api_key and Authorization)
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("auth_token");
  const headers = new Headers(init?.headers || {});
  
  // Only set Content-Type for non-FormData requests
  if (!(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  
  if (config.apiKey) {
    headers.set("x_api_key", config.apiKey);
    headers.set("x-api-key", config.apiKey); // compatibility with hyphenated header
  } else if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn("VITE_API_KEY is not set; requests may be rejected by the API.");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  
  const url = `${config.apiBaseUrl.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
  
  // Log headers for debugging (only in dev mode and for services endpoint)
  if (import.meta.env.DEV && path.includes("services")) {
    console.log("=== apiFetch Request ===");
    console.log("Path:", path);
    console.log("Full URL:", url);
    console.log("Method:", init?.method || "GET");
    console.log("API Request Headers:", {
      "Authorization": token ? "Bearer [token present]" : "Not set",
      "x_api_key": config.apiKey ? "[API key present]" : "Not set",
      "x-api-key": config.apiKey ? "[API key present]" : "Not set",
      "Content-Type": headers.get("Content-Type"),
    });
    if (init?.body) {
      console.log("Request Body:", init.body instanceof FormData ? "[FormData]" : init.body);
    }
  }
  
  const response = await fetch(url, { ...init, headers });
  
  // Log response for services endpoint
  if (import.meta.env.DEV && path.includes("services")) {
    console.log("=== apiFetch Response ===");
    console.log("Status:", response.status, response.statusText);
    console.log("Headers:", Object.fromEntries(response.headers.entries()));
  }
  // Global network issue handling
  if (response.status === 503 || (!navigator.onLine)) {
    try {
      window.dispatchEvent(new Event("network-issue"));
    } catch (_) {
      // ignore
    }
  } else {
    // Inspect body (non-blocking) for specific backend error without consuming stream
    const clone = response.clone();
    clone.text().then((text) => {
      if (text && text.includes("Network connection required")) {
        window.dispatchEvent(new Event("network-issue"));
      }
    }).catch(() => {});
  }
  return response;
}

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
        },
        token: "mock-jwt-token",
      };
    }
    
    throw new Error("Invalid credentials");
  },
  
  async register(payload: RegisterPayload): Promise<{ user: AuthUser }> {
    // Always hit real backend for registration; ignores mock mode
    const response = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      let message = "Registration failed";
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json().catch(() => null);
        message = (data && (data.message || data.error)) || message;
        // Include HTTP status for caller-side parsing/branching
        throw new Error(JSON.stringify({ message, status: response.status }));
      } else {
        const text = await response.text().catch(() => "");
        message = text || message;
        throw new Error(message);
      }
    }
    const data: RegisterResponse = await response.json();
    if (!data.success) {
      throw new Error(data.message || "Registration failed");
    }
    const mappedUser: AuthUser = {
      id: data.user._id,
      email: data.user.email,
      role: data.user.role === "artist" ? "artist" : "admin",
    };
    return { user: mappedUser };
  },
  
  async verifyOTP(payload: VerifyOTPPayload): Promise<{ user: AuthUser; token: string }> {
    // Verify registration OTP and get JWT token
    const response = await apiFetch("/auth/verify-registration-otp", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "OTP verification failed");
    }
    const data: VerifyOTPResponse = await response.json();
    if (!data.success) {
      throw new Error(data.message || "OTP verification failed");
    }
    const mappedUser: AuthUser = {
      id: data.user._id,
      email: data.user.email,
      role: data.user.role === "artist" ? "artist" : "admin",
    };
    return { user: mappedUser, token: data.jwtToken };
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

// Artists API
export const artistsApi = {
  async getCategories(activeOnly: boolean = true): Promise<string[]> {
    const response = await apiFetch(`/artist/categories?activeOnly=${activeOnly ? "true" : "false"}`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Failed to load categories");
    }
    const data = await response.json();
    return Array.isArray(data?.categories) ? data.categories : [];
  },
  async getById(id: string): Promise<Artist> {
    try {
      console.log("Fetching artist by ID:", id);
      const response = await apiFetch(`/artist/${id}`);
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to load artist: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Artist response data:", data);
      
      if (!data.success || !data.artist) {
        throw new Error(data.message || "Artist not found");
      }
      
      const artist = data.artist;
      
      // Map API response to Artist type
      const mappedArtist: Artist = {
        id: artist._id || id,
        displayName: artist.displayName || artist.name || "",
        email: artist.email || "",
        phone: artist.phone || "",
        city: artist.city || artist.location?.city || "",
        categories: Array.isArray(artist.categories) ? artist.categories : (Array.isArray(artist.category) ? artist.category : []),
        bio: artist.bio || "",
        verified: artist.verified !== undefined ? artist.verified : (artist.isVerified || false),
        media: Array.isArray(artist.media) ? artist.media : [],
        coverImageId: artist.coverImageId || artist.profileImage || undefined,
        createdAt: artist.createdAt || new Date().toISOString(),
      };
      
      console.log("Mapped artist:", mappedArtist);
      return mappedArtist;
    } catch (error) {
      console.error("Error in getById:", error);
      throw error;
    }
  },
  
  async update(id: string, data: Partial<Artist>): Promise<Artist> {
    try {
      console.log("Updating artist:", id, data);
      
      const updatePayload: any = {};
      if (data.displayName !== undefined) updatePayload.displayName = data.displayName;
      if (data.email !== undefined) updatePayload.email = data.email;
      if (data.phone !== undefined) updatePayload.phone = data.phone;
      if (data.bio !== undefined) updatePayload.bio = data.bio;
      if (data.categories !== undefined) updatePayload.categories = data.categories;
      if (data.city !== undefined) updatePayload.city = data.city;
      if (data.coverImageId !== undefined) updatePayload.coverImageId = data.coverImageId;
      if (data.verified !== undefined) updatePayload.verified = data.verified;
      
      const response = await apiFetch(`/artist/${id}`, {
        method: "PUT",
        body: JSON.stringify(updatePayload),
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to update artist: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      
      if (!responseData.success || !responseData.artist) {
        throw new Error(responseData.message || "Artist update was not successful");
      }
      
      const artist = responseData.artist;
      
      // Map API response back to Artist type
      const mappedArtist: Artist = {
        id: artist._id || id,
        displayName: artist.displayName || artist.name || data.displayName || "",
        email: artist.email || data.email || "",
        phone: artist.phone || data.phone || "",
        city: artist.city || artist.location?.city || data.city || "",
        categories: Array.isArray(artist.categories) ? artist.categories : (Array.isArray(artist.category) ? artist.category : (data.categories || [])),
        bio: artist.bio || data.bio || "",
        verified: artist.verified !== undefined ? artist.verified : (artist.isVerified !== undefined ? artist.isVerified : (data.verified || false)),
        media: Array.isArray(artist.media) ? artist.media : (data.media || []),
        coverImageId: artist.coverImageId || artist.profileImage || data.coverImageId || undefined,
        createdAt: artist.createdAt || new Date().toISOString(),
      };
      
      return mappedArtist;
    } catch (error) {
      console.error("Error in update:", error);
      throw error;
    }
  },
  
  async updateProfile(payload: ProfilePayload): Promise<{ success: boolean; message: string }> {
    // Always hit real backend for profile update
    const formData = new FormData();
    
    if (payload.profileImage) {
      formData.append("profileImage", payload.profileImage);
    }
    formData.append("bio", payload.bio);
    formData.append("category", payload.category.join(",")); // Comma-separated string
    formData.append("city", payload.city);
    formData.append("state", payload.state);
    formData.append("country", payload.country);
    formData.append("eventPricing", JSON.stringify(payload.eventPricing));
    
    const response = await apiFetch("/artist/profile", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Profile update failed");
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || "Profile update failed");
    }
    
    return data;
  },
};

// Services API
export const servicesApi = {
  async getByArtist(artistId: string): Promise<Service[]> {
    try {
      const token = localStorage.getItem("auth_token");
      const apiKey = config.apiKey;
      console.log("Fetching services - Token present:", !!token);
      console.log("Fetching services - API Key present:", !!apiKey);
      console.log("ArtistId:", artistId);
      
      const response = await apiFetch("/services/");
      console.log("Response status:", response.status, response.statusText);
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to load services: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("API Response Data:", data);
      
      if (!data.success) {
        console.error("API returned success: false", data);
        throw new Error(data.message || "API request was not successful");
      }
      
      if (!Array.isArray(data.services)) {
        console.error("Invalid response format - services is not an array:", data);
        throw new Error("Invalid response format: services is not an array");
      }
      
      console.log("Mapping services:", data.services.length, "items");
      
      // Map API response to Service type
      const mappedServices = data.services.map((service: any) => ({
        id: service._id,
        artistId: artistId,
        title: service.category || "Service",
        description: service.description || "",
        unit: service.unit || "day",
        price_for_user: service.price_for_user || 0,
        price_for_planner: service.price_for_planner || 0,
        advance: service.advance || 0,
        extras: service.extras || [],
        active: service.active !== undefined ? service.active : true,
      }));
      
      console.log("Mapped services:", mappedServices);
      return mappedServices;
    } catch (error) {
      console.error("Error in getByArtist:", error);
      throw error;
    }
  },

  async getServicesAndId(): Promise<Array<{ id: string; category: string }>> {
    try {
      const token = localStorage.getItem("auth_token");
      const apiKey = config.apiKey;
      console.log("=== getServicesAndId START ===");
      console.log("Token present:", !!token);
      console.log("API Key present:", !!apiKey);
      console.log("API Base URL:", config.apiBaseUrl);
      console.log("Fetching services and IDs from /services/services-and-id");
      
      const response = await apiFetch("/services/services-and-id");
      console.log("Services and ID response status:", response.status, response.statusText);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      // Read response body once (can only be read once)
      const responseText = await response.text();
      console.log("Response text (raw):", responseText);
      console.log("Response text length:", responseText.length);
      
      // Check if response is empty
      if (!responseText || responseText.trim().length === 0) {
        console.error("Empty response from server");
        throw new Error("Empty response from server");
      }
      
      // Parse response
      let data;
      try {
        data = JSON.parse(responseText);
        console.log("Services and ID response data (parsed):", data);
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);
        console.error("Response text that failed to parse:", responseText);
        throw new Error(`Invalid JSON response from server: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      
      // Check response status after parsing (to get error message from JSON if available)
      if (!response.ok) {
        console.error("API returned error status:", response.status);
        console.error("Error response data:", data);
        throw new Error(data?.message || data?.error || responseText || `Failed to load services: ${response.status} ${response.statusText}`);
      }
      
      // Validate response structure
      if (!data.success) {
        console.error("API returned success: false", data);
        throw new Error(data.message || data.error || "API request was not successful");
      }
      
      if (!data.services) {
        console.error("No services field in response:", data);
        throw new Error("Invalid response format: services field is missing");
      }
      
      if (!Array.isArray(data.services)) {
        console.error("Invalid response format - services is not an array:", data);
        console.error("Services type:", typeof data.services, "Value:", data.services);
        throw new Error("Invalid response format: services is not an array");
      }
      
      console.log("Mapping services and IDs:", data.services.length, "items");
      console.log("Raw services data:", data.services);
      
      // Map API response to simple service option format
      const mappedServices = data.services.map((service: any, index: number) => {
        const mapped = {
          id: service.id || service._id,
          category: service.category || "Service",
        };
        console.log(`Service ${index + 1}:`, { raw: service, mapped });
        return mapped;
      });
      
      console.log("Mapped services and IDs:", mappedServices);
      console.log("=== getServicesAndId SUCCESS ===");
      return mappedServices;
    } catch (error) {
      console.error("=== getServicesAndId ERROR ===");
      console.error("Error in getServicesAndId:", error);
      console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      throw error;
    }
  },
  
  async create(service: Omit<Service, "id">): Promise<Service> {
    await delay(500);
    return { ...service, id: `service-${Date.now()}` };
  },
  
  async update(id: string, data: Partial<Service>): Promise<Service> {
    try {
      console.log("Updating service:", id, "with data:", data);
      
      // Map Service fields back to API format
      const updatePayload: any = {};
      if (data.price_for_user !== undefined) {
        updatePayload.price_for_user = data.price_for_user;
      }
      if (data.price_for_planner !== undefined) {
        updatePayload.price_for_planner = data.price_for_planner;
      }
      if (data.advance !== undefined) {
        updatePayload.advance = data.advance;
      }
      if (data.unit !== undefined) {
        updatePayload.unit = data.unit;
      }
      if (data.title !== undefined) {
        updatePayload.category = data.title;
      }
      if (data.description !== undefined) {
        updatePayload.description = data.description;
      }
      if (data.active !== undefined) {
        updatePayload.active = data.active;
      }
      
      const response = await apiFetch(`/services/${id}`, {
        method: "PUT",
        body: JSON.stringify(updatePayload),
      });
      
      console.log("Update response status:", response.status, response.statusText);
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to update service: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log("Update response data:", responseData);
      
      if (!responseData.success) {
        throw new Error(responseData.message || "Service update was not successful");
      }
      
      // Map API response back to Service type
      const service = responseData.service || responseData;
      return {
        id: service._id || id,
        artistId: data.artistId || "",
        title: service.category || data.title || "",
        description: service.description || data.description || "",
        unit: service.unit || data.unit || "day",
        price_for_user: service.price_for_user ?? data.price_for_user ?? 0,
        price_for_planner: service.price_for_planner ?? data.price_for_planner ?? 0,
        advance: service.advance ?? data.advance ?? 0,
        extras: service.extras || data.extras || [],
        active: service.active !== undefined ? service.active : (data.active !== undefined ? data.active : true),
      };
    } catch (error) {
      console.error("Error in update:", error);
      throw error;
    }
  },
  
  async delete(id: string): Promise<void> {
    try {
      console.log("Deleting service:", id);
      const response = await apiFetch(`/services/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to delete service: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Service deletion was not successful");
      }
    } catch (error) {
      console.error("Error in delete:", error);
      throw error;
    }
  },
};

// Bookings API
export const bookingsApi = {
  async getByArtist(artistId: string): Promise<Booking[]> {
    try {
      console.log("Fetching bookings for artistId:", artistId);
      const response = await apiFetch("/bookings/");
      console.log("Bookings response status:", response.status, response.statusText);
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to load bookings: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Bookings response data:", data);
      
      if (!data.success) {
        console.error("API returned success: false", data);
        throw new Error(data.message || "API request was not successful");
      }
      
      if (!Array.isArray(data.bookings)) {
        console.error("Invalid response format - bookings is not an array:", data);
        // Return empty array if no bookings
        return [];
      }
      
      console.log("Mapping bookings:", data.bookings.length, "items");
      
      // Map API response to Booking type
      const mappedBookings = data.bookings.map((booking: any) => ({
        id: booking._id,
        clientName: booking.clientName || booking.client?.name || "Unknown Client",
        clientPhone: booking.clientPhone || booking.client?.phone || "",
        clientPhoneMasked: booking.clientPhoneMasked || booking.client?.phoneMasked || "",
        start: booking.startAt || booking.start,
        end: booking.endAt || booking.end,
        serviceId: booking.serviceId?._id || booking.serviceId || "",
        serviceName: booking.serviceId?.category || booking.serviceName || "Service",
        artistId: typeof booking.artistId === "string" ? booking.artistId : booking.artistId?._id || "",
        source: booking.source === "offline" ? "user" : (booking.source === "planner" ? "planner" : "user"),
        status: booking.status || "pending",
        price: booking.totalPrice || booking.price || 0,
        notes: booking.notes || booking.description || "",
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        syncStatus: "synced" as const,
      }));
      
      console.log("Mapped bookings:", mappedBookings);
      return mappedBookings;
    } catch (error) {
      console.error("Error in getByArtist:", error);
      throw error;
    }
  },
  
  async getById(id: string): Promise<Booking> {
    try {
      console.log("Fetching booking by ID:", id);
      const response = await apiFetch(`/bookings/${id}`);
      console.log("Booking response status:", response.status, response.statusText);
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to load booking: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Booking response data:", data);
      
      if (!data.success || !data.booking) {
        throw new Error(data.message || "Booking not found");
      }
      
      const booking = data.booking;
      
      // Map API response to Booking type
      // Note: The API response may have client info in different fields
      const mappedBooking: Booking = {
        id: booking._id,
        clientName: booking.clientName || booking.client?.name || "Unknown Client",
        clientPhone: booking.clientPhone || booking.client?.phone || "",
        clientPhoneMasked: booking.clientPhoneMasked || booking.client?.phoneMasked || "",
        start: booking.startAt || booking.start,
        end: booking.endAt || booking.end,
        serviceId: booking.serviceId?._id || booking.serviceId || "",
        serviceName: booking.serviceId?.category || booking.serviceName || "Service",
        artistId: typeof booking.artistId === "string" ? booking.artistId : booking.artistId?._id || "",
        source: booking.source === "offline" ? "user" : (booking.source === "planner" ? "planner" : "user"),
        status: booking.status || "pending",
        price: booking.totalPrice || booking.price || 0,
        notes: booking.notes || booking.description || "",
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        syncStatus: "synced",
      };
      
      console.log("Mapped booking:", mappedBooking);
      return mappedBooking;
    } catch (error) {
      console.error("Error in getById:", error);
      throw error;
    }
  },
  
  async create(booking: Omit<Booking, "id" | "createdAt" | "updatedAt">): Promise<Booking> {
    try {
      console.log("Creating booking:", booking);
      
      // Map Booking type to API format
      const createPayload: any = {
        artistId: booking.artistId,
        serviceId: booking.serviceId || undefined,
        startAt: booking.start,
        endAt: booking.end,
        clientName: booking.clientName,
        clientPhone: booking.clientPhone || undefined,
        source: booking.source === "user" ? "offline" : booking.source,
        status: booking.status || "pending",
        totalPrice: booking.price || 0,
        notes: booking.notes || undefined,
      };
      
      const response = await apiFetch("/bookings/", {
        method: "POST",
        body: JSON.stringify(createPayload),
      });
      
      console.log("Create booking response status:", response.status, response.statusText);
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to create booking: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Create booking response data:", data);
      
      if (!data.success || !data.booking) {
        throw new Error(data.message || "Booking creation was not successful");
      }
      
      const createdBooking = data.booking;
      
      // Map API response back to Booking type
      const mappedBooking: Booking = {
        id: createdBooking._id,
        clientName: createdBooking.clientName || booking.clientName,
        clientPhone: createdBooking.clientPhone || booking.clientPhone || "",
        clientPhoneMasked: createdBooking.clientPhoneMasked || booking.clientPhoneMasked || "",
        start: createdBooking.startAt || createdBooking.start || booking.start,
        end: createdBooking.endAt || createdBooking.end || booking.end,
        serviceId: createdBooking.serviceId?._id || createdBooking.serviceId || booking.serviceId || "",
        serviceName: createdBooking.serviceId?.category || createdBooking.serviceName || booking.serviceName,
        artistId: typeof createdBooking.artistId === "string" ? createdBooking.artistId : createdBooking.artistId?._id || booking.artistId,
        source: createdBooking.source === "offline" ? "user" : (createdBooking.source === "planner" ? "planner" : "user"),
        status: createdBooking.status || booking.status,
        price: createdBooking.totalPrice || createdBooking.price || booking.price,
        notes: createdBooking.notes || booking.notes || "",
        createdAt: createdBooking.createdAt,
        updatedAt: createdBooking.updatedAt,
        syncStatus: "synced",
      };
      
      console.log("Mapped created booking:", mappedBooking);
      return mappedBooking;
    } catch (error) {
      console.error("Error in create:", error);
      throw error;
    }
  },
  
  async updateStatus(id: string, status: Booking["status"]): Promise<Booking> {
    try {
      console.log("Updating booking status:", id, status);
      
      const response = await apiFetch(`/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to update booking status: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.booking) {
        throw new Error(data.message || "Booking status update was not successful");
      }
      
      const booking = data.booking;
      
      // Map API response back to Booking type
      const mappedBooking: Booking = {
        id: booking._id,
        clientName: booking.clientName || "Unknown Client",
        clientPhone: booking.clientPhone || "",
        clientPhoneMasked: booking.clientPhoneMasked || "",
        start: booking.startAt || booking.start,
        end: booking.endAt || booking.end,
        serviceId: booking.serviceId?._id || booking.serviceId || "",
        serviceName: booking.serviceId?.category || booking.serviceName || "Service",
        artistId: typeof booking.artistId === "string" ? booking.artistId : booking.artistId?._id || "",
        source: booking.source === "offline" ? "user" : (booking.source === "planner" ? "planner" : "user"),
        status: booking.status || status,
        price: booking.totalPrice || booking.price || 0,
        notes: booking.notes || booking.description || "",
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        syncStatus: "synced",
      };
      
      return mappedBooking;
    } catch (error) {
      console.error("Error in updateStatus:", error);
      throw error;
    }
  },
  
  async createOffline(payload: { serviceId: string; startAt: string; endAt: string; totalPrice: number }): Promise<Booking> {
    try {
      console.log("Creating offline booking:", payload);
      
      const response = await apiFetch("/bookings/offline", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      
      console.log("Create offline booking response status:", response.status, response.statusText);
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to create offline booking: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Create offline booking response data:", data);
      
      if (!data.success || !data.booking) {
        throw new Error(data.message || "Offline booking creation was not successful");
      }
      
      const booking = data.booking;
      
      // Map API response to Booking type
      const mappedBooking: Booking = {
        id: booking._id,
        clientName: booking.clientName || "Unknown Client",
        clientPhone: booking.clientPhone || "",
        clientPhoneMasked: booking.clientPhoneMasked || "",
        start: booking.startAt || booking.start,
        end: booking.endAt || booking.end,
        serviceId: booking.serviceId?._id || booking.serviceId || payload.serviceId,
        serviceName: booking.serviceId?.category || booking.serviceName || "Service",
        artistId: typeof booking.artistId === "string" ? booking.artistId : booking.artistId?._id || "",
        source: booking.source === "offline" ? "user" : (booking.source === "planner" ? "planner" : "user"),
        status: booking.status || "confirmed",
        price: booking.totalPrice || booking.price || payload.totalPrice,
        notes: booking.notes || booking.description || "",
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        syncStatus: "synced",
      };
      
      console.log("Mapped offline booking:", mappedBooking);
      return mappedBooking;
    } catch (error) {
      console.error("Error in createOffline:", error);
      throw error;
    }
  },
  
  async delete(id: string): Promise<void> {
    try {
      console.log("Deleting booking:", id);
      const response = await apiFetch(`/bookings/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to delete booking: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Booking deletion was not successful");
      }
    } catch (error) {
      console.error("Error in delete:", error);
      throw error;
    }
  },
};

// Calendar API
export const calendarApi = {
  async getByArtist(artistId: string): Promise<CalendarBlock[]> {
    try {
      console.log("Fetching calendar blocks from /api/calendar-blocks/");
      const response = await apiFetch("/calendar-blocks/");
      console.log("Calendar blocks response status:", response.status, response.statusText);
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to load calendar blocks: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Calendar blocks response data:", data);
      
      if (!data.success) {
        console.error("API returned success: false", data);
        throw new Error(data.message || "API request was not successful");
      }
      
      if (!Array.isArray(data.calendarBlocks)) {
        console.error("Invalid response format - calendarBlocks is not an array:", data);
        throw new Error("Invalid response format: calendarBlocks is not an array");
      }
      
      console.log("Mapping calendar blocks:", data.calendarBlocks.length, "items");
      
      // Map API response to CalendarBlock type
      const mappedBlocks = data.calendarBlocks.map((block: any) => ({
        id: block._id,
        artistId: block.artistId,
        start: block.startDate,
        end: block.endDate,
        type: block.type === "offlineBooking" ? "offline-booking" as const : "busy" as const,
        title: block.title || "Calendar Block",
        linkedBookingId: block.linkedBookingId || undefined,
        syncStatus: "synced" as const,
      }));
      
      console.log("Mapped calendar blocks:", mappedBlocks);
      return mappedBlocks;
    } catch (error) {
      console.error("Error in getByArtist:", error);
      throw error;
    }
  },
  
  async create(block: Omit<CalendarBlock, "id">): Promise<CalendarBlock> {
    try {
      console.log("Creating calendar block:", block);
      
      // Map CalendarBlock type to API format
      const createPayload: any = {
        artistId: block.artistId,
        startDate: block.start,
        endDate: block.end,
        type: block.type === "offline-booking" ? "offlineBooking" : block.type,
        title: block.title,
        linkedBookingId: block.linkedBookingId || undefined,
      };
      
      const response = await apiFetch("/calendar-blocks/", {
        method: "POST",
        body: JSON.stringify(createPayload),
      });
      
      console.log("Create calendar block response status:", response.status, response.statusText);
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to create calendar block: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Create calendar block response data:", data);
      
      if (!data.success || !data.calendarBlock) {
        throw new Error(data.message || "Calendar block creation was not successful");
      }
      
      const createdBlock = data.calendarBlock;
      
      // Map API response back to CalendarBlock type
      const mappedBlock: CalendarBlock = {
        id: createdBlock._id,
        artistId: createdBlock.artistId || block.artistId,
        start: createdBlock.startDate || createdBlock.start || block.start,
        end: createdBlock.endDate || createdBlock.end || block.end,
        type: createdBlock.type === "offlineBooking" ? "offline-booking" as const : "busy" as const,
        title: createdBlock.title || block.title,
        linkedBookingId: createdBlock.linkedBookingId || block.linkedBookingId,
        syncStatus: "synced" as const,
      };
      
      console.log("Mapped created calendar block:", mappedBlock);
      return mappedBlock;
    } catch (error) {
      console.error("Error in create:", error);
      throw error;
    }
  },
  
  async delete(id: string): Promise<void> {
    try {
      console.log("Deleting calendar block:", id);
      const response = await apiFetch(`/calendar-blocks/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to delete calendar block: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Calendar block deletion was not successful");
      }
    } catch (error) {
      console.error("Error in delete:", error);
      throw error;
    }
  },
};

// Media API
export const mediaApi = {
  async getByArtist(artistId: string): Promise<MediaItem[]> {
    try {
      console.log("Fetching media for artistId:", artistId);
      const response = await apiFetch(`/media/?artistId=${artistId}`);
      console.log("Media response status:", response.status, response.statusText);
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        // Return empty array if media endpoint doesn't exist yet
        if (response.status === 404) {
          return [];
        }
        throw new Error(text || `Failed to load media: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Media response data:", data);
      
      if (!data.success) {
        console.error("API returned success: false", data);
        // Return empty array if no media
        return [];
      }
      
      if (!Array.isArray(data.media)) {
        console.error("Invalid response format - media is not an array:", data);
        return [];
      }
      
      console.log("Mapping media:", data.media.length, "items");
      
      // Map API response to MediaItem type
      const mappedMedia = data.media.map((item: any) => ({
        id: item._id,
        artistId: item.artistId || artistId,
        type: item.type || (item.url?.match(/\.(mp4|webm|mov)$/i) ? "video" : "image"),
        url: item.url || "",
        dataUrl: item.dataUrl || "",
        fileName: item.fileName || item.url?.split("/").pop() || "",
        fileSize: item.fileSize || 0,
        order: item.order || 0,
        uploadedAt: item.uploadedAt || item.createdAt || new Date().toISOString(),
        syncStatus: "synced" as const,
      }));
      
      console.log("Mapped media:", mappedMedia);
      return mappedMedia;
    } catch (error) {
      console.error("Error in getByArtist:", error);
      // Return empty array on error to prevent breaking the app
      return [];
    }
  },
  
  async upload(artistId: string, file: File): Promise<MediaItem> {
    try {
      console.log("Uploading media for artistId:", artistId, "file:", file.name);
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("artistId", artistId);
      
      const response = await apiFetch("/media/upload", {
        method: "POST",
        body: formData,
      });
      
      console.log("Upload response status:", response.status, response.statusText);
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to upload media: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Upload response data:", data);
      
      if (!data.success || !data.media) {
        throw new Error(data.message || "Media upload was not successful");
      }
      
      const uploadedMedia = data.media;
      
      // Map API response to MediaItem type
      const mappedMedia: MediaItem = {
        id: uploadedMedia._id,
        artistId: uploadedMedia.artistId || artistId,
        type: uploadedMedia.type || (file.type.startsWith("video") ? "video" : "image"),
        url: uploadedMedia.url || "",
        dataUrl: uploadedMedia.dataUrl || "",
        fileName: uploadedMedia.fileName || file.name,
        fileSize: uploadedMedia.fileSize || file.size,
        order: uploadedMedia.order || 0,
        uploadedAt: uploadedMedia.uploadedAt || uploadedMedia.createdAt || new Date().toISOString(),
        syncStatus: "synced" as const,
      };
      
      console.log("Mapped uploaded media:", mappedMedia);
      return mappedMedia;
    } catch (error) {
      console.error("Error in upload:", error);
      throw error;
    }
  },
  
  async updateOrder(artistId: string, mediaIds: string[]): Promise<void> {
    try {
      console.log("Updating media order for artistId:", artistId, "order:", mediaIds);
      
      const response = await apiFetch("/media/order", {
        method: "PUT",
        body: JSON.stringify({
          artistId,
          mediaIds,
        }),
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to update media order: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Media order update was not successful");
      }
    } catch (error) {
      console.error("Error in updateOrder:", error);
      throw error;
    }
  },
  
  async delete(id: string): Promise<void> {
    try {
      console.log("Deleting media:", id);
      const response = await apiFetch(`/media/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(text || `Failed to delete media: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Media deletion was not successful");
      }
    } catch (error) {
      console.error("Error in delete:", error);
      throw error;
    }
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
