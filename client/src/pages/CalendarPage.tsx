import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Calendar, ChevronLeft, ChevronRight, Clock, Users, MapPin,
  Phone, Mail, MessageSquare, Plus, Filter, Search, MoreHorizontal,
  CheckCircle, XCircle, AlertCircle, User, Building, Target, Info,
  Download, Upload, Bell, Zap, TrendingUp, CalendarDays, Grid3x3,
  List, Eye, EyeOff, RefreshCw, Trash2, Edit, Copy, ExternalLink,
  Video, FileText, Tag, Star, ChevronDown, X, Settings
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, 
         isSameDay, isSameMonth, isToday, addMonths, subMonths,
         startOfWeek, endOfWeek, addDays, startOfDay, addWeeks,
         subWeeks, getHours, setHours, isBefore, isAfter, addMinutes,
         differenceInMinutes, parseISO, isSameWeek } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { ContactNotes } from "@/components/contacts/ContactNotes";
import type { Contact } from "@shared/schema";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time?: string;
  type: 'follow-up' | 'meeting' | 'call' | 'task';
  priority: 'low' | 'medium' | 'high';
  status: 'scheduled' | 'completed' | 'missed' | 'rescheduled';
  contact?: Contact;
  description?: string;
  location?: string;
  duration?: number;
  attendees?: string[];
  tags?: string[];
  isRecurring?: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  reminder?: number;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMiniCalendar, setShowMiniCalendar] = useState(true);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    type: 'meeting',
    priority: 'medium',
    status: 'scheduled',
    duration: 30
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['/api/contacts'],
  });

  const calendarEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    
    (contacts as Contact[]).forEach((contact: Contact) => {
      if (contact.nextFollowUpAt) {
        events.push({
          id: `follow-up-${contact.id}`,
          title: `Follow-up: ${contact.name}`,
          date: new Date(contact.nextFollowUpAt),
          type: 'follow-up',
          priority: contact.priority === 'high' ? 'high' : 
                    contact.priority === 'low' ? 'low' : 'medium',
          status: new Date(contact.nextFollowUpAt) < new Date() ? 'missed' : 'scheduled',
          contact,
          description: `Follow up with ${contact.name}${contact.company ? ` from ${contact.company}` : ''}`,
          tags: contact.tags || [],
          duration: 15
        });
      }

      if (contact.meetingDate) {
        events.push({
          id: `meeting-${contact.id}`,
          title: `Meeting: ${contact.name}`,
          date: new Date(contact.meetingDate),
          time: contact.meetingTime || '10:00 AM',
          type: 'meeting',
          priority: 'high',
          status: 'scheduled',
          contact,
          description: `Meeting with ${contact.name}`,
          location: contact.address || 'TBD',
          duration: 60,
          tags: contact.tags || []
        });
      }

      if (contact.priority === 'high' && contact.leadStatus === 'new') {
        const reminderDate = new Date();
        reminderDate.setDate(reminderDate.getDate() + 1);
        
        events.push({
          id: `call-${contact.id}`,
          title: `Call: ${contact.name}`,
          date: reminderDate,
          time: '9:00 AM',
          type: 'call',
          priority: 'high',
          status: 'scheduled',
          contact,
          description: `Initial outreach call to ${contact.name}`,
          duration: 15,
          tags: contact.tags || []
        });
      }
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [contacts]);

  const filteredEvents = useMemo(() => {
    return calendarEvents.filter(event => {
      const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
      const matchesType = filterType === 'all' || event.type === filterType;
      const matchesSearch = !searchTerm || 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.contact?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.contact?.company?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [calendarEvents, filterStatus, filterType, searchTerm]);

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter(event => isSameDay(event.date, date));
  };

  const getEventsForWeek = () => {
    return filteredEvents.filter(event => 
      isSameWeek(event.date, currentDate, { weekStartsOn: 0 })
    );
  };

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return filteredEvents
      .filter(event => isAfter(event.date, now))
      .slice(0, 5);
  }, [filteredEvents]);

  const todayEvents = useMemo(() => {
    return getEventsForDate(new Date());
  }, [filteredEvents]);

  const navigate = (direction: 'prev' | 'next') => {
    switch (viewMode) {
      case 'month':
        setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(direction === 'prev' ? addDays(currentDate, -1) : addDays(currentDate, 1));
        break;
    }
  };

  const calendarDays = useMemo(() => {
    switch (viewMode) {
      case 'month': {
        const start = startOfWeek(startOfMonth(currentDate));
        const end = endOfWeek(endOfMonth(currentDate));
        return eachDayOfInterval({ start, end });
      }
      case 'week': {
        const start = startOfWeek(currentDate);
        const end = endOfWeek(currentDate);
        return eachDayOfInterval({ start, end });
      }
      case 'day':
        return [currentDate];
      default:
        return [];
    }
  }, [currentDate, viewMode]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [currentDate]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour <= 23; hour++) {
      slots.push({
        hour,
        time: format(setHours(new Date(), hour), 'h a')
      });
    }
    return slots;
  }, []);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: string }) => {
      const [type, contactId] = eventId.split('-');
      
      if (type === 'follow-up') {
        return apiRequest('POST', `/api/contacts/${contactId}/follow-up`, { 
          status, 
          completedAt: new Date() 
        });
      }
      
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      setShowEventModal(false);
      toast({
        title: "Success",
        description: "Event updated successfully"
      });
    }
  });

  const handleEventStatusUpdate = (eventId: string, status: string) => {
    updateEventMutation.mutate({ eventId, status });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'follow-up': return 'bg-blue-500 dark:bg-blue-600';
      case 'meeting': return 'bg-green-500 dark:bg-green-600';
      case 'call': return 'bg-purple-500 dark:bg-purple-600';
      case 'task': return 'bg-orange-500 dark:bg-orange-600';
      default: return 'bg-gray-500 dark:bg-gray-600';
    }
  };

  const getEventTypeColorLight = (type: string) => {
    switch (type) {
      case 'follow-up': return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
      case 'meeting': return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
      case 'call': return 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800';
      case 'task': return 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800';
      default: return 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800';
    }
  };

  const getEventStatusBadge = (status: string) => {
    const variants = {
      completed: { variant: "default" as const, icon: CheckCircle, color: "text-green-600 dark:text-green-400" },
      missed: { variant: "destructive" as const, icon: XCircle, color: "text-red-600 dark:text-red-400" },
      rescheduled: { variant: "secondary" as const, icon: RefreshCw, color: "text-yellow-600 dark:text-yellow-400" },
      scheduled: { variant: "outline" as const, icon: Clock, color: "text-blue-600 dark:text-blue-400" }
    };
    return variants[status as keyof typeof variants] || variants.scheduled;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />;
      default: return <Clock className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />;
    }
  };

  const EventStats = () => {
    const stats = useMemo(() => {
      const total = filteredEvents.length;
      const completed = filteredEvents.filter(e => e.status === 'completed').length;
      const upcoming = filteredEvents.filter(e => e.status === 'scheduled' && isAfter(e.date, new Date())).length;
      const missed = filteredEvents.filter(e => e.status === 'missed').length;
      
      return { total, completed, upcoming, missed };
    }, [filteredEvents]);

    return (
      <div className="grid grid-cols-4 gap-4">
        <Card data-testid="stat-total-events" className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Events</p>
                <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</h3>
              </div>
              <CalendarDays className="w-8 h-8 text-blue-500 dark:text-blue-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-upcoming" className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400">Upcoming</p>
                <h3 className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.upcoming}</h3>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 dark:text-green-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-completed" className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Completed</p>
                <h3 className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.completed}</h3>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-500 dark:text-purple-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-missed" className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400">Missed</p>
                <h3 className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.missed}</h3>
              </div>
              <XCircle className="w-8 h-8 text-red-500 dark:text-red-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const MiniCalendar = () => {
    const [miniMonth, setMiniMonth] = useState(new Date());
    const miniDays = useMemo(() => {
      const start = startOfWeek(startOfMonth(miniMonth));
      const end = endOfWeek(endOfMonth(miniMonth));
      return eachDayOfInterval({ start, end });
    }, [miniMonth]);

    return (
      <Card data-testid="mini-calendar" className="h-fit">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Quick Nav</CardTitle>
            <Button
              data-testid="button-toggle-mini-calendar"
              variant="ghost"
              size="sm"
              onClick={() => setShowMiniCalendar(!showMiniCalendar)}
            >
              {showMiniCalendar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        {showMiniCalendar && (
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <Button
                data-testid="button-mini-prev"
                variant="ghost"
                size="sm"
                onClick={() => setMiniMonth(subMonths(miniMonth, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">{format(miniMonth, 'MMM yyyy')}</span>
              <Button
                data-testid="button-mini-next"
                variant="ghost"
                size="sm"
                onClick={() => setMiniMonth(addMonths(miniMonth, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {miniDays.map((day) => {
                const hasEvents = getEventsForDate(day).length > 0;
                const isCurrentMonth = isSameMonth(day, miniMonth);
                const isSelected = isSameDay(day, selectedDate);
                
                return (
                  <TooltipProvider key={day.toISOString()}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          data-testid={`mini-cal-day-${format(day, 'yyyy-MM-dd')}`}
                          className={cn(
                            "h-8 text-xs rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative",
                            !isCurrentMonth && "text-gray-300 dark:text-gray-600",
                            isToday(day) && "bg-blue-100 dark:bg-blue-900 font-bold text-blue-600 dark:text-blue-300",
                            isSelected && "ring-2 ring-blue-500 dark:ring-blue-400",
                            isCurrentMonth && !isToday(day) && "text-gray-700 dark:text-gray-300"
                          )}
                          onClick={() => {
                            setSelectedDate(day);
                            setCurrentDate(day);
                          }}
                        >
                          {format(day, 'd')}
                          {hasEvents && (
                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                              <div className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full" />
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      {hasEvents && (
                        <TooltipContent>
                          <p className="text-xs">{getEventsForDate(day).length} event(s)</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>

            <Separator className="my-3" />

            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Today's Events</h4>
              {todayEvents.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">No events today</p>
              ) : (
                <div className="space-y-1">
                  {todayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      data-testid={`mini-event-${event.id}`}
                      className={cn(
                        "p-2 rounded-md text-xs cursor-pointer hover:shadow-sm transition-all",
                        getEventTypeColorLight(event.type)
                      )}
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{event.title}</span>
                        <Badge variant="outline" className="text-xs h-4 px-1">
                          {event.time || 'All day'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {todayEvents.length > 3 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      +{todayEvents.length - 3} more
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  if (contactsLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="grid grid-cols-7 gap-4">
                {[...Array(35)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Calendar & Events
              </CardTitle>
              <CardDescription className="mt-1">
                Manage your schedule, meetings, and follow-ups
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-testid="button-create-event"
                      variant="default"
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                      onClick={() => setShowCreateModal(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Event
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Create a new calendar event</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button data-testid="button-refresh" variant="outline" size="icon">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh calendar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3 mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <Input
                data-testid="input-search"
                type="text"
                placeholder="Search events, contacts, or companies..."
                className="pl-10 bg-white dark:bg-gray-800"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger data-testid="select-filter-type" className="w-40 bg-white dark:bg-gray-800">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="follow-up">Follow-ups</SelectItem>
                <SelectItem value="meeting">Meetings</SelectItem>
                <SelectItem value="call">Calls</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger data-testid="select-filter-status" className="w-40 bg-white dark:bg-gray-800">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="rescheduled">Rescheduled</SelectItem>
              </SelectContent>
            </Select>

            <Button
              data-testid="button-today"
              variant="outline"
              className="whitespace-nowrap bg-white dark:bg-gray-800"
              onClick={() => {
                setCurrentDate(new Date());
                setSelectedDate(new Date());
              }}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              Today
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <EventStats />

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-4">
        {/* Sidebar */}
        <div className="col-span-3 space-y-4">
          <MiniCalendar />

          {/* Upcoming Events */}
          <Card data-testid="card-upcoming-events">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                  No upcoming events
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map(event => (
                    <div
                      key={event.id}
                      data-testid={`upcoming-event-${event.id}`}
                      className={cn(
                        "p-2 rounded-lg border cursor-pointer hover:shadow-md transition-all",
                        getEventTypeColorLight(event.type)
                      )}
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{event.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {format(event.date, 'MMM d')} {event.time && `• ${event.time}`}
                          </p>
                        </div>
                        {getPriorityIcon(event.priority)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card data-testid="card-legend">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Event Types</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-2">
                {[
                  { type: 'follow-up', label: 'Follow-up', icon: Phone },
                  { type: 'meeting', label: 'Meeting', icon: Users },
                  { type: 'call', label: 'Call', icon: Phone },
                  { type: 'task', label: 'Task', icon: CheckCircle }
                ].map(({ type, label, icon: Icon }) => (
                  <div key={type} className="flex items-center gap-2 text-xs">
                    <div className={cn("w-3 h-3 rounded", getEventTypeColor(type))} />
                    <Icon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar View */}
        <div className="col-span-9">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <Button
                      data-testid="button-nav-prev"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('prev')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="font-semibold min-w-[180px] text-center">
                      {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
                      {viewMode === 'week' && `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`}
                      {viewMode === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <Button
                      data-testid="button-nav-next"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('next')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                  <TabsList className="bg-gray-100 dark:bg-gray-800">
                    <TabsTrigger data-testid="tab-month" value="month" className="text-xs">
                      <Grid3x3 className="w-3 h-3 mr-2" />
                      Month
                    </TabsTrigger>
                    <TabsTrigger data-testid="tab-week" value="week" className="text-xs">
                      <List className="w-3 h-3 mr-2" />
                      Week
                    </TabsTrigger>
                    <TabsTrigger data-testid="tab-day" value="day" className="text-xs">
                      <CalendarDays className="w-3 h-3 mr-2" />
                      Day
                    </TabsTrigger>
                    <TabsTrigger data-testid="tab-agenda" value="agenda" className="text-xs">
                      <List className="w-3 h-3 mr-2" />
                      Agenda
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>

            <CardContent className="p-3">
              {/* Month View */}
              {viewMode === 'month' && (
                <div>
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                      <div key={day} className="p-2 text-center font-semibold text-sm text-gray-600 dark:text-gray-300">
                        {day.substring(0, 3)}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((day) => {
                      const dayEvents = getEventsForDate(day);
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isSelected = isSameDay(day, selectedDate);
                      
                      return (
                        <div
                          key={day.toISOString()}
                          data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                          className={cn(
                            "min-h-28 p-2 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md",
                            !isCurrentMonth && "bg-gray-50 dark:bg-gray-900 opacity-50",
                            isCurrentMonth && "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                            isToday(day) && "bg-blue-50 dark:bg-blue-950 border-blue-400 dark:border-blue-600 ring-2 ring-blue-200 dark:ring-blue-800",
                            isSelected && "border-blue-500 dark:border-blue-400 ring-2 ring-blue-300 dark:ring-blue-700"
                          )}
                          onClick={() => setSelectedDate(day)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={cn(
                              "text-sm font-semibold",
                              isToday(day) && "bg-blue-600 dark:bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                            )}>
                              {format(day, 'd')}
                            </span>
                            {dayEvents.length > 0 && (
                              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                {dayEvents.length}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map((event) => (
                              <div
                                key={event.id}
                                data-testid={`event-${event.id}`}
                                className={cn(
                                  "text-xs px-2 py-1 rounded-md truncate cursor-pointer transition-all hover:scale-105",
                                  getEventTypeColor(event.type),
                                  "text-white font-medium shadow-sm"
                                )}
                                title={event.title}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEventClick(event);
                                }}
                              >
                                <div className="flex items-center gap-1">
                                  {event.time && <Clock className="w-3 h-3" />}
                                  <span className="truncate">{event.time || ''} {event.title}</span>
                                </div>
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">
                                +{dayEvents.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Week View */}
              {viewMode === 'week' && (
                <div className="overflow-auto max-h-[600px]">
                  <div className="grid grid-cols-8 gap-2">
                    <div className="sticky top-0 bg-white dark:bg-gray-800 z-10"></div>
                    {weekDays.map(day => (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "sticky top-0 bg-white dark:bg-gray-800 z-10 p-2 text-center border-b-2 border-gray-200 dark:border-gray-700",
                          isToday(day) && "bg-blue-50 dark:bg-blue-950 border-blue-400 dark:border-blue-600"
                        )}
                      >
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {format(day, 'EEE')}
                        </div>
                        <div className={cn(
                          "text-lg font-bold",
                          isToday(day) && "text-blue-600 dark:text-blue-400"
                        )}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {timeSlots.map(slot => (
                    <div key={slot.hour} className="grid grid-cols-8 gap-2 border-t border-gray-100 dark:border-gray-800">
                      <div className="p-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {slot.time}
                      </div>
                      {weekDays.map(day => {
                        const slotEvents = getEventsForDate(day).filter(e => {
                          if (!e.time) return false;
                          const eventHour = parseInt(e.time.split(':')[0]);
                          return eventHour === slot.hour;
                        });

                        return (
                          <div
                            key={day.toISOString()}
                            className={cn(
                              "min-h-16 p-1 border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 rounded cursor-pointer",
                              isToday(day) && "bg-blue-50/30 dark:bg-blue-950/30"
                            )}
                          >
                            {slotEvents.map(event => (
                              <div
                                key={event.id}
                                data-testid={`week-event-${event.id}`}
                                className={cn(
                                  "p-1 rounded text-xs text-white mb-1 cursor-pointer hover:shadow-md transition-all",
                                  getEventTypeColor(event.type)
                                )}
                                onClick={() => handleEventClick(event)}
                              >
                                <p className="font-medium truncate">{event.title}</p>
                                {event.duration && (
                                  <p className="text-xs opacity-90">{event.duration}m</p>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* Day View */}
              {viewMode === 'day' && (
                <div className="overflow-auto max-h-[600px]">
                  <div className="space-y-1">
                    {timeSlots.map(slot => {
                      const slotEvents = getEventsForDate(currentDate).filter(e => {
                        if (!e.time) return false;
                        const eventHour = parseInt(e.time.split(':')[0]);
                        return eventHour === slot.hour;
                      });

                      return (
                        <div
                          key={slot.hour}
                          data-testid={`day-slot-${slot.hour}`}
                          className="flex border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                        >
                          <div className="w-24 p-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            {slot.time}
                          </div>
                          <div className="flex-1 p-2 min-h-16">
                            {slotEvents.map(event => (
                              <div
                                key={event.id}
                                data-testid={`day-event-${event.id}`}
                                className={cn(
                                  "p-3 rounded-lg border-l-4 mb-2 cursor-pointer hover:shadow-lg transition-all",
                                  getEventTypeColorLight(event.type)
                                )}
                                onClick={() => handleEventClick(event)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-sm">{event.title}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {event.time} • {event.duration || 30} minutes
                                    </p>
                                    {event.description && (
                                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
                                        {event.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getPriorityIcon(event.priority)}
                                    <Badge variant="outline" className="text-xs">
                                      {event.type}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Agenda View */}
              {viewMode === 'agenda' && (
                <div className="space-y-3 max-h-[600px] overflow-auto">
                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No events found</p>
                      <Button
                        data-testid="button-create-first-event"
                        variant="outline"
                        className="mt-4"
                        onClick={() => setShowCreateModal(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Event
                      </Button>
                    </div>
                  ) : (
                    filteredEvents.map((event) => {
                      const statusBadge = getEventStatusBadge(event.status);
                      const StatusIcon = statusBadge.icon;

                      return (
                        <Card
                          key={event.id}
                          data-testid={`agenda-event-${event.id}`}
                          className={cn(
                            "border-l-4 hover:shadow-lg transition-all cursor-pointer",
                            getEventTypeColorLight(event.type)
                          )}
                          onClick={() => handleEventClick(event)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-base">{event.title}</h3>
                                  {getPriorityIcon(event.priority)}
                                  <Badge variant="secondary" className="text-xs">
                                    {event.type}
                                  </Badge>
                                  <Badge variant={statusBadge.variant} className="text-xs">
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {event.status}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300 mb-3">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>{format(event.date, 'MMM dd, yyyy')}</span>
                                    {event.time && <span className="font-medium">at {event.time}</span>}
                                  </div>
                                  
                                  {event.duration && (
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4" />
                                      <span>{event.duration} minutes</span>
                                    </div>
                                  )}
                                  
                                  {event.contact && (
                                    <div className="flex items-center gap-2">
                                      <User className="w-4 h-4" />
                                      <span className="truncate">{event.contact.name}</span>
                                    </div>
                                  )}
                                  
                                  {event.contact?.company && (
                                    <div className="flex items-center gap-2">
                                      <Building className="w-4 h-4" />
                                      <span className="truncate">{event.contact.company}</span>
                                    </div>
                                  )}
                                  
                                  {event.location && (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4" />
                                      <span className="truncate">{event.location}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {event.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {event.description}
                                  </p>
                                )}
                                
                                {event.tags && event.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {event.tags.map((tag, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        <Tag className="w-3 h-3 mr-1" />
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              {event.contact && (
                                <div className="flex flex-col gap-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          data-testid={`button-call-${event.id}`}
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.location.href = `tel:${event.contact?.phone}`;
                                          }}
                                        >
                                          <Phone className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Call {event.contact.name}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          data-testid={`button-email-${event.id}`}
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (event.contact?.email) {
                                              window.location.href = `mailto:${event.contact.email}`;
                                            }
                                          }}
                                        >
                                          <Mail className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Email {event.contact.name}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          data-testid={`button-sms-${event.id}`}
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.location.href = `sms:${event.contact?.phone}`;
                                          }}
                                        >
                                          <MessageSquare className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Message {event.contact.name}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Details Modal */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-xl mb-2">{selectedEvent.title}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                      <Badge variant="secondary">{selectedEvent.type}</Badge>
                      <Badge variant={getEventStatusBadge(selectedEvent.status).variant}>
                        {selectedEvent.status}
                      </Badge>
                      <span className="flex items-center gap-1">
                        {getPriorityIcon(selectedEvent.priority)}
                        <span className="capitalize">{selectedEvent.priority} priority</span>
                      </span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                      <p className="font-medium">{format(selectedEvent.date, 'MMMM dd, yyyy')}</p>
                    </div>
                  </div>

                  {selectedEvent.time && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Time</p>
                        <p className="font-medium">{selectedEvent.time}</p>
                      </div>
                    </div>
                  )}

                  {selectedEvent.duration && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                        <p className="font-medium">{selectedEvent.duration} minutes</p>
                      </div>
                    </div>
                  )}

                  {selectedEvent.location && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <MapPin className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                        <p className="font-medium">{selectedEvent.location}</p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedEvent.description && (
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                {selectedEvent.contact && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Contact Information</Label>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{selectedEvent.contact.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{selectedEvent.contact.name}</p>
                          {selectedEvent.contact.company && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{selectedEvent.contact.company}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          data-testid="button-modal-call"
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = `tel:${selectedEvent.contact?.phone}`}
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          {selectedEvent.contact.phone}
                        </Button>

                        {selectedEvent.contact.email && (
                          <Button
                            data-testid="button-modal-email"
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.href = `mailto:${selectedEvent.contact?.email || ''}`}
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            Email
                          </Button>
                        )}
                      </div>

                      {selectedEvent.contact.notes && (
                        <div className="mt-3">
                          <ContactNotes 
                            contact={{
                              ...selectedEvent.contact,
                              updatedAt: selectedEvent.contact.updatedAt ? 
                                (typeof selectedEvent.contact.updatedAt === 'string' ? 
                                  selectedEvent.contact.updatedAt : 
                                  selectedEvent.contact.updatedAt.toISOString()) : 
                                new Date().toISOString()
                            }} 
                            variant="compact" 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                {selectedEvent.status === 'scheduled' && (
                  <>
                    <Button
                      data-testid="button-mark-completed"
                      variant="default"
                      onClick={() => handleEventStatusUpdate(selectedEvent.id, 'completed')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Completed
                    </Button>
                    <Button
                      data-testid="button-mark-missed"
                      variant="destructive"
                      onClick={() => handleEventStatusUpdate(selectedEvent.id, 'missed')}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Mark Missed
                    </Button>
                  </>
                )}
                <Button data-testid="button-close-modal" variant="outline" onClick={() => setShowEventModal(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Event Modal (Placeholder) */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Event creation functionality coming soon
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button data-testid="button-close-create" variant="outline" onClick={() => setShowCreateModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
