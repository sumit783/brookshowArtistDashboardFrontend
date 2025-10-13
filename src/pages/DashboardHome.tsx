import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../hooks/useAuth";
import { apiClient } from "../services/apiClient";
import { Artist } from "../types";
import { User, Mail, Phone, MapPin, CheckCircle } from "lucide-react";

export default function DashboardHome() {
  const { user } = useAuth();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadArtist = async () => {
      if (user?.artistId) {
        try {
          const data = await apiClient.artists.getById(user.artistId);
          setArtist(data);
        } catch (error) {
          console.error("Failed to load artist:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadArtist();
  }, [user]);

  if (loading) {
    return <div className="animate-pulse">Loading profile...</div>;
  }

  if (!artist) {
    return <div>Artist not found</div>;
  }

  return (
    <div className="space-y-6 slide-in-up">
      <div className="glass-modern p-6 rounded-lg">
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Welcome back, {artist.displayName}!
        </h1>
        <p className="text-muted-foreground mt-2">Manage your artist profile and settings</p>
      </div>

      <Card className="glass-modern hover-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Artist Profile
            {artist.verified && (
            <Badge variant="default" className="ml-2">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{artist.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{artist.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{artist.city}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Categories</p>
              <div className="flex flex-wrap gap-2">
                {artist.categories.map((category) => (
                  <Badge key={category} variant="accent">
                    {category}
                  </Badge>
                ))}
              </div>

              {artist.bio && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Bio</p>
                  <p className="text-sm">{artist.bio}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="glass-modern hover-glow border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">0</p>
              <p className="text-sm text-muted-foreground mt-2">Pending Bookings</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-modern hover-glow border-accent/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-accent drop-shadow-glow">0</p>
              <p className="text-sm text-muted-foreground mt-2">Confirmed Bookings</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-modern hover-glow border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold bg-gradient-accent bg-clip-text text-transparent">0</p>
              <p className="text-sm text-muted-foreground mt-2">Media Items</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
