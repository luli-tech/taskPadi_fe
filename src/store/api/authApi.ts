import { baseApi } from "./baseApi";

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user?: any;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface SignupRequest {
  email: string;
  password: string;
  username: string;
}

interface RefreshTokenRequest {
  refresh_token: string;
}

interface AdminRegisterRequest {
  username: string;
  email: string;
  password: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      transformResponse: (response: any): AuthResponse => {
        // Handle different response formats
        if (response.access_token && response.refresh_token) {
          return response;
        }
        // If response is wrapped in a data property
        if (response.data && response.data.access_token) {
          return response.data;
        }
        // Return as-is if already correct format
        return response;
      },
    }),
    signup: builder.mutation<AuthResponse, SignupRequest>({
      query: (data) => ({
        url: "/auth/register",
        method: "POST",
        body: data,
      }),
    }),
    refresh: builder.mutation<AuthResponse, RefreshTokenRequest>({
      query: (body) => ({
        url: "/auth/refresh",
        method: "POST",
        body,
      }),
    }),
    logout: builder.mutation<void, { refresh_token: string }>({
      query: (body) => ({
        url: "/auth/logout",
        method: "POST",
        body,
      }),
    }),
    googleLogin: builder.query<{ url: string }, void>({
      query: () => "/auth/google",
    }),
    googleCallback: builder.query<AuthResponse, { code: string; state?: string }>({
      query: (params) => ({
        url: "/auth/google/callback",
        params,
      }),
    }),
    // Admin Registration - Public endpoint
    adminRegister: builder.mutation<AuthResponse, AdminRegisterRequest>({
      query: (data) => ({
        url: "/admin/register",
        method: "POST",
        body: data,
      }),
      transformResponse: (response: any): AuthResponse => {
        // Handle different response formats
        if (response.access_token && response.refresh_token) {
          return response;
        }
        if (response.data && response.data.access_token) {
          return response.data;
        }
        return response;
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useRefreshMutation,
  useLogoutMutation,
  useGoogleLoginQuery,
  useLazyGoogleCallbackQuery,
  useAdminRegisterMutation,
} = authApi;
