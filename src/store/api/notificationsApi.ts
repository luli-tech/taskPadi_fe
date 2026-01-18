import { baseApi } from "./baseApi";

export interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  user_id?: string;
  task_id?: string | null;
}

export interface NotificationPreferences {
  notification_enabled: boolean;
}

interface UpdatePreferencesRequest {
  notification_enabled: boolean;
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<Notification[], void>({
      query: () => "/notifications",
      providesTags: ["Notifications"],
    }),
    markNotificationRead: builder.mutation<Notification, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["Notifications"],
    }),
    deleteNotification: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notifications"],
    }),
    updatePreferences: builder.mutation<NotificationPreferences, UpdatePreferencesRequest>({
      query: (data) => ({
        url: "/notifications/preferences",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Notifications"],
    }),
    // Note: SSE stream endpoint should be handled via EventSource using the sse utility
    // See src/lib/sse.ts for createNotificationStream()
    // This endpoint is kept for reference only
    getNotificationStreamUrl: builder.query<{ url: string }, void>({
      query: () => "/notifications/stream",
      transformResponse: () => ({ url: "/notifications/stream" }),
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useDeleteNotificationMutation,
  useUpdatePreferencesMutation,
  useGetNotificationStreamUrlQuery,
} = notificationsApi;
