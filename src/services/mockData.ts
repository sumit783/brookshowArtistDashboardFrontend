// Mock data for BrookShow

import { Artist, Service, Booking, CalendarBlock, MediaItem } from "../types";

export const mockArtist: Artist = {
  id: "artist-1",
  displayName: "Sarah Johnson",
  email: "sarah@brookshow.com",
  phone: "+1234567890",
  city: "New York",
  categories: ["Photography", "Videography"],
  bio: "Professional photographer and videographer with 10+ years of experience capturing life's special moments.",
  verified: true,
  media: [],
  createdAt: new Date().toISOString(),
};

export const mockServices: Service[] = [
  {
    id: "service-1",
    artistId: "artist-1",
    title: "Event Photography",
    description: "Professional photography for your special events",
    unit: "per hour",
    price_for_user: 150,
    price_for_planner: 180,
    extras: [
      { id: "extra-1", title: "Photo Album", price: 50 },
      { id: "extra-2", title: "Digital Downloads", price: 30 },
    ],
    active: true,
  },
  {
    id: "service-2",
    artistId: "artist-1",
    title: "Wedding Photography",
    description: "Full day wedding photography package",
    unit: "per day",
    price_for_user: 1200,
    price_for_planner: 1500,
    extras: [
      { id: "extra-3", title: "Second Shooter", price: 300 },
      { id: "extra-4", title: "Engagement Session", price: 200 },
    ],
    active: true,
  },
  {
    id: "service-3",
    artistId: "artist-1",
    title: "Portrait Session",
    description: "Individual or family portrait photography",
    unit: "per session",
    price_for_user: 200,
    price_for_planner: 250,
    extras: [],
    active: true,
  },
];

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);

export const mockBookings: Booking[] = [
  {
    id: "booking-1",
    clientName: "John Smith",
    clientPhone: "+1234567891",
    clientPhoneMasked: "+1234****891",
    start: tomorrow.toISOString(),
    end: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    serviceId: "service-1",
    serviceName: "Event Photography",
    artistId: "artist-1",
    source: "user",
    status: "pending",
    price: 300,
    notes: "Birthday party at Central Park",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: "synced",
  },
  {
    id: "booking-2",
    clientName: "Emily Davis",
    clientPhone: "+1234567892",
    clientPhoneMasked: "+1234****892",
    start: nextWeek.toISOString(),
    end: new Date(nextWeek.getTime() + 4 * 60 * 60 * 1000).toISOString(),
    serviceId: "service-2",
    serviceName: "Wedding Photography",
    artistId: "artist-1",
    source: "planner",
    status: "confirmed",
    price: 1500,
    notes: "Wedding at Grand Hotel - arrive 1 hour early",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: "synced",
  },
  {
    id: "booking-3",
    clientName: "Michael Brown",
    clientPhone: "+1234567893",
    clientPhoneMasked: "+1234****893",
    start: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
    serviceId: "service-3",
    serviceName: "Portrait Session",
    artistId: "artist-1",
    source: "user",
    status: "completed",
    price: 200,
    notes: "Family portraits",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    syncStatus: "synced",
  },
];

export const mockCalendarBlocks: CalendarBlock[] = [
  {
    id: "block-1",
    artistId: "artist-1",
    start: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    type: "busy",
    title: "Personal Appointment",
    syncStatus: "synced",
  },
];

export const mockMediaItems: MediaItem[] = [];
