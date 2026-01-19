import { baseApi } from "./baseApi";

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  group_id: string | null;
  content: string;
  image_url?: string | null;
  is_read: boolean;
  created_at: string;
}

interface SendMessageRequest {
  receiver_id?: string;
  group_id?: string;
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

// Group interfaces
export interface Group {
  id: string;
  name: string;
  description?: string | null;
  creator_id: string;
  avatar_url?: string | null;
  member_count?: number;
  created_at: string;
  updated_at: string;
  members?: GroupMember[];
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  username: string;
  avatar_url?: string | null;
  role: "creator" | "member";
  joined_at: string;
}

interface CreateGroupRequest {
  name: string;
  description?: string;
  avatar_url?: string;
}

interface AddGroupMembersRequest {
  user_id: string;
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
        // Correct endpoint: /messages/conversation/:user_id (singular "conversation")
        return `/messages/conversation/${userId}${queryString ? `?${queryString}` : ""}`;
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
    getGroupMessages: builder.query<Message[] | PaginatedMessageResponse, { groupId: string; params?: MessageQueryParams }>({
      query: ({ groupId, params }) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.append("page", params.page.toString());
        if (params?.limit) searchParams.append("limit", params.limit.toString());
        const queryString = searchParams.toString();
        return `/messages/groups/${groupId}${queryString ? `?${queryString}` : ""}`;
      },
      transformResponse: (response: Message[] | PaginatedMessageResponse | { messages: Message[] } | { data: Message[] }) => {
        if (Array.isArray(response)) return response;
        if ('data' in response && 'total' in response) return response as PaginatedMessageResponse;
        if ('messages' in response) return response.messages;
        if ('data' in response) return response.data;
        return [];
      },
      providesTags: (_, __, { groupId }) => [{ type: "Messages" as never, id: `group-${groupId}` }],
    }),
    markMessageRead: builder.mutation<Message, string>({
      query: (messageId) => ({
        url: `/messages/${messageId}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["Messages" as never],
    }),
    // Group endpoints
    createGroup: builder.mutation<Group, CreateGroupRequest>({
      query: (data) => ({
        url: "/groups",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Groups" as never],
    }),
    getGroups: builder.query<Group[], void>({
      query: () => "/groups",
      transformResponse: (response: Group[] | { groups: Group[] } | { data: Group[] }) => {
        if (Array.isArray(response)) return response;
        if ('groups' in response) return response.groups;
        if ('data' in response) return response.data;
        return [];
      },
      providesTags: ["Groups" as never],
    }),
    getGroup: builder.query<Group, string>({
      query: (groupId) => `/groups/${groupId}`,
      transformResponse: (response: Group | { group: Group } | { data: Group }) => {
        if ('group' in response) return response.group;
        if ('data' in response) return response.data;
        return response as Group;
      },
      providesTags: (_, __, groupId) => [{ type: "Groups" as never, id: groupId }],
    }),
    updateGroup: builder.mutation<Group, { groupId: string; data: Partial<Pick<Group, "name" | "description">> }>({
      query: ({ groupId, data }) => ({
        url: `/groups/${groupId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_, __, { groupId }) => [{ type: "Groups" as never, id: groupId }, "Groups" as never],
    }),
    deleteGroup: builder.mutation<void, string>({
      query: (groupId) => ({
        url: `/groups/${groupId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Groups" as never],
    }),
    addGroupMembers: builder.mutation<GroupMember, { groupId: string; data: AddGroupMembersRequest }>({
      query: ({ groupId, data }) => ({
        url: `/groups/${groupId}/members`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_, __, { groupId }) => [{ type: "Groups" as never, id: groupId }],
    }),
    removeGroupMember: builder.mutation<void, { groupId: string; userId: string }>({
      query: ({ groupId, userId }) => ({
        url: `/groups/${groupId}/members/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_, __, { groupId }) => [{ type: "Groups" as never, id: groupId }],
    }),
    getGroupMembers: builder.query<GroupMember[], string>({
      query: (groupId) => `/groups/${groupId}/members`,
      transformResponse: (response: GroupMember[] | { members: GroupMember[] } | { data: GroupMember[] }) => {
        if (Array.isArray(response)) return response;
        if ('members' in response) return response.members;
        if ('data' in response) return response.data;
        return [];
      },
      providesTags: (_, __, groupId) => [{ type: "Groups" as never, id: groupId }],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useSendMessageMutation,
  useGetConversationMessagesQuery,
  useGetGroupMessagesQuery,
  useMarkMessageReadMutation,
  useCreateGroupMutation,
  useGetGroupsQuery,
  useGetGroupQuery,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useAddGroupMembersMutation,
  useRemoveGroupMemberMutation,
  useGetGroupMembersQuery,
} = chatApi;
