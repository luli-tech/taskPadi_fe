import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const getInitialUser = (): { user: User | null; isAdmin: boolean } => {
  const token = localStorage.getItem("authToken");
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        user: {
          id: payload.sub,
          email: payload.email,
          name: payload.username || payload.email,
          role: payload.role,
        },
        isAdmin: payload.role === "admin",
      };
    } catch {
      return { user: null, isAdmin: false };
    }
  }
  return { user: null, isAdmin: false };
};

const initialData = getInitialUser();
const initialState: AuthState = {
  user: initialData.user,
  isLoading: false,
  isAuthenticated: !!localStorage.getItem("authToken"),
  isAdmin: initialData.isAdmin,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ access_token: string; refresh_token: string }>) => {
      const { access_token, refresh_token } = action.payload;
      localStorage.setItem("authToken", access_token);
      localStorage.setItem("refreshToken", refresh_token);
      
      try {
        const payload = JSON.parse(atob(access_token.split(".")[1]));
        state.user = {
          id: payload.sub,
          email: payload.email,
          name: payload.username || payload.email,
          role: payload.role,
        };
        state.isAuthenticated = true;
        state.isAdmin = payload.role === "admin";
      } catch {
        state.user = null;
        state.isAuthenticated = false;
        state.isAdmin = false;
      }
    },
    logout: (state) => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      state.user = null;
      state.isAuthenticated = false;
      state.isAdmin = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setCredentials, logout, setLoading } = authSlice.actions;
export default authSlice.reducer;
