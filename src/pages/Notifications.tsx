import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useDeleteNotificationMutation,
} from "@/store/api/notificationsApi";
import { Bell, Check, Trash2, CheckCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Notifications() {
  const isMobile = useIsMobile();
  const { data: notifications = [], isLoading } = useGetNotificationsQuery(undefined, {
    pollingInterval: 10000, // Poll every 10 seconds
  });
  const [markRead] = useMarkNotificationReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (id: string) => {
    try {
      await markRead(id).unwrap();
      toast.success("Notification marked as read");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to mark notification as read");
    }
  };

  const handleMarkAllRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.is_read);
    try {
      await Promise.all(unreadNotifications.map((n) => markRead(n.id).unwrap()));
      toast.success("All notifications marked as read");
    } catch (error: any) {
      toast.error("Failed to mark all notifications as read");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id).unwrap();
      toast.success("Notification deleted");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to delete notification");
    }
  };

  const handleDeleteAll = async () => {
    try {
      await Promise.all(notifications.map((n) => deleteNotification(n.id).unwrap()));
      toast.success("All notifications deleted");
    } catch (error: any) {
      toast.error("Failed to delete all notifications");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={cn("font-bold mb-2", isMobile ? "text-2xl" : "text-4xl")}>Notifications</h1>
          <p className={cn("text-muted-foreground", isMobile && "text-sm")}>Manage your notifications and stay updated</p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                onClick={handleMarkAllRead}
                size={isMobile ? "sm" : "default"}
                className={cn(isMobile && "text-xs")}
              >
                <CheckCheck className={cn("mr-2", isMobile ? "h-3 w-3" : "h-4 w-4")} />
                {isMobile ? "Mark All" : "Mark All Read"}
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleDeleteAll}
              size={isMobile ? "sm" : "default"}
              className={cn(isMobile && "text-xs")}
            >
              <Trash2 className={cn("mr-2", isMobile ? "h-3 w-3" : "h-4 w-4")} />
              {isMobile ? "Delete All" : "Delete All"}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className={cn("py-8 sm:py-12")}>
            <div className="text-center">
              <div className={cn(
                "animate-spin rounded-full border-b-2 border-primary mx-auto",
                isMobile ? "h-8 w-8" : "h-12 w-12"
              )}></div>
              <p className={cn("mt-4 text-muted-foreground", isMobile && "text-sm")}>Loading notifications...</p>
            </div>
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className={cn("py-8 sm:py-12")}>
            <div className="text-center text-muted-foreground">
              <Bell className={cn("mx-auto mb-4 opacity-20", isMobile ? "h-12 w-12" : "h-16 w-16")} />
              <p className={cn("font-medium", isMobile ? "text-base" : "text-lg")}>No notifications</p>
              <p className={cn("mt-1", isMobile ? "text-xs" : "text-sm")}>You're all caught up!</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className={cn(
          isMobile ? "h-[calc(100vh-200px)]" : "h-[calc(100vh-300px)]"
        )}>
          <div className="space-y-2 sm:space-y-3">
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <Card
                  className={cn(
                    "shadow-custom-md hover:shadow-custom-lg transition-all cursor-pointer",
                    !notification.is_read && "border-primary/50 bg-primary/5"
                  )}
                  onClick={() => !notification.is_read && handleMarkRead(notification.id)}
                >
                  <CardContent className={cn("p-3 sm:p-4")}>
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                        <div
                          className={cn(
                            "mt-1 rounded-full shrink-0",
                            isMobile ? "h-1.5 w-1.5" : "h-2 w-2",
                            notification.is_read ? "bg-muted" : "bg-primary"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "mb-1 break-words",
                              isMobile ? "text-xs" : "text-sm",
                              notification.is_read ? "text-muted-foreground" : "font-medium"
                            )}
                          >
                            {notification.message}
                          </p>
                          <p className={cn(
                            "text-muted-foreground",
                            isMobile ? "text-[10px]" : "text-xs"
                          )}>
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        {!notification.is_read && (
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              isMobile ? "text-[10px] px-1.5 py-0.5" : "text-xs"
                            )}
                          >
                            New
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            isMobile ? "h-7 w-7" : "h-8 w-8"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(notification.id);
                          }}
                        >
                          <Check className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4")} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "text-destructive hover:text-destructive",
                            isMobile ? "h-7 w-7" : "h-8 w-8"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification.id);
                          }}
                        >
                          <Trash2 className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4")} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
