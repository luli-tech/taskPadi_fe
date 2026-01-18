import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";

const API_BASE_URL = "https://task-manager-84ag.onrender.com/api";

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { endpoint }) => {
    // Don't add auth header for auth endpoints
    // RTK Query endpoint names are like "login", "signup", etc.
    const endpointName = typeof endpoint === 'string' ? endpoint : '';
    const isAuthEndpoint = 
      endpointName.includes('login') ||
      endpointName.includes('signup') ||
      endpointName.includes('register') ||
      endpointName.includes('google') ||
      endpointName.includes('refresh') ||
      endpointName.includes('logout');
    
    if (!isAuthEndpoint) {
      const token = localStorage.getItem("authToken");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
    headers.set("Content-Type", "application/json");
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await baseQuery(args, api, extraOptions);

  // Don't trigger reauth for auth endpoints or if the request URL is an auth endpoint
  const url = typeof args === 'string' ? args : args.url;
  const isAuthEndpoint = url && (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/google')
  );

  if (result.error && result.error.status === 401 && !isAuthEndpoint) {
    const refreshToken = localStorage.getItem("refreshToken");
    
    if (refreshToken) {
      const refreshResult = await baseQuery(
        {
          url: "/auth/refresh",
          method: "POST",
          body: { refresh_token: refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        const data = refreshResult.data as { access_token: string; refresh_token: string };
        localStorage.setItem("authToken", data.access_token);
        localStorage.setItem("refreshToken", data.refresh_token);
        result = await baseQuery(args, api, extraOptions);
      } else {
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/auth";
      }
    } else {
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/auth";
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Tasks", "Notifications", "Messages", "Users"],
  endpoints: () => ({}),
});
