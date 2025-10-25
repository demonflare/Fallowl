import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar, Clock, Phone, Trash2, Edit, Plus, CheckCircle, XCircle } from "lucide-react";
import type { ScheduledCall, Contact } from "@shared/schema";

const scheduledCallFormSchema = z.object({
  contactId: z.number().optional().nullable(),
  phone: z.string().min(1, "Phone number is required"),
  scheduledFor: z.string().min(1, "Schedule time is required"),
  timezone: z.string().default("America/New_York"),
  purpose: z.string().optional(),
  priority: z.enum(["high", "normal", "low"]).default("normal"),
  notes: z.string().optional(),
  reminderEnabled: z.boolean().default(true),
  reminderMinutes: z.number().default(15),
});

type ScheduledCallFormData = z.infer<typeof scheduledCallFormSchema>;

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    case "failed":
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    default:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    case "low":
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    default:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
  }
};

export default function ScheduledCallsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCall, setEditingCall] = useState<ScheduledCall | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scheduledCalls = [], isLoading } = useQuery<ScheduledCall[]>({
    queryKey: ["/api/scheduled-calls"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const form = useForm<ScheduledCallFormData>({
    resolver: zodResolver(scheduledCallFormSchema),
    defaultValues: {
      phone: "",
      timezone: "America/New_York",
      priority: "normal",
      reminderEnabled: true,
      reminderMinutes: 15,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ScheduledCallFormData) => {
      const response = await apiRequest("POST", "/api/scheduled-calls", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-calls"] });
      toast({
        title: "Success",
        description: "Scheduled call created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create scheduled call",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ScheduledCallFormData> }) => {
      const response = await apiRequest("PUT", `/api/scheduled-calls/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-calls"] });
      toast({
        title: "Success",
        description: "Scheduled call updated successfully",
      });
      setIsDialogOpen(false);
      setEditingCall(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update scheduled call",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/scheduled-calls/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-calls"] });
      toast({
        title: "Success",
        description: "Scheduled call deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete scheduled call",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ScheduledCallFormData) => {
    if (editingCall) {
      updateMutation.mutate({ id: editingCall.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (call: ScheduledCall) => {
    setEditingCall(call);
    form.reset({
      contactId: call.contactId,
      phone: call.phone,
      scheduledFor: call.scheduledFor ? new Date(call.scheduledFor).toISOString().slice(0, 16) : "",
      timezone: call.timezone || "America/New_York",
      purpose: call.purpose || "",
      priority: (call.priority as "high" | "normal" | "low") || "normal",
      notes: call.notes || "",
      reminderEnabled: call.reminderEnabled ?? true,
      reminderMinutes: call.reminderMinutes ?? 15,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this scheduled call?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCall(null);
    form.reset();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading scheduled calls...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Scheduled Calls</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and schedule your upcoming calls
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogClose()} data-testid="button-create-scheduled-call">
              <Plus className="mr-2 h-4 w-4" />
              Schedule Call
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCall ? "Edit Scheduled Call" : "Schedule New Call"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="contactId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const contactId = value ? parseInt(value) : null;
                          field.onChange(contactId);
                          const contact = contacts.find((c) => c.id === contactId);
                          if (contact) {
                            form.setValue("phone", contact.phone);
                          }
                        }}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-contact">
                            <SelectValue placeholder="Select a contact" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id.toString()}>
                              {contact.name} - {contact.phone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledFor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheduled Time *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="input-scheduled-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purpose</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-purpose">
                            <SelectValue placeholder="Select purpose" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="follow-up">Follow-up</SelectItem>
                          <SelectItem value="sales-call">Sales Call</SelectItem>
                          <SelectItem value="demo">Demo</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="check-in">Check-in</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field}) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any notes about this call..."
                          {...field}
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : editingCall
                      ? "Update"
                      : "Schedule"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleDialogClose} data-testid="button-cancel">
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Scheduled Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledCalls.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No scheduled calls yet</p>
              <p className="text-sm mt-1">Click "Schedule Call" to create your first scheduled call</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scheduled Time</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledCalls.map((call) => (
                    <TableRow key={call.id} data-testid={`row-scheduled-call-${call.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">
                              {call.scheduledFor
                                ? format(new Date(call.scheduledFor), "MMM d, yyyy")
                                : "Not set"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {call.scheduledFor
                                ? format(new Date(call.scheduledFor), "h:mm a")
                                : ""}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {call.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        {call.purpose ? (
                          <Badge variant="outline">{call.purpose}</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(call.priority || "normal")}>
                          {call.priority || "normal"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(call.status || "pending")}>
                          {call.status || "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {call.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(call)}
                            data-testid={`button-edit-${call.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(call.id)}
                            data-testid={`button-delete-${call.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
