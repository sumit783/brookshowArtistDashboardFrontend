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
import { DollarSign, User, Users } from "lucide-react";

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
    if (!user?.artistId) return;

    try {
      const cached = await storage.getAllItems<Service>("services");
      if (cached.length > 0) {
        setServices(cached);
      }

      const data = await apiClient.services.getByArtist(user.artistId);
      setServices(data);

      for (const service of data) {
        await storage.setItem("services", service.id, service);
      }
    } catch (error) {
      console.error("Failed to load services:", error);
      toast({
        title: "Error",
        description: "Failed to load pricing",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePriceUpdate = async (
    serviceId: string,
    field: "price_for_user" | "price_for_planner",
    value: string
  ) => {
    const price = parseFloat(value);
    if (isNaN(price) || price < 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }

    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    const updatedService = { ...service, [field]: price };
    setServices((prev) => prev.map((s) => (s.id === serviceId ? updatedService : s)));

    await storage.setItem("services", serviceId, updatedService);
    await syncQueue.enqueue({
      action: "update",
      entity: "service",
      data: { id: serviceId, [field]: price },
    });

    toast({
      title: "Price updated",
      description: "Changes saved successfully",
    });

    setEditingId(null);
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
                {service.title}
                {!service.active && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
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
                          handlePriceUpdate(
                            service.id,
                            "price_for_user",
                            e.target.value
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handlePriceUpdate(
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
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">
                        {service.price_for_user}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {service.unit}
                      </span>
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
                          handlePriceUpdate(
                            service.id,
                            "price_for_planner",
                            e.target.value
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handlePriceUpdate(
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
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">
                        {service.price_for_planner}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {service.unit}
                      </span>
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
                        <span className="font-medium">+${extra.price}</span>
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
