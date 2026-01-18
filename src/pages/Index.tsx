import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  Bell,
  ChevronRight,
  ChevronLeft,
  Plus,
  TrendingUp,
  Clock,
  Users,
  Sparkles,
  LogIn,
  LogOut,
  User,
  Menu,
  X,
  Home,
  Zap,
  BarChart3,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useGetTasksQuery } from "@/store/api/tasksApi";
import { useLogoutMutation } from "@/store/api/authApi";
import { logout } from "@/store/slices/authSlice";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
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

  const sidebarLinks = [
    { icon: Home, label: "Home", href: "/" },
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: CheckSquare, label: "Tasks", href: "/tasks" },
    { icon: MessageSquare, label: "Chat", href: "/chat" },
    { icon: Settings, label: "Settings", href: "/settings" },
    { icon: Shield, label: "Admin", href: "/admin" },
  ];

  const carouselSlides = [
    {
      title: "Boost Your Productivity",
      description: "Manage tasks efficiently with AI-powered insights and real-time collaboration.",
      icon: Zap,
      gradient: "from-primary to-secondary",
    },
    {
      title: "Track Progress Instantly",
      description: "Visual dashboards and analytics help you stay on top of your goals.",
      icon: BarChart3,
      gradient: "from-secondary to-primary",
    },
    {
      title: "Achieve Your Goals",
      description: "Set targets, break them into tasks, and celebrate your wins.",
      icon: Target,
      gradient: "from-primary/80 to-primary",
    },
  ];

  // Calculate real stats from tasks
  const activeTasks = tasks.filter(t => t.status === 'Pending' || t.status === 'InProgress').length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;

  const stats = [
    { label: "Active Tasks", value: isAuthenticated ? String(activeTasks) : "--", icon: Clock, trend: isAuthenticated && activeTasks > 0 ? `+${activeTasks}` : null },
    { label: "Completed", value: isAuthenticated ? String(completedTasks) : "--", icon: CheckSquare, trend: isAuthenticated && completedTasks > 0 ? `+${completedTasks}` : null },
    { label: "Total Tasks", value: isAuthenticated ? String(tasks.length) : "--", icon: Users, trend: null },
  ];

  // Auto-advance carousel
  useState(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  });

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="gradient-hero px-4 pt-8 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-xs">
                  {isAuthenticated ? "Welcome back," : "Welcome to"}
                </p>
                <h1 className="text-white text-lg font-bold">
                  {isAuthenticated ? user?.name || "TaskFlow Pro" : "TaskFlow Pro"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <button className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-white" />
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
                  >
                    <LogOut className="w-4 h-4 text-white" />
                  </button>
                </>
              ) : (
                <Link 
                  to="/auth" 
                  className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full text-white text-xs font-medium"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Carousel */}
          <div className="relative overflow-hidden rounded-2xl mb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className={`bg-gradient-to-r ${carouselSlides[currentSlide].gradient} p-5 text-white rounded-2xl`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const Icon = carouselSlides[currentSlide].icon;
                      return <Icon className="w-6 h-6" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold mb-1">{carouselSlides[currentSlide].title}</h2>
                    <p className="text-xs text-white/90 leading-relaxed">{carouselSlides[currentSlide].description}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Carousel Dots */}
            <div className="flex justify-center gap-1.5 mt-3">
              {carouselSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentSlide ? "bg-white w-4" : "bg-white/40 w-1.5"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-white/95 backdrop-blur-sm p-5 rounded-2xl shadow-custom-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-foreground font-semibold">Task Overview</span>
                </div>
                <button
                  onClick={() => handleProtectedNavigation("/tasks")}
                  className="text-primary text-sm font-medium flex items-center gap-1"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                      {stat.trend && (
                        <span className="text-xs text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded-full">
                          {stat.trend}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">{stat.label}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </header>

        {/* Quick Actions */}
        <section className="px-4 -mt-2 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-4 rounded-2xl shadow-custom-md">
              <div className="flex justify-around">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleProtectedNavigation(action.href)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl ${action.color} flex items-center justify-center transition-transform group-hover:scale-105`}
                    >
                      <action.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <span className="text-foreground text-xs font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="px-4 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-4 rounded-2xl shadow-custom-md">
              <div className="grid grid-cols-4 gap-4">
                {features.map((feature, index) => (
                  <button
                    key={index}
                    onClick={() => handleProtectedNavigation(feature.href)}
                    className="flex flex-col items-center gap-2 group relative"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center transition-all group-hover:bg-primary/20 group-hover:scale-105">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    {feature.badge && (
                      <span className="absolute -top-1 right-1 text-[10px] font-bold bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
                        {feature.badge}
                      </span>
                    )}
                    <span className="text-foreground text-xs font-medium text-center">
                      {feature.label}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        </section>

        {/* Promo Section */}
        <section className="px-4 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-5 rounded-2xl shadow-custom-md bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <h3 className="font-bold text-foreground mb-3">
                {isAuthenticated ? "Your Productivity Hub" : "Get Started Today"}
              </h3>
              <div className="flex items-center gap-4">
                {!isAuthenticated && (
                  <Button size="sm" className="rounded-full" onClick={() => navigate("/auth")}>
                    Get Started
                  </Button>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">AI-Powered Tasks</p>
                    <p className="text-muted-foreground text-xs">
                      Smart summaries & insights
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </section>

        {/* Tips Section */}
        <section className="px-4 mt-6 mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-4 rounded-2xl shadow-custom-md">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckSquare className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-foreground text-sm">Quick Tip</h4>
                    <button onClick={() => handleProtectedNavigation("/dashboard")} className="text-primary text-xs font-medium">
                      More <ChevronRight className="w-3 h-3 inline" />
                    </button>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Use keyboard shortcuts to quickly create and manage tasks. Press 'N' for new task, 'D' for dashboard.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </section>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 shadow-custom-lg">
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
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-64 bg-card border-r border-border h-screen fixed left-0 top-0 z-40 shadow-custom-lg"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">TaskFlow</span>
              </div>

              <nav className="space-y-2">
                {sidebarLinks.map((link, index) => (
                  <button
                    key={index}
                    onClick={() => handleProtectedNavigation(link.href)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:bg-primary/10 ${
                      link.href === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    <span className="font-medium">{link.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Sidebar Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{user?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
                  </div>
                  <button onClick={handleLogout} className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <LogOut className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <Button className="w-full" onClick={() => navigate("/auth")}>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <p className="text-sm text-muted-foreground">
                {isAuthenticated ? "Welcome back," : "Welcome to TaskFlow"}
              </p>
              <h1 className="text-lg font-bold text-foreground">
                {isAuthenticated ? user?.name || "TaskFlow Pro" : ""}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <button className="p-2 hover:bg-muted rounded-lg transition-colors relative">
                <Bell className="w-5 h-5" />
                {activeTasks > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                )}
              </button>
            )}
            {!isAuthenticated && (
              <Button onClick={() => navigate("/auth")}>
                <LogIn className="w-4 h-4 mr-2" />
                Get Started
              </Button>
            )}
          </div>
        </header>

        <div className="p-8">
          {/* Hero Carousel */}
          <section className="mb-8">
            <div className="relative overflow-hidden rounded-3xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.5 }}
                  className={`bg-gradient-to-r ${carouselSlides[currentSlide].gradient} p-12 text-white`}
                >
                  <div className="max-w-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
                      {(() => {
                        const Icon = carouselSlides[currentSlide].icon;
                        return <Icon className="w-8 h-8" />;
                      })()}
                    </div>
                    <h2 className="text-4xl font-bold mb-4">{carouselSlides[currentSlide].title}</h2>
                    <p className="text-xl text-white/90 mb-6">{carouselSlides[currentSlide].description}</p>
                    {!isAuthenticated && (
                      <Button 
                        size="lg" 
                        variant="secondary" 
                        className="bg-white text-primary hover:bg-white/90"
                        onClick={() => navigate("/auth")}
                      >
                        Get Started Free
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Carousel Controls */}
              <div className="absolute bottom-6 right-6 flex items-center gap-2">
                <button
                  onClick={() => setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length)}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex gap-2 mx-2">
                  {carouselSlides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentSlide ? "bg-white w-6" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % carouselSlides.length)}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </section>

          {/* Stats Cards */}
          <section className="grid grid-cols-3 gap-6 mb-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-custom-lg transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <stat.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold text-foreground">{stat.value}</span>
                        {stat.trend && (
                          <span className="text-sm text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                            {stat.trend}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </section>

          {/* Quick Actions & Features */}
          <div className="grid grid-cols-2 gap-8">
            {/* Quick Actions */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
              <Card className="p-6">
                <div className="grid grid-cols-3 gap-4">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleProtectedNavigation(action.href)}
                      className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-muted transition-colors group"
                    >
                      <div
                        className={`w-16 h-16 rounded-2xl ${action.color} flex items-center justify-center transition-transform group-hover:scale-105`}
                      >
                        <action.icon className="w-7 h-7 text-primary-foreground" />
                      </div>
                      <span className="text-foreground font-medium">{action.label}</span>
                    </button>
                  ))}
                </div>
              </Card>
            </section>

            {/* Features Grid */}
            <section>
              <h3 className="text-lg font-semibold text-foreground mb-4">Features</h3>
              <Card className="p-6">
                <div className="grid grid-cols-4 gap-4">
                  {features.map((feature, index) => (
                    <button
                      key={index}
                      onClick={() => handleProtectedNavigation(feature.href)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors group relative"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center transition-all group-hover:bg-primary/20 group-hover:scale-105">
                        <feature.icon className="w-6 h-6 text-primary" />
                      </div>
                      {feature.badge && (
                        <span className="absolute top-1 right-1 text-[10px] font-bold bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
                          {feature.badge}
                        </span>
                      )}
                      <span className="text-foreground text-sm font-medium text-center">
                        {feature.label}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            </section>
          </div>

          {/* Promo Section */}
          <section className="mt-8">
            <Card className="p-8 bg-gradient-to-r from-primary/5 via-primary/10 to-secondary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      {isAuthenticated ? "Your Productivity Hub" : "AI-Powered Task Management"}
                    </h3>
                    <p className="text-muted-foreground text-lg">
                      Smart summaries, intelligent insights, and seamless collaboration.
                    </p>
                  </div>
                </div>
                {!isAuthenticated && (
                  <Button size="lg" onClick={() => navigate("/auth")}>
                    Get Started
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                )}
              </div>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Index;
