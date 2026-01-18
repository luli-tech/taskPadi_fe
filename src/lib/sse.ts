/**
 * Server-Sent Events (SSE) utility for real-time updates
 * 
 * Usage:
 * const eventSource = createSSEConnection('/api/tasks/stream', {
 *   onMessage: (data) => console.log('Task update:', data),
 *   onError: (error) => console.error('SSE error:', error),
 * });
 * 
 * // Cleanup when done
 * eventSource.close();
 */

const API_BASE_URL = "https://task-manager-84ag.onrender.com/api";

export interface SSECallbacks {
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export function createSSEConnection(endpoint: string, callbacks: SSECallbacks = {}): EventSource {
  const token = localStorage.getItem("authToken");
  const url = `${API_BASE_URL}${endpoint}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  
  const eventSource = new EventSource(url);

  eventSource.onopen = () => {
    console.log("SSE connection opened:", endpoint);
    callbacks.onOpen?.();
  };

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      callbacks.onMessage?.(data);
    } catch (error) {
      console.error("Error parsing SSE message:", error);
      callbacks.onError?.(event);
    }
  };

  eventSource.onerror = (error) => {
    console.error("SSE connection error:", error);
    callbacks.onError?.(error);
  };

  // Handle custom event types
  eventSource.addEventListener("task_update", (event) => {
    try {
      const data = JSON.parse(event.data);
      callbacks.onMessage?.(data);
    } catch (error) {
      console.error("Error parsing SSE task update:", error);
    }
  });

  eventSource.addEventListener("notification", (event) => {
    try {
      const data = JSON.parse(event.data);
      callbacks.onMessage?.(data);
    } catch (error) {
      console.error("Error parsing SSE notification:", error);
    }
  });

  return eventSource;
}

/**
 * Create SSE connection for task updates
 */
export function createTaskStream(callbacks: SSECallbacks): EventSource {
  return createSSEConnection("/tasks/stream", callbacks);
}

/**
 * Create SSE connection for notifications
 */
export function createNotificationStream(callbacks: SSECallbacks): EventSource {
  return createSSEConnection("/notifications/stream", callbacks);
}
