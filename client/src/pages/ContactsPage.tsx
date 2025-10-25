import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/store/useStore";
import { useTwilioDeviceV2 } from "@/hooks/useTwilioDeviceV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Grid, List, Download, Upload, Phone, Mail, MessageSquare, 
  Star, BarChart3, Filter, Calendar, Users, Building, MapPin,
  TrendingUp, Eye, Edit, Trash2, MoreHorizontal
} from "lucide-react";
import SmartContactCard from "@/components/contacts/SmartContactCard";
import SmartContactModal from "@/components/contacts/SmartContactModal";
import ContactFilters from "@/components/contacts/ContactFilters";
import ContactImportModal from "@/components/contacts/ContactImportModal";
import { ContactNotes } from "@/components/contacts/ContactNotes";
import { ContactsPageSkeleton } from "@/components/skeletons/ContactsPageSkeleton";
import { AdvancedFilters } from "@/components/filters/AdvancedFilters";
import { DateRange } from "react-day-picker";
import { isWithinInterval } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Contact } from "@shared/schema";

export default function ContactsPage() {
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<any>({});
  const [selectedListId, setSelectedListId] = useState<string>('all');
  const { setCurrentView, setSelectedContact: setSelectedContactId } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { makeCall, isReady } = useTwilioDeviceV2();

  // Get listId from URL params if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const listIdFromUrl = urlParams.get('listId');
    if (listIdFromUrl) {
      setSelectedListId(listIdFromUrl);
    }
  }, []);

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: contactListsData = [] } = useQuery({
    queryKey: ["/api/lists"],
  });

  // Ensure contactLists is always an array
  const contactLists = Array.isArray(contactListsData) ? contactListsData : [];

  const { data: listContacts = [], isLoading: listContactsLoading } = useQuery<Contact[]>({
    queryKey: ["/api/lists", selectedListId, "contacts"],
    enabled: selectedListId !== 'all',
  });

  // Filter and sort contacts
  const filteredAndSortedContacts = useMemo(() => {
    // Use list contacts if a specific list is selected, otherwise use all contacts
    let filtered = selectedListId === 'all' ? contacts : listContacts;

    // Apply search filter
    if (filters.search) {
      filtered = filtered.filter(contact => 
        contact.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        contact.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
        contact.phone.includes(filters.search) ||
        contact.company?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply other filters
    if (filters.priority) {
      filtered = filtered.filter(contact => contact.priority === filters.priority);
    }

    if (filters.leadStatus) {
      filtered = filtered.filter(contact => contact.leadStatus === filters.leadStatus);
    }

    if (filters.disposition) {
      filtered = filtered.filter(contact => contact.disposition === filters.disposition);
    }

    if (filters.leadSource) {
      filtered = filtered.filter(contact => contact.leadSource === filters.leadSource);
    }

    if (filters.assignedTo) {
      filtered = filtered.filter(contact => 
        contact.assignedTo?.toLowerCase().includes(filters.assignedTo.toLowerCase())
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(contact => 
        filters.tags.some((tag: string) => contact.tags?.includes(tag))
      );
    }

    if (filters.doNotCall) {
      filtered = filtered.filter(contact => contact.doNotCall);
    }

    if (filters.doNotEmail) {
      filtered = filtered.filter(contact => contact.doNotEmail);
    }

    if (filters.doNotSms) {
      filtered = filtered.filter(contact => contact.doNotSms);
    }

    if (filters.hasNextFollowUp) {
      filtered = filtered.filter(contact => 
        contact.nextFollowUpAt && new Date(contact.nextFollowUpAt) > new Date()
      );
    }

    // Sort contacts
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Contact];
      let bValue: any = b[sortBy as keyof Contact];

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [contacts, listContacts, selectedListId, filters, sortBy, sortOrder]);

  const handleCall = async (phone: string) => {
    try {
      if (!isReady) {
        toast({
          title: "Call Error",
          description: "Twilio device not ready. Please check your connection.",
          variant: "destructive"
        });
        return;
      }

      // Make the call using Twilio device V2
      await makeCall(phone);
      
      // Success toast is handled by the makeCall function
    } catch (error: any) {
      // Error toast is handled by the makeCall function
      console.error('Call failed:', error);
    }
  };

  const handleSms = (contactId: number) => {
    setSelectedContactId(contactId);
    setCurrentView("sms");
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleAddContact = () => {
    setSelectedContact(undefined);
    setShowModal(true);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowModal(true);
  };

  const handleViewDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setShowModal(true);
  };

  const markFavoriteMutation = useMutation({
    mutationFn: async ({ contactId, isFavorite }: { contactId: number; isFavorite: boolean }) => {
      const response = await apiRequest('POST', `/api/contacts/${contactId}/favorite`, { isFavorite });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Favorite Updated",
        description: "Contact favorite status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update favorite status",
        variant: "destructive"
      });
    }
  });

  const dispositionMutation = useMutation({
    mutationFn: async ({ contactId, disposition }: { contactId: number; disposition: string }) => {
      const response = await apiRequest('POST', `/api/contacts/${contactId}/disposition`, { disposition });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Disposition Updated",
        description: "Contact disposition updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update disposition",
        variant: "destructive"
      });
    }
  });

  const handleMarkFavorite = (contactId: number) => {
    const contact = contacts.find(c => c.id === contactId);
    const isFavorite = contact?.tags?.includes('favorite') || false;
    markFavoriteMutation.mutate({ contactId, isFavorite: !isFavorite });
  };

  const handleUpdateDisposition = (contactId: number, disposition: string) => {
    dispositionMutation.mutate({ contactId, disposition });
  };

  const handleImportComplete = (result: any) => {
    // Refresh contacts list
    queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    
    // If a new list was created, refresh lists and switch to it
    if (result.listId) {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      setSelectedListId(result.listId.toString());
    }
    
    setShowImportModal(false);
  };

  // Bulk operations
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/contacts/bulk/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: [] }) // Export all
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'contacts.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Export Complete",
        description: "Contacts exported successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export Error",
        description: error.message || "Failed to export contacts",
        variant: "destructive"
      });
    }
  });

  const bulkCallMutation = useMutation({
    mutationFn: async (contactIds: number[]) => {
      const response = await apiRequest('POST', '/api/contacts/bulk/call', { contactIds });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Call Initiated",
        description: `${data.results.filter((r: any) => r.status === 'queued').length} calls queued`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Call Error",
        description: error.message || "Failed to initiate bulk calls",
        variant: "destructive"
      });
    }
  });

  const bulkSmsMutation = useMutation({
    mutationFn: async ({ contactIds, message }: { contactIds: number[]; message: string }) => {
      const response = await apiRequest('POST', '/api/contacts/bulk/sms', { contactIds, message });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk SMS Initiated",
        description: `${data.results.filter((r: any) => r.status === 'queued').length} SMS messages queued`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk SMS Error",
        description: error.message || "Failed to send bulk SMS",
        variant: "destructive"
      });
    }
  });

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleBulkCall = () => {
    const contactIds = filteredAndSortedContacts
      .filter(c => !c.doNotCall)
      .map(c => c.id);
    
    if (contactIds.length === 0) {
      toast({
        title: "No Contacts",
        description: "No contacts available for calling",
        variant: "destructive"
      });
      return;
    }

    bulkCallMutation.mutate(contactIds);
  };

  const handleBulkSms = () => {
    const contactIds = filteredAndSortedContacts
      .filter(c => !c.doNotSms)
      .map(c => c.id);
    
    if (contactIds.length === 0) {
      toast({
        title: "No Contacts",
        description: "No contacts available for SMS",
        variant: "destructive"
      });
      return;
    }

    // For now, use a simple message - this could be improved with a modal
    const message = "Hello! This is a bulk message from our CRM system.";
    bulkSmsMutation.mutate({ contactIds, message });
  };

  const handleBulkEmail = () => {
    const contacts = filteredAndSortedContacts.filter(c => c.email && !c.doNotEmail);
    
    if (contacts.length === 0) {
      toast({
        title: "No Contacts",
        description: "No contacts available for email",
        variant: "destructive"
      });
      return;
    }

    // Open default email client with all recipients
    const emailList = contacts.map(c => c.email).join(',');
    window.location.href = `mailto:${emailList}?subject=Bulk Message&body=Hello,`;
  };

  // Statistics
  const stats = useMemo(() => {
    const total = contacts.length;
    const newLeads = contacts.filter(c => c.leadStatus === 'new').length;
    const qualified = contacts.filter(c => c.leadStatus === 'qualified').length;
    const converted = contacts.filter(c => c.leadStatus === 'converted').length;
    const highPriority = contacts.filter(c => c.priority === 'high').length;
    const followUpsDue = contacts.filter(c => 
      c.nextFollowUpAt && new Date(c.nextFollowUpAt) <= new Date()
    ).length;

    return { total, newLeads, qualified, converted, highPriority, followUpsDue };
  }, [contacts]);

  if (isLoading || (selectedListId !== 'all' && listContactsLoading)) {
    return <ContactsPageSkeleton viewMode={viewMode} />;
  }

  return (
    <div className="space-y-4">
      {/* Compact Statistics Bar */}
      <Card data-testid="card-stats">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="flex items-center space-x-2" data-testid="stat-total-contacts">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white" data-testid="text-stat-total">{stats.total}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
              </div>
            </div>

            <div className="flex items-center space-x-2" data-testid="stat-new-leads">
              <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white" data-testid="text-stat-new">{stats.newLeads}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">New</p>
              </div>
            </div>

            <div className="flex items-center space-x-2" data-testid="stat-qualified">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white" data-testid="text-stat-qualified">{stats.qualified}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Qualified</p>
              </div>
            </div>

            <div className="flex items-center space-x-2" data-testid="stat-converted">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <Building className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white" data-testid="text-stat-converted">{stats.converted}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Converted</p>
              </div>
            </div>

            <div className="flex items-center space-x-2" data-testid="stat-high-priority">
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                <Filter className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white" data-testid="text-stat-priority">{stats.highPriority}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Priority</p>
              </div>
            </div>

            <div className="flex items-center space-x-2" data-testid="stat-followups">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white" data-testid="text-stat-followups">{stats.followUpsDue}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Follow-ups</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <CardTitle className="text-xl">Contacts</CardTitle>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select list" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts</SelectItem>
                  {contactLists.map((list: any) => (
                    <SelectItem key={list.id} value={list.id.toString()}>
                      {list.name} ({list.contactCount || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between lg:justify-end space-x-2">
              <div className="flex items-center space-x-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 px-2"
                  data-testid="button-view-grid"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 px-2"
                  data-testid="button-view-list"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="createdAt">Created</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="leadStatus">Status</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-8 w-8 p-0"
                data-testid="button-sort-order"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>

              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExport}
                disabled={exportMutation.isPending}
                className="h-8 px-2"
                data-testid="button-export"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowImportModal(true)}
                className="h-8 px-2"
                data-testid="button-import"
              >
                <Upload className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={handleAddContact}
                className="bg-blue-600 hover:bg-blue-700 text-white h-8"
                size="sm"
                data-testid="button-add-contact"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <ContactFilters
            onFilterChange={setFilters}
            totalContacts={contacts.length}
            filteredContacts={filteredAndSortedContacts.length}
          />

          {/* Quick Actions - Compact */}
          <div className="flex items-center justify-between py-2 border-t border-b bg-gray-50 dark:bg-gray-900/20 -mx-6 px-6">
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleBulkCall}
                disabled={bulkCallMutation.isPending}
                className="h-7 px-2 text-xs"
                data-testid="button-bulk-call"
              >
                <Phone className="w-3 h-3 mr-1" />
                Call All
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleBulkSms}
                disabled={bulkSmsMutation.isPending}
                className="h-7 px-2 text-xs"
                data-testid="button-bulk-sms"
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                SMS All
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleBulkEmail}
                className="h-7 px-2 text-xs"
                data-testid="button-bulk-email"
              >
                <Mail className="w-3 h-3 mr-1" />
                Email All
              </Button>
            </div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Showing {filteredAndSortedContacts.length} of {contacts.length}
            </div>
          </div>

          {/* Contact List */}
          {filteredAndSortedContacts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg text-gray-500 mb-2">No contacts found</p>
              <p className="text-sm text-gray-400 mb-4">
                Try adjusting your filters or add your first contact
              </p>
              <Button onClick={handleAddContact}>
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>
          ) : (
            <div className={cn(
              "mt-4",
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                : "space-y-3"
            )}>
              {filteredAndSortedContacts.map((contact) => (
                <SmartContactCard
                  key={contact.id}
                  contact={contact}
                  onCall={handleCall}
                  onSms={handleSms}
                  onEmail={handleEmail}
                  onEdit={handleEditContact}
                  onViewDetails={handleViewDetails}
                  onMarkFavorite={handleMarkFavorite}
                  onUpdateDisposition={handleUpdateDisposition}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SmartContactModal
        open={showModal}
        onClose={() => setShowModal(false)}
        contact={selectedContact}
      />

      <ContactImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
