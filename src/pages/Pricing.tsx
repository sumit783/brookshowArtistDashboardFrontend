import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { apiClient } from "../services/apiClient";
import { storage } from "../services/storage";
import { syncQueue } from "../services/syncQueue";
import { Service } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";
import { User, Users, Pencil, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export default function Pricing() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadServices();
  }, [user]);

  const loadServices = async () => {
    console.log("loadServices called, user:", user);
    
    if (!user) {
      console.warn("No user found");
      setLoading(false);
      return;
    }

    // For artist users, use user.id as artistId if artistId is not set
    const artistId = user.artistId || (user.role === "artist" ? user.id : null);
    
    if (!artistId) {
      console.warn("No artistId found in user object:", user);
      setLoading(false);
      return;
    }

    try {
      console.log("Loading cached services...");
      const cached = await storage.getAllItems<Service>("services");
      if (cached.length > 0) {
        console.log("Found cached services:", cached.length);
        setServices(cached);
      }

      console.log("Fetching services from API for artistId:", artistId);
      const data = await apiClient.services.getByArtist(artistId);
      console.log("Received services from API:", data);
      
      if (data && data.length > 0) {
        setServices(data);
        console.log("Setting services in state:", data.length, "items");

        for (const service of data) {
          await storage.setItem("services", service.id, service);
        }
        console.log("Services cached to storage");
      } else {
        console.warn("No services returned from API");
        setServices([]);
      }
    } catch (error) {
      console.error("Failed to load services:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load pricing";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      // Keep cached services if API fails and we don't have any in state yet
      const cached = await storage.getAllItems<Service>("services");
      if (cached.length > 0) {
        console.log("Using cached services after API error:", cached.length);
        setServices(cached);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFieldUpdate = async (
    serviceId: string,
    field: "price_for_user" | "price_for_planner" | "advance" | "unit",
    value: string | number
  ) => {
    let processedValue: number | string = value;
    
    // Validate numeric fields
    if (field === "price_for_user" || field === "price_for_planner" || field === "advance") {
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      if (isNaN(numValue) || numValue < 0) {
        toast({
          title: "Invalid value",
          description: "Please enter a valid positive number",
          variant: "destructive",
        });
        return;
      }
      processedValue = numValue;
    }

    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    // Optimistically update UI
    const updatedService = { ...service, [field]: processedValue };
    setServices((prev) => prev.map((s) => (s.id === serviceId ? updatedService : s)));
    setEditingId(null);

    try {
      // Update via API
      console.log("Updating service field via API:", serviceId, field, processedValue);
      await apiClient.services.update(serviceId, { [field]: processedValue });
      
      // Refetch all services to ensure we have the latest data
      console.log("Refetching services after update");
      const artistId = user?.artistId || (user?.role === "artist" ? user.id : null);
      if (artistId) {
        const refreshedServices = await apiClient.services.getByArtist(artistId);
        setServices(refreshedServices);
        
        // Update cache
        for (const svc of refreshedServices) {
          await storage.setItem("services", svc.id, svc);
        }
      }

      toast({
        title: "Updated",
        description: "Changes saved successfully",
      });
    } catch (error) {
      console.error("Failed to update field:", error);
      
      // Revert optimistic update on error
      setServices((prev) => prev.map((s) => (s.id === serviceId ? service : s)));
      
      const errorMessage = error instanceof Error ? error.message : "Failed to update";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Restore editing state so user can try again
      const fieldSuffix = field === "price_for_user" ? "user" : 
                         field === "price_for_planner" ? "planner" :
                         field === "advance" ? "advance" : "unit";
      setEditingId(`${serviceId}-${fieldSuffix}`);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading pricing...</div>;
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold">Pricing</h1>
        <p className="text-muted-foreground">
          Set different prices for direct bookings and event planners
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <Card key={service.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{service.title}</span>
                <div className="flex items-center gap-2">
                  <Select
                    value={service.unit}
                    onValueChange={(value) => {
                      handleFieldUpdate(service.id, "unit", value);
                    }}
                  >
                    <SelectTrigger className="w-24 h-7 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">hour</SelectItem>
                      <SelectItem value="event">event</SelectItem>
                      <SelectItem value="day">day</SelectItem>
                    </SelectContent>
                  </Select>
                  {!service.active && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {service.description}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* User Price */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    Direct Booking Price
                  </Label>
                  {editingId === `${service.id}-user` ? (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={service.price_for_user}
                        autoFocus
                        onBlur={(e) =>
                          handleFieldUpdate(
                            service.id,
                            "price_for_user",
                            e.target.value
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleFieldUpdate(
                              service.id,
                              "price_for_user",
                              e.currentTarget.value
                            );
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted"
                      onClick={() => setEditingId(`${service.id}-user`)}
                    >
                      <span className="text-muted-foreground font-semibold">₹</span>
                      <span className="font-semibold">
                        {service.price_for_user}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {service.unit}
                      </span>
                      <Pencil className="h-3 w-3 ml-auto text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Planner Price */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    Event Planner Price
                  </Label>
                  {editingId === `${service.id}-planner` ? (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={service.price_for_planner}
                        autoFocus
                        onBlur={(e) =>
                          handleFieldUpdate(
                            service.id,
                            "price_for_planner",
                            e.target.value
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleFieldUpdate(
                              service.id,
                              "price_for_planner",
                              e.currentTarget.value
                            );
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted"
                      onClick={() => setEditingId(`${service.id}-planner`)}
                    >
                      <span className="text-muted-foreground font-semibold">₹</span>
                      <span className="font-semibold">
                        {service.price_for_planner}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {service.unit}
                      </span>
                      <Pencil className="h-3 w-3 ml-auto text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Advance */}
              <div className="pt-2 border-t">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    Advance Payment
                  </Label>
                  {editingId === `${service.id}-advance` ? (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={service.advance || 0}
                        autoFocus
                        onBlur={(e) =>
                          handleFieldUpdate(
                            service.id,
                            "advance",
                            e.target.value
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleFieldUpdate(
                              service.id,
                              "advance",
                              e.currentTarget.value
                            );
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted"
                      onClick={() => setEditingId(`${service.id}-advance`)}
                    >
                      <span className="text-muted-foreground font-semibold">₹</span>
                      <span className="font-semibold">
                        {service.advance || 0}
                      </span>
                      <Pencil className="h-3 w-3 ml-auto text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {service.extras.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2">Extras</p>
                  <div className="space-y-1">
                    {service.extras.map((extra) => (
                      <div
                        key={extra.id}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {extra.title}
                        </span>
                        <span className="font-medium">+₹{extra.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No services configured yet</p>
        </div>
      )}
    </div>
  );
}
