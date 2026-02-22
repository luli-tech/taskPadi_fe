import { baseApi } from "./baseApi";

export interface CallParticipant {
  user_id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  status: string;
  joined_at: string;
}

export interface VideoCall {
  id: string;
  caller_id: string;
  receiver_id: string | null;
  group_id: string | null;
  call_type: "video" | "voice";
  status: "initiating" | "ringing" | "active" | "accepted" | "rejected" | "ended" | "missed";
  started_at: string;
  ended_at: string | null;
  participants: CallParticipant[];
}

export interface InitiateCallRequest {
  receiver_id?: string;
  group_id?: string;
  call_type?: "video" | "voice";
}

interface AddParticipantRequest {
  user_id: string;
}

interface CallHistoryParams {
  limit?: number;
  offset?: number;
}

interface CallHistoryResponse {
  data: VideoCall[];
  total: number;
  limit: number;
  offset: number;
  total_pages: number;
}

export const videoCallApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    initiateCall: builder.mutation<VideoCall, InitiateCallRequest>({
      query: (data) => ({
        url: "/video-calls",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["VideoCalls" as any],
    }),
    acceptCall: builder.mutation<VideoCall, string>({
      query: (callId) => ({
        url: `/video-calls/${callId}/accept`,
        method: "POST",
      }),
      invalidatesTags: ["VideoCalls" as any],
    }),
    rejectCall: builder.mutation<VideoCall, string>({
      query: (callId) => ({
        url: `/video-calls/${callId}/reject`,
        method: "POST",
      }),
      invalidatesTags: ["VideoCalls" as any],
    }),
    endCall: builder.mutation<VideoCall, string>({
      query: (callId) => ({
        url: `/video-calls/${callId}/end`,
        method: "POST",
      }),
      invalidatesTags: ["VideoCalls" as any],
    }),
    addParticipant: builder.mutation<VideoCall, { callId: string; data: AddParticipantRequest }>({
      query: ({ callId, data }) => ({
        url: `/video-calls/${callId}/participants`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["VideoCalls" as any],
    }),
    getCall: builder.query<VideoCall, string>({
      query: (callId) => `/video-calls/${callId}`,
      providesTags: (_result, _error, callId) => [{ type: "VideoCalls" as any, id: callId }],
    }),
    getCallHistory: builder.query<CallHistoryResponse, CallHistoryParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append("limit", params.limit.toString());
        if (params.offset) searchParams.append("offset", params.offset.toString());
        return `/video-calls?${searchParams.toString()}`;
      },
      providesTags: ["VideoCalls" as any],
    }),
    getActiveCalls: builder.query<VideoCall[], void>({
      query: () => "/video-calls/active",
      providesTags: ["VideoCalls" as any],
    }),
  }),
});

export const {
  useInitiateCallMutation,
  useAcceptCallMutation,
  useRejectCallMutation,
  useEndCallMutation,
  useAddParticipantMutation,
  useGetCallQuery,
  useGetCallHistoryQuery,
  useGetActiveCallsQuery,
} = videoCallApi;
