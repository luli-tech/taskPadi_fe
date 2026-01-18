import { baseApi } from "./baseApi";
import type { Task, TaskStatus, TaskPriority } from "./tasksApi";
import type { User } from "./usersApi";

interface PaginationParams {
  page?: number;
  limit?: number;
}

interface AdminTaskFilters extends PaginationParams {
  status?: string;
  statuses?: string[];
  priority?: string;
  priorities?: string[];
  search?: string;
  created_from?: string;
  created_to?: string;
  due_from?: string;
  due_to?: string;
  user_id?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface UpdateUserRequest {
  username?: string;
  email?: string;
  bio?: string;
  theme?: string;
  avatar_url?: string;
  is_admin?: boolean;
  is_active?: boolean;
}

interface UpdateUserStatusRequest {
  is_active: boolean;
}

interface UpdateUserAdminRequest {
  is_admin: boolean;
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // User Management
    getUsers: builder.query<PaginatedResponse<User> | User[], PaginationParams | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.append("page", params.page.toString());
        if (params?.limit) searchParams.append("limit", params.limit.toString());
        const queryString = searchParams.toString();
        return `/admin/users${queryString ? `?${queryString}` : ""}`;
      },
      transformResponse: (response: User[] | PaginatedResponse<User> | { users: User[] } | { data: User[] }) => {
        if (Array.isArray(response)) return response;
        if ('data' in response && 'total' in response) return response as PaginatedResponse<User>;
        if ('users' in response) return { data: response.users, total: response.users.length, page: 1, limit: response.users.length, total_pages: 1 };
        if ('data' in response) return { data: response.data, total: response.data.length, page: 1, limit: response.data.length, total_pages: 1 };
        return { data: [], total: 0, page: 1, limit: 10, total_pages: 0 };
      },
      providesTags: ["Users" as never],
    }),
    getUser: builder.query<User, string>({
      query: (userId) => `/admin/users/${userId}`,
      providesTags: (_, __, userId) => [{ type: "Users" as never, id: userId }],
    }),
    updateUser: builder.mutation<User, { userId: string; data: UpdateUserRequest }>({
      query: ({ userId, data }) => ({
        url: `/admin/users/${userId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_, __, { userId }) => [{ type: "Users" as never, id: userId }, "Users" as never],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/admin/users/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_, __, userId) => [{ type: "Users" as never, id: userId }, "Users" as never],
    }),
    updateUserStatus: builder.mutation<User, { userId: string; data: UpdateUserStatusRequest }>({
      query: ({ userId, data }) => ({
        url: `/admin/users/${userId}/status`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_, __, { userId }) => [{ type: "Users" as never, id: userId }, "Users" as never],
    }),
    updateUserAdmin: builder.mutation<User, { userId: string; data: UpdateUserAdminRequest }>({
      query: ({ userId, data }) => ({
        url: `/admin/users/${userId}/admin`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (_, __, { userId }) => [{ type: "Users" as never, id: userId }, "Users" as never],
    }),
    // Task Management
    getAllTasks: builder.query<PaginatedResponse<Task> | Task[], AdminTaskFilters | void>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters) {
          if (filters.status) params.append("status", filters.status);
          if (filters.statuses) {
            filters.statuses.forEach((s) => params.append("statuses[]", s));
          }
          if (filters.priority) params.append("priority", filters.priority);
          if (filters.priorities) {
            filters.priorities.forEach((p) => params.append("priorities[]", p));
          }
          if (filters.search) params.append("search", filters.search);
          if (filters.created_from) params.append("created_from", filters.created_from);
          if (filters.created_to) params.append("created_to", filters.created_to);
          if (filters.due_from) params.append("due_from", filters.due_from);
          if (filters.due_to) params.append("due_to", filters.due_to);
          if (filters.user_id) params.append("user_id", filters.user_id);
          if (filters.page) params.append("page", filters.page.toString());
          if (filters.limit) params.append("limit", filters.limit.toString());
        }
        const queryString = params.toString();
        return `/admin/tasks${queryString ? `?${queryString}` : ""}`;
      },
      transformResponse: (response: Task[] | PaginatedResponse<Task> | { tasks: Task[] } | { data: Task[] }) => {
        if (Array.isArray(response)) return response;
        if ('data' in response && 'total' in response) return response as PaginatedResponse<Task>;
        if ('tasks' in response) return { data: response.tasks, total: response.tasks.length, page: 1, limit: response.tasks.length, total_pages: 1 };
        if ('data' in response) return { data: response.data, total: response.data.length, page: 1, limit: response.data.length, total_pages: 1 };
        return { data: [], total: 0, page: 1, limit: 10, total_pages: 0 };
      },
      providesTags: ["Tasks" as never],
    }),
    getUserTasks: builder.query<PaginatedResponse<Task> | Task[], { userId: string; filters?: Omit<AdminTaskFilters, "user_id"> }>({
      query: ({ userId, filters }) => {
        const params = new URLSearchParams();
        if (filters) {
          if (filters.status) params.append("status", filters.status);
          if (filters.statuses) {
            filters.statuses.forEach((s) => params.append("statuses[]", s));
          }
          if (filters.priority) params.append("priority", filters.priority);
          if (filters.priorities) {
            filters.priorities.forEach((p) => params.append("priorities[]", p));
          }
          if (filters.search) params.append("search", filters.search);
          if (filters.created_from) params.append("created_from", filters.created_from);
          if (filters.created_to) params.append("created_to", filters.created_to);
          if (filters.due_from) params.append("due_from", filters.due_from);
          if (filters.due_to) params.append("due_to", filters.due_to);
          if (filters.page) params.append("page", filters.page.toString());
          if (filters.limit) params.append("limit", filters.limit.toString());
        }
        const queryString = params.toString();
        return `/admin/users/${userId}/tasks${queryString ? `?${queryString}` : ""}`;
      },
      transformResponse: (response: Task[] | PaginatedResponse<Task> | { tasks: Task[] } | { data: Task[] }) => {
        if (Array.isArray(response)) return response;
        if ('data' in response && 'total' in response) return response as PaginatedResponse<Task>;
        if ('tasks' in response) return { data: response.tasks, total: response.tasks.length, page: 1, limit: response.tasks.length, total_pages: 1 };
        if ('data' in response) return { data: response.data, total: response.data.length, page: 1, limit: response.data.length, total_pages: 1 };
        return { data: [], total: 0, page: 1, limit: 10, total_pages: 0 };
      },
      providesTags: ["Tasks" as never],
    }),
    deleteTask: builder.mutation<void, string>({
      query: (taskId) => ({
        url: `/admin/tasks/${taskId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_, __, taskId) => [{ type: "Tasks" as never, id: taskId }, "Tasks" as never],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useUpdateUserStatusMutation,
  useUpdateUserAdminMutation,
  useGetAllTasksQuery,
  useGetUserTasksQuery,
  useDeleteTaskMutation,
} = adminApi;
