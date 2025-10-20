import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  User, Shield, Clock, Activity, CreditCard, Settings, 
  Download, Trash2, Eye, EyeOff, Lock, Unlock, Mail,
  Phone, MapPin, Calendar, TrendingUp, AlertTriangle 
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType, LoginHistory, UserActivity, Invoice } from "@shared/schema";

interface UserProfileProps {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfile({ user, isOpen, onClose }: UserProfileProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch user login history
  const { data: loginHistory = [] } = useQuery<LoginHistory[]>({
    queryKey: ["/api/users", user?.id, "login-history"],
    enabled: !!user?.id && isOpen,
  });

  // Fetch user activity
  const { data: userActivity = [] } = useQuery<UserActivity[]>({
    queryKey: ["/api/users", user?.id, "activity"],
    enabled: !!user?.id && isOpen,
  });

  // Fetch user invoices
  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/users", user?.id, "invoices"],
    enabled: !!user?.id && isOpen,
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (updates: Partial<UserType>) => {
      await apiRequest("PUT", `/api/users/${user?.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User updated",
        description: "User has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const handleStatusToggle = (newStatus: string) => {
    if (user) {
      updateUserMutation.mutate({ status: newStatus });
    }
  };

  const handle2FAToggle = (enabled: boolean) => {
    if (user) {
      updateUserMutation.mutate({ twoFactorEnabled: enabled });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'suspended': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getSubscriptionColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'trialing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'overdue': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user.username}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
            </div>
            <div className="ml-auto flex gap-2">
              <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
              <Badge className={getSubscriptionColor(user.subscriptionStatus || 'active')}>
                {user.subscriptionPlan || 'Free'}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <div className="mt-4 h-[60vh] overflow-hidden">
            <TabsContent value="overview" className="h-full">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* User Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        User Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Username</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{user.username}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Email</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Phone</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{user.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Role</Label>
                          <Badge variant="outline">{user.role}</Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Account Type</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{user.accountType || 'Standard'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Created</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {format(new Date(user.createdAt!), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      
                      {user.tags && user.tags.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium">Tags</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {user.internalNotes && (
                        <div>
                          <Label className="text-sm font-medium">Internal Notes</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            {user.internalNotes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Account Status & Controls */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Account Controls
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Account Status</Label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Control user access
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={user.status === 'active' ? 'default' : 'outline'}
                            onClick={() => handleStatusToggle('active')}
                            disabled={updateUserMutation.isPending}
                          >
                            <Unlock className="w-3 h-3 mr-1" />
                            Active
                          </Button>
                          <Button
                            size="sm"
                            variant={user.status === 'suspended' ? 'destructive' : 'outline'}
                            onClick={() => handleStatusToggle('suspended')}
                            disabled={updateUserMutation.isPending}
                          >
                            <Lock className="w-3 h-3 mr-1" />
                            Suspend
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Enhance account security
                          </p>
                        </div>
                        <Switch
                          checked={user.twoFactorEnabled || false}
                          onCheckedChange={handle2FAToggle}
                          disabled={updateUserMutation.isPending}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Email Verified</Label>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Email verification status
                          </p>
                        </div>
                        <Badge variant={user.emailVerified ? 'default' : 'destructive'}>
                          {user.emailVerified ? 'Verified' : 'Unverified'}
                        </Badge>
                      </div>

                      <div className="pt-4 space-y-2">
                        <Button variant="outline" size="sm" className="w-full">
                          <Mail className="w-3 h-3 mr-2" />
                          Send Password Reset
                        </Button>
                        <Button variant="outline" size="sm" className="w-full">
                          <Download className="w-3 h-3 mr-2" />
                          Export User Data
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="activity" className="h-full">
              <ScrollArea className="h-full">
                <div className="space-y-6">
                  {/* Login History */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Recent Login History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Device</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loginHistory.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                No login history available
                              </TableCell>
                            </TableRow>
                          ) : (
                            loginHistory.slice(0, 10).map((login) => (
                              <TableRow key={login.id}>
                                <TableCell>
                                  {format(new Date(login.timestamp!), 'MMM dd, yyyy HH:mm')}
                                </TableCell>
                                <TableCell className="font-mono text-sm">{login.ipAddress}</TableCell>
                                <TableCell>{login.location || 'Unknown'}</TableCell>
                                <TableCell>{login.device || 'Unknown'}</TableCell>
                                <TableCell>
                                  <Badge variant={login.success ? 'default' : 'destructive'}>
                                    {login.success ? 'Success' : 'Failed'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* User Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Resource</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userActivity.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                No activity history available
                              </TableCell>
                            </TableRow>
                          ) : (
                            userActivity.slice(0, 15).map((activity) => (
                              <TableRow key={activity.id}>
                                <TableCell>
                                  {format(new Date(activity.timestamp!), 'MMM dd, yyyy HH:mm')}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{activity.action}</Badge>
                                </TableCell>
                                <TableCell>{activity.resource || '-'}</TableCell>
                                <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                                  {activity.metadata ? JSON.stringify(activity.metadata) : '-'}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="billing" className="h-full">
              <ScrollArea className="h-full">
                <div className="space-y-6">
                  {/* Subscription Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Subscription Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Current Plan</Label>
                          <p className="text-lg font-semibold">{user.subscriptionPlan || 'Free'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Status</Label>
                          <Badge className={getSubscriptionColor(user.subscriptionStatus || 'active')}>
                            {user.subscriptionStatus || 'Active'}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Next Billing</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {user.nextBillingDate 
                              ? format(new Date(user.nextBillingDate), 'MMM dd, yyyy')
                              : 'N/A'
                            }
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Last Payment</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {user.lastPaymentDate 
                              ? format(new Date(user.lastPaymentDate), 'MMM dd, yyyy')
                              : 'N/A'
                            }
                          </p>
                        </div>
                      </div>

                      {user.trialExpiresAt && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium">Trial expires on {format(new Date(user.trialExpiresAt), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Upgrade Plan
                        </Button>
                        <Button variant="outline" size="sm">
                          Change Billing
                        </Button>
                        <Button variant="outline" size="sm">
                          Add Credits
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Invoice History */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Invoice History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                No invoices found
                              </TableCell>
                            </TableRow>
                          ) : (
                            invoices.map((invoice) => (
                              <TableRow key={invoice.id}>
                                <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
                                <TableCell>
                                  {format(new Date(invoice.createdAt!), 'MMM dd, yyyy')}
                                </TableCell>
                                <TableCell>${(invoice.amount / 100).toFixed(2)}</TableCell>
                                <TableCell>
                                  <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                                    {invoice.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {invoice.billingPeriodStart && invoice.billingPeriodEnd ? (
                                    `${format(new Date(invoice.billingPeriodStart), 'MMM dd')} - ${format(new Date(invoice.billingPeriodEnd), 'MMM dd')}`
                                  ) : (
                                    'N/A'
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm">
                                    <Download className="w-3 h-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="security" className="h-full">
              <ScrollArea className="h-full">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Security Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm font-medium">Login Attempts</Label>
                          <p className="text-2xl font-bold">{user.loginAttempts || 0}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Failed attempts</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Account Locked</Label>
                          <p className="text-2xl font-bold">
                            {user.lockedUntil ? 'Yes' : 'No'}
                          </p>
                          {user.lockedUntil && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Until {format(new Date(user.lockedUntil), 'MMM dd, yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Extra security for account access
                            </p>
                          </div>
                          <Badge variant={user.twoFactorEnabled ? 'default' : 'secondary'}>
                            {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">Email Verification</Label>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Email address verification status
                            </p>
                          </div>
                          <Badge variant={user.emailVerified ? 'default' : 'destructive'}>
                            {user.emailVerified ? 'Verified' : 'Unverified'}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">GDPR Consent</Label>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Data processing consent
                            </p>
                          </div>
                          <Badge variant={user.gdprConsent ? 'default' : 'secondary'}>
                            {user.gdprConsent ? 'Given' : 'Not Given'}
                          </Badge>
                        </div>
                      </div>

                      <div className="pt-4 space-y-2">
                        <Button variant="outline" size="sm" className="w-full">
                          Reset Password
                        </Button>
                        <Button variant="outline" size="sm" className="w-full">
                          Force Logout All Sessions
                        </Button>
                        <Button variant="destructive" size="sm" className="w-full">
                          <Trash2 className="w-3 h-3 mr-2" />
                          Delete Account
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="usage" className="h-full">
              <ScrollArea className="h-full">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Usage Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-blue-600">
                          {(user.usageStats as any)?.callsThisMonth || 0}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Calls This Month</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">
                          {(user.usageStats as any)?.smsThisMonth || 0}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">SMS This Month</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-purple-600">
                          {(user.usageStats as any)?.storageUsed || 0} GB
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Storage Used</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="admin" className="h-full">
              <ScrollArea className="h-full">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Administrative Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Account Manager</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user.accountManager || 'Not assigned'}
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Internal Notes</Label>
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {user.internalNotes || 'No notes available'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 space-y-2">
                      <Button variant="outline" size="sm" className="w-full">
                        <Mail className="w-3 h-3 mr-2" />
                        Send Email
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        Edit User Details
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        Assign Account Manager
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        Add Internal Note
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}