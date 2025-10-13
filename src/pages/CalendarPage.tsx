import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { apiClient } from "../services/apiClient";
import { storage } from "../services/storage";
import { syncQueue } from "../services/syncQueue";
import { Booking, CalendarBlock } from "../types";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Plus } from "lucide-react";

export default function CalendarPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [showOfflineBookingModal, setShowOfflineBookingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [offlineBookingData, setOfflineBookingData] = useState({
    title: "",
    clientName: "",
    startTime: "",
    endTime: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.artistId) return;

    try {
      const [bookingsData, blocksData] = await Promise.all([
        apiClient.bookings.getByArtist(user.artistId),
        apiClient.calendar.getByArtist(user.artistId),
      ]);

      setBookings(bookingsData);
      setBlocks(blocksData);
    } catch (error) {
      console.error("Failed to load calendar data:", error);
    }
  };

  const handleDateClick = (info: any) => {
    setSelectedDate(info.date);
    setShowOfflineBookingModal(true);
  };

  const handleCreateOfflineBooking = async () => {
    if (!user?.artistId || !selectedDate) return;

    const start = new Date(selectedDate);
    const [startHour, startMin] = offlineBookingData.startTime.split(":");
    start.setHours(parseInt(startHour), parseInt(startMin));

    const end = new Date(selectedDate);
    const [endHour, endMin] = offlineBookingData.endTime.split(":");
    end.setHours(parseInt(endHour), parseInt(endMin));

    // Check for conflicts
    const hasConflict = bookings.some((booking) => {
      const bookingStart = new Date(booking.start);
      const bookingEnd = new Date(booking.end);
      return (
        (start >= bookingStart && start < bookingEnd) ||
        (end > bookingStart && end <= bookingEnd) ||
        (start <= bookingStart && end >= bookingEnd)
      );
    });

    if (hasConflict) {
      toast({
        title: "Conflict detected",
        description: "This time slot overlaps with an existing booking",
        variant: "destructive",
      });
      return;
    }

    // Create booking
    const newBooking: Omit<Booking, "id" | "createdAt" | "updatedAt"> = {
      clientName: offlineBookingData.clientName || "Offline Booking",
      clientPhone: "",
      clientPhoneMasked: "",
      start: start.toISOString(),
      end: end.toISOString(),
      serviceId: "",
      serviceName: offlineBookingData.title,
      artistId: user.artistId,
      source: "user",
      status: "confirmed",
      price: 0,
      syncStatus: "pending",
    };

    const booking = await apiClient.bookings.create(newBooking);
    await storage.setItem("bookings", booking.id, booking);
    setBookings((prev) => [...prev, booking]);

    // Create calendar block
    const newBlock: Omit<CalendarBlock, "id"> = {
      artistId: user.artistId,
      start: start.toISOString(),
      end: end.toISOString(),
      type: "offline-booking",
      title: offlineBookingData.title,
      linkedBookingId: booking.id,
      syncStatus: "pending",
    };

    const block = await apiClient.calendar.create(newBlock);
    await storage.setItem("calendarBlocks", block.id, block);
    setBlocks((prev) => [...prev, block]);

    // Add to sync queue
    await syncQueue.enqueue({
      action: "create",
      entity: "booking",
      data: booking,
    });

    await syncQueue.enqueue({
      action: "create",
      entity: "calendarBlock",
      data: block,
    });

    toast({
      title: "Offline booking created",
      description: "Successfully added to calendar",
    });

    setShowOfflineBookingModal(false);
    setOfflineBookingData({ title: "", clientName: "", startTime: "", endTime: "" });
  };

  const calendarEvents = [
    ...bookings.map((booking) => ({
      id: booking.id,
      title: `${booking.serviceName} - ${booking.clientName}`,
      start: booking.start,
      end: booking.end,
      backgroundColor:
        booking.status === "confirmed"
          ? "#16a34a"
          : booking.status === "pending"
          ? "#eab308"
          : "#6b7280",
      borderColor:
        booking.status === "confirmed"
          ? "#16a34a"
          : booking.status === "pending"
          ? "#eab308"
          : "#6b7280",
    })),
    ...blocks.map((block) => ({
      id: block.id,
      title: block.title,
      start: block.start,
      end: block.end,
      backgroundColor: block.type === "busy" ? "#64748b" : "#8b5cf6",
      borderColor: block.type === "busy" ? "#64748b" : "#8b5cf6",
    })),
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Manage your schedule and availability</p>
        </div>
        <Button onClick={() => setShowOfflineBookingModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Offline Booking
        </Button>
      </div>

      <div className="bg-card rounded-lg p-4 border">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={calendarEvents}
          dateClick={handleDateClick}
          height="auto"
          eventDisplay="block"
          displayEventTime={true}
          eventTimeFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: "short",
          }}
        />
      </div>

      <Dialog open={showOfflineBookingModal} onOpenChange={setShowOfflineBookingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Offline Booking</DialogTitle>
            <DialogDescription>
              Create a booking manually and block it on your calendar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Private Event"
                value={offlineBookingData.title}
                onChange={(e) =>
                  setOfflineBookingData((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="clientName">Client Name (Optional)</Label>
              <Input
                id="clientName"
                placeholder="Client name"
                value={offlineBookingData.clientName}
                onChange={(e) =>
                  setOfflineBookingData((prev) => ({ ...prev, clientName: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={offlineBookingData.startTime}
                  onChange={(e) =>
                    setOfflineBookingData((prev) => ({ ...prev, startTime: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={offlineBookingData.endTime}
                  onChange={(e) =>
                    setOfflineBookingData((prev) => ({ ...prev, endTime: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowOfflineBookingModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreateOfflineBooking}
              disabled={!offlineBookingData.title || !offlineBookingData.startTime || !offlineBookingData.endTime}
            >
              Create Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
