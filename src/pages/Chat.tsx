import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useGetConversationsQuery, useGetConversationMessagesQuery, useSendMessageMutation } from "@/store/api/chatApi";
import { useGetAllUsersQuery } from "@/store/api/usersApi";
import { useAppSelector } from "@/store/hooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Send, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { user, isAdmin } = useAppSelector((state) => state.auth);
  const { 
    data: conversations = [], 
    isLoading: conversationsLoading,
    error: conversationsError,
    refetch: refetchConversations
  } = useGetConversationsQuery(undefined, {
    // Refetch conversations every 10 seconds for real-time updates
    pollingInterval: 10000,
  });
  
  // Fetch all users (public endpoint - works for all authenticated users)
  const { 
    data: allUsersData, 
    isLoading: usersLoading,
    error: usersError 
  } = useGetAllUsersQuery(
    { page: 1, limit: 100 }, // Fetch up to 100 users for chat
    {
      // Refetch users every 30 seconds for real-time updates
      pollingInterval: 30000,
    }
  );
  
  // Extract users from response (handle paginated response)
  const allUsers = useMemo(() => {
    if (!allUsersData) return [];
    // Handle both array response and paginated response
    if (Array.isArray(allUsersData)) return allUsersData;
    if ('data' in allUsersData) return allUsersData.data;
    return [];
  }, [allUsersData]);
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Create a map of conversation users for O(1) lookup
  const conversationsMap = useMemo(() => {
    const map = new Map<string, typeof conversations[0]>();
    conversations.forEach(conv => {
      map.set(conv.user_id, conv);
    });
    return map;
  }, [conversations]);
  
  // Build user list from conversations (works for all users)
  // If admin, merge with all users to show users without conversations too
  const userList = useMemo(() => {
    // Start with conversation users
    const conversationUsers = conversations.map(conv => ({
      id: conv.user_id,
      username: conv.username,
      avatar_url: conv.avatar_url || undefined,
      email: '',
      role: 'user' as const,
      hasConversation: true,
      last_message: conv.last_message,
      last_message_time: conv.last_message_time,
      unread_count: conv.unread_count,
    }));
    
    // If we have all users, merge them (all authenticated users can see all users now)
    if (allUsers.length > 0) {
      const conversationUserIds = new Set(conversations.map(c => c.user_id));
      const additionalUsers = allUsers
        .filter(u => u.id !== user?.id && !conversationUserIds.has(u.id))
        .map(u => ({
          id: u.id,
          username: u.username,
          avatar_url: u.avatar_url,
          email: u.email,
          role: u.role,
          hasConversation: false,
          last_message: undefined,
          last_message_time: undefined,
          unread_count: 0,
        }));
      
      return [...conversationUsers, ...additionalUsers];
    }
    
    return conversationUsers;
  }, [conversations, allUsers, isAdmin, user?.id]);
  
  // Find selected user info
  const selectedUserInfo = useMemo(() => {
    if (!selectedUserId) return null;
    
    // Check in conversations first
    const conv = conversationsMap.get(selectedUserId);
    if (conv) {
      return {
        user_id: conv.user_id,
        username: conv.username,
        avatar_url: conv.avatar_url,
        last_message: conv.last_message,
        last_message_time: conv.last_message_time,
        unread_count: conv.unread_count,
      };
    }
    
    // Check in all users (if admin)
    const userData = allUsers.find(u => u.id === selectedUserId);
    if (userData) {
      return {
        user_id: userData.id,
        username: userData.username,
        avatar_url: userData.avatar_url,
        last_message: undefined,
        last_message_time: undefined,
        unread_count: 0,
      };
    }
    
    return null;
  }, [selectedUserId, conversationsMap, allUsers]);
  
  // Memoized click handler to prevent unnecessary re-renders
  const handleUserSelect = useCallback((userId: string) => {
    setSelectedUserId(userId);
  }, []);

  // Get messages with the selected user (only fetch when user is selected)
  const { data: messagesData, isLoading: messagesLoading } = useGetConversationMessagesQuery(
    { userId: selectedUserId!, params: { page: 1, limit: 100 } },
    { 
      skip: !selectedUserId,
      // Poll every 5 seconds for new messages when conversation is open
      pollingInterval: selectedUserId ? 5000 : 0,
    }
  );

  // Extract messages from paginated response
  const messages = useMemo(() => {
    if (!messagesData) return [];
    if (Array.isArray(messagesData)) return messagesData;
    if ('data' in messagesData) return messagesData.data;
    return [];
  }, [messagesData]);

  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedUserId) return;

    try {
      await sendMessage({ receiver_id: selectedUserId, content: messageInput }).unwrap();
      setMessageInput("");
      // Scroll to bottom after sending
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
    }
  }, [messageInput, selectedUserId, sendMessage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-[calc(100vh-180px)] flex gap-4"
    >
      {/* Users List */}
      <Card className="w-80 flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Users</h2>
            <div className="text-xs text-muted-foreground">
              {userList.length} {userList.length === 1 ? 'user' : 'users'}
            </div>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {conversationsLoading || usersLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading users...</div>
          ) : conversationsError ? (
            <div className="p-4 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-destructive">Error loading conversations</p>
              <p className="text-xs mt-1">
                {(conversationsError as any)?.data?.error || (conversationsError as any)?.message || 'Failed to load users'}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2" 
                onClick={() => refetchConversations()}
              >
                Retry
              </Button>
            </div>
          ) : userList.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No users found</p>
              <p className="text-xs mt-1">
                {isAdmin 
                  ? "No users available" 
                  : "Start a conversation to see users here"}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {userList.map((chatUser) => (
                <button
                  key={chatUser.id}
                  onClick={() => handleUserSelect(chatUser.id)}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-colors hover:bg-muted/50",
                    selectedUserId === chatUser.id && "bg-primary/10 text-primary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={chatUser.avatar_url} />
                      <AvatarFallback>
                        {chatUser.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{chatUser.username}</p>
                        {chatUser.hasConversation && chatUser.unread_count > 0 && (
                          <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                            {chatUser.unread_count}
                          </span>
                        )}
                      </div>
                      {chatUser.hasConversation ? (
                        <>
                          <p className="text-xs text-muted-foreground truncate">
                            {chatUser.last_message || "No messages yet"}
                          </p>
                          {chatUser.last_message_time && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(chatUser.last_message_time).toLocaleDateString()}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Click to start chatting
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Messages Area */}
      <Card className="flex-1 flex flex-col">
        {selectedUserId ? (
          <>
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUserInfo?.avatar_url} />
                  <AvatarFallback>
                    {selectedUserInfo?.username.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedUserInfo?.username || "User"}</h3>
                  <p className="text-xs text-muted-foreground">Direct message</p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="text-center text-muted-foreground">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No messages yet</p>
                  <p className="text-xs mt-1">Send a message to start the conversation</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex gap-3", isOwn && "flex-row-reverse")}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {isOwn 
                              ? (user?.name?.charAt(0).toUpperCase() || "U")
                              : (selectedUserInfo?.username?.charAt(0).toUpperCase() || "U")
                            }
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg px-4 py-2",
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <p className="text-sm">{msg.content}</p>
                          {msg.image_url && (
                            <img 
                              src={msg.image_url} 
                              alt="Message attachment" 
                              className="mt-2 rounded max-w-full"
                            />
                          )}
                          <p className={cn(
                            "text-xs mt-1",
                            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={sending}
                />
                <Button type="submit" disabled={sending || !messageInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a chat from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
