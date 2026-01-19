import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  Settings,
  Shield,
  User,
  Zap,
  Clock,
  CheckCircle2,
  Users as UsersIcon,
  Sparkles,
  Bell,
  Plus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Target,
  TrendingUp,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useGetTasksQuery } from "@/store/api/tasksApi";
import { useGetMyStatsQuery } from "@/store/api/usersApi";
import { useGetNotificationsQuery } from "@/store/api/notificationsApi";
import { useGetConversationsQuery } from "@/store/api/chatApi";
import { useState, useEffect } from "react";

export default function Index() {
  const { isAuthenticated, user, isAdmin } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Fetch tasks for stats
  const { data: tasksData } = useGetTasksQuery(undefined, { skip: !isAuthenticated });
  const { data: stats } = useGetMyStatsQuery(undefined, { skip: !isAuthenticated });
  const { data: conversations = [] } = useGetConversationsQuery(undefined, { skip: !isAuthenticated });
  const { data: notifications = [] } = useGetNotificationsQuery(undefined, { skip: !isAuthenticated });
  
  // Extract tasks array
  const tasks: any[] = Array.isArray(tasksData) 
    ? tasksData 
    : (tasksData && typeof tasksData === 'object' && 'data' in tasksData && Array.isArray((tasksData as any).data) 
      ? ((tasksData as any).data || [])
      : []);
  
  // Calculate task stats
  const activeTasks = tasks.filter((t: any) => t.status === "InProgress" || t.status === "Pending").length;
  const completedTasks = tasks.filter((t: any) => t.status === "Completed").length;
  const totalTasks = tasks.length;
  
  // Calculate total unread messages
  const totalUnreadMessages = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
  
  // Calculate total unread notifications
  const totalUnreadNotifications = notifications.filter((n) => !n.is_read).length;

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Carousel slides data
  const carouselSlides = [
    {
      icon: Zap,
      title: "Boost Your Productivity Instantly",
      description: "Manage tasks efficiently with AI-powered insights and real-time collaboration.",
      buttonText: isAuthenticated ? "Go to Dashboard" : "Get Started Free",
      buttonAction: () => navigate(isAuthenticated ? "/dashboard" : "/auth"),
      bgColor: "bg-gradient-to-br from-primary/10 via-primary/5 to-background",
    },
    {
      icon: Target,
      title: "Stay Organized & Focused",
      description: "Track your progress, set priorities, and achieve your goals with intelligent task management.",
      buttonText: isAuthenticated ? "View Tasks" : "Get Started Free",
      buttonAction: () => navigate(isAuthenticated ? "/tasks" : "/auth"),
      bgColor: "bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background",
    },
    {
      icon: TrendingUp,
      title: "Collaborate Seamlessly",
      description: "Work together with your team through real-time chat and shared workspaces.",
      buttonText: isAuthenticated ? "Open Chat" : "Get Started Free",
      buttonAction: () => navigate(isAuthenticated ? "/chat" : "/auth"),
      bgColor: "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-background",
    },
  ];

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [carouselSlides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
  };

  const summaryCards = [
    {
      icon: Clock,
      value: isAuthenticated ? activeTasks : 0,
      label: "Active Tasks",
    },
    {
      icon: CheckCircle2,
      value: isAuthenticated ? completedTasks : 0,
      label: "Completed",
    },
    {
      icon: UsersIcon,
      value: isAuthenticated ? totalTasks : 0,
      label: "Total Tasks",
    },
  ];

  const quickActions = [
    {
      icon: Plus,
      label: "New Task",
      href: isAuthenticated ? "/tasks" : "/auth",
    },
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: isAuthenticated ? "/dashboard" : "/auth",
    },
    {
      icon: CheckSquare,
      label: "All Tasks",
      href: isAuthenticated ? "/tasks" : "/auth",
    },
  ];

  const features = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: isAuthenticated ? "/dashboard" : "/auth",
    },
    {
      icon: CheckSquare,
      label: "Tasks",
      badge: "New",
      href: isAuthenticated ? "/tasks" : "/auth",
    },
    {
      icon: MessageSquare,
      label: "Team Chat",
      href: isAuthenticated ? "/chat" : "/auth",
    },
    {
      icon: Settings,
      label: "Settings",
      href: isAuthenticated ? "/settings" : "/auth",
    },
    {
      icon: Shield,
      label: "Admin",
      href: isAdmin ? "/admin" : "/admin/login",
    },
    {
      icon: Sparkles,
      label: "AI Summary",
      badge: "AI",
      href: isAuthenticated ? "/dashboard" : "/auth",
    },
    {
      icon: UsersIcon,
      label: "Team",
      href: isAuthenticated ? "/dashboard" : "/auth",
    },
    {
      icon: Bell,
      label: "Alerts",
      href: isAuthenticated ? "/dashboard" : "/auth",
    },
  ];

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Chat", href: "/chat", icon: MessageSquare },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Admin", href: isAuthenticated && isAdmin ? "/admin" : "/admin/login", icon: Shield },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex-col">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">TaskFlow</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
  return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  activeClassName="bg-primary/10 text-primary"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Sign In Button or User Profile at Bottom */}
          {!isAuthenticated ? (
            <div className="p-4 border-t border-border">
              <Button
                onClick={() => navigate("/auth")}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{(user as any)?.username || user?.email?.split("@")[0] || user?.name || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Header with Welcome Message */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {isAuthenticated ? (
                <>
                  <h2 className="text-lg font-medium">
                    Welcome back, {user?.name || user?.email?.split("@")[0] || "User"}
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative"
                    onClick={() => navigate("/notifications")}
                  >
                    <Bell className="h-5 w-5" />
                    {totalUnreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
                        {totalUnreadNotifications > 9 ? "9+" : totalUnreadNotifications}
                      </span>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="lg:hidden">
                    <Link to="/" className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                        <CheckSquare className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <span className="text-xl font-bold">TaskFlow</span>
                    </Link>
                  </div>
                  <Button onClick={() => navigate("/auth")} size="sm">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={cn("flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8", isMobile && "pb-20")}>
        {/* Carousel Banner */}
        <div className="relative rounded-xl overflow-hidden border border-border">
          {/* Navigation Controls */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 z-20 flex items-center gap-2 sm:gap-3 text-muted-foreground">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={prevSlide}
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            </Button>
            <div className="flex gap-1 sm:gap-1.5">
              {carouselSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    "rounded-full transition-all",
                    index === currentSlide 
                      ? "bg-primary h-2 w-6 sm:h-2.5 sm:w-8" 
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50 h-1.5 w-1.5 sm:h-2 sm:w-2"
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={nextSlide}
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            </Button>
          </div>
          
          {/* Carousel Slides */}
          <div className="relative h-[400px] sm:h-[450px] lg:h-[500px] xl:h-[550px]">
            <AnimatePresence mode="wait">
              {carouselSlides.map((slide, index) => {
                if (index !== currentSlide) return null;
                const Icon = slide.icon;
  return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                    className={cn("absolute inset-0 p-6 sm:p-8 lg:p-12 xl:p-16", slide.bgColor)}
                  >
                    <div className="relative z-10 max-w-2xl xl:max-w-3xl h-full flex flex-col justify-center mx-auto">
                      <div className="flex items-center gap-4 mb-4 sm:mb-6">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary" />
      </div>
    </div>
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6 text-foreground leading-tight">
                        {slide.title}
                      </h1>
                      <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-muted-foreground mb-6 sm:mb-8 max-w-xl">
                        {slide.description}
                      </p>
                      <Button
                        size="lg"
                        onClick={slide.buttonAction}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 w-fit text-base sm:text-lg px-6 sm:px-8 py-6 sm:py-7"
                      >
                        {slide.buttonText}
                        <ArrowRight className="ml-2 h-5 w-5 sm:h-6 sm:w-6" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summaryCards.map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <card.icon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{card.value}</div>
                    <div className="text-sm text-muted-foreground">{card.label}</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={action.href}>
                  <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <action.icon className="w-8 h-8 text-primary" />
                      </div>
                      <span className="font-medium">{action.label}</span>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Features</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={cn(
                    "p-4 cursor-pointer hover:shadow-lg transition-shadow relative",
                    !isAuthenticated && feature.href.includes("/admin") && "opacity-60"
                  )}
                  onClick={() => navigate(feature.href)}
                >
                  <div className="flex flex-col items-center text-center">
                    {feature.badge && (
                      <Badge
                        variant="destructive"
                        className="absolute top-2 right-2 text-xs px-1.5 py-0.5"
                      >
                        {feature.badge}
                      </Badge>
                    )}
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-2">
                      <feature.icon className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium">{feature.label}</span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Your Productivity Hub Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-muted/50 rounded-xl p-6 sm:p-8 lg:p-12 border border-border"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground">
                  Your Productivity Hub
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Smart summaries, intelligent insights, and seamless collaboration.
                </p>
              </div>
            </div>
            {!isAuthenticated ? (
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="w-full sm:w-auto"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="w-full sm:w-auto"
              >
                Explore Features
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        </motion.div>
      </main>
      </div>

      {/* Bottom Navigation for Mobile - Outside scrollable area */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-background border-t border-border lg:hidden shadow-lg">
          <div className="grid grid-cols-5 h-16">
            {/* Home */}
            <NavLink
              to="/"
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors relative",
                location.pathname === "/"
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
              activeClassName="text-primary"
            >
              {location.pathname === "/" ? (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-5 h-5 rounded border-2 border-white flex items-center justify-center">
                    <CheckSquare className="h-3 w-3 text-white fill-white" />
      </div>
                </div>
              ) : (
                <Home className="h-5 w-5" />
              )}
              <span className={cn("font-medium text-[10px]", location.pathname === "/" && "text-primary")}>
                Home
              </span>
            </NavLink>

            {/* Dashboard */}
            <NavLink
              to="/dashboard"
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                location.pathname === "/dashboard"
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
              activeClassName="text-primary"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span className={cn("font-medium text-[10px]", location.pathname === "/dashboard" && "text-primary")}>
                Dashboard
              </span>
            </NavLink>

            {/* Tasks */}
            <NavLink
              to="/tasks"
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                location.pathname === "/tasks"
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
              activeClassName="text-primary"
            >
              <CheckSquare className="h-5 w-5" />
              <span className={cn("font-medium text-[10px]", location.pathname === "/tasks" && "text-primary")}>
                Tasks
              </span>
            </NavLink>

            {/* Chat */}
            <NavLink
              to="/chat"
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors relative",
                location.pathname === "/chat"
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
              activeClassName="text-primary"
            >
              <div className="relative">
                <MessageSquare className="h-5 w-5" />
                {totalUnreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-background"></span>
                )}
              </div>
              <span className={cn("font-medium text-[10px]", location.pathname === "/chat" && "text-primary")}>
                Chat
              </span>
            </NavLink>

            {/* Settings */}
            <NavLink
              to="/settings"
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                location.pathname === "/settings"
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
              activeClassName="text-primary"
            >
              <Settings className="h-5 w-5" />
              <span className={cn("font-medium text-[10px]", location.pathname === "/settings" && "text-primary")}>
                Settings
              </span>
            </NavLink>
          </div>
        </nav>
      )}
    </div>
  );
}
