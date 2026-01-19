import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useLogoutMutation } from "@/store/api/authApi";
import { logout } from "@/store/slices/authSlice";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  LogOut,
  User,
  Menu,
  X,
  Settings,
  Shield,
  Home,
  CheckSquare,
  MessageSquare,
  Bell,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function DashboardLayout() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [logoutApi] = useLogoutMutation();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();

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
    navigate("/auth");
  };

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Chat", href: "/chat", icon: MessageSquare },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  // Bottom navigation: Home, Dashboard, Tasks, Chat, Notifications (Settings moved to header)
  const bottomNavigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Chat", href: "/chat", icon: MessageSquare },
    { name: "Notifications", href: "/notifications", icon: Bell },
  ];

  const isChatPage = location.pathname === "/chat";
  const shouldHideSidebarOnMobile = isMobile && isChatPage;

  const adminNav = [
    { name: "Admin", href: "/admin", icon: Shield },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - Only visible on desktop */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -256 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={cn(
          "hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <img 
                  src="/favicon.ico" 
                  alt="TaskPadi logo" 
                  className="w-7 h-7 object-contain"
                />
              </div>
              <span className="text-xl font-bold">TaskPadi</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === "/"}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                activeClassName="bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            ))}
            
            <div className="pt-4 mt-4 border-t border-border">
              <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Admin</p>
              {adminNav.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  activeClassName="bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </NavLink>
              ))}
            </div>
          </nav>

          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3 px-4 py-2">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </motion.aside>

      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-200",
        sidebarOpen ? 'lg:ml-64' : 'ml-0'
      )}>
        {/* Header - Hidden on chat page mobile, visible otherwise */}
        {!shouldHideSidebarOnMobile && (
          <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
            <div className="flex items-center justify-between px-6 py-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex"
              >
                <Menu className="w-5 h-5" />
              </Button>
            
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold">
                {navigation.find(item => item.href === location.pathname)?.name || 
                 adminNav.find(item => item.href === location.pathname)?.name || 
                 "Dashboard"}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Settings button on mobile - top right */}
              {isMobile && (
                <NavLink
                  to="/settings"
                  className={cn(
                    "flex items-center justify-center p-2 rounded-lg transition-colors",
                    location.pathname === "/settings"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  activeClassName="text-primary"
                >
                  <Settings className="h-5 w-5" />
                </NavLink>
              )}
            </div>
          </div>
        </header>
        )}

        <main className={cn("flex-1", shouldHideSidebarOnMobile ? "p-0 pb-20" : "p-6 pb-24 sm:pb-6")}>
          <div className={cn(shouldHideSidebarOnMobile ? "w-full h-full" : "max-w-7xl mx-auto")}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom Navigation for Mobile (without Settings) */}
      {/* Hide bottom nav when in a chat conversation on mobile */}
      {isMobile && !(location.pathname === "/chat" && new URLSearchParams(location.search).get("chat")) && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border lg:hidden">
          <div className="grid grid-cols-5 h-16">
            {bottomNavigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href === "/" && location.pathname === "/");
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === "/"}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  activeClassName="text-primary"
                >
                  <item.icon className={cn(
                    isMobile ? "h-4 w-4" : "h-5 w-5",
                    isActive && "text-primary"
                  )} />
                  <span className={cn(
                    "font-medium truncate max-w-full px-1",
                    isActive && "text-primary"
                  )}>
                    {item.name}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
