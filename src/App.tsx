import { Provider } from "react-redux";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { store } from "@/store";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useTheme } from "@/hooks/use-theme";
import { VideoCallManager } from "@/components/VideoCallManager";
import { VideoCallProvider } from "@/context/VideoCallContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import AdminDashboard from "./pages/AdminDashboard";
import UserDetails from "./pages/UserDetails";
import ChatUserDetails from "./pages/ChatUserDetails";
import NotFound from "./pages/NotFound";

const AppContent = () => {
  useTheme(); // Initialize theme
  return (
    <VideoCallProvider>
      <TooltipProvider>
        <VideoCallManager />
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/" element={<Index />} />
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/users/:userId" element={<ChatUserDetails />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/users/:userId"
              element={
                <AdminProtectedRoute>
                  <UserDetails />
                </AdminProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </VideoCallProvider>
  );
};

const App = () => (
  <Provider store={store}>
    <AppContent />
  </Provider>
);

export default App;
