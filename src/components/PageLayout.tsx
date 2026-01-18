import { useNavigate } from "react-router-dom";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft,
  CheckSquare,
  LayoutDashboard,
  MessageSquare,
  Settings,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function PageLayout({ title, children }: PageLayoutProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [showBottomNav, setShowBottomNav] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    // Show bottom nav after scrolling 100px
    setShowBottomNav(latest > 100);
  });

  const handleProtectedNavigation = (href: string) => {
    if (!isAuthenticated) {
      navigate("/auth");
    } else {
      navigate(href);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Back Button */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-24">
        {children}
      </main>

      {/* Bottom Navigation - Shows on Scroll */}
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: showBottomNav ? 0 : 100, opacity: showBottomNav ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 shadow-custom-lg z-50"
      >
        <div className="flex justify-around items-center max-w-md mx-auto">
          <Link to="/" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
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
      </motion.nav>
    </div>
  );
}
