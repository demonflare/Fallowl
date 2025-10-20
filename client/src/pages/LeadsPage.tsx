import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Phone,
  Mail,
  Plus,
  Search,
  Star,
  TrendingUp,
  Users,
  DollarSign,
  Flame,
  Eye,
  Edit,
  Trash2,
  Crown,
  Target,
  X,
  CheckCircle,
  Clock,
  BarChart3,
  Activity,
  Calendar,
  MessageSquare
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Lead = {
  id: number;
  contactId?: number;
  statusId?: number;
  sourceId?: number;
  leadStatusId?: number;
  leadSourceId?: number;
  assigneeId?: number;
  company?: string;
  title?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  score?: number;
  leadScore?: number;
  priority: string;
  temperature: string;
  value?: number;
  estimatedValue?: string;
  tags?: string[];
  notes?: string;
  nextFollowUp?: string;
  nextFollowUpDate?: string;
  lastContactedAt?: string;
  lastContactDate?: string;
  createdAt: string;
  updatedAt: string;
};

type LeadSource = {
  id: number;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
  cost?: string;
  conversionRate?: string;
  createdAt: string;
};

type LeadStatus = {
  id: number;
  name: string;
  description?: string;
  color?: string;
  sortOrder?: number;
  isActive: boolean;
  createdAt: string;
};

type LeadStats = {
  totalLeads: number;
  newLeadsThisMonth: number;
  conversionRate: number;
  hotLeads: number;
  pipelineValue: number;
};

type LeadActivity = {
  id: number;
  leadId: number;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
};

type LeadTask = {
  id: number;
  leadId: number;
  title: string;
  description?: string;
  dueDate?: string;
  status: string;
  priority: string;
  createdAt: string;
};

const temperatureConfig = {
  cold: { color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20", icon: "❄️" },
  warm: { color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20", icon: "☀️" },
  hot: { color: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20", icon: "🔥" }
};

const priorityConfig = {
  low: { color: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20" },
  medium: { color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20" },
  high: { color: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20" },
  urgent: { color: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20" }
};

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedTemperature, setSelectedTemperature] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<Partial<Lead>>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    priority: "medium",
    temperature: "cold",
    notes: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: leadStats } = useQuery<LeadStats>({
    queryKey: ["/api/leads/stats"],
  });

  const { data: leadSources = [] } = useQuery<LeadSource[]>({
    queryKey: ["/api/lead-sources/active"],
  });

  const { data: leadStatuses = [] } = useQuery<LeadStatus[]>({
    queryKey: ["/api/lead-statuses/active"],
  });

  const { data: leadActivities = [] } = useQuery<LeadActivity[]>({
    queryKey: [`/api/leads/${selectedLead?.id}/activities`],
    enabled: !!selectedLead?.id
  });

  const { data: leadTasks = [] } = useQuery<LeadTask[]>({
    queryKey: [`/api/leads/${selectedLead?.id}/tasks`],
    enabled: !!selectedLead?.id
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Lead>) => 
      apiRequest("POST", "/api/leads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      setShowCreateModal(false);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        priority: "medium",
        temperature: "cold",
        notes: ""
      });
      toast({ title: "Success", description: "Lead created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create lead", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Lead> }) => 
      apiRequest("PUT", `/api/leads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      setShowDetailsModal(false);
      toast({ title: "Success", description: "Lead updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update lead", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest("DELETE", `/api/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      setShowDetailsModal(false);
      toast({ title: "Success", description: "Lead deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete lead", variant: "destructive" });
    }
  });

  const filteredLeads = leads.filter((lead: Lead) => {
    const matchesSearch = !searchTerm || 
      lead.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const statusId = lead.statusId || lead.leadStatusId;
    const sourceId = lead.sourceId || lead.leadSourceId;
    const matchesStatus = selectedStatus === "all" || statusId === parseInt(selectedStatus);
    const matchesSource = selectedSource === "all" || sourceId === parseInt(selectedSource);
    const matchesPriority = selectedPriority === "all" || lead.priority === selectedPriority;
    const matchesTemperature = selectedTemperature === "all" || lead.temperature === selectedTemperature;

    return matchesSearch && matchesStatus && matchesSource && matchesPriority && matchesTemperature;
  });

  const getScore = (lead: Lead) => lead.score || lead.leadScore || 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <Crown className="h-3 w-3" />;
    if (score >= 60) return <Flame className="h-3 w-3" />;
    if (score >= 40) return <Star className="h-3 w-3" />;
    return <Target className="h-3 w-3" />;
  };

  const getStatusBadge = (lead: Lead) => {
    const statusId = lead.statusId || lead.leadStatusId;
    const status = leadStatuses.find(s => s.id === statusId);
    if (!status) return <Badge variant="outline" className="text-xs">Unknown</Badge>;
    return (
      <Badge 
        variant="outline" 
        className="text-xs border" 
        style={{ backgroundColor: status.color + "15", borderColor: status.color }}
      >
        {status.name}
      </Badge>
    );
  };

  const getSourceBadge = (lead: Lead) => {
    const sourceId = lead.sourceId || lead.leadSourceId;
    const source = leadSources.find(s => s.id === sourceId);
    if (!source) return <Badge variant="outline" className="text-xs">Unknown</Badge>;
    return (
      <Badge 
        variant="outline" 
        className="text-xs border" 
        style={{ backgroundColor: source.color + "15", borderColor: source.color }}
      >
        {source.name}
      </Badge>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLead) {
      updateMutation.mutate({ id: selectedLead.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const groupedLeadsByStatus = leadStatuses.map(status => ({
    status,
    leads: filteredLeads.filter(lead => (lead.statusId || lead.leadStatusId) === status.id)
  }));

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage and track your sales pipeline</p>
        <Button onClick={() => { setSelectedLead(null); setFormData({ firstName: "", lastName: "", email: "", phone: "", company: "", priority: "medium", temperature: "cold", notes: "" }); setShowCreateModal(true); }} size="sm" data-testid="button-create-lead">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Compact Stats */}
      {leadStats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{leadStats.totalLeads || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">New</p>
                <p className="text-xl font-bold">{leadStats.newLeadsThisMonth || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Conv. Rate</p>
                <p className="text-xl font-bold">{leadStats.conversionRate || 0}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500 opacity-20" />
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Hot Leads</p>
                <p className="text-xl font-bold">{leadStats.hotLeads || 0}</p>
              </div>
              <Flame className="h-8 w-8 text-orange-500 opacity-20" />
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pipeline</p>
                <p className="text-xl font-bold">${(leadStats.pipelineValue || 0).toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500 opacity-20" />
            </div>
          </Card>
        </div>
      )}

      {/* Compact Filters */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
              data-testid="input-search-leads"
            />
          </div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[130px] h-9 text-sm" data-testid="select-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {leadStatuses.map((status) => (
                <SelectItem key={status.id} value={status.id.toString()}>{status.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="w-[130px] h-9 text-sm" data-testid="select-source">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {leadSources.map((source) => (
                <SelectItem key={source.id} value={source.id.toString()}>{source.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="w-[120px] h-9 text-sm" data-testid="select-priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedTemperature} onValueChange={setSelectedTemperature}>
            <SelectTrigger className="w-[120px] h-9 text-sm" data-testid="select-temperature">
              <SelectValue placeholder="Temp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Temps</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => {
            setSearchTerm("");
            setSelectedStatus("all");
            setSelectedSource("all");
            setSelectedPriority("all");
            setSelectedTemperature("all");
          }} data-testid="button-clear-filters">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="table" data-testid="tab-table">Table</TabsTrigger>
          <TabsTrigger value="kanban" data-testid="tab-kanban">Kanban</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Table View */}
        <TabsContent value="table" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">Score</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Temp</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No leads found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => {
                    const score = getScore(lead);
                    return (
                      <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedLead(lead); setFormData(lead); setShowDetailsModal(true); }} data-testid={`row-lead-${lead.id}`}>
                        <TableCell>
                          <div className={`flex items-center gap-1 ${getScoreColor(score)}`}>
                            {getScoreIcon(score)}
                            <span className="text-xs font-semibold">{score}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{lead.firstName} {lead.lastName}</p>
                            {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {lead.email && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">{lead.email}</span>
                              </div>
                            )}
                            {lead.phone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{lead.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(lead)}</TableCell>
                        <TableCell>{getSourceBadge(lead)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs border ${priorityConfig[lead.priority as keyof typeof priorityConfig]?.color || ""}`}>
                            {lead.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs border ${temperatureConfig[lead.temperature as keyof typeof temperatureConfig]?.color || ""}`}>
                            {temperatureConfig[lead.temperature as keyof typeof temperatureConfig]?.icon} {lead.temperature}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {lead.value ? `$${Number(lead.value).toLocaleString()}` : lead.estimatedValue ? `$${Number(lead.estimatedValue).toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setFormData(lead); setShowDetailsModal(true); }} data-testid={`button-view-${lead.id}`}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); if (confirm("Delete this lead?")) deleteMutation.mutate(lead.id); }} data-testid={`button-delete-${lead.id}`}>
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Kanban View */}
        <TabsContent value="kanban" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {groupedLeadsByStatus.map(({ status, leads }) => (
              <Card key={status.id} className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }}></div>
                    {status.name}
                  </h3>
                  <Badge variant="secondary" className="text-xs">{leads.length}</Badge>
                </div>
                <div className="space-y-2">
                  {leads.map((lead) => {
                    const score = getScore(lead);
                    return (
                      <div
                        key={lead.id}
                        className="p-2 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => { setSelectedLead(lead); setFormData(lead); setShowDetailsModal(true); }}
                        data-testid={`kanban-card-${lead.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-medium">{lead.firstName} {lead.lastName}</p>
                          <div className={`flex items-center gap-1 ${getScoreColor(score)}`}>
                            {getScoreIcon(score)}
                            <span className="text-xs font-semibold">{score}</span>
                          </div>
                        </div>
                        {lead.company && <p className="text-xs text-muted-foreground mb-2">{lead.company}</p>}
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className={`text-xs border ${priorityConfig[lead.priority as keyof typeof priorityConfig]?.color || ""}`}>
                            {lead.priority}
                          </Badge>
                          <Badge variant="outline" className={`text-xs border ${temperatureConfig[lead.temperature as keyof typeof temperatureConfig]?.color || ""}`}>
                            {temperatureConfig[lead.temperature as keyof typeof temperatureConfig]?.icon}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  {leads.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No leads</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics View */}
        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Lead Distribution by Source</h3>
              <div className="space-y-2">
                {leadSources.map((source) => {
                  const count = leads.filter(l => (l.sourceId || l.leadSourceId) === source.id).length;
                  const percentage = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                  return (
                    <div key={source.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: source.color }}></div>
                          {source.name}
                        </span>
                        <span className="font-medium">{count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full" style={{ width: `${percentage}%`, backgroundColor: source.color }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Lead Distribution by Status</h3>
              <div className="space-y-2">
                {leadStatuses.map((status) => {
                  const count = leads.filter(l => (l.statusId || l.leadStatusId) === status.id).length;
                  const percentage = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                  return (
                    <div key={status.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }}></div>
                          {status.name}
                        </span>
                        <span className="font-medium">{count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full" style={{ width: `${percentage}%`, backgroundColor: status.color }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Temperature Distribution</h3>
              <div className="grid grid-cols-3 gap-2">
                {["cold", "warm", "hot"].map((temp) => {
                  const count = leads.filter(l => l.temperature === temp).length;
                  return (
                    <div key={temp} className="text-center p-3 border rounded-lg">
                      <p className="text-2xl mb-1">{temperatureConfig[temp as keyof typeof temperatureConfig]?.icon}</p>
                      <p className="text-sm capitalize font-medium">{temp}</p>
                      <p className="text-xl font-bold">{count}</p>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Priority Distribution</h3>
              <div className="grid grid-cols-2 gap-2">
                {["low", "medium", "high", "urgent"].map((priority) => {
                  const count = leads.filter(l => l.priority === priority).length;
                  return (
                    <div key={priority} className="text-center p-3 border rounded-lg">
                      <p className="text-sm capitalize font-medium">{priority}</p>
                      <p className="text-xl font-bold">{count}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLead ? "Edit Lead" : "Create New Lead"}</DialogTitle>
            <DialogDescription>
              {selectedLead ? "Update lead information" : "Add a new lead to your pipeline"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName || ""}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    data-testid="input-firstName"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName || ""}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    data-testid="input-lastName"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    data-testid="input-phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company || ""}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  data-testid="input-company"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leadStatusId">Status</Label>
                  <Select 
                    value={formData.leadStatusId?.toString() || formData.statusId?.toString() || ""} 
                    onValueChange={(value) => setFormData({ ...formData, leadStatusId: parseInt(value) })}
                  >
                    <SelectTrigger data-testid="select-leadStatusId">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadStatuses.map((status) => (
                        <SelectItem key={status.id} value={status.id.toString()}>{status.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leadSourceId">Source</Label>
                  <Select 
                    value={formData.leadSourceId?.toString() || formData.sourceId?.toString() || ""} 
                    onValueChange={(value) => setFormData({ ...formData, leadSourceId: parseInt(value) })}
                  >
                    <SelectTrigger data-testid="select-leadSourceId">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadSources.map((source) => (
                        <SelectItem key={source.id} value={source.id.toString()}>{source.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedValue">Value ($)</Label>
                  <Input
                    id="estimatedValue"
                    type="number"
                    value={formData.estimatedValue || formData.value || ""}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                    data-testid="input-estimatedValue"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority || "medium"} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger data-testid="select-priority-form">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Select value={formData.temperature || "cold"} onValueChange={(value) => setFormData({ ...formData, temperature: value })}>
                    <SelectTrigger data-testid="select-temperature-form">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cold">Cold</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="hot">Hot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  data-testid="textarea-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-lead">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : selectedLead ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Lead Details</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => { setShowDetailsModal(false); setShowCreateModal(true); }} data-testid="button-edit-lead">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => { if (selectedLead && confirm("Delete this lead?")) deleteMutation.mutate(selectedLead.id); }} data-testid="button-delete-lead-modal">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedLead.firstName} {selectedLead.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{selectedLead.company || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedLead.email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedLead.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedLead)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Source</p>
                  <div className="mt-1">{getSourceBadge(selectedLead)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Score</p>
                  <div className={`flex items-center gap-1 mt-1 ${getScoreColor(getScore(selectedLead))}`}>
                    {getScoreIcon(getScore(selectedLead))}
                    <span className="font-semibold">{getScore(selectedLead)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Value</p>
                  <p className="font-medium">{selectedLead.value ? `$${Number(selectedLead.value).toLocaleString()}` : selectedLead.estimatedValue ? `$${Number(selectedLead.estimatedValue).toLocaleString()}` : "-"}</p>
                </div>
              </div>

              {selectedLead.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedLead.notes}</p>
                </div>
              )}

              <Tabs defaultValue="activities" className="mt-6">
                <TabsList>
                  <TabsTrigger value="activities">
                    <Activity className="h-4 w-4 mr-2" />
                    Activities ({leadActivities.length})
                  </TabsTrigger>
                  <TabsTrigger value="tasks">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Tasks ({leadTasks.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="activities" className="space-y-2 mt-4">
                  {leadActivities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No activities yet</p>
                  ) : (
                    leadActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.title}</p>
                          {activity.description && <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>}
                          <p className="text-xs text-muted-foreground mt-1">{new Date(activity.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
                <TabsContent value="tasks" className="space-y-2 mt-4">
                  {leadTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No tasks yet</p>
                  ) : (
                    leadTasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <CheckCircle className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{task.title}</p>
                            <Badge variant="outline" className="text-xs">{task.status}</Badge>
                          </div>
                          {task.description && <p className="text-xs text-muted-foreground mt-1">{task.description}</p>}
                          {task.dueDate && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
