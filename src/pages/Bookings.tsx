import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { apiClient } from "../services/apiClient";
import { storage } from "../services/storage";
import { syncQueue } from "../services/syncQueue";
import { Booking, BookingStatus } from "../types";
import { BookingCard } from "../components/BookingCard";
import { BookingDetailModal } from "../components/BookingDetailModal";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useToast } from "../hooks/use-toast";
import { config } from "../config";

export default function Bookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const { toast } = useToast();

  useEffect(() => {
    loadBookings();
  }, [user]);

  const loadBookings = async () => {
    if (!user?.artistId) return;

    try {
      // Try to load from IndexedDB first
      const cached = await storage.getAllItems<Booking>("bookings");
      if (cached.length > 0) {
        setBookings(cached);
      }

      // Then fetch from API
      const data = await apiClient.bookings.getByArtist(user.artistId);
      setBookings(data);

      // Update cache
      for (const booking of data) {
        await storage.setItem("bookings", booking.id, booking);
      }
    } catch (error) {
      console.error("Failed to load bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (id: string, status: BookingStatus) => {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;

    // Optimistic update
    const updatedBooking = { ...booking, status, syncStatus: "pending" as const };
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? updatedBooking : b))
    );

    // Update local storage
    await storage.setItem("bookings", id, updatedBooking);

    // Add to sync queue
    await syncQueue.enqueue({
      action: "update",
      entity: "booking",
      data: { id, status },
    });

    toast({
      title: "Booking updated",
      description: `Booking ${status}`,
    });
  };

  const handleComplete = (id: string) => updateBookingStatus(id, "completed");

  const handleWhatsApp = (phone: string) => {
    const message = encodeURIComponent("Hello! This is regarding your booking with BrookShow.");
    window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${message}`, "_blank");
  };

  const filteredBookings = bookings.filter((booking) =>
    filter === "all" ? true : booking.status === filter
  );

  if (loading) {
    return <div className="animate-pulse">Loading bookings...</div>;
  }

  return (
    <div className="space-y-6 slide-in-up">
      <div className="glass-modern p-6 rounded-lg">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Bookings</h1>
        <p className="text-muted-foreground mt-1">Manage your event bookings</p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredBookings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No bookings found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onComplete={handleComplete}
              onWhatsApp={handleWhatsApp}
              onClick={() => setSelectedBooking(booking)}
            />
          ))}
        </div>
      )}

      <BookingDetailModal
        booking={selectedBooking}
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onBlockCalendar={(booking) => {
          toast({
            title: "Calendar block created",
            description: "This booking has been blocked on your calendar",
          });
          setSelectedBooking(null);
        }}
      />
    </div>
  );
}
