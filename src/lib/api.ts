import { toast } from "sonner";

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// Token management
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/auth";
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  localStorage.setItem("authToken", data.access_token);
  localStorage.setItem("refreshToken", data.refresh_token);
  return data.access_token;
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

// Request interceptor
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, ...fetchOptions } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };

  // Add auth token if required
  if (requiresAuth) {
    const token = localStorage.getItem("authToken");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    // Handle different status codes
    if (!response.ok) {
      if (response.status === 401 && requiresAuth) {
        // Try to refresh token
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const newToken = await refreshAccessToken();
            isRefreshing = false;
            onRefreshed(newToken);

            // Retry original request with new token
            headers["Authorization"] = `Bearer ${newToken}`;
            return apiRequest<T>(endpoint, { ...options, headers });
          } catch (refreshError) {
            isRefreshing = false;
            localStorage.removeItem("authToken");
            localStorage.removeItem("refreshToken");
            window.location.href = "/auth";
            throw new Error("Session expired. Please login again.");
          }
        } else {
          // Wait for token refresh
          return new Promise<T>((resolve, reject) => {
            addRefreshSubscriber((token: string) => {
              headers["Authorization"] = `Bearer ${token}`;
              apiRequest<T>(endpoint, { ...options, headers })
                .then(resolve)
                .catch(reject);
            });
          });
        }
      }

      if (response.status === 403) {
        throw new Error("You don't have permission to perform this action.");
      }

      if (response.status === 404) {
        throw new Error("Resource not found.");
      }

      if (response.status >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      // Try to get error message from response
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "An error occurred");
    }

    // Handle no content responses
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      toast.error(error.message);
      throw error;
    }
    toast.error("An unexpected error occurred");
    throw new Error("An unexpected error occurred");
  }
}

// API methods
export const api = {
  // Auth endpoints
  auth: {
    login: (email: string, password: string) =>
      apiRequest<{ access_token: string; refresh_token: string; user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        requiresAuth: false,
      }),

    signup: (email: string, password: string, username: string) =>
      apiRequest<{ access_token: string; refresh_token: string; user: any }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, username }),
        requiresAuth: false,
      }),

    logout: () => {
      const refreshToken = localStorage.getItem("refreshToken");
      return apiRequest<void>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    },

    googleAuth: () => {
      window.location.href = `${API_BASE_URL}/auth/google`;
    },
  },

  // Task endpoints
  tasks: {
    list: (filters?: {
      status?: string;
      priority?: string;
      due_date?: string;
      search?: string;
    }) =>
      apiRequest<any[]>(`/tasks${filters ? `?${new URLSearchParams(filters as any)}` : ""}`),

    get: (id: string) => apiRequest<any>(`/tasks/${id}`),

    create: (data: {
      title: string;
      description?: string;
      priority?: "Low" | "Medium" | "High" | "Urgent";
      due_date?: string;
      reminder_time?: string;
    }) =>
      apiRequest<any>("/tasks", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (id: string, data: {
      title?: string;
      description?: string;
      priority?: "Low" | "Medium" | "High" | "Urgent";
      due_date?: string;
      reminder_time?: string;
    }) =>
      apiRequest<any>(`/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    updateStatus: (id: string, status: "Pending" | "InProgress" | "Completed" | "Archived") =>
      apiRequest<any>(`/tasks/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),

    delete: (id: string) =>
      apiRequest<void>(`/tasks/${id}`, {
        method: "DELETE",
      }),
  },

  // Notifications
  notifications: {
    list: () => apiRequest<any[]>("/notifications"),
    markAsRead: (id: string) =>
      apiRequest<void>(`/notifications/${id}/read`, {
        method: "PATCH",
      }),
    delete: (id: string) =>
      apiRequest<void>(`/notifications/${id}`, {
        method: "DELETE",
      }),
  },

  // Message endpoints
  messages: {
    conversations: () => apiRequest<any[]>("/messages/conversations"),
    
    getConversation: (otherUserId: string) =>
      apiRequest<any[]>(`/messages/conversations/${otherUserId}`),

    send: (recipientId: string, content: string) =>
      apiRequest<any>("/messages", {
        method: "POST",
        body: JSON.stringify({ recipient_id: recipientId, content }),
      }),

    markAsRead: (messageId: string) =>
      apiRequest<void>(`/messages/${messageId}/read`, {
        method: "PUT",
      }),
  },
};
