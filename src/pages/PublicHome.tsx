import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Ticket, Users, Calendar, Star } from "lucide-react";
import { config } from "../config";

export default function PublicHome() {
  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold animate-slide-up">
            <span className="gradient-text">{config.brandName}</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground animate-slide-up">
            {config.tagline}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-slide-up">
            <Button size="lg" className="text-lg" asChild>
              <Link to="/login">Artist Login</Link>
            </Button>
            <Button size="lg" variant="accent" className="text-lg">
              Book a Ticket
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
          <Card className="animate-slide-up">
            <CardHeader>
              <Ticket className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Buy Tickets</CardTitle>
              <CardDescription>
                Easy ticketing for amazing events
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
            <CardHeader>
              <Users className="h-10 w-10 text-accent mb-2" />
              <CardTitle>Book Artists</CardTitle>
              <CardDescription>
                Connect with talented performers
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: "200ms" }}>
            <CardHeader>
              <Calendar className="h-10 w-10 text-success mb-2" />
              <CardTitle>Manage Schedule</CardTitle>
              <CardDescription>
                Artists manage their availability
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: "300ms" }}>
            <CardHeader>
              <Star className="h-10 w-10 text-warning mb-2" />
              <CardTitle>Verified Artists</CardTitle>
              <CardDescription>
                Quality assured professionals
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <Card className="max-w-2xl mx-auto animate-slide-up">
            <CardHeader>
              <CardTitle className="text-3xl">For Artists</CardTitle>
              <CardDescription className="text-lg">
                Manage your bookings, calendar, and media all in one place
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link to="/login">Access Artist Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 {config.brandName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
