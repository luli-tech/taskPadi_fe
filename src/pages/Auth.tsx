import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { useLoginMutation, useSignupMutation } from "@/store/api/authApi";
import { setCredentials } from "@/store/slices/authSlice";
import { toast } from "sonner";
import { CheckCircle2, Rocket } from "lucide-react";
export default function Auth() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [signup, { isLoading: isSignupLoading }] = useSignupMutation();
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const result = await login({
        email: formData.get("email") as string,
        password: formData.get("password") as string,
      }).unwrap();
      dispatch(setCredentials(result));
      toast.success("Welcome back!");
      navigate("/");
    } catch (error: any) {
      toast.error(error?.data?.message || "Login failed");
    }
  };
  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const result = await signup({
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        username: formData.get("username") as string,
      }).unwrap();
      dispatch(setCredentials(result));
      toast.success("Account created successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error?.data?.message || "Signup failed");
    }
  };
  const isLoading = isLoginLoading || isSignupLoading;
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 gradient-primary opacity-10"></div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center relative z-10">
        <motion.div
          initial={{
            opacity: 0,
            x: -20,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.6,
          }}
          className="hidden lg:block space-y-6"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <img
                src="/favicon.ico"
                alt="TaskPadi logo"
                className="w-7 h-7 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold">TaskPadi</h1>
          </div>

          <h2 className="text-4xl font-bold leading-tight">
            Manage tasks with
            <br />
            <span className="gradient-primary bg-clip-text text-transparent bg-muted-foreground">
              intelligence & collaboration
            </span>
          </h2>

          <p className="text-lg text-muted-foreground">
            The modern task management platform that combines powerful features
            with beautiful design.
          </p>

          <div className="space-y-4 pt-6">
            {[
              "Real-time collaboration",
              "AI-powered insights",
              "Smart task management",
              "Team chat included",
            ].map((feature, i) => (
              <motion.div
                key={feature}
                initial={{
                  opacity: 0,
                  x: -20,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  delay: 0.2 + i * 0.1,
                }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                </div>
                <span className="text-foreground">{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
          }}
        >
          <Card className="shadow-custom-xl border-border/50 border-dotted opacity-100">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Welcome</CardTitle>
              <CardDescription>
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        name="password"
                        type="password"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoginLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-username">Username</Label>
                      <Input
                        id="signup-username"
                        name="username"
                        type="text"
                        placeholder="john_doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isSignupLoading
                        ? "Creating account..."
                        : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
