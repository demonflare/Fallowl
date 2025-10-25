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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FileText, Plus, Edit, Trash2 } from "lucide-react";
import type { CallScript } from "@shared/schema";

const callScriptFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  content: z.string().min(1, "Script content is required"),
  type: z.string().default("general"),
  isActive: z.boolean().default(true),
});

type CallScriptFormData = z.infer<typeof callScriptFormSchema>;

export default function CallScriptsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<CallScript | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scripts = [], isLoading } = useQuery<CallScript[]>({
    queryKey: ["/api/call-scripts"],
  });

  const form = useForm<CallScriptFormData>({
    resolver: zodResolver(callScriptFormSchema),
    defaultValues: {
      name: "",
      content: "",
      type: "general",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CallScriptFormData) => {
      const response = await apiRequest("POST", "/api/call-scripts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-scripts"] });
      toast({ title: "Success", description: "Call script created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CallScriptFormData> }) => {
      const response = await apiRequest("PUT", `/api/call-scripts/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-scripts"] });
      toast({ title: "Success", description: "Call script updated successfully" });
      setIsDialogOpen(false);
      setEditingScript(null);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/call-scripts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-scripts"] });
      toast({ title: "Success", description: "Call script deleted successfully" });
    },
  });

  const onSubmit = (data: CallScriptFormData) => {
    if (editingScript) {
      updateMutation.mutate({ id: editingScript.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (script: CallScript) => {
    setEditingScript(script);
    form.reset({
      name: script.name,
      description: script.description || "",
      content: script.content,
      type: script.type || "general",
      isActive: script.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div className="p-6">Loading call scripts...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Call Scripts</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your call scripts and templates
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-script">
              <Plus className="mr-2 h-4 w-4" />
              Create Script
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingScript ? "Edit Script" : "Create New Script"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Script Name *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="follow-up">Follow-up</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Script Content *</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={10} data-testid="textarea-content" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingScript ? "Update" : "Create"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {scripts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-gray-500">No call scripts yet</p>
            </CardContent>
          </Card>
        ) : (
          scripts.map((script) => (
            <Card key={script.id} data-testid={`card-script-${script.id}`}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{script.name}</CardTitle>
                  <Badge className="mt-2">{script.type}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(script)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Delete this script?")) {
                        deleteMutation.mutate(script.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {script.content}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
