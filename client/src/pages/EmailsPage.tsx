import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Send, Inbox, Mail, Trash2, Star, StarOff, Edit, Archive, Clock } from "lucide-react";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import type { Email } from "@shared/schema";

const emailFormSchema = z.object({
  to: z.string().min(1, "Recipient is required").transform(val => val.split(',').map(s => s.trim())),
  cc: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()) : []),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Email body is required"),
  from: z.string().email("Valid email required"),
});

type EmailFormData = z.infer<typeof emailFormSchema>;

export default function EmailsPage() {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [folder, setFolder] = useState<string>("inbox");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: emails = [], isLoading } = useQuery<Email[]>({
    queryKey: ["/api/emails"],
  });

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      from: "",
      to: "",
      cc: "",
      subject: "",
      body: "",
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/emails", {
        ...data,
        direction: "outbound",
        status: "sent",
        sentAt: new Date(),
        folder: "sent",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({ title: "Success", description: "Email sent successfully" });
      setIsComposerOpen(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Email> }) => {
      const response = await apiRequest("PUT", `/api/emails/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/emails/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/emails"] });
      toast({ title: "Success", description: "Email deleted successfully" });
      setSelectedEmail(null);
    },
  });

  const onSubmit = (data: EmailFormData) => {
    sendMutation.mutate(data);
  };

  const toggleStar = (email: Email) => {
    updateMutation.mutate({
      id: email.id,
      data: { isStarred: !email.isStarred },
    });
  };

  const markAsRead = (email: Email) => {
    if (!email.isRead) {
      updateMutation.mutate({
        id: email.id,
        data: { isRead: true, readAt: new Date() },
      });
    }
  };

  const filteredEmails = emails.filter(email => {
    if (folder === "inbox") return email.folder === "inbox" || email.direction === "inbound";
    if (folder === "sent") return email.folder === "sent" || email.direction === "outbound";
    if (folder === "starred") return email.isStarred;
    if (folder === "drafts") return email.status === "draft";
    return email.folder === folder;
  });

  const unreadCount = emails.filter(e => !e.isRead && e.direction === "inbound").length;

  if (isLoading) {
    return <div className="p-6">Loading emails...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Emails</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your email communications
          </p>
        </div>
        <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-compose-email">
              <Send className="mr-2 h-4 w-4" />
              Compose Email
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Compose Email</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="your@email.com" data-testid="input-from" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="recipient@email.com (comma-separated for multiple)"
                          data-testid="input-to"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CC</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="cc@email.com" data-testid="input-cc" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-subject" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message *</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={8} data-testid="textarea-body" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={sendMutation.isPending} data-testid="button-send">
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsComposerOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Folders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={folder === "inbox" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setFolder("inbox")}
                data-testid="button-folder-inbox"
              >
                <Inbox className="mr-2 h-4 w-4" />
                Inbox
                {unreadCount > 0 && (
                  <Badge className="ml-auto" variant="destructive">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={folder === "sent" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setFolder("sent")}
                data-testid="button-folder-sent"
              >
                <Send className="mr-2 h-4 w-4" />
                Sent
              </Button>
              <Button
                variant={folder === "drafts" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setFolder("drafts")}
                data-testid="button-folder-drafts"
              >
                <Edit className="mr-2 h-4 w-4" />
                Drafts
              </Button>
              <Button
                variant={folder === "starred" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setFolder("starred")}
                data-testid="button-folder-starred"
              >
                <Star className="mr-2 h-4 w-4" />
                Starred
              </Button>
              <Button
                variant={folder === "trash" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setFolder("trash")}
                data-testid="button-folder-trash"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Trash
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Email List */}
        <div className="lg:col-span-3">
          {selectedEmail ? (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
                      ← Back
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleStar(selectedEmail)}
                      data-testid="button-toggle-star"
                    >
                      {selectedEmail.isStarred ? (
                        <StarOff className="h-4 w-4" />
                      ) : (
                        <Star className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Delete this email?")) {
                          deleteMutation.mutate(selectedEmail.id);
                        }
                      }}
                      data-testid="button-delete-email"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <CardTitle className="text-2xl">{selectedEmail.subject}</CardTitle>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div>From: {selectedEmail.from}</div>
                    <div>To: {selectedEmail.to.join(", ")}</div>
                    {selectedEmail.sentAt && (
                      <div>{format(new Date(selectedEmail.sentAt), "PPp")}</div>
                    )}
                  </div>
                  {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      CC: {selectedEmail.cc.join(", ")}
                    </div>
                  )}
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="mt-6">
                <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  {selectedEmail.bodyHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedEmail.bodyHtml) }} />
                  ) : (
                    selectedEmail.body
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{folder}</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredEmails.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p className="text-gray-500">No emails in {folder}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredEmails.map((email) => (
                      <div
                        key={email.id}
                        className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition ${
                          !email.isRead && email.direction === "inbound"
                            ? "bg-blue-50 dark:bg-blue-950 border-blue-200"
                            : "bg-white dark:bg-gray-900"
                        }`}
                        onClick={() => {
                          setSelectedEmail(email);
                          markAsRead(email);
                        }}
                        data-testid={`email-item-${email.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {email.isStarred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                              <span
                                className={`font-medium truncate ${
                                  !email.isRead ? "font-bold" : ""
                                }`}
                              >
                                {email.direction === "inbound" ? email.from : email.to.join(", ")}
                              </span>
                              {email.status === "draft" && (
                                <Badge variant="outline">Draft</Badge>
                              )}
                            </div>
                            <div className="text-sm font-medium mt-1 truncate">{email.subject}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                              {email.body.substring(0, 100)}...
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 ml-4 whitespace-nowrap">
                            {email.sentAt
                              ? format(new Date(email.sentAt), "MMM d")
                              : format(new Date(email.createdAt), "MMM d")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
