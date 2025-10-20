import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Search, Filter, SlidersHorizontal, X, ChevronDown, 
  Star, AlertCircle, Phone, Mail, MessageSquare, Calendar
} from "lucide-react";

interface ContactFiltersProps {
  onFilterChange: (filters: any) => void;
  totalContacts: number;
  filteredContacts: number;
}

export default function ContactFilters({ onFilterChange, totalContacts, filteredContacts }: ContactFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any>({
    priority: "",
    leadStatus: "",
    disposition: "",
    assignedTo: "",
    leadSource: "",
    tags: [],
    doNotCall: false,
    doNotEmail: false,
    doNotSms: false,
    hasNextFollowUp: false,
  });

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onFilterChange({ ...activeFilters, search: value });
  };

  const handleFilterChange = (key: string, value: any) => {
    // Convert "all" back to empty string for filtering logic
    const filterValue = value === "all" ? "" : value;
    const newFilters = { ...activeFilters, [key]: filterValue };
    setActiveFilters(newFilters);
    onFilterChange({ ...newFilters, search: searchQuery });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = activeFilters.tags.includes(tag)
      ? activeFilters.tags.filter((t: string) => t !== tag)
      : [...activeFilters.tags, tag];
    handleFilterChange('tags', newTags);
  };

  const clearFilters = () => {
    const clearedFilters = {
      priority: "",
      leadStatus: "",
      disposition: "",
      assignedTo: "",
      leadSource: "",
      tags: [],
      doNotCall: false,
      doNotEmail: false,
      doNotSms: false,
      hasNextFollowUp: false,
    };
    setActiveFilters(clearedFilters);
    onFilterChange({ ...clearedFilters, search: searchQuery });
  };

  const getActiveFilterCount = () => {
    return Object.values(activeFilters).reduce((count, value) => {
      if (Array.isArray(value)) {
        return count + value.length;
      }
      return count + (value ? 1 : 0);
    }, 0);
  };

  const priorityOptions = [
    { value: "high", label: "High Priority", color: "bg-red-100 text-red-800" },
    { value: "medium", label: "Medium Priority", color: "bg-yellow-100 text-yellow-800" },
    { value: "low", label: "Low Priority", color: "bg-green-100 text-green-800" }
  ];

  const statusOptions = [
    { value: "new", label: "New Leads", color: "bg-blue-100 text-blue-800" },
    { value: "contacted", label: "Contacted", color: "bg-orange-100 text-orange-800" },
    { value: "qualified", label: "Qualified", color: "bg-purple-100 text-purple-800" },
    { value: "converted", label: "Converted", color: "bg-green-100 text-green-800" },
    { value: "lost", label: "Lost", color: "bg-red-100 text-red-800" }
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

  const commonTags = [
    "VIP", "Hot Lead", "Client", "Prospect", "Referral", "Follow-up", 
    "Demo Scheduled", "Proposal Sent", "Decision Maker", "Influencer"
  ];

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center space-x-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search contacts by name, email, phone, or company..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="flex items-center space-x-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters</span>
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary" className="ml-2">
              {getActiveFilterCount()}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filter Panel */}
      <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <CollapsibleContent>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Advanced Filters</CardTitle>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Priority and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select value={activeFilters.priority || "all"} onValueChange={(value) => handleFilterChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      {priorityOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Lead Status</Label>
                  <Select value={activeFilters.leadStatus || "all"} onValueChange={(value) => handleFilterChange('leadStatus', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Disposition and Lead Source */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Disposition</Label>
                  <Select value={activeFilters.disposition || "all"} onValueChange={(value) => handleFilterChange('disposition', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All dispositions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dispositions</SelectItem>
                      {dispositionOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Lead Source</Label>
                  <Select value={activeFilters.leadSource || "all"} onValueChange={(value) => handleFilterChange('leadSource', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {leadSourceOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {commonTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={activeFilters.tags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-blue-100"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Communication Preferences */}
              <div>
                <Label>Communication Restrictions</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge
                    variant={activeFilters.doNotCall ? "default" : "outline"}
                    className="cursor-pointer hover:bg-red-100"
                    onClick={() => handleFilterChange('doNotCall', !activeFilters.doNotCall)}
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Do Not Call
                  </Badge>
                  <Badge
                    variant={activeFilters.doNotEmail ? "default" : "outline"}
                    className="cursor-pointer hover:bg-red-100"
                    onClick={() => handleFilterChange('doNotEmail', !activeFilters.doNotEmail)}
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    Do Not Email
                  </Badge>
                  <Badge
                    variant={activeFilters.doNotSms ? "default" : "outline"}
                    className="cursor-pointer hover:bg-red-100"
                    onClick={() => handleFilterChange('doNotSms', !activeFilters.doNotSms)}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Do Not SMS
                  </Badge>
                </div>
              </div>

              {/* Special Filters */}
              <div>
                <Label>Special Filters</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge
                    variant={activeFilters.hasNextFollowUp ? "default" : "outline"}
                    className="cursor-pointer hover:bg-orange-100"
                    onClick={() => handleFilterChange('hasNextFollowUp', !activeFilters.hasNextFollowUp)}
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    Has Follow-up Scheduled
                  </Badge>
                </div>
              </div>

              {/* Assigned To */}
              <div>
                <Label>Assigned To</Label>
                <Input
                  placeholder="Enter team member name"
                  value={activeFilters.assignedTo}
                  onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {filteredContacts} of {totalContacts} contacts
        </span>
        {getActiveFilterCount() > 0 && (
          <span className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>{getActiveFilterCount()} active filters</span>
          </span>
        )}
      </div>
    </div>
  );
}