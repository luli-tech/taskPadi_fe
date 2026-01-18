import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useGetConversationsQuery, useGetConversationMessagesQuery, useSendMessageMutation } from "@/store/api/chatApi";
import { useGetAllUsersQuery } from "@/store/api/usersApi";
import { useAppSelector } from "@/store/hooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageLayout } from "@/components/PageLayout";
import { MessageSquare, Send, Plus, Users, User } from "lucide-react";
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
    <PageLayout title="Team Chat">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-[calc(100vh-220px)] flex flex-col md:flex-row gap-4"
      >
        {/* Conversations List */}
        <Card className="w-full md:w-80 flex flex-col max-h-48 md:max-h-full">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Chats</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Conversation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input
                      placeholder="Conversation name"
                      value={newConversationName}
                      onChange={(e) => setNewConversationName(e.target.value)}
                    />
                    <Button onClick={handleCreateConversation} className="w-full">
                      Create
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <ScrollArea className="flex-1">
            {conversationsLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-xs mt-1">Create one to start chatting</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={cn(
                      "w-full p-3 rounded-lg text-left transition-colors hover:bg-muted/50",
                      selectedConversation === conv.id && "bg-primary/10 text-primary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        {conv.type === "group" ? (
                          <Users className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{conv.name || "Conversation"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.last_message?.content || "No messages yet"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Messages Area */}
        <Card className="flex-1 flex flex-col min-h-[300px]">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {selectedConv?.type === "group" ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedConv?.name || "Conversation"}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedConv?.participants?.length || 0} participants
                    </p>
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
                              {(msg.sender_name || "U").charAt(0).toUpperCase()}
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
                            {!isOwn && (
                              <p className="text-xs font-medium mb-1">{msg.sender_name}</p>
                            )}
                            <p className="text-sm">{msg.content}</p>
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
                <p className="text-sm">Choose a chat from the sidebar or create a new one</p>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </PageLayout>
  );
}
