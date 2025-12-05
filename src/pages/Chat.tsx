import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useGetConversationsQuery, useGetMessagesQuery, useSendMessageMutation, useCreateConversationMutation } from "@/store/api/chatApi";
import { useAppSelector } from "@/store/hooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Send, Plus, Users, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { user } = useAppSelector((state) => state.auth);
  const { data: conversations = [], isLoading: conversationsLoading } = useGetConversationsQuery();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const { data: messages = [], isLoading: messagesLoading } = useGetMessagesQuery(selectedConversation!, {
    skip: !selectedConversation,
    pollingInterval: 3000,
  });
  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();
  const [createConversation] = useCreateConversationMutation();
  const [messageInput, setMessageInput] = useState("");
  const [newConversationName, setNewConversationName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    try {
      await sendMessage({ conversationId: selectedConversation, content: messageInput }).unwrap();
      setMessageInput("");
    } catch (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
    }
  };

  const handleCreateConversation = async () => {
    try {
      const result = await createConversation({ participantIds: [], name: newConversationName || "New Chat" }).unwrap();
      setSelectedConversation(result.id);
      setNewConversationName("");
      toast({ title: "Conversation created" });
    } catch (error) {
      toast({ title: "Failed to create conversation", variant: "destructive" });
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-[calc(100vh-180px)] flex gap-4"
    >
      {/* Conversations List */}
      <Card className="w-80 flex flex-col">
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
      <Card className="flex-1 flex flex-col">
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
  );
}
