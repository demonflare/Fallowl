import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Users, Settings, Trash2, Edit3, Eye, Filter, Grid, List as ListIcon, Star, ChevronDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useStore } from "@/store/useStore";
import type { ContactList, InsertContactList } from "@shared/schema";

// Color options for lists
const colorOptions = [
  { value: "#3B82F6", name: "Blue" },
  { value: "#10B981", name: "Green" },
  { value: "#F59E0B", name: "Yellow" },
  { value: "#EF4444", name: "Red" },
  { value: "#8B5CF6", name: "Purple" },
  { value: "#F97316", name: "Orange" },
  { value: "#06B6D4", name: "Cyan" },
  { value: "#84CC16", name: "Lime" },
];

// Icon options for lists
const iconOptions = [
  { value: "Users", name: "Users" },
  { value: "Star", name: "Star" },
  { value: "Target", name: "Target" },
  { value: "Heart", name: "Heart" },
  { value: "Zap", name: "Zap" },
  { value: "Shield", name: "Shield" },
  { value: "Crown", name: "Crown" },
  { value: "Briefcase", name: "Briefcase" },
];

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateListDialog({ open, onOpenChange }: CreateListDialogProps) {
  const [formData, setFormData] = useState<Partial<InsertContactList>>({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "Users",
    type: "custom",
    category: "general",
    visibility: "private",
  });
  const { toast } = useToast();

  const createListMutation = useMutation({
    mutationFn: async (data: InsertContactList) => {
      const response = await apiRequest("POST", "/api/lists", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({
        title: "List created",
        description: "Your new contact list has been created successfully.",
      });
      onOpenChange(false);
      setFormData({
        name: "",
        description: "",
        color: "#3B82F6",
        icon: "Users",
        type: "custom",
        category: "general",
        visibility: "private",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create list. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name) {
      createListMutation.mutate(formData as InsertContactList);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
          <DialogDescription>
            Create a new contact list to organize your contacts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">List Name</Label>
            <Input
              id="name"
              value={formData.name ?? ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter list name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description ?? ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this list is for"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Select value={formData.color ?? "#3B82F6"} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color.value }}
                        />
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category ?? "general"} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <Select value={formData.visibility ?? "private"} onValueChange={(value) => setFormData({ ...formData, visibility: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createListMutation.isPending}>
              {createListMutation.isPending ? "Creating..." : "Create List"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ListCardProps {
  list: ContactList;
}

function ListCard({ list }: ListCardProps) {
  const { toast } = useToast();
  const { setCurrentView } = useStore();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showContactsDialog, setShowContactsDialog] = useState(false);

  const deleteListMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/lists/${list.id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({
        title: "List deleted",
        description: "The contact list has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete list. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleViewContacts = () => {
    setCurrentView('contacts');
  };

  const [editForm, setEditForm] = useState({
    name: list.name,
    description: list.description || ""
  });

  const editListMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const response = await apiRequest(`/api/lists/${list.id}`, "PATCH", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      setShowEditDialog(false);
      toast({
        title: "List updated",
        description: "The contact list has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update list. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditList = () => {
    setEditForm({
      name: list.name,
      description: list.description || ""
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (editForm.name.trim()) {
      editListMutation.mutate(editForm);
    }
  };

  const handleSettings = () => {
    toast({
      title: "Settings",
      description: "List settings feature coming soon!",
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: list.color ?? "#3B82F6" }}
            >
              <Users className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{list.name}</CardTitle>
              <CardDescription className="text-sm">
                {list.contactCount || 0} contacts
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewContacts}>
                <Eye className="w-4 h-4 mr-2" />
                View Contacts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEditList}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSettings}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => deleteListMutation.mutate()}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {list.description && (
          <p className="text-sm text-gray-600 mb-3">{list.description}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {list.category}
            </Badge>
            {list.type === "smart" && (
              <Badge variant="outline" className="text-xs">
                Smart
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Updated {list.updatedAt ? new Date(list.updatedAt).toLocaleDateString() : "N/A"}
          </div>
        </div>
      </CardContent>

      {/* Edit List Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
            <DialogDescription>
              Update the details of your contact list.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">List Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter list name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Enter list description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={editListMutation.isPending}>
              {editListMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function ListsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["/api/lists"],
  });

  const filteredLists = lists.filter((list: ContactList) => {
    const matchesSearch = list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (list.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || list.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "general", label: "General" },
    { value: "sales", label: "Sales" },
    { value: "marketing", label: "Marketing" },
    { value: "support", label: "Support" },
    { value: "event", label: "Event" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-gray-600">
          Organize your contacts into smart lists for better management
        </p>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create List
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search lists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <ListIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Lists Grid/List */}
      {filteredLists.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No lists found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || selectedCategory !== "all"
              ? "No lists match your current filters."
              : "Get started by creating your first contact list."}
          </p>
          {(!searchQuery && selectedCategory === "all") && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First List
            </Button>
          )}
        </Card>
      ) : (
        <div className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        )}>
          {filteredLists.map((list: ContactList) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}

      {/* Create List Dialog */}
      <CreateListDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}