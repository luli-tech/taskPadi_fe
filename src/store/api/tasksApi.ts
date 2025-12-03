import { baseApi } from "./baseApi";

export type TaskStatus = "Pending" | "InProgress" | "Completed" | "Archived";
export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  reminder_time?: string;
  created_at: string;
  updated_at: string;
}

interface TaskFilters {
  status?: string;
  priority?: string;
  due_date?: string;
  search?: string;
}

interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string;
  reminder_time?: string;
}

interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string;
  reminder_time?: string;
}

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query<Task[], TaskFilters | void>({
      query: (filters) => {
        const params = filters ? new URLSearchParams(filters as Record<string, string>).toString() : "";
        return `/tasks${params ? `?${params}` : ""}`;
      },
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: "Tasks" as const, id })), { type: "Tasks", id: "LIST" }]
          : [{ type: "Tasks", id: "LIST" }],
    }),
    getTask: builder.query<Task, string>({
      query: (id) => `/tasks/${id}`,
      providesTags: (_, __, id) => [{ type: "Tasks", id }],
    }),
    createTask: builder.mutation<Task, CreateTaskRequest>({
      query: (data) => ({
        url: "/tasks",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Tasks", id: "LIST" }],
    }),
    updateTask: builder.mutation<Task, { id: string; data: UpdateTaskRequest }>({
      query: ({ id, data }) => ({
        url: `/tasks/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "Tasks", id }, { type: "Tasks", id: "LIST" }],
    }),
    updateTaskStatus: builder.mutation<Task, { id: string; status: TaskStatus }>({
      query: ({ id, status }) => ({
        url: `/tasks/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "Tasks", id }, { type: "Tasks", id: "LIST" }],
    }),
    deleteTask: builder.mutation<void, string>({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Tasks", id: "LIST" }],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useUpdateTaskStatusMutation,
  useDeleteTaskMutation,
} = tasksApi;
