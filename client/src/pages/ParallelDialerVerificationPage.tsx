import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Database,
  Zap,
  Shield,
  TrendingUp,
  Clock,
  BarChart3,
  RefreshCw,
  Trash2,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

export default function ParallelDialerVerificationPage() {
  const { toast } = useToast();
  const [selectedDateRange, setSelectedDateRange] = useState<'today' | '7days' | '30days' | 'all'>('7days');

  const getDateRange = () => {
    const now = new Date();
    const endDate = now.toISOString();
    let startDate: string | undefined;

    switch (selectedDateRange) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        break;
      case '7days':
        startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
        break;
      case '30days':
        startDate = new Date(now.setDate(now.getDate() - 30)).toISOString();
        break;
      case 'all':
      default:
        startDate = undefined;
    }

    return { startDate, endDate };
  };

  const { data: analyticsReport, isLoading: reportLoading, refetch: refetchReport } = useQuery({
    queryKey: ['/api/parallel-dialer/analytics/report', selectedDateRange],
    queryFn: async () => {
      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/parallel-dialer/analytics/report?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    }
  });

  const { data: resourceLeaks } = useQuery({
    queryKey: ['/api/parallel-dialer/verify/resource-leaks'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/parallel-dialer/cleanup/stale-calls');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cleanup Complete",
        description: `Cleaned up ${data.cleaned} stale call(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/parallel-dialer/verify/resource-leaks'] });
    },
    onError: (error: any) => {
      toast({
        title: "Cleanup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'Excellent': return 'text-green-600 dark:text-green-400';
      case 'Good': return 'text-blue-600 dark:text-blue-400';
      case 'Fair': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-red-600 dark:text-red-400';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'Excellent': return <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />;
      case 'Good': return <CheckCircle2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
      case 'Fair': return <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />;
      default: return <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />;
    }
  };

  if (reportLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <p className="text-gray-600 dark:text-gray-400">Loading verification report...</p>
        </div>
      </div>
    );
  }

  const summary = analyticsReport?.summary;
  const dataIntegrity = analyticsReport?.dataIntegrity;
  const amdPerformance = analyticsReport?.amdPerformance;
  const dispositionAccuracy = analyticsReport?.dispositionAccuracy;
  const singleCallEnforcement = analyticsReport?.singleCallEnforcement;
  const recommendations = analyticsReport?.recommendations || [];

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="verification-dashboard">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Parallel Dialer Verification
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive operational monitoring and data integrity validation
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            data-testid="select-date-range"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          <Button onClick={() => refetchReport()} variant="outline" data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Health Status */}
      <Card className="border-2" data-testid="card-overall-health">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getHealthIcon(summary?.overallHealth)}
              <div>
                <CardTitle className="text-2xl">System Health: {summary?.overallHealth}</CardTitle>
                <CardDescription>
                  {summary?.totalCalls} calls analyzed from {summary?.dateRange?.start} to now
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Alert data-testid="alert-recommendations">
          <Info className="w-4 h-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Recommendations:</div>
            <ul className="list-disc list-inside space-y-1">
              {recommendations.map((rec: string, idx: number) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Data Integrity */}
        <Card data-testid="card-data-integrity">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Data Integrity</CardTitle>
              <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataIntegrity?.details?.integrityRate || '0%'}</div>
            <Progress 
              value={parseFloat(dataIntegrity?.details?.integrityRate || '0')} 
              className="mt-2 h-2"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {dataIntegrity?.details?.validCalls || 0} of {dataIntegrity?.details?.totalCalls || 0} calls valid
            </p>
          </CardContent>
        </Card>

        {/* AMD Performance */}
        <Card data-testid="card-amd-performance">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">AMD Accuracy</CardTitle>
              <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {amdPerformance?.detectionAccuracy?.toFixed(1) || 0}%
            </div>
            <Progress 
              value={amdPerformance?.detectionAccuracy || 0} 
              className="mt-2 h-2"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Avg detection: {amdPerformance?.avgDetectionTime?.toFixed(1) || 0}s
            </p>
          </CardContent>
        </Card>

        {/* Disposition Accuracy */}
        <Card data-testid="card-disposition-accuracy">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Disposition Accuracy</CardTitle>
              <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dispositionAccuracy?.accuracyRate?.toFixed(1) || 0}%
            </div>
            <Progress 
              value={dispositionAccuracy?.accuracyRate || 0} 
              className="mt-2 h-2"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {dispositionAccuracy?.missingDispositions || 0} missing, {dispositionAccuracy?.inconsistentDispositions || 0} inconsistent
            </p>
          </CardContent>
        </Card>

        {/* Single Call Enforcement */}
        <Card data-testid="card-enforcement">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Call Enforcement</CardTitle>
              <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {singleCallEnforcement?.enforcementSuccess ? 'Active' : 'Issues'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Avg drop latency: {singleCallEnforcement?.avgDropLatency?.toFixed(0) || 0}ms
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {singleCallEnforcement?.secondaryCallsDropped || 0} of {singleCallEnforcement?.secondaryCallsCount || 0} dropped
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="amd" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="amd" data-testid="tab-amd">AMD Analysis</TabsTrigger>
          <TabsTrigger value="dispositions" data-testid="tab-dispositions">Dispositions</TabsTrigger>
          <TabsTrigger value="resources" data-testid="tab-resources">Resource Leaks</TabsTrigger>
          <TabsTrigger value="issues" data-testid="tab-issues">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="amd" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AMD Performance Breakdown</CardTitle>
              <CardDescription>Answering Machine Detection analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {amdPerformance?.humanDetections || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Human Detected</div>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {amdPerformance?.machineDetections || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Machine Detected</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                    {amdPerformance?.unknownResults || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Unknown</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispositions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Disposition Distribution</CardTitle>
              <CardDescription>Call outcome categorization</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {Object.entries(dispositionAccuracy?.dispositionBreakdown || {}).map(([disposition, count]) => (
                    <div key={disposition} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{disposition}</Badge>
                      </div>
                      <div className="text-lg font-semibold">{count as number}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Resource Leak Detection</CardTitle>
                  <CardDescription>Stuck calls and ghost connections</CardDescription>
                </div>
                <Button 
                  onClick={() => cleanupMutation.mutate()} 
                  disabled={!(resourceLeaks as any)?.cleanupRequired || cleanupMutation.isPending}
                  variant="destructive"
                  size="sm"
                  data-testid="button-cleanup"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cleanup
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Calls</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Currently in progress</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {(resourceLeaks as any)?.activeCallsCount || 0}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Stuck Calls</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Active for &gt; 30 minutes</div>
                  </div>
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {(resourceLeaks as any)?.stuckCalls?.length || 0}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Ghost Calls</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Marked active but completed</div>
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {(resourceLeaks as any)?.ghostCalls?.length || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Identified Issues</CardTitle>
              <CardDescription>Problems requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {dataIntegrity?.issues?.length === 0 && singleCallEnforcement?.issues?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-600 dark:text-green-400" />
                    <p>No issues detected</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dataIntegrity?.issues?.map((issue: string, idx: number) => (
                      <Alert key={`di-${idx}`} variant="destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>{issue}</AlertDescription>
                      </Alert>
                    ))}
                    {singleCallEnforcement?.issues?.map((issue: string, idx: number) => (
                      <Alert key={`sce-${idx}`} variant="destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>{issue}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
