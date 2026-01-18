import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useLoginMutation, useAdminRegisterMutation } from "@/store/api/authApi";
import { setCredentials } from "@/store/slices/authSlice";
import { toast } from "sonner";
import { Shield, ArrowLeft, Lock, UserPlus } from "lucide-react";

export default function AdminLogin() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [adminRegister, { isLoading: isSignupLoading }] = useAdminRegisterMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      // Check if user is admin by decoding token
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          if (payload.role === "admin") {
            navigate("/admin");
          } else {
            navigate("/dashboard");
          }
        } catch {
          navigate("/dashboard");
        }
      }
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      console.log("Attempting login with:", { email });
      const result = await login({
        email,
        password,
      }).unwrap();

      console.log("Login result:", result);

      // Ensure we have the required tokens
      if (result.access_token && result.refresh_token) {
        // Check if user is admin
        try {
          const payload = JSON.parse(atob(result.access_token.split(".")[1]));
          console.log("Token payload:", payload);
          if (payload.role === "admin") {
            dispatch(setCredentials(result));
            toast.success("Welcome, Admin!");
            navigate("/admin");
          } else {
            toast.error("Access denied. Admin privileges required.");
            // Clear any tokens that were set
            localStorage.removeItem("authToken");
            localStorage.removeItem("refreshToken");
          }
        } catch (error) {
          console.error("Token decode error:", error);
          toast.error("Invalid token format");
        }
      } else {
        console.error("Missing tokens in response:", result);
        toast.error("Invalid response from server - missing tokens");
      }
    } catch (error: any) {
      console.error("Login error details:", error);
      console.error("Error status:", error?.status);
      console.error("Error data:", error?.data);
      console.error("Full error object:", JSON.stringify(error, null, 2));
      
      // More detailed error handling
      let errorMessage = "Login failed. Please check your credentials.";
      
      // Handle different error response formats
      if (error?.data) {
        // Check for direct error property (most common format: {"error": "message"})
        if (typeof error.data === 'object' && error.data.error) {
          errorMessage = error.data.error;
        } 
        // Check for message property
        else if (error.data.message) {
          errorMessage = error.data.message;
        }
        // Check if data itself is a string
        else if (typeof error.data === 'string') {
          errorMessage = error.data;
        }
        // Check for nested error object
        else if (error.data.data?.error) {
          errorMessage = error.data.data.error;
        }
      }
      
      // Handle by status code (but prioritize the error message from data)
      if (error?.status === 401 && !error?.data?.error) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error?.status === 400 && !error?.data?.error) {
        errorMessage = errorMessage || "Invalid request. Please check your input.";
      } else if (error?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (error?.error && !error?.data) {
        errorMessage = error.error;
      }
      
      // Show the error message
      toast.error(errorMessage);
      
      // Additional helpful message for admin login
      if (errorMessage.toLowerCase().includes('invalid credentials') || 
          errorMessage.toLowerCase().includes('invalid email') ||
          errorMessage.toLowerCase().includes('invalid password')) {
        console.log("💡 Tip: Make sure you're using an admin account. Regular user accounts cannot access the admin panel.");
      }
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const result = await adminRegister({
        email,
        password,
        username,
      }).unwrap();

      // Admin register endpoint always creates admin users
      if (result.access_token && result.refresh_token) {
        dispatch(setCredentials(result));
        toast.success("Admin account created successfully! You now have full admin access.");
        navigate("/admin");
      } else {
        toast.error("Invalid response from server");
      }
    } catch (error: any) {
      console.error("Admin registration error:", error);
      const errorMessage =
        error?.data?.error ||
        error?.data?.message ||
        error?.error ||
        "Admin registration failed. Please try again.";
      toast.error(errorMessage);
    }
  };

  const isLoading = isLoginLoading || isSignupLoading;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      <div className="absolute inset-0 gradient-primary opacity-5"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="shadow-2xl border-border/50">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Admin Login</CardTitle>
            <CardDescription className="text-base">
              Sign in with your admin credentials to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={isLoading}
                  >
                    {isLoginLoading ? (
                      <>
                        <Lock className="mr-2 h-4 w-4 animate-pulse" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Sign In as Admin
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-username">Username</Label>
                    <Input
                      id="admin-username"
                      type="text"
                      placeholder="admin_user"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-register-email">Email</Label>
                    <Input
                      id="admin-register-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-register-password">Password</Label>
                    <Input
                      id="admin-register-password"
                      type="password"
                      placeholder="Enter a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-11"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={isLoading}
                  >
                    {isSignupLoading ? (
                      <>
                        <UserPlus className="mr-2 h-4 w-4 animate-pulse" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create Admin Account
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-6 border-t border-border">
              <Link to="/auth">
                <Button
                  variant="ghost"
                  className="w-full"
                  disabled={isLoginLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to User Login
                </Button>
              </Link>
            </div>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                <Lock className="inline h-3 w-3 mr-1" />
                This page is restricted to administrators only
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
