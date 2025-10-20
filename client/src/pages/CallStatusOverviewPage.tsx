import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Phone, PhoneCall, PhoneIncoming, PhoneOff, PhoneMissed, 
  Clock, CheckCircle, XCircle, AlertCircle, Voicemail as VoicemailIcon,
  Activity, TrendingUp, Users, PhoneForwarded
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Call } from "@shared/schema";

interface CallStatusGroups {
  queued: Call[];
  initiated: Call[];
  ringing: Call[];
  inProgress: Call[];
  completed: Call[];
  busy: Call[];
  failed: Call[];
  noAnswer: Call[];
  voicemail: Call[];
  dropped: Call[];
  canceled: Call[];
}

interface CallSummary {
  totalCalls: number;
  active: number;
  connected: number;
  completed: number;
  failed: number;
  voicemail: number;
  dropped: number;
}

interface CallStatusData {
  grouped: CallStatusGroups;
  summary: CallSummary;
}

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const areaCode = cleaned.substring(1, 4);
    const prefix = cleaned.substring(4, 7);
    const lineNumber = cleaned.substring(7);
    return `+1 (${areaCode}) ${prefix}-${lineNumber}`;
  }
  return phone;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'queued':
    case 'initiated':
      return <Clock className="w-4 h-4" />;
    case 'ringing':
      return <PhoneIncoming className="w-4 h-4 animate-pulse" />;
    case 'in-progress':
      return <PhoneCall className="w-4 h-4 text-green-500" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'busy':
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'no-answer':
      return <PhoneMissed className="w-4 h-4 text-orange-500" />;
    case 'voicemail':
      return <VoicemailIcon className="w-4 h-4 text-blue-500" />;
    case 'call-dropped':
      return <PhoneOff className="w-4 h-4 text-red-500" />;
    default:
      return <Phone className="w-4 h-4" />;
  }
};

const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'completed':
      return 'default';
    case 'in-progress':
    case 'ringing':
      return 'secondary';
    case 'failed':
    case 'busy':
    case 'call-dropped':
      return 'destructive';
    default:
      return 'outline';
  }
};

function CallCard({ call }: { call: Call & { agentName?: string | null; contactName?: string | null } }) {
  const [liveTimer, setLiveTimer] = useState(call.duration || 0);

  useEffect(() => {
    if (call.status === 'in-progress' || call.status === 'ringing') {
      const interval = setInterval(() => {
        setLiveTimer(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [call.status]);

  return (
    <div 
      className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
      data-testid={`call-card-${call.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {getStatusIcon(call.status)}
            <span className="font-medium text-sm truncate">
              {call.contactName || formatPhoneNumber(call.phone)}
            </span>
            <Badge variant={getStatusBadgeVariant(call.status)} className="text-xs">
              {call.status}
            </Badge>
          </div>
          
          <div className="space-y-1 text-xs">
            {call.agentName && (
              <div className="text-muted-foreground">
                <span className="font-semibold">Agent:</span> {call.agentName}
              </div>
            )}
            <div className="text-muted-foreground">
              <span className="font-semibold">Lead Number:</span> {formatPhoneNumber(call.phone)}
            </div>
            {call.sipCallId && (
              <div className="text-muted-foreground break-all">
                <span className="font-semibold">Twilio Call SID:</span> {call.sipCallId}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <div>
                <span className="font-semibold">Duration:</span>{' '}
                {call.status === 'in-progress' || call.status === 'ringing' 
                  ? formatDuration(liveTimer)
                  : formatDuration(call.duration)}
              </div>
              {call.type && (
                <div>
                  <span className="font-semibold">Type:</span> {call.type}
                </div>
              )}
              {call.cost && (
                <div>
                  <span className="font-semibold">Cost:</span> ${Number(call.cost).toFixed(4)}
                </div>
              )}
              {call.outcome && (
                <div>
                  <span className="font-semibold">Outcome:</span> {call.outcome}
                </div>
              )}
            </div>
            {call.hangupReason && (
              <div className="text-red-500">
                <span className="font-semibold">Hangup Reason:</span> {call.hangupReason}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusSection({ 
  title, 
  calls, 
  icon: Icon, 
  badge 
}: { 
  title: string; 
  calls: (Call & { agentName?: string | null; contactName?: string | null })[]; 
  icon: any; 
  badge?: string;
}) {
  if (calls.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {title}
          </div>
          <Badge variant="secondary" data-testid={`badge-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {calls.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {calls.map(call => (
              <CallCard key={call.id} call={call} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default function CallStatusOverviewPage() {
  const { data, isLoading, refetch } = useQuery<CallStatusData>({
    queryKey: ['/api/calls/by-status'],
    refetchInterval: 3000
  });

  useEffect(() => {
    const handleCallUpdate = () => {
      refetch();
    };

    window.addEventListener('call_update', handleCallUpdate);
    window.addEventListener('new_call', handleCallUpdate);
    window.addEventListener('parallel_call_status', handleCallUpdate);
    window.addEventListener('parallel_call_connected', handleCallUpdate);
    window.addEventListener('parallel_call_ended', handleCallUpdate);

    return () => {
      window.removeEventListener('call_update', handleCallUpdate);
      window.removeEventListener('new_call', handleCallUpdate);
      window.removeEventListener('parallel_call_status', handleCallUpdate);
      window.removeEventListener('parallel_call_connected', handleCallUpdate);
      window.removeEventListener('parallel_call_ended', handleCallUpdate);
    };
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading call status...</p>
        </div>
      </div>
    );
  }

  const { grouped = {} as CallStatusGroups, summary = {} as CallSummary } = data || {};

  const activeCalls = [
    ...(grouped.queued || []),
    ...(grouped.initiated || []),
    ...(grouped.ringing || []),
    ...(grouped.inProgress || [])
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Real-time monitoring of all parallel dialer calls
        </p>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Activity className="w-4 h-4 mr-2" />
          Live Updates
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="stat-total-calls">
              {summary.totalCalls || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500" data-testid="stat-active-calls">
              {summary.active || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.connected || 0} connected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500" data-testid="stat-completed-calls">
              {summary.completed || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed / Voicemail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500" data-testid="stat-failed-calls">
              {summary.failed || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.voicemail || 0} voicemail, {summary.dropped || 0} dropped
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({activeCalls.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed ({(grouped.completed || []).length})
          </TabsTrigger>
          <TabsTrigger value="failed" data-testid="tab-failed">
            Failed ({(grouped.failed || []).length + (grouped.busy || []).length + (grouped.noAnswer || []).length})
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">
            All Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeCalls.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <PhoneOff className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No active calls at the moment</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StatusSection 
                title="Queued" 
                calls={grouped.queued || []} 
                icon={Clock}
              />
              <StatusSection 
                title="Initiated" 
                calls={grouped.initiated || []} 
                icon={PhoneForwarded}
              />
              <StatusSection 
                title="Ringing" 
                calls={grouped.ringing || []} 
                icon={PhoneIncoming}
              />
              <StatusSection 
                title="In Progress" 
                calls={grouped.inProgress || []} 
                icon={PhoneCall}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <StatusSection 
            title="Completed Calls" 
            calls={grouped.completed || []} 
            icon={CheckCircle}
          />
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StatusSection 
              title="Failed" 
              calls={grouped.failed || []} 
              icon={XCircle}
            />
            <StatusSection 
              title="Busy" 
              calls={grouped.busy || []} 
              icon={PhoneMissed}
            />
            <StatusSection 
              title="No Answer" 
              calls={grouped.noAnswer || []} 
              icon={PhoneMissed}
            />
            <StatusSection 
              title="Voicemail" 
              calls={grouped.voicemail || []} 
              icon={VoicemailIcon}
            />
            <StatusSection 
              title="Dropped" 
              calls={grouped.dropped || []} 
              icon={PhoneOff}
            />
          </div>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StatusSection 
              title="Queued" 
              calls={grouped.queued || []} 
              icon={Clock}
            />
            <StatusSection 
              title="Initiated" 
              calls={grouped.initiated || []} 
              icon={PhoneForwarded}
            />
            <StatusSection 
              title="Ringing" 
              calls={grouped.ringing || []} 
              icon={PhoneIncoming}
            />
            <StatusSection 
              title="In Progress" 
              calls={grouped.inProgress || []} 
              icon={PhoneCall}
            />
            <StatusSection 
              title="Completed" 
              calls={grouped.completed || []} 
              icon={CheckCircle}
            />
            <StatusSection 
              title="Failed" 
              calls={grouped.failed || []} 
              icon={XCircle}
            />
            <StatusSection 
              title="Busy" 
              calls={grouped.busy || []} 
              icon={PhoneMissed}
            />
            <StatusSection 
              title="No Answer" 
              calls={grouped.noAnswer || []} 
              icon={PhoneMissed}
            />
            <StatusSection 
              title="Voicemail" 
              calls={grouped.voicemail || []} 
              icon={VoicemailIcon}
            />
            <StatusSection 
              title="Dropped" 
              calls={grouped.dropped || []} 
              icon={PhoneOff}
            />
            <StatusSection 
              title="Canceled" 
              calls={grouped.canceled || []} 
              icon={PhoneOff}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
