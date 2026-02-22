import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { wsService, WsMessageType } from '@/lib/websocket';
import { tasksApi } from '@/store/api/tasksApi';
import { chatApi } from '@/store/api/chatApi';
import { notificationsApi } from '@/store/api/notificationsApi';
import { toast } from 'sonner';

export const useSocketManager = (isAuthenticated: boolean) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isAuthenticated) {
      wsService.disconnect();
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) return;

    wsService.connect(token);

    // Task listeners
    const unsubTaskUpdated = wsService.subscribe(WsMessageType.TaskUpdated, (data) => {
      dispatch(tasksApi.util.invalidateTags([{ type: 'Tasks', id: data.task_id }, { type: 'Tasks', id: 'LIST' }] as any));
      toast.info(`Task "${data.field}" updated`);
    });

    const unsubTaskShared = wsService.subscribe(WsMessageType.TaskShared, (data) => {
      dispatch(tasksApi.util.invalidateTags([{ type: 'Tasks', id: 'LIST' }] as any));
      toast.success(`Task shared with you: ${data.task_title}`);
    });

    // Chat listeners
    const unsubChatMessage = wsService.subscribe(WsMessageType.ChatMessage, (data) => {
      dispatch(chatApi.util.invalidateTags(['Messages'] as any));
      // Optionally show a toast if the user is not in the chat page or not in this specific conversation
    });

    // Notification listeners
    const unsubNotification = wsService.subscribe('notification', () => {
      dispatch(notificationsApi.util.invalidateTags(['Notifications'] as any));
    });

    return () => {
      unsubTaskUpdated();
      unsubTaskShared();
      unsubChatMessage();
      unsubNotification();
    };
  }, [isAuthenticated, dispatch]);
};
