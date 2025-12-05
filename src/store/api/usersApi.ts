import { baseApi } from "./baseApi";

export interface User {
  id: string;
  email: string;
  username: string;
  role: "admin" | "user";
  created_at: string;
  updated_at: string;
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
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
  useGetUsersQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetAllTasksQuery,
} = usersApi;
