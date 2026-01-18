import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useGetConversationsQuery, useGetConversationMessagesQuery, useSendMessageMutation, useCreateGroupMutation, useAddGroupMembersMutation } from "@/store/api/chatApi";
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
import { MessageSquare, Send, Users, UserPlus, Search, ArrowLeft, MoreVertical, Phone, Video } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Chat() {
  const { user, isAdmin } = useAppSelector((state) => state.auth);
  const isMobile = useIsMobile();
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
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [chatListSearch, setChatListSearch] = useState("");
  
  const [createGroup, { isLoading: isCreatingGroup }] = useCreateGroupMutation();
  const [addGroupMembers] = useAddGroupMembersMutation();

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
  }, [conversations, allUsers, user?.id]);

  const filteredUserList = useMemo(() => {
    if (!chatListSearch.trim()) return userList;
    const query = chatListSearch.toLowerCase();
    return userList.filter(u => 
      u.username.toLowerCase().includes(query) || 
      u.email.toLowerCase().includes(query)
    );
  }, [userList, chatListSearch]);

  const selectedUserInfo = useMemo(() => {
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
      };
    }
    
    return null;
  }, [selectedUserId, conversationsMap, allUsers]);

  const handleUserSelect = useCallback((userId: string) => {
    setSelectedUserId(userId);
    if (isMobile) {
      setShowChatWindow(true);
      // Update URL to indicate we're in a chat conversation
      setSearchParams({ chat: userId });
    }
  }, [isMobile, setSearchParams]);

  const handleBackToList = useCallback(() => {
    setShowChatWindow(false);
    setSelectedUserId(null);
    // Clear URL params to indicate we're back to chat list
    setSearchParams({});
  }, [setSearchParams]);

  const { data: messagesData, isLoading: messagesLoading } = useGetConversationMessagesQuery(
    { userId: selectedUserId!, params: { page: 1, limit: 100 } },
    { 
      skip: !selectedUserId,
      pollingInterval: selectedUserId ? 5000 : 0,
    }
  );

  const messages = useMemo(() => {
    if (!messagesData) return [];
    if (Array.isArray(messagesData)) return messagesData;
    if ('data' in messagesData) return messagesData.data;
    return [];
  }, [messagesData]);

  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedUserId) return;

    try {
      await sendMessage({ receiver_id: selectedUserId, content: messageInput }).unwrap();
      setMessageInput("");
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
    }
  }, [messageInput, selectedUserId, sendMessage]);

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

  const handleToggleMember = useCallback((userId: string) => {
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
        "h-[calc(100vh-180px)] flex",
        isMobile && "h-[calc(100vh-80px)]"
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
              "flex flex-col bg-[#f0f2f5]",
              isMobile ? "w-full absolute inset-0 z-10" : "w-96 border-r border-border"
            )}
          >
            {/* Chat List Header */}
            <div className="bg-[#008069] text-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Chats</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="text-white hover:bg-white/20 h-9 w-9"
                >
                  <UserPlus className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                <Input
                  placeholder="Search or start new chat"
                  value={chatListSearch}
                  onChange={(e) => setChatListSearch(e.target.value)}
                  className="pl-10 bg-white/20 text-white placeholder:text-white/70 border-white/30 focus:bg-white/30 h-10 rounded-lg"
                />
              </div>
            </div>

            {/* Chat List Items */}
            <ScrollArea className="flex-1 bg-white">
              {conversationsLoading || usersLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading chats...</div>
              ) : filteredUserList.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No chats found</p>
                </div>
              ) : (
                <div>
                  {filteredUserList.map((chatUser) => {
                    const isSelected = selectedUserId === chatUser.id;
                    return (
                      <button
                        key={chatUser.id}
                        onClick={() => handleUserSelect(chatUser.id)}
                        className={cn(
                          "w-full p-3 flex items-center gap-3 hover:bg-[#f5f6f6] transition-colors border-b border-[#f0f2f5]",
                          isSelected && "bg-[#f0f2f5]"
                        )}
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={chatUser.avatar_url} />
                          <AvatarFallback className="bg-[#25d366] text-white">
                            {chatUser.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm truncate">{chatUser.username}</p>
                            {chatUser.hasConversation && chatUser.last_message_time && (
                              <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                                {formatChatTime(chatUser.last_message_time)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            {chatUser.hasConversation ? (
                              <p className="text-xs text-muted-foreground truncate">
                                {chatUser.last_message || "No messages yet"}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">
                                Tap to start chatting
                              </p>
                            )}
                            {chatUser.unread_count > 0 && (
                              <span className="ml-2 bg-[#25d366] text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center font-medium">
                                {chatUser.unread_count > 9 ? "9+" : chatUser.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
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
        {selectedUserId && (isMobile ? showChatWindow : true) && (
          <motion.div
            key="chat-window"
            initial={{ x: isMobile ? 100 : 0, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isMobile ? 100 : 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex flex-col bg-[#efeae2] flex-1",
              isMobile && "w-full absolute inset-0 z-20"
            )}
          >
            {/* Chat Header */}
            <div className="bg-[#008069] text-white p-3 shadow-sm flex items-center gap-3">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToList}
                  className="text-white hover:bg-white/20 h-9 w-9"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedUserInfo?.avatar_url} />
                <AvatarFallback className="bg-white text-[#008069]">
                  {selectedUserInfo?.username?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{selectedUserInfo?.username || "User"}</h3>
                <p className="text-xs text-white/80">Click here for contact info</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-9 w-9">
                  <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-9 w-9">
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-9 w-9">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#efeae2] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiPjxwYXRoIGQ9Ik0wIDBoMTAwdjEwMEgweiIgZmlsbD0iI2VmZWFlMiIvPjxwYXRoIGQ9Ik0yNiAyNmM0IDQuMjkgOSA4LjU4IDE0IDEyLjg3cy05IDguNTgtMTQgMTIuODdsLTE0LTE0YzAtNC4yOSAwLTguNTggMC0xMi44N3MxMC05LjE2IDE0LTEyLjg3eiIgZmlsbD0iI2YwZjJmNSIgZmlsbC1vcGFjaXR5PSIwLjAzIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')]"
            >
              {messagesLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No messages yet</p>
                  <p className="text-xs mt-1">Send a message to start the conversation</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          isOwn ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] sm:max-w-[65%] rounded-lg px-2 py-1 shadow-sm",
                            isOwn
                              ? "bg-[#d9fdd3] rounded-tr-none"
                              : "bg-white rounded-tl-none"
                          )}
                        >
                          <p className="text-sm break-words">{msg.content}</p>
                          {msg.image_url && (
                            <img 
                              src={msg.image_url} 
                              alt="Attachment" 
                              className="mt-1 rounded max-w-full"
                            />
                          )}
                          <div className={cn(
                            "flex items-center justify-end gap-1 mt-0.5",
                            isOwn ? "text-[#667781]" : "text-[#667781]"
                          )}>
                            <span className="text-[10px]">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isOwn && (
                              <svg className="h-3 w-3" viewBox="0 0 16 15" fill="none">
                                <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.175a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.175a.365.365 0 0 0-.063-.51z" fill="currentColor"/>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input - WhatsApp style */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#f0f2f5] border-t border-border/50">
              <div className="flex items-end gap-2">
                <div className="flex-1 bg-white rounded-full px-4 py-2 flex items-center gap-2">
                  <Input
                    placeholder="Type a message"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={sending}
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={sending || !messageInput.trim()}
                  className="rounded-full h-10 w-10 p-0 bg-[#25d366] hover:bg-[#20ba5a] text-white"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show placeholder when no chat selected on desktop */}
      {!isMobile && !selectedUserId && (
        <div className="flex-1 flex items-center justify-center bg-[#efeae2]">
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
                        onClick={() => handleToggleMember(member.id)}
                      >
                        <Checkbox
                          checked={selectedMemberIds.has(member.id)}
                          onCheckedChange={() => handleToggleMember(member.id)}
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
