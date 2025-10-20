import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, Send, Search, FileText, BarChart3, Zap,
  Clock, Check, CheckCheck, AlertCircle, ChevronDown, ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Message, Contact, SmsTemplate, SmsCampaign } from "@shared/schema";

export default function SmsPageAdvanced() {
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [activeTab, setActiveTab] = useState("conversations");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null);
  const [showStats, setShowStats] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const response = await fetch("/api/contacts");
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/messages/contact", selectedContactId],
    queryFn: async () => {
      if (!selectedContactId) return [];
      const response = await fetch(`/api/messages/contact/${selectedContactId}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!selectedContactId,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["/api/sms/templates"],
    queryFn: async () => {
      const response = await fetch("/api/sms/templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json();
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["/api/sms/campaigns"],
    queryFn: async () => {
      const response = await fetch("/api/sms/campaigns");
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      return response.json();
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/sms/analytics"],
    queryFn: async () => {
      const response = await fetch("/api/sms/analytics");
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ contactId, content, templateId }: { contactId: number; content: string; templateId?: number }) => {
      const contact = contacts.find(c => c.id === contactId);
      if (!contact) throw new Error("Contact not found");
      
      return await apiRequest("POST", "/api/messages", {
        contactId,
        phone: contact.phone,
        content,
        type: "sent",
        status: "pending",
        templateId,
        messageSource: templateId ? "template" : "manual",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/contact", selectedContactId] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/analytics"] });
      setMessageText("");
      setSelectedTemplate(null);
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
    if (messageText.trim() && selectedContactId && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate({ 
        contactId: selectedContactId, 
        content: messageText.trim(),
        templateId: selectedTemplate?.id
      });
    }
  };

  const handleTemplateSelect = (template: SmsTemplate) => {
    setSelectedTemplate(template);
    setMessageText(template.content);
    setShowTemplateDialog(false);
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getMessageStatus = (message: Message) => {
    switch (message.status) {
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-green-500" />;
      case 'sent':
        return <Check className="w-3 h-3 text-blue-500" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  const getMessageStats = () => {
    const sent = messages.filter(m => m.type === 'sent').length;
    const received = messages.filter(m => m.type === 'received').length;
    return { total: messages.length, sent, received };
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery)
  );

  const stats = getMessageStats();

  return (
    <div className="space-y-3">
      {/* Compact Stats */}
      <Card>
        <CardHeader className="p-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Quick Stats</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              data-testid="button-toggle-stats"
            >
              {showStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        {showStats && (
          <CardContent className="p-3 pt-0">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.sent}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Sent</div>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats.received}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Received</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="conversations" className="text-xs" data-testid="tab-conversations">
            <MessageCircle className="w-3 h-3 mr-1" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs" data-testid="tab-templates">
            <FileText className="w-3 h-3 mr-1" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs" data-testid="tab-campaigns">
            <Zap className="w-3 h-3 mr-1" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs" data-testid="tab-analytics">
            <BarChart3 className="w-3 h-3 mr-1" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversations" className="space-y-3 mt-3">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            {/* Contacts Sidebar */}
            <Card className="lg:col-span-1">
              <CardHeader className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-sm">Contacts</CardTitle>
                  <Badge variant="secondary" className="text-xs">{filteredContacts.length}</Badge>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-3 h-3 text-gray-400" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 h-8 text-sm"
                    data-testid="input-search-contacts"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[450px]">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => setSelectedContactId(contact.id)}
                      className={cn(
                        "p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 transition-colors",
                        selectedContactId === contact.id && "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500"
                      )}
                      data-testid={`contact-${contact.id}`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                          {getInitials(contact.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{contact.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{contact.phone}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="lg:col-span-3">
              {selectedContact ? (
                <div className="flex flex-col h-[550px]">
                  {/* Chat Header */}
                  <CardHeader className="p-3 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                          {getInitials(selectedContact.name)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{selectedContact.name}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{selectedContact.phone}</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowTemplateDialog(true)}
                        className="h-7 text-xs"
                        data-testid="button-use-template"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Templates
                      </Button>
                    </div>
                  </CardHeader>

                  {/* Messages */}
                  <CardContent className="flex-1 overflow-y-auto p-3">
                    <ScrollArea className="h-full">
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                          <div className="text-center">
                            <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">No messages yet</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={cn(
                                "flex",
                                message.type === 'sent' ? 'justify-end' : 'justify-start'
                              )}
                              data-testid={`message-${message.id}`}
                            >
                              <div
                                className={cn(
                                  "max-w-[75%] px-3 py-2 rounded-lg text-sm",
                                  message.type === 'sent'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                                )}
                              >
                                <p className="leading-relaxed">{message.content}</p>
                                <div className={cn(
                                  "flex items-center justify-between mt-1 text-xs",
                                  message.type === 'sent' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                                )}>
                                  <span>
                                    {message.createdAt ? format(new Date(message.createdAt), 'HH:mm') : '-'}
                                  </span>
                                  {message.type === 'sent' && (
                                    <span className="ml-2">
                                      {getMessageStatus(message)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>

                  {/* Message Input */}
                  <div className="p-3 border-t">
                    {selectedTemplate && (
                      <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-medium text-blue-900 dark:text-blue-200">
                              {selectedTemplate.name}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => {
                              setSelectedTemplate(null);
                              setMessageText("");
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
                      <div className="flex-1">
                        <Textarea
                          placeholder="Type your message..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          className="min-h-[60px] resize-none text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage(e);
                            }
                          }}
                          data-testid="input-message"
                        />
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {messageText.length}/160
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={!messageText.trim() || sendMessageMutation.isPending}
                        className="h-9"
                        data-testid="button-send-message"
                      >
                        {sendMessageMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[550px] text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">Select a contact to start messaging</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTab templates={templates} onSelect={handleTemplateSelect} />
        </TabsContent>

        <TabsContent value="campaigns">
          <CampaignsTab campaigns={campaigns} />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab analytics={analytics} />
        </TabsContent>
      </Tabs>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Select Template</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No templates available</p>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    data-testid={`template-${template.id}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">{template.name}</h4>
                      <Badge variant="secondary" className="text-xs">{template.category}</Badge>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{template.content}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplatesTab({ templates, onSelect }: { templates: SmsTemplate[]; onSelect: (template: SmsTemplate) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {templates.length === 0 ? (
        <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm">No templates available</p>
        </div>
      ) : (
        templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="p-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-900 dark:text-gray-100">{template.name}</CardTitle>
                <Badge variant="secondary" className="text-xs">{template.category}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{template.content}</p>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  Used {template.usageCount || 0}×
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onSelect(template)}
                  className="h-7 text-xs"
                  data-testid={`button-use-template-${template.id}`}
                >
                  Use
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function CampaignsTab({ campaigns }: { campaigns: SmsCampaign[] }) {
  return (
    <div className="space-y-3">
      {campaigns.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Zap className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm">No campaigns available</p>
        </div>
      ) : (
        campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm text-gray-900 dark:text-gray-100">{campaign.name}</CardTitle>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{campaign.description}</p>
                </div>
                <Badge variant={campaign.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                  {campaign.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="text-base font-bold text-blue-600 dark:text-blue-400">{campaign.totalRecipients}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Recipients</div>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="text-base font-bold text-green-600 dark:text-green-400">{campaign.sentCount}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Sent</div>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="text-base font-bold text-purple-600 dark:text-purple-400">{campaign.deliveredCount}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Delivered</div>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="text-base font-bold text-orange-600 dark:text-orange-400">{campaign.responseCount}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Responses</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function AnalyticsTab({ analytics }: { analytics: any }) {
  if (!analytics) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-sm">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Messages</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analytics.totalMessages || 0}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">Delivery Rate</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{analytics.deliveryRate || 0}%</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">Response Rate</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{analytics.responseRate || 0}%</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">Avg Response</div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{analytics.avgResponseTime || '-'}</div>
        </Card>
      </div>

      {analytics.topKeywords && analytics.topKeywords.length > 0 && (
        <Card className="p-3">
          <CardTitle className="text-sm mb-3 text-gray-900 dark:text-gray-100">Top Keywords</CardTitle>
          <div className="space-y-2">
            {analytics.topKeywords.map((keyword: string, index: number) => (
              <div key={keyword} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs w-6 h-6 flex items-center justify-center p-0">{index + 1}</Badge>
                  <span className="text-gray-900 dark:text-gray-100">{keyword}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {analytics.sentimentDistribution && (
        <Card className="p-3">
          <CardTitle className="text-sm mb-3 text-gray-900 dark:text-gray-100">Sentiment Analysis</CardTitle>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-600 dark:text-green-400">Positive</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{analytics.sentimentDistribution.positive || 0}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Neutral</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{analytics.sentimentDistribution.neutral || 0}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-red-600 dark:text-red-400">Negative</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{analytics.sentimentDistribution.negative || 0}%</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
