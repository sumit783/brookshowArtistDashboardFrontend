// BrookShow Configuration

export const config = {
  // Brand
  brandName: "BrookShow",
  tagline: "Book Artists, Capture Memories",
  
  // API Configuration - Replace with your actual backend URL
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api",
  
  // Mock mode - Set to false when connecting to real backend
  useMockData: true,
  
  // Features
  features: {
    offlineSync: true,
    pwa: true,
    whatsappIntegration: true,
  },
  
  // Booking settings
  booking: {
    advanceBookingDays: 90,
    cancellationHours: 24,
  },
  
  // Contact
  supportEmail: "support@brookshow.com",
  supportPhone: "+1234567890",
  whatsappNumber: "1234567890",
};
