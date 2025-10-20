import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/store/useStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Phone, Paperclip } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Message, Contact } from "@shared/schema";

export default function ChatArea() {
  const { selectedContact } = useStore();
  const [messageText, setMessageText] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contact } = useQuery<Contact>({
    queryKey: ["/api/contacts", selectedContact],
    enabled: !!selectedContact,
  });

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages/contact", selectedContact],
    enabled: !!selectedContact,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedContact || !contact) throw new Error("No contact selected");
      
      const response = await apiRequest("POST", "/api/messages", {
        contactId: selectedContact,
        phone: contact.phone,
        content,
        type: "sent",
        status: "delivered",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/contact", selectedContact] });
      setMessageText("");
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(messageText.trim());
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!selectedContact) {
    return (
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>Select a contact to start messaging</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 animate-pulse">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
            <div className="ml-3">
              <div className="w-24 h-4 bg-gray-300 rounded"></div>
              <div className="w-32 h-3 bg-gray-300 rounded mt-1"></div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-end">
                <div className="w-48 h-12 bg-gray-300 rounded-lg animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-medium">
              {contact ? getInitials(contact.name) : "??"}
            </span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-800">{contact?.name || "Unknown"}</p>
            <p className="text-xs text-gray-500">{contact?.phone || "No phone"}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
          <Phone className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  message.type === 'sent'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.type === 'sent' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.createdAt ? format(new Date(message.createdAt), 'HH:mm') : 'Unknown'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message Composer */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-3 top-2 text-gray-500 hover:text-gray-700"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </div>
          <Button
            type="submit"
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {sendMessageMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
