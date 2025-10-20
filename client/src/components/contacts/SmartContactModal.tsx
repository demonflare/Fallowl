import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  X, User, Phone, Mail, MapPin, Building, Calendar, 
  Star, Tag, Globe, Linkedin, Twitter, Facebook, 
  Clock, AlertCircle, Plus, Trash2, MessageSquare, List
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Contact } from "@shared/schema";

interface SmartContactModalProps {
  open: boolean;
  onClose: () => void;
  contact?: Contact;
}

// Phone number validation regex - supports international formats
const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SmartContactModal({ open, onClose, contact }: SmartContactModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    alternatePhone: "",
    company: "",
    industry: "",
    revenue: "",
    employeeSize: "",
    jobTitle: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "US",
    timezone: "",
    birthdate: "",
    notes: "",
    priority: "medium",
    leadStatus: "new",
    leadSource: "",
    disposition: "",
    assignedTo: "",
    nextFollowUpAt: "",
    meetingDate: "",
    meetingTimezone: "",
    tags: [] as string[],
    socialProfiles: {} as any,
    customFields: {} as any,
    communicationPreferences: {} as any,
    doNotCall: false,
    doNotEmail: false,
    doNotSms: false,
    isActive: true,
    primaryListId: null as number | null,
  });

  const [newTag, setNewTag] = useState("");
  const [newCustomField, setNewCustomField] = useState({ key: "", value: "" });
  const [activeTab, setActiveTab] = useState("basic");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch contact lists for assignment
  const { data: contactLists = [] } = useQuery({
    queryKey: ["/api/lists"],
  });

  // Reset form when contact changes or modal opens/closes
  useEffect(() => {
    if (contact && open) {
      setFormData({
        name: contact.name || "",
        phone: contact.phone || "",
        email: contact.email || "",
        alternatePhone: contact.alternatePhone || "",
        company: contact.company || "",
        industry: contact.industry || "",
        revenue: contact.revenue || "",
        employeeSize: contact.employeeSize || "",
        jobTitle: contact.jobTitle || "",
        address: contact.address || "",
        city: contact.city || "",
        state: contact.state || "",
        zipCode: contact.zipCode || "",
        country: contact.country || "US",
        timezone: contact.timezone || "",
        birthdate: contact.birthdate ? new Date(contact.birthdate).toISOString().slice(0, 10) : "",
        notes: contact.notes || "",
        priority: contact.priority || "medium",
        leadStatus: contact.leadStatus || "new",
        leadSource: contact.leadSource || "",
        disposition: contact.disposition || "",
        assignedTo: contact.assignedTo || "",
        nextFollowUpAt: contact.nextFollowUpAt ? new Date(contact.nextFollowUpAt).toISOString().slice(0, 16) : "",
        meetingDate: contact.meetingDate ? new Date(contact.meetingDate).toISOString().slice(0, 16) : "",
        meetingTimezone: contact.meetingTimezone || "",
        tags: contact.tags || [],
        socialProfiles: contact.socialProfiles || {},
        customFields: contact.customFields || {},
        communicationPreferences: contact.communicationPreferences || {},
        doNotCall: contact.doNotCall || false,
        doNotEmail: contact.doNotEmail || false,
        doNotSms: contact.doNotSms || false,
        isActive: contact.isActive !== false,
        primaryListId: contact.primaryListId || null,
      });
      setValidationErrors({});
    } else if (!contact && open) {
      // Reset to empty form for new contact
      setFormData({
        name: "",
        phone: "",
        email: "",
        alternatePhone: "",
        company: "",
        industry: "",
        revenue: "",
        employeeSize: "",
        jobTitle: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "US",
        timezone: "",
        birthdate: "",
        notes: "",
        priority: "medium",
        leadStatus: "new",
        leadSource: "",
        disposition: "",
        assignedTo: "",
        nextFollowUpAt: "",
        meetingDate: "",
        meetingTimezone: "",
        tags: [],
        socialProfiles: {},
        customFields: {},
        communicationPreferences: {},
        doNotCall: false,
        doNotEmail: false,
        doNotSms: false,
        isActive: true,
        primaryListId: null,
      });
      setValidationErrors({});
    }
  }, [contact, open]);

  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    // Required fields
    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!phoneRegex.test(formData.phone)) {
      errors.phone = "Invalid phone number format";
    }

    // Optional field validation
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = "Invalid email format";
    }
    if (formData.alternatePhone && !phoneRegex.test(formData.alternatePhone)) {
      errors.alternatePhone = "Invalid alternate phone format";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = contact ? `/api/contacts/${contact.id}` : "/api/contacts";
      const method = contact ? "PUT" : "POST";
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: (savedContact) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      
      // If list was assigned, add contact to that list
      if (formData.primaryListId && savedContact?.id) {
        addToListMutation.mutate({ 
          contactId: savedContact.id, 
          listId: formData.primaryListId 
        });
      }
      
      toast({
        title: contact ? "Contact updated" : "Contact created",
        description: `Contact has been ${contact ? "updated" : "created"} successfully.`,
      });
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error.message || `Failed to ${contact ? "update" : "create"} contact`;
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!contact) return;
      const response = await apiRequest("DELETE", `/api/contacts/${contact.id}`, undefined);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      toast({
        title: "Contact deleted",
        description: "Contact has been permanently deleted.",
      });
      setShowDeleteConfirm(false);
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact",
        variant: "destructive",
      });
    },
  });

  const addToListMutation = useMutation({
    mutationFn: async ({ contactId, listId }: { contactId: number; listId: number }) => {
      const response = await apiRequest("POST", `/api/lists/${listId}/contacts`, { contactId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      nextFollowUpAt: formData.nextFollowUpAt ? new Date(formData.nextFollowUpAt).toISOString() : null,
      meetingDate: formData.meetingDate ? new Date(formData.meetingDate).toISOString() : null,
      birthdate: formData.birthdate ? new Date(formData.birthdate).toISOString() : null,
    };

    mutation.mutate(submitData);
  };

  const handleDelete = () => {
    if (contact) {
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddCustomField = () => {
    if (newCustomField.key.trim() && newCustomField.value.trim()) {
      setFormData(prev => ({
        ...prev,
        customFields: {
          ...prev.customFields,
          [newCustomField.key]: newCustomField.value
        }
      }));
      setNewCustomField({ key: "", value: "" });
    }
  };

  const handleRemoveCustomField = (keyToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      customFields: Object.fromEntries(
        Object.entries(prev.customFields).filter(([key]) => key !== keyToRemove)
      )
    }));
  };

  const handleSocialProfileChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialProfiles: {
        ...prev.socialProfiles,
        [platform]: value
      }
    }));
  };

  const handleClose = () => {
    onClose();
    // Reset form after a short delay to avoid UI flicker
    setTimeout(() => {
      setActiveTab("basic");
      setNewTag("");
      setNewCustomField({ key: "", value: "" });
      setValidationErrors({});
    }, 200);
  };

  const priorityOptions = [
    { value: "high", label: "High", color: "text-red-600" },
    { value: "medium", label: "Medium", color: "text-yellow-600" },
    { value: "low", label: "Low", color: "text-green-600" }
  ];

  const statusOptions = [
    { value: "new", label: "New Lead" },
    { value: "contacted", label: "Contacted" },
    { value: "qualified", label: "Qualified" },
    { value: "converted", label: "Converted" },
    { value: "lost", label: "Lost" }
  ];

  const dispositionOptions = [
    { value: "answered", label: "Answered" },
    { value: "human", label: "Human Answered" },
    { value: "voicemail", label: "Voicemail" },
    { value: "machine", label: "Machine Detected" },
    { value: "busy", label: "Busy" },
    { value: "no-answer", label: "No Answer" },
    { value: "failed", label: "Failed" },
    { value: "callback-requested", label: "Callback Requested" },
    { value: "interested", label: "Interested" },
    { value: "not-interested", label: "Not Interested" },
    { value: "qualified", label: "Qualified" },
    { value: "wrong-number", label: "Wrong Number" },
    { value: "disconnected", label: "Disconnected" },
    { value: "dnc-requested", label: "DNC Requested" },
    { value: "dnc-skipped", label: "DNC Skipped" }
  ];

  const leadSourceOptions = [
    { value: "website", label: "Website" },
    { value: "referral", label: "Referral" },
    { value: "social", label: "Social Media" },
    { value: "ads", label: "Advertising" },
    { value: "cold_call", label: "Cold Call" },
    { value: "email", label: "Email Campaign" },
    { value: "trade_show", label: "Trade Show" },
    { value: "other", label: "Other" }
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>{contact ? "Edit Contact" : "Add New Contact"}</span>
              </div>
              {contact && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  data-testid="button-delete-contact"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="business">Business</TabsTrigger>
                <TabsTrigger value="lead">Lead Info</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
                <TabsTrigger value="tags">Tags & Notes</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Doe"
                      required
                      data-testid="input-name"
                    />
                    {validationErrors.name && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="phone">Primary Phone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                      required
                      data-testid="input-phone"
                    />
                    {validationErrors.phone && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@example.com"
                      data-testid="input-email"
                    />
                    {validationErrors.email && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.email}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="alternatePhone">Alternate Phone</Label>
                    <Input
                      id="alternatePhone"
                      value={formData.alternatePhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, alternatePhone: e.target.value }))}
                      placeholder="+1 (555) 987-6543"
                      data-testid="input-alternate-phone"
                    />
                    {validationErrors.alternatePhone && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.alternatePhone}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="birthdate">Birthdate</Label>
                    <Input
                      id="birthdate"
                      type="date"
                      value={formData.birthdate}
                      onChange={(e) => setFormData(prev => ({ ...prev, birthdate: e.target.value }))}
                      data-testid="input-birthdate"
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={formData.timezone}
                      onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                      placeholder="America/New_York"
                      data-testid="input-timezone"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Main Street"
                    data-testid="input-address"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="New York"
                      data-testid="input-city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="NY"
                      data-testid="input-state"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                      placeholder="10001"
                      data-testid="input-zipcode"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="primaryListId">Assign to List</Label>
                  <Select 
                    value={formData.primaryListId?.toString() || "none"} 
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      primaryListId: value === "none" ? null : parseInt(value) 
                    }))}
                  >
                    <SelectTrigger data-testid="select-list">
                      <SelectValue placeholder="Select a list (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No List</SelectItem>
                      {Array.isArray(contactLists) && contactLists.map((list: any) => (
                        <SelectItem key={list.id} value={list.id.toString()}>
                          {list.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="business" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company">Company Name</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Acme Corporation"
                      data-testid="input-company"
                    />
                  </div>
                  <div>
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                      placeholder="CEO"
                      data-testid="input-job-title"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                      placeholder="Technology"
                      data-testid="input-industry"
                    />
                  </div>
                  <div>
                    <Label htmlFor="revenue">Revenue</Label>
                    <Input
                      id="revenue"
                      value={formData.revenue}
                      onChange={(e) => setFormData(prev => ({ ...prev, revenue: e.target.value }))}
                      placeholder="$1M - $10M"
                      data-testid="input-revenue"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="employeeSize">Employee Size</Label>
                  <Input
                    id="employeeSize"
                    value={formData.employeeSize}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeeSize: e.target.value }))}
                    placeholder="50-100"
                    data-testid="input-employee-size"
                  />
                </div>
              </TabsContent>

              <TabsContent value="lead" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.color}>{option.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="leadStatus">Lead Status</Label>
                    <Select value={formData.leadStatus} onValueChange={(value) => setFormData(prev => ({ ...prev, leadStatus: value }))}>
                      <SelectTrigger data-testid="select-lead-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="leadSource">Lead Source</Label>
                    <Select value={formData.leadSource} onValueChange={(value) => setFormData(prev => ({ ...prev, leadSource: value }))}>
                      <SelectTrigger data-testid="select-lead-source">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {leadSourceOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="disposition">Disposition</Label>
                    <Select value={formData.disposition} onValueChange={(value) => setFormData(prev => ({ ...prev, disposition: value }))}>
                      <SelectTrigger data-testid="select-disposition">
                        <SelectValue placeholder="Select disposition" />
                      </SelectTrigger>
                      <SelectContent>
                        {dispositionOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="assignedTo">Assigned To</Label>
                  <Input
                    id="assignedTo"
                    value={formData.assignedTo}
                    onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                    placeholder="Agent name"
                    data-testid="input-assigned-to"
                  />
                </div>

                <div>
                  <Label htmlFor="nextFollowUpAt">Next Follow-up Date</Label>
                  <Input
                    id="nextFollowUpAt"
                    type="datetime-local"
                    value={formData.nextFollowUpAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, nextFollowUpAt: e.target.value }))}
                    data-testid="input-follow-up-date"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="meetingDate">Meeting Booked Date</Label>
                    <Input
                      id="meetingDate"
                      type="datetime-local"
                      value={formData.meetingDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, meetingDate: e.target.value }))}
                      data-testid="input-meeting-date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="meetingTimezone">Meeting Timezone</Label>
                    <Input
                      id="meetingTimezone"
                      value={formData.meetingTimezone}
                      onChange={(e) => setFormData(prev => ({ ...prev, meetingTimezone: e.target.value }))}
                      placeholder="America/New_York"
                      data-testid="input-meeting-timezone"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="social" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="linkedin">LinkedIn Profile</Label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="linkedin"
                        value={(formData.socialProfiles as any)?.linkedin || ""}
                        onChange={(e) => handleSocialProfileChange('linkedin', e.target.value)}
                        placeholder="https://linkedin.com/in/username"
                        className="pl-10"
                        data-testid="input-linkedin"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="companyLinkedin">Company LinkedIn Profile</Label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="companyLinkedin"
                        value={(formData.socialProfiles as any)?.companyLinkedin || ""}
                        onChange={(e) => handleSocialProfileChange('companyLinkedin', e.target.value)}
                        placeholder="https://linkedin.com/company/companyname"
                        className="pl-10"
                        data-testid="input-company-linkedin"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="website"
                        value={(formData.socialProfiles as any)?.website || ""}
                        onChange={(e) => handleSocialProfileChange('website', e.target.value)}
                        placeholder="https://example.com"
                        className="pl-10"
                        data-testid="input-website"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tags" className="space-y-4">
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1" data-testid={`tag-${tag}`}>
                        {tag}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-4 h-4 p-0 hover:bg-transparent"
                          onClick={() => handleRemoveTag(tag)}
                          data-testid={`button-remove-tag-${tag}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      data-testid="input-new-tag"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddTag}
                      disabled={!newTag.trim()}
                      data-testid="button-add-tag"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Enter notes about this contact..."
                    rows={4}
                    data-testid="textarea-notes"
                  />
                </div>

                <div>
                  <Label>Custom Fields</Label>
                  <div className="space-y-2 mb-2">
                    {Object.entries(formData.customFields).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded" data-testid={`custom-field-${key}`}>
                        <span className="font-medium flex-1">{key}:</span>
                        <span className="flex-1">{value as string}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCustomField(key)}
                          data-testid={`button-remove-custom-field-${key}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={newCustomField.key}
                      onChange={(e) => setNewCustomField(prev => ({ ...prev, key: e.target.value }))}
                      placeholder="Field name"
                      data-testid="input-custom-field-key"
                    />
                    <Input
                      value={newCustomField.value}
                      onChange={(e) => setNewCustomField(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="Field value"
                      data-testid="input-custom-field-value"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCustomField}
                    disabled={!newCustomField.key.trim() || !newCustomField.value.trim()}
                    className="mt-2"
                    data-testid="button-add-custom-field"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Field
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="preferences" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Communication Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4" />
                        <span>Do Not Call</span>
                      </div>
                      <Switch
                        checked={formData.doNotCall}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, doNotCall: checked }))}
                        data-testid="switch-do-not-call"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span>Do Not Email</span>
                      </div>
                      <Switch
                        checked={formData.doNotEmail}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, doNotEmail: checked }))}
                        data-testid="switch-do-not-email"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Do Not SMS</span>
                      </div>
                      <Switch
                        checked={formData.doNotSms}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, doNotSms: checked }))}
                        data-testid="switch-do-not-sms"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Account Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>Active Contact</span>
                      </div>
                      <Switch
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                        data-testid="switch-is-active"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save">
                {mutation.isPending ? "Saving..." : (contact ? "Update Contact" : "Create Contact")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the contact "{contact?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
