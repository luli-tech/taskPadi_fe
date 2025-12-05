import { baseApi } from "./baseApi";

export interface TaskSummary {
  summary: string;
  insights: string[];
  recommendations: string[];
  generated_at: string;
}

export const aiApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTaskSummary: builder.query<TaskSummary, void>({
      query: () => "/ai/summary",
      transformResponse: (response: TaskSummary | { data: TaskSummary }) => {
        if ('data' in response) return response.data;
        return response;
      },
    }),
    generateSummary: builder.mutation<TaskSummary, void>({
      query: () => ({
        url: "/ai/summary/generate",
        method: "POST",
      }),
    }),
  }),
});

export const {
  useGetTaskSummaryQuery,
  useGenerateSummaryMutation,
} = aiApi;
