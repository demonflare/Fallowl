import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Shield, Plus, Edit, Trash2, Users, Settings, 
  Phone, MessageSquare, Mic, Mail, BarChart3, CreditCard 
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Role } from "@shared/schema";

const roleFormSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  permissions: z.record(z.array(z.string())),
});

type RoleFormData = z.infer<typeof roleFormSchema>;

const PERMISSION_MODULES = [
  { key: 'users', label: 'Users', icon: Users, description: 'Manage user accounts' },
  { key: 'contacts', label: 'Contacts', icon: Users, description: 'Manage contact database' },
  { key: 'calls', label: 'Calls', icon: Phone, description: 'Make and manage calls' },
  { key: 'messages', label: 'Messages', icon: MessageSquare, description: 'Send and manage SMS' },
  { key: 'recordings', label: 'Recordings', icon: Mic, description: 'Access call recordings' },
  { key: 'voicemails', label: 'Voicemails', icon: Mail, description: 'Manage voicemail system' },
  { key: 'settings', label: 'Settings', icon: Settings, description: 'System configuration' },
  { key: 'billing', label: 'Billing', icon: CreditCard, description: 'Billing and payments' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Reports and analytics' },
  { key: 'roles', label: 'Roles', icon: Shield, description: 'Role management' },
];

const PERMISSION_ACTIONS = ['create', 'read', 'update', 'delete'];

interface RoleManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RoleManager({ isOpen, onClose }: RoleManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch roles
  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
    enabled: isOpen,
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      await apiRequest("POST", "/api/roles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Role created",
        description: "New role has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<RoleFormData> }) => {
      await apiRequest("PUT", `/api/roles/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      toast({
        title: "Role updated",
        description: "Role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Role deleted",
        description: "Role has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
    },
  });

  const handleDeleteRole = (role: Role) => {
    if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setIsEditDialogOpen(true);
  };

  const getPermissionsSummary = (permissions: any) => {
    const moduleCount = Object.keys(permissions).length;
    const totalActions = Object.values(permissions).reduce((sum: number, actions: any) => sum + actions.length, 0);
    return `${moduleCount} modules, ${totalActions} actions`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            Role Management
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="ml-auto"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="h-[70vh] overflow-hidden">
          <Tabs defaultValue="roles" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="permissions">Permission Matrix</TabsTrigger>
            </TabsList>

            <TabsContent value="roles" className="h-full mt-4">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Available Roles</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Role Name</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Permissions</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                  Loading roles...
                                </TableCell>
                              </TableRow>
                            ) : roles.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                  No roles found
                                </TableCell>
                              </TableRow>
                            ) : (
                              roles.map((role) => (
                                <TableRow key={role.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Shield className="w-4 h-4 text-blue-600" />
                                      <span className="font-medium">{role.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {role.description || 'No description'}
                                    </p>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {getPermissionsSummary(role.permissions)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={role.isCustom ? 'secondary' : 'default'}>
                                      {role.isCustom ? 'Custom' : 'System'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedRole(role)}
                                      >
                                        View
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditRole(role)}
                                        disabled={!role.isCustom}
                                      >
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteRole(role)}
                                        disabled={!role.isCustom || deleteRoleMutation.isPending}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    {selectedRole && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">{selectedRole.name}</CardTitle>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedRole.description}
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium">Type</Label>
                              <Badge variant={selectedRole.isCustom ? 'secondary' : 'default'}>
                                {selectedRole.isCustom ? 'Custom Role' : 'System Role'}
                              </Badge>
                            </div>

                            <div>
                              <Label className="text-sm font-medium">Permissions</Label>
                              <div className="mt-2 space-y-2">
                                {Object.entries(selectedRole.permissions as any).map(([module, actions]) => (
                                  <div key={module} className="flex items-center justify-between text-sm">
                                    <span className="capitalize">{module}</span>
                                    <div className="flex gap-1">
                                      {(actions as string[]).map((action) => (
                                        <Badge key={action} variant="outline" className="text-xs">
                                          {action}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="text-xs text-gray-500">
                              Created: {new Date(selectedRole.createdAt!).toLocaleDateString()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="permissions" className="h-full mt-4">
              <ScrollArea className="h-full">
                <Card>
                  <CardHeader>
                    <CardTitle>Permission Matrix</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Overview of permissions across all roles
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="text-left p-2 border-b">Module</th>
                            {roles.map((role) => (
                              <th key={role.id} className="text-center p-2 border-b min-w-[120px]">
                                <div className="text-sm font-medium">{role.name}</div>
                                <Badge variant="outline" className="text-xs">
                                  {role.isCustom ? 'Custom' : 'System'}
                                </Badge>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {PERMISSION_MODULES.map((module) => (
                            <tr key={module.key}>
                              <td className="p-2 border-b">
                                <div className="flex items-center gap-2">
                                  <module.icon className="w-4 h-4 text-gray-600" />
                                  <div>
                                    <div className="font-medium">{module.label}</div>
                                    <div className="text-xs text-gray-500">{module.description}</div>
                                  </div>
                                </div>
                              </td>
                              {roles.map((role) => {
                                const permissions = (role.permissions as any)[module.key] || [];
                                return (
                                  <td key={role.id} className="p-2 border-b text-center">
                                    <div className="flex flex-wrap justify-center gap-1">
                                      {permissions.length > 0 ? (
                                        permissions.map((action: string) => (
                                          <Badge key={action} variant="default" className="text-xs">
                                            {action}
                                          </Badge>
                                        ))
                                      ) : (
                                        <Badge variant="outline" className="text-xs">
                                          None
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Create Role Dialog */}
        <RoleFormDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSubmit={(data) => createRoleMutation.mutate(data)}
          isLoading={createRoleMutation.isPending}
          title="Create New Role"
        />

        {/* Edit Role Dialog */}
        <RoleFormDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setSelectedRole(null);
          }}
          onSubmit={(data) => selectedRole && updateRoleMutation.mutate({ id: selectedRole.id, updates: data })}
          isLoading={updateRoleMutation.isPending}
          title="Edit Role"
          initialData={selectedRole}
        />
      </DialogContent>
    </Dialog>
  );
}

interface RoleFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RoleFormData) => void;
  isLoading: boolean;
  title: string;
  initialData?: Role | null;
}

function RoleFormDialog({ isOpen, onClose, onSubmit, isLoading, title, initialData }: RoleFormDialogProps) {
  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      permissions: initialData?.permissions as any || {},
    },
  });

  const handleSubmit = (data: RoleFormData) => {
    onSubmit(data);
  };

  const togglePermission = (module: string, action: string) => {
    const currentPermissions = form.getValues("permissions");
    const modulePermissions = currentPermissions[module] || [];
    
    const newPermissions = modulePermissions.includes(action)
      ? modulePermissions.filter(a => a !== action)
      : [...modulePermissions, action];
    
    form.setValue(`permissions.${module}`, newPermissions);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter role name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter role description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-4 block">Permissions</Label>
              <ScrollArea className="h-80 border rounded-lg p-4">
                <div className="space-y-6">
                  {PERMISSION_MODULES.map((module) => (
                    <div key={module.key} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <module.icon className="w-4 h-4" />
                        <span className="font-medium">{module.label}</span>
                        <span className="text-xs text-gray-500">- {module.description}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 ml-6">
                        {PERMISSION_ACTIONS.map((action) => {
                          const isChecked = ((form.watch("permissions")[module.key] as string[]) || []).includes(action);
                          return (
                            <div key={action} className="flex items-center space-x-2">
                              <Switch
                                checked={isChecked}
                                onCheckedChange={() => togglePermission(module.key, action)}
                              />
                              <Label className="text-sm capitalize">{action}</Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Role"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}