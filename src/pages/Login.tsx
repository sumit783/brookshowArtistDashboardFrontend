import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useToast } from "../hooks/use-toast";
import { config } from "../config";

export default function Login() {
  const [email, setEmail] = useState("demo@brookshow.com");
  const [password, setPassword] = useState("demo123");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-dark px-4">
      <div className="w-full max-w-md space-y-6 relative">
        <Button
          variant="outline"
          className="absolute -top-4 left-0 glass-modern"
          asChild
        >
          <Link to="/">← Back to Website</Link>
        </Button>
        
        <div className="text-center mt-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            {config.brandName}
          </h1>
          <p className="text-muted-foreground">Artist Dashboard</p>
        </div>

        <Card className="glass-modern hover-glow">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Enter any email and password to login (demo mode)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="demo@brookshow.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="demo123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>

              <div className="text-sm text-muted-foreground text-center pt-2">
                <p>Demo credentials:</p>
                <p>Email: demo@brookshow.com</p>
                <p>Password: demo123</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
