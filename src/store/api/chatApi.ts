import { baseApi } from "./baseApi";

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string;
  read?: boolean;
  created_at: string;
}

interface SendMessageRequest {
  receiver_id: string;
  content: string;
  image_url?: string;
}

interface MessageQueryParams {
  page?: number;
  limit?: number;
}

// ConversationUser structure from API
export interface ConversationUser {
  user_id: string;
  username: string;
  avatar_url?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

// Paginated response structure
interface PaginatedMessageResponse {
  data: Message[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getConversations: builder.query<ConversationUser[], void>({
      query: () => "/messages/conversations",
      transformResponse: (response: ConversationUser[] | { conversations: ConversationUser[] } | { data: ConversationUser[] }) => {
        if (Array.isArray(response)) return response;
        if ('conversations' in response) return response.conversations;
        if ('data' in response) return response.data;
        return [];
      },
      providesTags: ["Messages" as never],
    }),
    sendMessage: builder.mutation<Message, SendMessageRequest>({
      query: (data) => ({
        url: "/messages",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Messages" as never],
    }),
    getConversationMessages: builder.query<Message[] | PaginatedMessageResponse, { userId: string; params?: MessageQueryParams }>({
      query: ({ userId, params }) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.append("page", params.page.toString());
        if (params?.limit) searchParams.append("limit", params.limit.toString());
        const queryString = searchParams.toString();
        return `/messages/${userId}${queryString ? `?${queryString}` : ""}`;
      },
      transformResponse: (response: Message[] | PaginatedMessageResponse | { messages: Message[] } | { data: Message[] }) => {
        if (Array.isArray(response)) return response;
        if ('data' in response && 'total' in response) return response as PaginatedMessageResponse;
        if ('messages' in response) return response.messages;
        if ('data' in response) return response.data;
        return [];
      },
      providesTags: (_, __, { userId }) => [{ type: "Messages" as never, id: userId }],
    }),
    markMessageRead: builder.mutation<Message, string>({
      query: (messageId) => ({
        url: `/messages/${messageId}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["Messages" as never],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useSendMessageMutation,
  useGetConversationMessagesQuery,
  useMarkMessageReadMutation,
} = chatApi;
