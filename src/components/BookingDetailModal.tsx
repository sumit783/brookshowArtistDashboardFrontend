import { Booking } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import { Calendar, Clock, User, Phone, DollarSign, FileText } from "lucide-react";

interface BookingDetailModalProps {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
  onBlockCalendar?: (booking: Booking) => void;
}

export function BookingDetailModal({
  booking,
  open,
  onClose,
  onBlockCalendar,
}: BookingDetailModalProps) {
  if (!booking) return null;

  const startDate = new Date(booking.start);
  const endDate = new Date(booking.end);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Booking Details
            <Badge className={`status-${booking.status}`}>
              {booking.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            #{booking.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Client</p>
              <p className="text-sm text-muted-foreground">{booking.clientName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Contact</p>
              <p className="text-sm text-muted-foreground">{booking.clientPhoneMasked}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Service</p>
              <p className="text-sm text-muted-foreground">{booking.serviceName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Date</p>
              <p className="text-sm text-muted-foreground">
                {format(startDate, "MMMM dd, yyyy")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Time</p>
              <p className="text-sm text-muted-foreground">
                {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Price</p>
              <p className="text-sm text-muted-foreground">${booking.price}</p>
            </div>
          </div>

          {booking.notes && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium mb-1">Notes</p>
              <p className="text-sm text-muted-foreground">{booking.notes}</p>
            </div>
          )}

          <div className="rounded-lg bg-info-light p-3">
            <p className="text-xs text-info-foreground">
              <span className="font-medium">Booking Source:</span>{" "}
              {booking.source === "user" ? "Direct Booking" : "Event Planner"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onBlockCalendar?.(booking)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Block on Calendar
          </Button>
          <Button variant="default" className="flex-1" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
