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
  statuses?: string[];
  priority?: string;
  priorities?: string[];
  search?: string;
  created_from?: string;
  created_to?: string;
  due_from?: string;
  due_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

interface PaginatedTaskResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
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
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  reminder_time?: string;
}

interface ShareTaskRequest {
  user_ids: string[];
}

export interface TaskMember {
  id: string;
  username: string;
  email: string;
  role?: string;
  joined_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  user_name?: string;
  action: string;
  details?: Record<string, any>;
  created_at: string;
}

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query<Task[] | PaginatedTaskResponse, TaskFilters | void>({
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
          if (filters.sort_by) params.append("sort_by", filters.sort_by);
          if (filters.sort_order) params.append("sort_order", filters.sort_order);
          if (filters.page) params.append("page", filters.page.toString());
          if (filters.limit) params.append("limit", filters.limit.toString());
        }
        const queryString = params.toString();
        return `/tasks${queryString ? `?${queryString}` : ""}`;
      },
      transformResponse: (response: Task[] | PaginatedTaskResponse | { tasks: Task[] } | { data: Task[] }) => {
        if (Array.isArray(response)) return response;
        if ('tasks' in response && 'total' in response) return response as PaginatedTaskResponse;
        if ('tasks' in response) return response.tasks;
        if ('data' in response) return response.data;
        return [];
      },
      providesTags: (result) => {
        const tasks = Array.isArray(result) ? result : ('tasks' in result ? result.tasks : []);
        return tasks.length > 0
          ? [...tasks.map(({ id }) => ({ type: "Tasks" as const, id })), { type: "Tasks", id: "LIST" }]
          : [{ type: "Tasks", id: "LIST" }];
      },
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
      invalidatesTags: (_, __, id) => [{ type: "Tasks", id }, { type: "Tasks", id: "LIST" }],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Optimistic update - remove task from cache immediately
        const patchResult = dispatch(
          tasksApi.util.updateQueryData('getTasks', undefined, (draft) => {
            const tasks = Array.isArray(draft) ? draft : ('tasks' in draft ? draft.tasks : []);
            const index = tasks.findIndex((task) => task.id === id);
            if (index !== -1) {
              if (Array.isArray(draft)) {
                draft.splice(index, 1);
              } else if ('tasks' in draft) {
                draft.tasks.splice(index, 1);
              }
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          // Revert on error
          patchResult.undo();
        }
      },
    }),
    shareTask: builder.mutation<{ message: string }, { taskId: string; data: ShareTaskRequest }>({
      query: ({ taskId, data }) => ({
        url: `/tasks/${taskId}/share`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_, __, { taskId }) => [{ type: "Tasks", id: taskId }],
    }),
    getTaskMembers: builder.query<TaskMember[], string>({
      query: (taskId) => `/tasks/${taskId}/members`,
      providesTags: (_, __, taskId) => [{ type: "Tasks", id: taskId }],
    }),
    removeTaskMember: builder.mutation<void, { taskId: string; userId: string }>({
      query: ({ taskId, userId }) => ({
        url: `/tasks/${taskId}/members/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_, __, { taskId }) => [{ type: "Tasks", id: taskId }],
    }),
    getTaskActivity: builder.query<TaskActivity[], string>({
      query: (taskId) => `/tasks/${taskId}/activity`,
      providesTags: (_, __, taskId) => [{ type: "Tasks", id: taskId }],
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
  useShareTaskMutation,
  useGetTaskMembersQuery,
  useRemoveTaskMemberMutation,
  useGetTaskActivityQuery,
} = tasksApi;
