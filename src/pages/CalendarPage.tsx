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
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Calendar as CalendarIcon, Clock, User, Phone, DollarSign } from "lucide-react";

interface ServiceOption {
  id: string;
  category: string;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [showOfflineBookingModal, setShowOfflineBookingModal] = useState(false);
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [offlineBookingData, setOfflineBookingData] = useState({
    serviceId: "",
    title: "",
    clientName: "",
    startTime: "",
    endTime: "",
    totalPrice: "",
  });
  const [calendarView, setCalendarView] = useState<string>("dayGridMonth");
  const { toast } = useToast();

  // Determine initial view based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setCalendarView("timeGridDay");
      } else if (window.innerWidth < 1024) {
        setCalendarView("timeGridWeek");
      } else {
        setCalendarView("dayGridMonth");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    // For artist users, use user.id as artistId if artistId is not set
    const artistId = user?.artistId || (user?.role === "artist" ? user.id : null);
    
    if (!artistId) {
      console.warn("No artistId found in user object:", user);
      return;
    }

    try {
      console.log("Loading calendar data for artistId:", artistId);
      const [bookingsData, blocksData] = await Promise.all([
        apiClient.bookings.getByArtist(artistId),
        apiClient.calendar.getByArtist(artistId),
      ]);

      console.log("Loaded bookings:", bookingsData.length);
      console.log("Loaded blocks:", blocksData.length);
      setBookings(bookingsData);
      setBlocks(blocksData);
    } catch (error) {
      console.error("Failed to load calendar data:", error);
      toast({
        title: "Error",
        description: "Failed to load calendar data",
        variant: "destructive",
      });
    }
  };

  const handleDateClick = (info: any) => {
    console.log("handleDateClick called with date:", info.date);
    setSelectedDate(info.date);
    setShowOfflineBookingModal(true);
    console.log("Modal opened, loading services...");
    loadServices();
  };

  const loadServices = async () => {
    try {
      console.log("=== loadServices START ===");
      console.log("User:", user);
      setLoadingServices(true);
      console.log("Calling apiClient.services.getServicesAndId()");
      const servicesData = await apiClient.services.getServicesAndId();
      console.log("Received services data:", servicesData);
      console.log("Services count:", servicesData.length);
      setServices(servicesData);
      console.log("Services state updated");
      console.log("=== loadServices SUCCESS ===");
    } catch (error) {
      console.error("=== loadServices ERROR ===");
      console.error("Failed to load services:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : "No stack trace",
      });
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load services",
        variant: "destructive",
      });
      // Set empty array on error to prevent infinite loading state
      setServices([]);
    } finally {
      setLoadingServices(false);
      console.log("loadServices finally - loadingServices set to false");
    }
  };

  const handleEventClick = async (info: any) => {
    const eventId = info.event.id;
    const eventProps = info.event.extendedProps;
    console.log("Event clicked:", eventId, eventProps);
    
    let bookingId: string | null = null;
    
    // Check if this is a calendar block with a linked booking
    if (eventProps?.type === "block" && eventProps?.linkedBookingId) {
      bookingId = eventProps.linkedBookingId;
    } 
    // Or if it's a booking event directly
    else if (eventProps?.type === "booking" && eventProps?.bookingId) {
      bookingId = eventProps.bookingId;
    }
    
    if (bookingId) {
      try {
        setLoadingBooking(true);
        setShowBookingDetailsModal(true);
        const booking = await apiClient.bookings.getById(bookingId);
        setSelectedBooking(booking);
      } catch (error) {
        console.error("Failed to load booking details:", error);
        toast({
          title: "Error",
          description: "Failed to load booking details",
          variant: "destructive",
        });
        setShowBookingDetailsModal(false);
      } finally {
        setLoadingBooking(false);
      }
    }
  };

  const handleCreateOfflineBooking = async () => {
    const artistId = user?.artistId || (user?.role === "artist" ? user.id : null);
    if (!artistId || !selectedDate) return;

    if (!offlineBookingData.serviceId) {
      toast({
        title: "Service required",
        description: "Please select a service",
        variant: "destructive",
      });
      return;
    }

    if (!offlineBookingData.totalPrice || parseFloat(offlineBookingData.totalPrice) <= 0) {
      toast({
        title: "Price required",
        description: "Please enter a valid price",
        variant: "destructive",
      });
      return;
    }

    try {
      // Format dates as YYYY-MM-DD (date only, no time)
      const startDate = new Date(selectedDate);
      const endDate = new Date(selectedDate);
      
      // Format as YYYY-MM-DD
      const startAt = startDate.toISOString().split('T')[0];
      const endAt = endDate.toISOString().split('T')[0];

      // Create offline booking using the new endpoint
      const booking = await apiClient.bookings.createOffline({
        serviceId: offlineBookingData.serviceId,
        startAt: startAt,
        endAt: endAt,
        totalPrice: parseFloat(offlineBookingData.totalPrice),
      });

      // Reload calendar data to get the updated bookings and blocks
      await loadData();

      toast({
        title: "Offline booking created",
        description: "Successfully added to calendar",
      });

      setShowOfflineBookingModal(false);
      setOfflineBookingData({ 
        serviceId: "",
        title: "", 
        clientName: "", 
        startTime: "",
        endTime: "",
        totalPrice: "",
      });
      setServices([]); // Clear services when modal closes
    } catch (error) {
      console.error("Failed to create offline booking:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create offline booking",
        variant: "destructive",
      });
    }
  };

  const calendarEvents = [
    ...bookings.map((booking) => {
      // Modern gradient colors based on status - using CSS classes
      let backgroundColor, borderColor, classNames;
      if (booking.status === "confirmed") {
        backgroundColor = "#10b981";
        borderColor = "#10b981";
        classNames = "event-confirmed";
      } else if (booking.status === "pending") {
        backgroundColor = "#f59e0b";
        borderColor = "#f59e0b";
        classNames = "event-pending";
      } else if (booking.status === "completed") {
        backgroundColor = "#6366f1";
        borderColor = "#6366f1";
        classNames = "event-completed";
      } else {
        backgroundColor = "#6b7280";
        borderColor = "#6b7280";
        classNames = "event-cancelled";
      }

      return {
        id: booking.id,
        title: `${booking.serviceName} - ${booking.clientName}`,
        start: booking.start,
        end: booking.end,
        backgroundColor,
        borderColor,
        classNames,
        textColor: "#ffffff",
        extendedProps: {
          type: "booking",
          bookingId: booking.id,
        },
      };
    }),
    ...blocks.map((block) => {
      const backgroundColor = block.type === "busy" ? "#64748b" : "#8b5cf6";
      
      return {
        id: block.id,
        title: block.title,
        start: block.start,
        end: block.end,
        backgroundColor,
        borderColor: backgroundColor,
        classNames: block.type === "busy" ? "event-busy" : "event-offline",
        textColor: "#ffffff",
        extendedProps: {
          type: "block",
          blockId: block.id,
          linkedBookingId: block.linkedBookingId,
        },
      };
    }),
  ];

  return (
    <div className="space-y-4 md:space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 sm:h-7 sm:w-7" />
            Calendar
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your schedule and availability
          </p>
        </div>
        {/* <Button onClick={() => setShowOfflineBookingModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Offline Booking
        </Button> */}
      </div>

      {/* Calendar Legend */}
      <div className="relative flex flex-wrap items-center gap-4 p-4 rounded-lg border border-border/50 overflow-hidden bg-gradient-to-r from-card via-card/95 to-card backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>
        <div className="relative z-10 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-green-500 via-green-500 to-green-600 shadow-lg shadow-green-500/50"></div>
            <span className="text-sm font-medium">Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-amber-500 via-amber-500 to-amber-600 shadow-lg shadow-amber-500/50"></div>
            <span className="text-sm font-medium">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-indigo-500 via-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/50"></div>
            <span className="text-sm font-medium">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-slate-500 via-slate-500 to-slate-600 shadow-lg shadow-slate-500/50"></div>
            <span className="text-sm font-medium">Cancelled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-500 via-purple-500 to-purple-600 shadow-lg shadow-purple-500/50"></div>
            <span className="text-sm font-medium">Offline Booking</span>
          </div>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="relative rounded-xl border border-border/50 shadow-strong overflow-hidden backdrop-blur-xl bg-gradient-to-br from-card via-card/95 to-card/90">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none z-0"></div>
        <div className="relative z-10 p-3 sm:p-6">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={calendarView}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={calendarEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            height="auto"
            eventDisplay="block"
            displayEventTime={true}
            eventTimeFormat={{
              hour: "numeric",
              minute: "2-digit",
              meridiem: "short",
            }}
            views={{
              dayGridMonth: {
                titleFormat: { year: "numeric", month: "long" },
                dayHeaderFormat: { weekday: "short" },
              },
              timeGridWeek: {
                titleFormat: { year: "numeric", month: "short", day: "numeric" },
                dayHeaderFormat: { weekday: "short", day: "numeric" },
              },
              timeGridDay: {
                titleFormat: { year: "numeric", month: "short", day: "numeric" },
              },
            }}
            dayMaxEvents={3}
            moreLinkClick="popover"
            slotMinTime="06:00:00"
            slotMaxTime="24:00:00"
            allDaySlot={true}
            firstDay={1}
            weekends={true}
            editable={false}
            selectable={true}
            selectMirror={true}
            eventMaxStack={3}
          />
        </div>
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
              <Label htmlFor="serviceId">Service Category *</Label>
              {loadingServices ? (
                <div className="p-3 text-sm text-muted-foreground border rounded-md">Loading services...</div>
              ) : services.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground border rounded-md">No services available</div>
              ) : (
                <>
                  <Select
                    value={offlineBookingData.serviceId}
                    onValueChange={(value) =>
                      setOfflineBookingData((prev) => ({ ...prev, serviceId: value }))
                    }
                    disabled={loadingServices}
                  >
                    <SelectTrigger id="serviceId" className="w-full">
                      <SelectValue placeholder="Select a service category" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id} className="cursor-pointer">
                          <span className="font-medium">{service.category}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {offlineBookingData.serviceId && (
                    <div className="mt-2 p-2 bg-muted/50 rounded-md">
                      <p className="text-sm font-medium text-foreground">
                        Selected: {services.find((s) => s.id === offlineBookingData.serviceId)?.category}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {services.length} service{services.length !== 1 ? "s" : ""} available
                  </p>
                </>
              )}
            </div>

            <div>
              <Label htmlFor="totalPrice">Total Price (₹) *</Label>
              <Input
                id="totalPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g., 2500"
                value={offlineBookingData.totalPrice}
                onChange={(e) =>
                  setOfflineBookingData((prev) => ({ ...prev, totalPrice: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowOfflineBookingModal(false);
                setOfflineBookingData({ 
                  serviceId: "",
                  title: "", 
                  clientName: "", 
                  startTime: "",
                  endTime: "",
                  totalPrice: "",
                });
                setServices([]);
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreateOfflineBooking}
              disabled={!offlineBookingData.serviceId || !offlineBookingData.totalPrice || loadingServices}
            >
              Create Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Details Dialog */}
      <Dialog open={showBookingDetailsModal} onOpenChange={setShowBookingDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              View detailed information about this booking
            </DialogDescription>
          </DialogHeader>

          {loadingBooking ? (
            <div className="py-8 text-center">
              <div className="animate-pulse">Loading booking details...</div>
            </div>
          ) : selectedBooking ? (
            <div className="space-y-6 py-4">
              {/* Status and Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Status:</span>
                  <Badge 
                    variant={selectedBooking.status === "confirmed" ? "default" : "secondary"}
                    className={
                      selectedBooking.status === "confirmed" 
                        ? "bg-green-500" 
                        : selectedBooking.status === "pending"
                        ? "bg-yellow-500"
                        : "bg-gray-500"
                    }
                  >
                    {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Total Price:</span>
                  <span className="text-lg font-bold">₹{selectedBooking.price}</span>
                </div>
              </div>

              {/* Service Information */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Service
                </Label>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium">{selectedBooking.serviceName}</p>
                </div>
              </div>

              {/* Client Information */}
              {(selectedBooking.clientName && selectedBooking.clientName !== "Unknown Client") && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Client Information
                  </Label>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <p className="font-medium">{selectedBooking.clientName}</p>
                    {selectedBooking.clientPhone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{selectedBooking.clientPhoneMasked || selectedBooking.clientPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Date and Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Start Date & Time
                  </Label>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm">
                      {new Date(selectedBooking.start).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedBooking.start).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    End Date & Time
                  </Label>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm">
                      {new Date(selectedBooking.end).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedBooking.end).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Source */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Booking Source</Label>
                <div className="p-3 rounded-lg bg-muted/50">
                  <Badge variant="outline">
                    {selectedBooking.source === "user" ? "Direct Booking" : "Event Planner"}
                  </Badge>
                </div>
              </div>

              {/* Notes */}
              {selectedBooking.notes && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Notes</Label>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm whitespace-pre-wrap">{selectedBooking.notes}</p>
                  </div>
                </div>
              )}

              {/* Created/Updated Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground pt-2 border-t">
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(selectedBooking.createdAt).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Updated:</span>{" "}
                  {new Date(selectedBooking.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No booking data available</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowBookingDetailsModal(false);
                setSelectedBooking(null);
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
