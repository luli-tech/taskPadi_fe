import { baseApi } from "./baseApi";

export interface User {
  id: string;
  email: string;
  username: string;
  role: "admin" | "user";
  bio?: string;
  theme?: string;
  avatar_url?: string;
  is_admin?: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  bio?: string;
  theme?: string;
  avatar_url?: string;
}

export interface UserStats {
  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  archived_tasks: number;
}

interface UpdateProfileRequest {
  username?: string;
  bio?: string;
  theme?: string;
  avatar_url?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // User Profile Endpoints
    getMe: builder.query<UserProfile, void>({
      query: () => "/users/me",
      providesTags: ["Users" as never],
    }),
    updateMe: builder.mutation<UserProfile, UpdateProfileRequest>({
      query: (data) => ({
        url: "/users/me",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Users" as never],
    }),
    getMyStats: builder.query<UserStats, void>({
      query: () => "/users/me/stats",
      providesTags: ["Users" as never],
    }),
    // Public User List Endpoint (for chat/search - requires authentication but not admin)
    getAllUsers: builder.query<User[] | PaginatedResponse<User>, UserListParams | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.append("page", params.page.toString());
        if (params?.limit) searchParams.append("limit", params.limit.toString());
        if (params?.search) searchParams.append("search", params.search);
        const queryString = searchParams.toString();
        return `/users${queryString ? `?${queryString}` : ""}`;
      },
      transformResponse: (response: User[] | PaginatedResponse<User> | { users: User[] } | { data: User[] }) => {
        if (Array.isArray(response)) return response;
        if ('data' in response && 'total' in response) return response as PaginatedResponse<User>;
        if ('users' in response) return response.users;
        if ('data' in response) return response.data;
        return [];
      },
      providesTags: ["Users" as never],
    }),
    // Admin Endpoints (moved from here, but keeping for backward compatibility)
    getUsers: builder.query<User[], void>({
      query: () => "/admin/users",
      transformResponse: (response: User[] | { users: User[] } | { data: User[] }) => {
        if (Array.isArray(response)) return response;
        if ('users' in response) return response.users;
        if ('data' in response) return response.data;
        return [];
      },
      providesTags: ["Users" as never],
    }),
    updateUser: builder.mutation<User, { id: string; data: Partial<User> }>({
      query: ({ id, data }) => ({
        url: `/admin/users/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Users" as never],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users" as never],
    }),
    getAllTasks: builder.query<any[], void>({
      query: () => "/admin/tasks",
      transformResponse: (response: any[] | { tasks: any[] } | { data: any[] }) => {
        if (Array.isArray(response)) return response;
        if ('tasks' in response) return response.tasks;
        if ('data' in response) return response.data;
        return [];
      },
    }),
  }),
});

export const {
  useGetMeQuery,
  useUpdateMeMutation,
  useGetMyStatsQuery,
  useGetAllUsersQuery,
  useGetUsersQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetAllTasksQuery,
} = usersApi;
