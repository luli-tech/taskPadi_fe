import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("authToken");
    const refreshToken = localStorage.getItem("refreshToken");
    
    if (token && refreshToken) {
      try {
        // Try to decode JWT to get user info (basic decode without verification)
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.sub,
          email: payload.email,
          name: payload.username || payload.email,
        });
      } catch (error) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
      }
    }
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    const { access_token, refresh_token } = await api.auth.login(email, password);
    localStorage.setItem("authToken", access_token);
    localStorage.setItem("refreshToken", refresh_token);
    
    // Decode JWT to get user info
    const payload = JSON.parse(atob(access_token.split('.')[1]));
    setUser({
      id: payload.sub,
      email: payload.email,
      name: payload.username || payload.email,
    });
  };

  const signup = async (email: string, password: string, username: string) => {
    const { access_token, refresh_token } = await api.auth.signup(email, password, username);
    localStorage.setItem("authToken", access_token);
    localStorage.setItem("refreshToken", refresh_token);
    
    // Decode JWT to get user info
    const payload = JSON.parse(atob(access_token.split('.')[1]));
    setUser({
      id: payload.sub,
      email: payload.email,
      name: payload.username || username,
    });
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    // Navigation will be handled by the component
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
