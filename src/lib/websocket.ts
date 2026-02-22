export enum WsMessageType {
  ChatMessage = "chat_message",
  TypingIndicator = "typing_indicator",
  UserStatus = "user_status",
  TaskUpdated = "task_updated",
  TaskShared = "task_shared",
  TaskMemberRemoved = "task_member_removed",
  MessageDelivered = "message_delivered",
  CallInitiated = "call_initiated",
  CallAccepted = "call_accepted",
  CallRejected = "call_rejected",
  CallEnded = "call_ended",
  CallOffer = "call_offer",
  CallAnswer = "call_answer",
  IceCandidate = "ice_candidate",
  Error = "error",
  Ping = "ping",
  Pong = "pong",
}

type MessageHandler = (data: any) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private url: string;
  private token: string | null = null;
  private heartbeatInterval: number | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect(token: string) {
    this.token = token;
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(`${this.url}?token=${token}`);

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "pong") return;
        
        const handlers = this.messageHandlers.get(data.type);
        if (handlers) {
          handlers.forEach(handler => handler(data));
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    this.ws.onclose = () => {
      console.log("WebSocket disconnected");
      this.stopHeartbeat();
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      this.send("ping", {});
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect() {
    if (this.token && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        if (this.token) this.connect(this.token);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  subscribe(type: WsMessageType | string, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  send(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    } else {
      console.warn("WebSocket is not connected. Message not sent:", type);
    }
  }

  // Helper methods for signaling
  sendCallOffer(callId: string, toUserId: string, sdp: string) {
    this.send("send_call_offer", { call_id: callId, to_user_id: toUserId, sdp });
  }

  sendCallAnswer(callId: string, toUserId: string, sdp: string) {
    this.send("send_call_answer", { call_id: callId, to_user_id: toUserId, sdp });
  }

  sendIceCandidate(callId: string, toUserId: string, candidate: string) {
    this.send("send_ice_candidate", { call_id: callId, to_user_id: toUserId, candidate });
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.token = null;
  }
}

// Singleton instance
const WS_URL = import.meta.env.VITE_WS_URL || "wss://task-manager-84ag.onrender.com/api/ws";
export const wsService = new WebSocketService(WS_URL);
