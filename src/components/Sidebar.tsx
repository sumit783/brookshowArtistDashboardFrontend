import { NavLink, useLocation } from "react-router-dom";
import {
  Calendar,
  FileText,
  Image,
  DollarSign,
  User,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

interface SidebarProps {
  open: boolean;
  onClose?: () => void;
}

const navItems = [
  { to: "/", icon: User, label: "Profile" },
  { to: "/bookings", icon: FileText, label: "Bookings" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/media", icon: Image, label: "Media" },
  { to: "/pricing", icon: DollarSign, label: "Pricing" },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-16 left-0 z-50 h-[calc(100vh-4rem)] w-64 glass-modern border-r border-border/50 transition-transform duration-300 md:sticky md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Close button for mobile */}
          <div className="flex items-center justify-between p-4 md:hidden">
            <span className="text-sm font-medium text-sidebar-foreground">Menu</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-sidebar-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "text-foreground hover:bg-accent/10 hover:translate-x-1"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
