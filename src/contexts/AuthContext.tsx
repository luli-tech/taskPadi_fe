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
    if (token) {
      try {
        const userData = await api.auth.me();
        setUser(userData);
      } catch (error) {
        localStorage.removeItem("authToken");
      }
    }
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    const { token, user: userData } = await api.auth.login(email, password);
    localStorage.setItem("authToken", token);
    setUser(userData);
    // Navigation will be handled by the component
  };

  const signup = async (email: string, password: string, name: string) => {
    const { token, user: userData } = await api.auth.signup(email, password, name);
    localStorage.setItem("authToken", token);
    setUser(userData);
    // Navigation will be handled by the component
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
    localStorage.removeItem("authToken");
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
