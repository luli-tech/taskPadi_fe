// Utility functions for task status and priority conversion
// API uses: pending, in_progress, completed, cancelled (lowercase snake_case)
// Frontend display uses: Pending, In Progress, Completed, Cancelled (formatted)

export type ApiTaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type ApiTaskPriority = "low" | "medium" | "high" | "urgent";

export type DisplayTaskStatus = "Pending" | "InProgress" | "Completed" | "Archived" | "Cancelled";
export type DisplayTaskPriority = "Low" | "Medium" | "High" | "Urgent";

// Status conversion maps
const API_TO_DISPLAY_STATUS: Record<ApiTaskStatus, DisplayTaskStatus> = {
  pending: "Pending",
  in_progress: "InProgress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const DISPLAY_TO_API_STATUS: Record<DisplayTaskStatus, ApiTaskStatus> = {
  Pending: "pending",
  InProgress: "in_progress",
  Completed: "completed",
  Cancelled: "cancelled",
  Archived: "cancelled", // Map Archived to cancelled in API
};

// Priority conversion maps
const API_TO_DISPLAY_PRIORITY: Record<ApiTaskPriority, DisplayTaskPriority> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const DISPLAY_TO_API_PRIORITY: Record<DisplayTaskPriority, ApiTaskPriority> = {
  Low: "low",
  Medium: "medium",
  High: "high",
  Urgent: "urgent",
};

// Convert API status to display format
export function apiStatusToDisplay(apiStatus: string): DisplayTaskStatus {
  return API_TO_DISPLAY_STATUS[apiStatus as ApiTaskStatus] || ("Pending" as DisplayTaskStatus);
}

// Convert display status to API format
export function displayStatusToApi(displayStatus: string): ApiTaskStatus {
  return DISPLAY_TO_API_STATUS[displayStatus as DisplayTaskStatus] || "pending";
}

// Convert API priority to display format
export function apiPriorityToDisplay(apiPriority: string): DisplayTaskPriority {
  return API_TO_DISPLAY_PRIORITY[apiPriority as ApiTaskPriority] || ("Medium" as DisplayTaskPriority);
}

// Convert display priority to API format
export function displayPriorityToApi(displayPriority: string): ApiTaskPriority {
  return DISPLAY_TO_API_PRIORITY[displayPriority as DisplayTaskPriority] || "medium";
}

// Format status for display (e.g., "InProgress" -> "In Progress")
export function formatStatusForDisplay(status: string): string {
  const displayStatus = apiStatusToDisplay(status);
  return displayStatus.replace(/([A-Z])/g, " $1").trim();
}

// Format priority for display
export function formatPriorityForDisplay(priority: string): string {
  const displayPriority = apiPriorityToDisplay(priority);
  return displayPriority;
}
