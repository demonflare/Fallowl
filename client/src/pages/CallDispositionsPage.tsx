import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tag, Plus, Edit, Trash2 } from "lucide-react";
import type { CallDisposition } from "@shared/schema";

const dispositionFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  category: z.string().default("outcome"),
  color: z.string().default("#6B7280"),
  isActive: z.boolean().default(true),
});

type DispositionFormData = z.infer<typeof dispositionFormSchema>;

export default function CallDispositionsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CallDisposition | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dispositions = [], isLoading } = useQuery<CallDisposition[]>({
    queryKey: ["/api/call-dispositions"],
  });

  const form = useForm<DispositionFormData>({
    resolver: zodResolver(dispositionFormSchema),
    defaultValues: {
      name: "",
      code: "",
      category: "outcome",
      color: "#6B7280",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DispositionFormData) => {
      const response = await apiRequest("POST", "/api/call-dispositions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-dispositions"] });
      toast({ title: "Success", description: "Disposition created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DispositionFormData> }) => {
      const response = await apiRequest("PUT", `/api/call-dispositions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-dispositions"] });
      toast({ title: "Success", description: "Disposition updated successfully" });
      setIsDialogOpen(false);
      setEditing(null);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/call-dispositions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-dispositions"] });
      toast({ title: "Success", description: "Disposition deleted successfully" });
    },
  });

  const onSubmit = (data: DispositionFormData) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading dispositions...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Call Dispositions</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage call outcomes and classifications
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-disposition">
              <Plus className="mr-2 h-4 w-4" />
              Create Disposition
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Disposition" : "Create Disposition"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., SALE, NI, CB" data-testid="input-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="outcome">Outcome</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                          <SelectItem value="action-required">Action Required</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit">
                    {editing ? "Update" : "Create"}
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

      <Card>
        <CardContent className="p-0">
          {dispositions.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-gray-500">No dispositions yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispositions.map((disp) => (
                  <TableRow key={disp.id}>
                    <TableCell>{disp.name}</TableCell>
                    <TableCell>
                      <Badge>{disp.code}</Badge>
                    </TableCell>
                    <TableCell>{disp.category}</TableCell>
                    <TableCell>
                      {disp.isActive ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(disp);
                            form.reset({
                              name: disp.name,
                              code: disp.code,
                              description: disp.description || "",
                              category: disp.category || "outcome",
                              color: disp.color || "#6B7280",
                              isActive: disp.isActive ?? true,
                            });
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Delete this disposition?")) {
                              deleteMutation.mutate(disp.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
