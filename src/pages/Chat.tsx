import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useGetConversationsQuery, useGetConversationMessagesQuery, useSendMessageMutation, useUpdateMessageMutation, useDeleteMessageMutation, useCreateGroupMutation, useAddGroupMembersMutation, useGetGroupsQuery, useGetGroupMessagesQuery } from "@/store/api/chatApi";
import { useGetAllUsersQuery } from "@/store/api/usersApi";
import { useAppSelector } from "@/store/hooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Users, UserPlus, Search, ArrowLeft, MoreVertical, Phone, Video, Edit, Trash2, X, Moon, Sun } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { wsService, WsMessageType } from "@/lib/websocket";
import { useTheme } from "@/hooks/use-theme";
import { useVideoCallContext } from "@/context/VideoCallContext";

export default function Chat() {
  const { user, isAdmin } = useAppSelector((state) => state.auth);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  
  const { initiateCall, initiateGroupCall } = useVideoCallContext();
  
  // Get current effective theme (resolves system theme)
  const currentTheme = useMemo(() => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  }, [theme]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showChatWindow, setShowChatWindow] = useState(false);
  
  const { 
    data: conversations = [], 
    isLoading: conversationsLoading,
    error: conversationsError,
    refetch: refetchConversations
  } = useGetConversationsQuery(undefined, {
    pollingInterval: 10000,
  });
  
  const { 
    data: allUsersData, 
    isLoading: usersLoading,
    error: usersError 
  } = useGetAllUsersQuery(
    { page: 1, limit: 100 },
    {
      pollingInterval: 30000,
    }
  );
  
  const allUsers = useMemo(() => {
    if (!allUsersData) return [];
    if (Array.isArray(allUsersData)) return allUsersData;
    if ('data' in allUsersData) return allUsersData.data;
    return [];
  }, [allUsersData]);

  // Initialize selectedUserId from URL params if present
  const chatParam = searchParams.get("chat");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(chatParam);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [chatListSearch, setChatListSearch] = useState("");
  
  const [createGroup, { isLoading: isCreatingGroup }] = useCreateGroupMutation();
  const [addGroupMembers] = useAddGroupMembersMutation();

  const { data: groups = [], isLoading: groupsLoading } = useGetGroupsQuery();

  // Sync showChatWindow with selectedUserId on mobile
  useEffect(() => {
    if (isMobile && selectedUserId) {
      setShowChatWindow(true);
    } else if (isMobile && !selectedUserId) {
      setShowChatWindow(false);
    }
  }, [selectedUserId, isMobile]);

  const conversationsMap = useMemo(() => {
    const map = new Map<string, typeof conversations[0]>();
    conversations.forEach(conv => {
      map.set(conv.user_id, conv);
    });
    return map;
  }, [conversations]);

  const userList = useMemo(() => {
    const list: any[] = [];
    
    // Add groups first
    groups.forEach(group => {
      list.push({
        id: group.id,
        isGroup: true,
        username: group.name,
        avatar_url: group.avatar_url || undefined,
        last_message: "Group chat",
        unread_count: 0,
        hasConversation: true,
      });
    });

    const conversationUsers = conversations.map(conv => ({
      id: conv.user_id,
      isGroup: false,
      username: conv.username,
      avatar_url: conv.avatar_url || undefined,
      email: '',
      role: 'user' as const,
      hasConversation: true,
      last_message: conv.last_message,
      last_message_time: conv.last_message_time,
      unread_count: conv.unread_count,
    }));
    
    list.push(...conversationUsers);

    if (allUsers.length > 0) {
      const conversationUserIds = new Set(conversations.map(c => c.user_id));
      const additionalUsers = allUsers
        .filter(u => u.id !== user?.id && !conversationUserIds.has(u.id))
        .map(u => ({
          id: u.id,
          isGroup: false,
          username: u.username,
          avatar_url: u.avatar_url,
          email: u.email,
          role: u.role,
          hasConversation: false,
          last_message: undefined,
          last_message_time: undefined,
          unread_count: 0,
        }));
      
      list.push(...additionalUsers);
    }
    
    return list;
  }, [conversations, allUsers, user?.id, groups]);

  const filteredUserList = useMemo(() => {
    if (!chatListSearch.trim()) return userList;
    const query = chatListSearch.toLowerCase();
    return userList.filter(u => 
      u.username.toLowerCase().includes(query) || 
      (u.email && u.email.toLowerCase().includes(query))
    );
  }, [userList, chatListSearch]);

  const selectedUserInfo = useMemo(() => {
    if (selectedGroupId) {
      const group = groups.find(g => g.id === selectedGroupId);
      if (group) {
        return {
          user_id: group.id,
          username: group.name,
          avatar_url: group.avatar_url,
          isGroup: true,
        };
      }
    }

    if (!selectedUserId) return null;
    
    const conv = conversationsMap.get(selectedUserId);
    if (conv) {
      return {
        user_id: conv.user_id,
        username: conv.username,
        avatar_url: conv.avatar_url,
        last_message: conv.last_message,
        last_message_time: conv.last_message_time,
        unread_count: conv.unread_count,
        isGroup: false,
      };
    }
    
    const userData = allUsers.find(u => u.id === selectedUserId);
    if (userData) {
      return {
        user_id: userData.id,
        username: userData.username,
        avatar_url: userData.avatar_url,
        last_message: undefined,
        last_message_time: undefined,
        unread_count: 0,
        isGroup: false,
      };
    }
    
    return null;
  }, [selectedUserId, selectedGroupId, conversationsMap, allUsers, groups]);


  const handleUserSelect = useCallback((userId: string, isGroup = false) => {
    if (isGroup) {
      setSelectedGroupId(userId);
      setSelectedUserId(null);
    } else {
      setSelectedUserId(userId);
      setSelectedGroupId(null);
    }
    
    if (isMobile) {
      setShowChatWindow(true);
      // Update URL to indicate we're in a chat conversation
      setSearchParams(isGroup ? { group: userId } : { chat: userId });
    }
  }, [isMobile, setSearchParams]);

  const handleBackToList = useCallback(() => {
    setShowChatWindow(false);
    setSelectedUserId(null);
    setSelectedGroupId(null);
    // Clear URL params to indicate we're back to chat list
    setSearchParams({});
  }, [setSearchParams]);

  const { data: convMessagesData, isLoading: convMessagesLoading } = useGetConversationMessagesQuery(
    { userId: selectedUserId!, params: { page: 1, limit: 100 } },
    { 
      skip: !selectedUserId,
      pollingInterval: selectedUserId ? 5000 : 0,
    }
  );

  const { data: groupMessagesData, isLoading: groupMessagesLoading } = useGetGroupMessagesQuery(
    { groupId: selectedGroupId!, params: { page: 1, limit: 100 } },
    { 
      skip: !selectedGroupId,
      pollingInterval: selectedGroupId ? 5000 : 0,
    }
  );

  const messagesLoading = convMessagesLoading || groupMessagesLoading;
  const rawMessages = selectedGroupId ? groupMessagesData : convMessagesData;

  const messages = useMemo(() => {
    if (!rawMessages) return [];
    if (Array.isArray(rawMessages)) return rawMessages;
    if ('data' in rawMessages) return rawMessages.data;
    return [];
  }, [rawMessages]);

  // Reverse messages to display oldest → newest
  const orderedMessages = useMemo(() => {
    return [...messages].reverse();
  }, [messages]);

  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();
  const [updateMessage] = useUpdateMessageMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [messageInput, setMessageInput] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [messageMenuPosition, setMessageMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Scroll to bottom when messages change or user changes
  useEffect(() => {
    if (messagesContainerRef.current && orderedMessages.length > 0) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [orderedMessages, selectedUserId]);

  // WebSocket setup for typing indicators
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token || !user) return;

    // Connect WebSocket
    wsService.connect(token);

    // Subscribe to typing events
    const unsubscribeTyping = wsService.subscribe(WsMessageType.TypingIndicator, (data: { user_id: string; conversation_with: string; is_typing: boolean }) => {
      // Only show typing indicator if it's for the current conversation
      if (data.conversation_with === user.id && selectedUserId === data.user_id) {
        if (data.is_typing) {
          setTypingUsers(prev => new Set(prev).add(data.user_id));
        } else {
          setTypingUsers(prev => {
            const next = new Set(prev);
            next.delete(data.user_id);
            return next;
          });
        }
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribeTyping();
    };
  }, [user, selectedUserId]);

  // Send typing indicator when user types
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    if (!selectedUserId || !user) return;

    const now = Date.now();
    // Send typing event immediately on first keystroke
    if (value.trim().length > 0 && now - lastTypingSentRef.current > 1000) {
      wsService.send("typing_indicator", {
        conversation_with: selectedUserId,
        is_typing: true,
      });
      lastTypingSentRef.current = now;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing indicator after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedUserId) {
        wsService.send("typing_indicator", {
          conversation_with: selectedUserId,
          is_typing: false,
        });
      }
    }, 3000);
  }, [selectedUserId, user]);

  // Stop typing when message is sent
  useEffect(() => {
    if (!messageInput.trim() && selectedUserId) {
      wsService.send("typing_indicator", {
        conversation_with: selectedUserId,
        is_typing: false,
      });
    }
  }, [messageInput, selectedUserId]);

  // Clear typing indicator when conversation changes
  useEffect(() => {
    setTypingUsers(new Set());
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [selectedUserId]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || (!selectedUserId && !selectedGroupId)) return;

    try {
      // Stop typing indicator
      if (selectedUserId) {
        wsService.send("typing_indicator", {
          conversation_with: selectedUserId,
          is_typing: false,
        });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      await sendMessage({ 
        receiver_id: selectedUserId || undefined,
        group_id: selectedGroupId || undefined,
        content: messageInput 
      }).unwrap();
      
      setMessageInput("");
      // Scroll to bottom after sending message
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    } catch (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
    }
  }, [messageInput, selectedUserId, selectedGroupId, sendMessage]);

  const handleLongPress = useCallback((e: React.TouchEvent | React.MouseEvent, messageId: string, isOwn: boolean) => {
    if (!isOwn) return; // Only allow long press on own messages
    
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setSelectedMessageId(messageId);
    setMessageMenuPosition({ x: clientX, y: clientY });
  }, []);

  const handleLongPressStart = useCallback((e: React.TouchEvent | React.MouseEvent, messageId: string, isOwn: boolean) => {
    if (!isOwn) return;
    
    longPressTimerRef.current = setTimeout(() => {
      handleLongPress(e, messageId, isOwn);
    }, 500); // 500ms for long press
  }, [handleLongPress]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleEditMessage = useCallback((messageId: string, currentContent: string) => {
    setEditingMessageId(messageId);
    setEditingMessageContent(currentContent);
    setSelectedMessageId(null);
    setMessageMenuPosition(null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingMessageId || !editingMessageContent.trim()) return;

    try {
      await updateMessage({ messageId: editingMessageId, content: editingMessageContent.trim() }).unwrap();
      setEditingMessageId(null);
      setEditingMessageContent("");
      toast({ title: "Message updated", variant: "default" });
    } catch (error) {
      toast({ title: "Failed to update message", variant: "destructive" });
    }
  }, [editingMessageId, editingMessageContent, updateMessage]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      await deleteMessage(messageId).unwrap();
      setSelectedMessageId(null);
      setMessageMenuPosition(null);
      toast({ title: "Message deleted", variant: "default" });
    } catch (error) {
      toast({ title: "Failed to delete message", variant: "destructive" });
    }
  }, [deleteMessage]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setSelectedMessageId(null);
      setMessageMenuPosition(null);
    };

    if (selectedMessageId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [selectedMessageId]);

  const availableUsersForGroup = useMemo(() => {
    return allUsers.filter(u => u.id !== user?.id);
  }, [allUsers, user?.id]);

  const filteredUsersForGroup = useMemo(() => {
    if (!searchQuery.trim()) return availableUsersForGroup;
    const query = searchQuery.toLowerCase();
    return availableUsersForGroup.filter(u => 
      u.username.toLowerCase().includes(query) || 
      u.email.toLowerCase().includes(query)
    );
  }, [availableUsersForGroup, searchQuery]);

  const handleToggleMember = useCallback((userId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const handleCreateGroup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast({ title: "Group name is required", variant: "destructive" });
      return;
    }
    if (selectedMemberIds.size === 0) {
      toast({ title: "Please select at least one member", variant: "destructive" });
      return;
    }

    try {
      // Create group (creator is automatically added as member)
      const group = await createGroup({
        name: groupName.trim(),
        description: undefined,
        avatar_url: undefined,
      }).unwrap();
      
      // Add selected members one by one
      if (selectedMemberIds.size > 0) {
        const memberPromises = Array.from(selectedMemberIds).map(userId =>
          addGroupMembers({
            groupId: group.id,
            data: { user_id: userId }
          }).unwrap().catch(err => {
            console.error(`Failed to add member ${userId}:`, err);
            return null;
          })
        );
        
        await Promise.all(memberPromises);
      }
      
      toast({ title: "Group created successfully!", description: `"${groupName}" group has been created.` });
      setIsCreateGroupOpen(false);
      setGroupName("");
      setSelectedMemberIds(new Set());
      setSearchQuery("");
    } catch (error: any) {
      const errorMessage = error?.data?.error || error?.data?.message || error?.message || "Failed to create group";
      toast({ title: "Failed to create group", description: errorMessage, variant: "destructive" });
    }
  }, [groupName, selectedMemberIds, createGroup]);

  const handleCloseCreateGroupDialog = useCallback(() => {
    setIsCreateGroupOpen(false);
    setGroupName("");
    setSelectedMemberIds(new Set());
    setSearchQuery("");
  }, []);

  // Format time for chat list
  const formatChatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex overflow-hidden",
        isMobile ? "fixed inset-0" : "h-full w-full"
      )}
    >
      {/* Chat List - WhatsApp style */}
      <AnimatePresence mode="wait">
        {(!isMobile || !showChatWindow) && (
          <motion.div
            key="chat-list"
            initial={{ x: isMobile ? -100 : 0, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isMobile ? -100 : 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex flex-col",
              "bg-[#f0f2f5] dark:bg-[#0b141a]",
              isMobile 
                ? "w-full absolute inset-0 z-10" 
                : "w-80 xl:w-96 border-r border-border dark:border-[#2a3942] shrink-0"
            )}
          >
            {/* Chat List Header */}
            <div className="bg-[#008069] dark:bg-[#202c33] text-white shadow-md">
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h2 className={cn("font-semibold", isMobile ? "text-lg" : "text-xl")}>Chats</h2>
                  <div className="flex items-center gap-1 sm:gap-2">
                    {/* Dark Mode Toggle Button */}
                    <button
                      onClick={() => {
                        setTheme(currentTheme === "dark" ? "light" : "dark");
                      }}
                      className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10 shrink-0 flex items-center justify-center rounded-lg transition-colors"
                      title={currentTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                      aria-label={currentTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    >
                      {currentTheme === "dark" ? (
                        <Sun className="h-5 w-5 flex-shrink-0" />
                      ) : (
                        <Moon className="h-5 w-5 flex-shrink-0" />
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsCreateGroupOpen(true)}
                      className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10"
                      title="Create group"
                    >
                      <UserPlus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                  <Input
                    placeholder="Search or start new chat"
                    value={chatListSearch}
                    onChange={(e) => setChatListSearch(e.target.value)}
                    className={cn(
                      "pl-10 bg-white/20 text-white placeholder:text-white/70",
                      "border-white/30 focus:bg-white/30 focus:border-white/50",
                      "rounded-lg transition-colors",
                      isMobile ? "h-9 text-sm" : "h-10"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Chat List Items */}
            <ScrollArea className="flex-1 bg-white dark:bg-[#111b21]">
              {conversationsLoading || usersLoading ? (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <div className="text-center text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#008069] border-t-transparent mx-auto mb-2"></div>
                    <p className={cn("text-sm", isMobile && "text-xs")}>Loading chats...</p>
                  </div>
                </div>
              ) : filteredUserList.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[200px] px-4">
                  <div className="text-center text-muted-foreground max-w-xs">
                    <div className="bg-[#f0f2f5] dark:bg-[#202c33] rounded-full p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                      <Users className="h-8 w-8 text-[#008069] dark:text-[#00a884] opacity-50" />
                    </div>
                    <p className={cn("font-medium mb-1", isMobile ? "text-sm" : "text-base")}>
                      {chatListSearch ? "No results found" : "No chats yet"}
                    </p>
                    <p className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>
                      {chatListSearch 
                        ? "Try a different search term" 
                        : "Start a conversation to see it here"}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  {filteredUserList.map((chatUser) => {
                    return (
                      <motion.button
                        key={chatUser.id}
                        onClick={() => handleUserSelect(chatUser.id, chatUser.isGroup)}
                        whileHover={{ backgroundColor: "#f5f6f6" }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "w-full p-3 sm:p-4 flex items-center gap-3",
                          "hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] active:bg-[#f0f2f5] dark:active:bg-[#182229] transition-colors",
                          "border-b border-[#f0f2f5] dark:border-[#2a3942]",
                          (selectedUserId === chatUser.id || selectedGroupId === chatUser.id) && "bg-[#f0f2f5] dark:bg-[#202c33]"
                        )}
                      >
                        <Avatar className={cn(
                          "shrink-0",
                          isMobile ? "h-12 w-12" : "h-14 w-14"
                        )}>
                          <AvatarImage src={chatUser.avatar_url} />
                          <AvatarFallback className={cn(
                            "text-white font-semibold",
                            chatUser.isGroup ? "bg-[#00a884]" : "bg-[#25d366]"
                          )}>
                            {chatUser.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <p className={cn(
                              "font-medium truncate",
                              "text-[#111b21] dark:text-[#e9edef]",
                              isMobile ? "text-sm" : "text-[15px]"
                            )}>
                              {chatUser.username}
                              {chatUser.isGroup && (
                                <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Group</span>
                              )}
                            </p>
                            {chatUser.hasConversation && chatUser.last_message_time && (
                              <span className={cn(
                                "text-muted-foreground whitespace-nowrap shrink-0",
                                isMobile ? "text-[10px]" : "text-xs"
                              )}>
                                {formatChatTime(chatUser.last_message_time)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            {chatUser.hasConversation ? (
                              <p className={cn(
                                "text-muted-foreground truncate",
                                isMobile ? "text-xs" : "text-sm",
                                chatUser.unread_count > 0 && "font-medium text-foreground"
                              )}>
                                {chatUser.last_message || "No messages yet"}
                              </p>
                            ) : (
                              <p className={cn(
                                "text-muted-foreground italic",
                                isMobile ? "text-xs" : "text-sm"
                              )}>
                                Tap to start chatting
                              </p>
                            )}
                            {chatUser.unread_count > 0 && (
                              <span className={cn(
                                "bg-[#25d366] text-white rounded-full",
                                "text-center font-semibold shrink-0",
                                isMobile 
                                  ? "text-[10px] px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center"
                                  : "text-xs px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center"
                              )}>
                                {chatUser.unread_count > 9 ? "9+" : chatUser.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window - WhatsApp style */}
      <AnimatePresence mode="wait">
        {(selectedUserId || selectedGroupId) && (isMobile ? showChatWindow : true) && (
          <motion.div
            key="chat-window"
            initial={{ x: isMobile ? 100 : 0, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isMobile ? 100 : 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex flex-col h-full",
              "bg-[#efeae2] dark:bg-[#0b141a]",
              "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiPjxwYXRoIGQ9Ik0wIDBoMTAwdjEwMEgweiIgZmlsbD0iI2VmZWFlMiIvPjxwYXRoIGQ9Ik0yNiAyNmM0IDQuMjkgOSA4LjU4IDE0IDEyLjg3cy05IDguNTgtMTQgMTIuODdsLTE0LTE0YzAtNC4yOSAwLTguNTggMC0xMi44N3MxMC05LjE2IDE0LTEyLjg3eiIgZmlsbD0iI2YwZjJmNSIgZmlsbC1vcGFjaXR5PSIwLjAzIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiPjxwYXRoIGQ9Ik0wIDBoMTAwdjEwMEgweiIgZmlsbD0iIzBiMTQxYSIvPjxwYXRoIGQ9Ik0yNiAyNmM0IDQuMjkgOSA4LjU4IDE0IDEyLjg3cy05IDguNTgtMTQgMTIuODdsLTE0LTE0YzAtNC4yOSAwLTguNTggMC0xMi44N3MxMC05LjE2IDE0LTEyLjg3eiIgZmlsbD0iIzIwMmMzMyIgZmlsbC1vcGFjaXR5PSIwLjAzIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')]",
              isMobile && "w-full absolute inset-0 z-20"
            )}
          >
            {/* Chat Header - Fixed at top */}
            <div className="bg-[#008069] dark:bg-[#202c33] text-white shadow-md flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 z-10 relative shrink-0">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToList}
                  className="text-white hover:bg-white/20 h-9 w-9 shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <button
                onClick={() => selectedUserId && navigate(`/chat/users/${selectedUserId}`)}
                className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 hover:bg-white/10 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
              >
                <Avatar className="h-10 w-10 sm:h-11 sm:w-11 shrink-0">
                  <AvatarImage src={selectedUserInfo?.avatar_url} />
                  <AvatarFallback className={cn(
                    "text-white font-semibold",
                    selectedUserInfo?.isGroup ? "bg-[#00a884]" : "bg-[#25d366]"
                  )}>
                    {selectedUserInfo?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="font-semibold text-sm sm:text-base truncate">
                    {selectedUserInfo?.username || "User"}
                  </h3>
                  <p className="text-xs text-white/80 truncate">
                    {selectedUserInfo?.isGroup ? "Group Chat" : isMobile ? "Tap for info" : "Click here for contact info"}
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                {/* Dark Mode Toggle Button */}
                <button
                  onClick={() => {
                    setTheme(currentTheme === "dark" ? "light" : "dark");
                  }}
                  className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10 shrink-0 flex items-center justify-center rounded-lg transition-colors"
                  title={currentTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  aria-label={currentTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {currentTheme === "dark" ? (
                    <Sun className="h-5 w-5 flex-shrink-0" />
                  ) : (
                    <Moon className="h-5 w-5 flex-shrink-0" />
                  )}
                </button>
                {!selectedUserInfo?.isGroup && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10"
                      onClick={() => selectedUserInfo && initiateCall(selectedUserInfo.user_id, selectedUserInfo.username, 'video', selectedUserInfo.avatar_url || undefined)}
                      title="Video call"
                    >
                      <Video className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10"
                      onClick={() => selectedUserInfo && initiateCall(selectedUserInfo.user_id, selectedUserInfo.username, 'voice', selectedUserInfo.avatar_url || undefined)}
                      title="Voice call"
                    >
                      <Phone className="h-5 w-5" />
                    </Button>
                  </>
                )}
                {selectedUserInfo?.isGroup && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10"
                      onClick={() => selectedUserInfo && initiateGroupCall(selectedUserInfo.user_id, selectedUserInfo.username, 'video', selectedUserInfo.avatar_url || undefined)}
                      title="Group video call"
                    >
                      <Video className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10"
                      onClick={() => selectedUserInfo && initiateGroupCall(selectedUserInfo.user_id, selectedUserInfo.username, 'voice', selectedUserInfo.avatar_url || undefined)}
                      title="Group voice call"
                    >
                      <Phone className="h-5 w-5" />
                    </Button>
                  </>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/20 h-9 w-9 sm:h-10 sm:w-10"
                  onClick={() => selectedUserInfo && !selectedUserInfo.isGroup && navigate(`/chat/users/${selectedUserInfo.user_id}`)}
                  title="More options"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages Area - Scrollable */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto min-h-0"
              style={{ 
                scrollBehavior: 'smooth'
              }}
            >
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#008069] border-t-transparent mx-auto mb-2"></div>
                    <p className="text-sm">Loading messages...</p>
                  </div>
                </div>
              ) : orderedMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground max-w-xs px-4">
                    <div className="bg-white/50 dark:bg-[#202c33]/50 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <MessageSquare className="h-10 w-10 text-[#008069] dark:text-[#00a884] opacity-50" />
                    </div>
                    <p className="text-base font-medium mb-1 text-[#111b21] dark:text-[#e9edef]">No messages yet</p>
                    <p className="text-xs text-[#667781] dark:text-[#8696a0]">Send a message to start the conversation</p>
                  </div>
                </div>
              ) : (
                <div className="px-3 sm:px-4 pt-4 pb-4 space-y-1">
                  {orderedMessages.map((msg, index) => {
                    const isOwn = msg.sender_id === user?.id;
                    const prevMsg = index > 0 ? orderedMessages[index - 1] : null;
                    const nextMsg = index < orderedMessages.length - 1 ? orderedMessages[index + 1] : null;
                    const showAvatar = !isOwn && (!nextMsg || nextMsg.sender_id !== msg.sender_id);
                    const showTimeSeparator = prevMsg && 
                      new Date(msg.created_at).getDate() !== new Date(prevMsg.created_at).getDate();
                    
                    return (
                      <div key={msg.id}>
                        {showTimeSeparator && (
                          <div className="flex items-center justify-center my-4">
                            <div className="bg-white/60 px-3 py-1 rounded-full">
                              <span className="text-xs text-muted-foreground">
                                {new Date(msg.created_at).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                        )}
                        <div
                          className={cn(
                            "flex items-end gap-2 mb-1",
                            isOwn ? "justify-end" : "justify-start"
                          )}
                        >
                          {!isOwn && (
                            <Avatar className={cn(
                              "h-6 w-6 shrink-0",
                              showAvatar ? "opacity-100" : "opacity-0"
                            )}>
                              <AvatarImage src={msg.image_url || undefined} /> {/* This would ideally be sender avatar */}
                              <AvatarFallback className="bg-[#008069] text-white text-[10px]">
                                {msg.sender_id.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            onTouchStart={(e) => handleLongPressStart(e, msg.id, isOwn)}
                            onTouchEnd={handleLongPressEnd}
                            onMouseDown={(e) => handleLongPressStart(e, msg.id, isOwn)}
                            onMouseUp={handleLongPressEnd}
                            onMouseLeave={handleLongPressEnd}
                            className={cn(
                              "max-w-[75%] sm:max-w-[65%] lg:max-w-[55%] rounded-lg shadow-sm",
                              "px-3 py-2",
                              isOwn && "cursor-pointer select-none",
                              isOwn
                                ? "bg-[#d9fdd3] rounded-tr-sm"
                                : "bg-white rounded-tl-sm",
                              selectedMessageId === msg.id && isOwn && "ring-2 ring-primary"
                            )}
                          >
                            {editingMessageId === msg.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editingMessageContent}
                                  onChange={(e) => setEditingMessageContent(e.target.value)}
                                  className="text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSaveEdit();
                                    }
                                    if (e.key === "Escape") {
                                      setEditingMessageId(null);
                                      setEditingMessageContent("");
                                    }
                                  }}
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={handleSaveEdit}
                                    className="h-7 text-xs"
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingMessageId(null);
                                      setEditingMessageContent("");
                                    }}
                                    className="h-7 text-xs"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className={cn(
                                "break-words whitespace-pre-wrap",
                                "text-[#111b21] dark:text-[#e9edef]",
                                isMobile ? "text-sm" : "text-[15px]",
                                "leading-relaxed"
                              )}>
                                {msg.content}
                              </p>
                            )}
                            {msg.image_url && (
                              <img 
                                src={msg.image_url} 
                                alt="Attachment" 
                                className="mt-2 rounded-lg max-w-full h-auto"
                              />
                            )}
                            <div className={cn(
                              "flex items-center gap-1.5 mt-1.5",
                              isOwn ? "justify-end" : "justify-start"
                            )}>
                              <span className={cn(
                                "text-[#667781] dark:text-[#8696a0]",
                                isMobile ? "text-[10px]" : "text-[11px]"
                              )}>
                                {new Date(msg.created_at).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                              {isOwn && (
                                <div className="flex items-center">
                                  {msg.is_read ? (
                                    <svg className="h-3.5 w-3.5 text-blue-500" viewBox="0 0 16 15" fill="currentColor">
                                      <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.175a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.175a.365.365 0 0 0-.063-.51z"/>
                                    </svg>
                                  ) : (
                                    <svg className="h-3.5 w-3.5 text-[#667781]" viewBox="0 0 16 15" fill="currentColor">
                                      <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.175a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.175a.365.365 0 0 0-.063-.51z"/>
                                    </svg>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                          {isOwn && <div className="w-6 shrink-0" />}
                        </div>
                      </div>
                    );
                  })} 
                  <div ref={messagesEndRef} />
                  
                  {/* Typing Indicator */}
                  {typingUsers.size > 0 && selectedUserId && (
                    <div className="px-3 sm:px-4 pb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={selectedUserInfo?.avatar_url} />
                          <AvatarFallback className="bg-[#008069] text-white text-xs">
                            {selectedUserInfo?.username?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-white rounded-lg rounded-tl-sm px-4 py-2 shadow-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-[#667781] text-xs">
                              {selectedUserInfo?.username || "Someone"} is typing
                            </span>
                            <div className="flex items-center gap-0.5 ml-1">
                              <span className="w-1.5 h-1.5 bg-[#667781] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-1.5 h-1.5 bg-[#667781] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-1.5 h-1.5 bg-[#667781] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Message Options Menu */}
            <AnimatePresence>
              {selectedMessageId && messageMenuPosition && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed z-50 bg-card border border-border rounded-lg shadow-lg p-1 min-w-[120px]"
                  style={{
                    left: `${Math.min(messageMenuPosition.x, window.innerWidth - 140)}px`,
                    top: `${Math.min(messageMenuPosition.y, window.innerHeight - 100)}px`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      const message = orderedMessages.find(m => m.id === selectedMessageId);
                      if (message) {
                        handleEditMessage(message.id, message.content);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteMessage(selectedMessageId)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message Input - Fixed at bottom */}
            <div className="shrink-0">
              <form 
                onSubmit={handleSendMessage} 
                className={cn(
                  "px-3 sm:px-4 py-2 sm:py-3",
                  isMobile && "pb-4"
                )}
              >
                <div className="flex items-end gap-2">
                  <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-full px-4 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2 shadow-sm border border-[#e4e6eb] dark:border-[#2a3942]">
                    <Input
                      placeholder="Type a message"
                      value={messageInput}
                      onChange={handleInputChange}
                      disabled={sending}
                      className={cn(
                        "border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent",
                        "placeholder:text-muted-foreground",
                        isMobile ? "text-sm" : "text-[15px]"
                      )}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={sending || !messageInput.trim()}
                    className={cn(
                      "rounded-full p-0 bg-[#25d366] hover:bg-[#20ba5a] text-white",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "transition-all duration-200",
                      "shadow-md hover:shadow-lg",
                      isMobile ? "h-10 w-10" : "h-11 w-11"
                    )}
                  >
                    <Send className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} />
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show placeholder when no chat selected on desktop */}
      {!isMobile && !selectedUserId && !selectedGroupId && (
        <div className="flex-1 flex items-center justify-center bg-[#efeae2] dark:bg-[#0b141a]">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm">Choose a chat from the sidebar to start messaging</p>
          </div>
        </div>
      )}

      {/* Create Group Dialog */}
      <Dialog open={isCreateGroupOpen} onOpenChange={handleCloseCreateGroupDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a group to collaborate and share tasks with other users.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateGroup} className="flex flex-col flex-1 min-h-0 gap-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name *</Label>
              <Input
                id="group-name"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={isCreatingGroup}
                required
              />
            </div>

            <div className="space-y-2 flex-1 min-h-0 flex flex-col">
              <Label>Select Members ({selectedMemberIds.size} selected)</Label>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  disabled={isCreatingGroup}
                />
              </div>
              <ScrollArea className="flex-1 border rounded-md p-2 min-h-[200px]">
                {usersLoading ? (
                  <div className="p-4 text-center text-muted-foreground">Loading users...</div>
                ) : filteredUsersForGroup.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No users found</p>
                    {searchQuery && (
                      <p className="text-xs mt-1">Try a different search term</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredUsersForGroup.map((member) => (
                      <div
                        key={member.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors",
                          selectedMemberIds.has(member.id) && "bg-primary/5"
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleMember(member.id, e);
                        }}
                      >
                        <Checkbox
                          checked={selectedMemberIds.has(member.id)}
                          onCheckedChange={() => {
                            handleToggleMember(member.id);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          disabled={isCreatingGroup}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback>
                            {member.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{member.username}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseCreateGroupDialog}
                disabled={isCreatingGroup}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingGroup || !groupName.trim() || selectedMemberIds.size === 0}
              >
                {isCreatingGroup ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
