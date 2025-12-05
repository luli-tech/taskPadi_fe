import { baseApi } from "./baseApi";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  name?: string;
  type: "direct" | "group";
  participants: { id: string; username: string }[];
  last_message?: Message;
  created_at: string;
  updated_at: string;
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getConversations: builder.query<Conversation[], void>({
      query: () => "/chat/conversations",
      transformResponse: (response: Conversation[] | { conversations: Conversation[] } | { data: Conversation[] }) => {
        if (Array.isArray(response)) return response;
        if ('conversations' in response) return response.conversations;
        if ('data' in response) return response.data;
        return [];
      },
      providesTags: ["Messages" as never],
    }),
    getMessages: builder.query<Message[], string>({
      query: (conversationId) => `/chat/conversations/${conversationId}/messages`,
      transformResponse: (response: Message[] | { messages: Message[] } | { data: Message[] }) => {
        if (Array.isArray(response)) return response;
        if ('messages' in response) return response.messages;
        if ('data' in response) return response.data;
        return [];
      },
      providesTags: (_, __, id) => [{ type: "Messages" as never, id }],
    }),
    sendMessage: builder.mutation<Message, { conversationId: string; content: string }>({
      query: ({ conversationId, content }) => ({
        url: `/chat/conversations/${conversationId}/messages`,
        method: "POST",
        body: { content },
      }),
      invalidatesTags: (_, __, { conversationId }) => [{ type: "Messages" as never, id: conversationId }, "Messages" as never],
    }),
    createConversation: builder.mutation<Conversation, { participantIds: string[]; name?: string }>({
      query: (data) => ({
        url: "/chat/conversations",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Messages" as never],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useCreateConversationMutation,
} = chatApi;
