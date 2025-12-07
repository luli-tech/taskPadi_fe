import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckSquare,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  Bell,
  ChevronRight,
  Plus,
  TrendingUp,
  Clock,
  Users,
  Sparkles,
  LogIn,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useGetTasksQuery } from "@/store/api/tasksApi";
import { useLogoutMutation } from "@/store/api/authApi";
import { logout } from "@/store/slices/authSlice";

const Index = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { data: tasks = [] } = useGetTasksQuery(undefined, { skip: !isAuthenticated });
  const [logoutApi] = useLogoutMutation();

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      if (refreshToken) {
        await logoutApi({ refresh_token: refreshToken }).unwrap();
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
    dispatch(logout());
  };

  const handleProtectedNavigation = (href: string) => {
    if (!isAuthenticated) {
      navigate("/auth");
    } else {
      navigate(href);
    }
  };

  const quickActions = [
    { icon: Plus, label: "New Task", href: "/tasks", color: "bg-primary" },
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", color: "bg-primary/90" },
    { icon: CheckSquare, label: "All Tasks", href: "/tasks", color: "bg-primary/80" },
  ];

  const features = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", badge: null },
    { icon: CheckSquare, label: "Tasks", href: "/tasks", badge: "New" },
    { icon: MessageSquare, label: "Team Chat", href: "/chat", badge: null },
    { icon: Settings, label: "Settings", href: "/settings", badge: null },
    { icon: Shield, label: "Admin", href: "/admin", badge: null },
    { icon: Sparkles, label: "AI Summary", href: "/dashboard", badge: "AI" },
    { icon: Users, label: "Team", href: "/admin", badge: null },
    { icon: Bell, label: "Alerts", href: "/dashboard", badge: isAuthenticated ? String(tasks.filter(t => t.status === 'Pending').length || '') : null },
  ];

  // Calculate real stats from tasks
  const activeTasks = tasks.filter(t => t.status === 'Pending' || t.status === 'InProgress').length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;

  const stats = [
    { label: "Active Tasks", value: isAuthenticated ? String(activeTasks) : "--", icon: Clock, trend: isAuthenticated && activeTasks > 0 ? `+${activeTasks}` : null },
    { label: "Completed", value: isAuthenticated ? String(completedTasks) : "--", icon: CheckSquare, trend: isAuthenticated && completedTasks > 0 ? `+${completedTasks}` : null },
    { label: "Total Tasks", value: isAuthenticated ? String(tasks.length) : "--", icon: Users, trend: null },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero px-4 pt-8 pb-6 md:px-8 lg:px-12 lg:pt-12 lg:pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6 lg:mb-8">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-white/20 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-sm lg:text-base">
                  {isAuthenticated ? "Welcome back," : "Welcome to"}
                </p>
                <h1 className="text-white text-xl lg:text-3xl font-bold">
                  {isAuthenticated ? user?.name || "TaskFlow Pro" : "TaskFlow Pro"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 lg:gap-3">
              {isAuthenticated ? (
                <>
                  <button className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                    <Bell className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    <LogOut className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  </button>
                </>
              ) : (
                <Link 
                  to="/auth" 
                  className="flex items-center gap-2 bg-white/20 px-4 py-2 lg:px-6 lg:py-3 rounded-full text-white text-sm lg:text-base font-medium hover:bg-white/30 transition-colors"
                >
                  <LogIn className="w-4 h-4 lg:w-5 lg:h-5" />
                  Sign In
                </Link>
              )}
            </div>
          </div>

          {/* Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-white/95 backdrop-blur-sm p-5 lg:p-8 rounded-2xl shadow-custom-lg">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                  </div>
                  <span className="text-foreground font-semibold lg:text-lg">Task Overview</span>
                </div>
                <button
                  onClick={() => handleProtectedNavigation("/tasks")}
                  className="text-primary text-sm lg:text-base font-medium flex items-center gap-1 hover:underline"
                >
                  View All <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 lg:gap-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center lg:text-left lg:flex lg:items-center lg:gap-4">
                    <div className="hidden lg:flex w-12 h-12 rounded-xl bg-primary/10 items-center justify-center flex-shrink-0">
                      <stat.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center justify-center lg:justify-start gap-1 mb-1">
                        <span className="text-2xl lg:text-4xl font-bold text-foreground">{stat.value}</span>
                        {stat.trend && (
                          <span className="text-xs lg:text-sm text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded-full">
                            {stat.trend}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs lg:text-sm">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        {/* Quick Actions */}
        <section className="px-4 md:px-8 lg:px-12 -mt-2 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-4 lg:p-6 rounded-2xl shadow-custom-md">
              <div className="flex justify-around lg:justify-start lg:gap-8">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleProtectedNavigation(action.href)}
                    className="flex flex-col lg:flex-row items-center gap-2 lg:gap-4 group"
                  >
                    <div
                      className={`w-14 h-14 lg:w-16 lg:h-16 rounded-2xl ${action.color} flex items-center justify-center transition-transform group-hover:scale-105`}
                    >
                      <action.icon className="w-6 h-6 lg:w-7 lg:h-7 text-primary-foreground" />
                    </div>
                    <span className="text-foreground text-xs lg:text-base font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        </section>

        {/* Main Content Grid */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 px-4 md:px-8 lg:px-12 mt-6">
          {/* Features Grid */}
          <section>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="p-4 lg:p-6 rounded-2xl shadow-custom-md h-full">
                <h3 className="font-semibold text-foreground mb-4 lg:mb-6 lg:text-lg">Quick Access</h3>
                <div className="grid grid-cols-4 gap-4 lg:gap-6">
                  {features.map((feature, index) => (
                    <button
                      key={index}
                      onClick={() => handleProtectedNavigation(feature.href)}
                      className="flex flex-col items-center gap-2 lg:gap-3 group relative"
                    >
                      <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-primary/10 flex items-center justify-center transition-all group-hover:bg-primary/20 group-hover:scale-105">
                        <feature.icon className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
                      </div>
                      {feature.badge && (
                        <span className="absolute -top-1 right-0 lg:right-2 text-[10px] lg:text-xs font-bold bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
                          {feature.badge}
                        </span>
                      )}
                      <span className="text-foreground text-xs lg:text-sm font-medium text-center">
                        {feature.label}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>
          </section>

          {/* Right Column - Promo & Tips */}
          <div className="mt-6 lg:mt-0 space-y-6">
            {/* Promo Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-5 lg:p-6 rounded-2xl shadow-custom-md bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <h3 className="font-bold text-foreground mb-3 lg:text-lg">
                  {isAuthenticated ? "Your Productivity Hub" : "Get Started Today"}
                </h3>
                <div className="flex items-center gap-4">
                  {!isAuthenticated && (
                    <Button size="sm" className="rounded-full lg:text-base lg:px-6" onClick={() => navigate("/auth")}>
                      Get Started
                    </Button>
                  )}
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm lg:text-base">AI-Powered Tasks</p>
                      <p className="text-muted-foreground text-xs lg:text-sm">
                        Smart summaries & insights
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Tips Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="p-4 lg:p-6 rounded-2xl shadow-custom-md">
                <div className="flex items-start gap-3 lg:gap-4">
                  <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckSquare className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1 lg:mb-2">
                      <h4 className="font-semibold text-foreground text-sm lg:text-base">Quick Tip</h4>
                      <button onClick={() => handleProtectedNavigation("/dashboard")} className="text-primary text-xs lg:text-sm font-medium hover:underline">
                        More <ChevronRight className="w-3 h-3 lg:w-4 lg:h-4 inline" />
                      </button>
                    </div>
                    <p className="text-muted-foreground text-xs lg:text-sm leading-relaxed">
                      Use keyboard shortcuts to quickly create and manage tasks. Press 'N' for new task, 'D' for dashboard.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Extra spacing for bottom nav */}
        <div className="h-24 lg:h-12" />
      </div>

      {/* Bottom Navigation - Hidden on large screens */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 shadow-custom-lg lg:hidden">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <Link to="/" className="flex flex-col items-center gap-1 text-primary">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xs font-medium">Home</span>
          </Link>
          <button onClick={() => handleProtectedNavigation("/dashboard")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-xs">Dashboard</span>
          </button>
          <button onClick={() => handleProtectedNavigation("/tasks")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <CheckSquare className="w-6 h-6" />
            <span className="text-xs">Tasks</span>
          </button>
          <button onClick={() => handleProtectedNavigation("/chat")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors relative">
            <MessageSquare className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
            <span className="text-xs">Chat</span>
          </button>
          {isAuthenticated ? (
            <button onClick={() => handleProtectedNavigation("/settings")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="w-6 h-6" />
              <span className="text-xs">Settings</span>
            </button>
          ) : (
            <Link to="/auth" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <User className="w-6 h-6" />
              <span className="text-xs">Sign In</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Index;
