import { useState, useEffect } from "react";
import { Wifi, WifiOff, User, Menu, Download } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useSync } from "../hooks/useSync";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { config } from "../config";
import { useToast } from "../hooks/use-toast";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount } = useSync();
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      setShowInstall(false);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast({
        title: "App installed!",
        description: "You can now use BrookShow as a standalone app",
      });
      setShowInstall(false);
    }

    setDeferredPrompt(null);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 glass-modern">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="md:hidden hover:bg-accent/10"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {config.brandName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Install App Button */}
          {showInstall && (
            <Button
              variant="accent"
              size="sm"
              onClick={handleInstallClick}
              className="hidden sm:flex"
            >
              <Download className="h-4 w-4 mr-2" />
              Install App
            </Button>
          )}

          {/* Online/Offline Indicator */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Online
                </span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-danger" />
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Offline
                </span>
              </>
            )}
            
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingCount} pending
              </Badge>
            )}
          </div>

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">Demo Artist</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
