import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const getInitialUser = (): User | null => {
  const token = localStorage.getItem("authToken");
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.username || payload.email,
      };
    } catch {
      return null;
    }
  }
  return null;
};

const initialState: AuthState = {
  user: getInitialUser(),
  isLoading: false,
  isAuthenticated: !!localStorage.getItem("authToken"),
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
        };
        state.isAuthenticated = true;
      } catch {
        state.user = null;
        state.isAuthenticated = false;
      }
    },
    logout: (state) => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      state.user = null;
      state.isAuthenticated = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setCredentials, logout, setLoading } = authSlice.actions;
export default authSlice.reducer;
