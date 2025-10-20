import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Users, UserCheck, UserX, Shield, CreditCard, 
  Mail, Tag, Settings, ChevronDown, AlertTriangle 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, Role, SubscriptionPlan } from "@shared/schema";

interface BulkActionsProps {
  selectedUsers: User[];
  onClearSelection: () => void;
}

export default function BulkActions({ selectedUsers, onClearSelection }: BulkActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<string>("");
  const [actionValue, setActionValue] = useState<string>("");

  // Fetch roles and subscription plans for bulk actions
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const { data: subscriptionPlans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { userIds: number[]; updates: any }) => {
      const response = await apiRequest("POST", "/api/users/bulk-update", data);
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onClearSelection();
      setIsDialogOpen(false);
      toast({
        title: "Bulk action completed",
        description: data.message || `${selectedUsers.length} users updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update users",
        variant: "destructive",
      });
    },
  });

  const handleBulkAction = () => {
    if (!actionType || !actionValue) {
      toast({
        title: "Error",
        description: "Please select an action and value",
        variant: "destructive",
      });
      return;
    }

    const userIds = selectedUsers.map(user => user.id);
    let updates: any = {};

    switch (actionType) {
      case 'status':
        updates.status = actionValue;
        break;
      case 'role':
        updates.role = actionValue;
        break;
      case 'subscription':
        updates.subscriptionPlan = actionValue;
        break;
      case 'subscriptionStatus':
        updates.subscriptionStatus = actionValue;
        break;
      case 'accountType':
        updates.accountType = actionValue;
        break;
      case 'twoFactorEnabled':
        updates.twoFactorEnabled = actionValue === 'true';
        break;
      case 'emailVerified':
        updates.emailVerified = actionValue === 'true';
        break;
      default:
        toast({
          title: "Error",
          description: "Invalid action type",
          variant: "destructive",
        });
        return;
    }

    bulkUpdateMutation.mutate({ userIds, updates });
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'status': return 'Account Status';
      case 'role': return 'User Role';
      case 'subscription': return 'Subscription Plan';
      case 'subscriptionStatus': return 'Subscription Status';
      case 'accountType': return 'Account Type';
      case 'twoFactorEnabled': return 'Two-Factor Authentication';
      case 'emailVerified': return 'Email Verification';
      default: return type;
    }
  };

  const renderValueOptions = () => {
    switch (actionType) {
      case 'status':
        return (
          <>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </>
        );
      case 'role':
        return roles.map(role => (
          <SelectItem key={role.id} value={role.name.toLowerCase().replace(/\s+/g, '_')}>
            {role.name}
          </SelectItem>
        ));
      case 'subscription':
        return subscriptionPlans.map(plan => (
          <SelectItem key={plan.id} value={plan.name.toLowerCase()}>
            {plan.name}
          </SelectItem>
        ));
      case 'subscriptionStatus':
        return (
          <>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trialing">Trialing</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </>
        );
      case 'accountType':
        return (
          <>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </>
        );
      case 'twoFactorEnabled':
      case 'emailVerified':
        return (
          <>
            <SelectItem value="true">Enable</SelectItem>
            <SelectItem value="false">Disable</SelectItem>
          </>
        );
      default:
        return null;
    }
  };

  if (selectedUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div className="flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium">
          {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Quick Actions */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <UserCheck className="w-3 h-3 mr-2" />
              Activate
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setActionType('status');
                  setActionValue('active');
                  handleBulkAction();
                }}
                disabled={bulkUpdateMutation.isPending}
              >
                <UserCheck className="w-3 h-3 mr-2" />
                Activate Users
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setActionType('status');
                  setActionValue('suspended');
                  handleBulkAction();
                }}
                disabled={bulkUpdateMutation.isPending}
              >
                <UserX className="w-3 h-3 mr-2" />
                Suspend Users
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setActionType('emailVerified');
                  setActionValue('true');
                  handleBulkAction();
                }}
                disabled={bulkUpdateMutation.isPending}
              >
                <Mail className="w-3 h-3 mr-2" />
                Mark Email Verified
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Roles */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Shield className="w-3 h-3 mr-2" />
              Assign Role
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="space-y-2">
              {roles.slice(0, 5).map(role => (
                <Button
                  key={role.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setActionType('role');
                    setActionValue(role.name.toLowerCase().replace(/\s+/g, '_'));
                    handleBulkAction();
                  }}
                  disabled={bulkUpdateMutation.isPending}
                >
                  <Shield className="w-3 h-3 mr-2" />
                  {role.name}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Plans */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CreditCard className="w-3 h-3 mr-2" />
              Assign Plan
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="space-y-2">
              {subscriptionPlans.map(plan => (
                <Button
                  key={plan.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setActionType('subscription');
                    setActionValue(plan.name.toLowerCase());
                    handleBulkAction();
                  }}
                  disabled={bulkUpdateMutation.isPending}
                >
                  <CreditCard className="w-3 h-3 mr-2" />
                  {plan.name}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Advanced Actions */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="w-3 h-3 mr-2" />
              More Actions
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Bulk Actions
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium">Selected Users</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} will be updated
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedUsers.slice(0, 5).map(user => (
                    <Badge key={user.id} variant="outline" className="text-xs">
                      {user.username}
                    </Badge>
                  ))}
                  {selectedUsers.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{selectedUsers.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Action Type</Label>
                  <Select value={actionType} onValueChange={setActionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="status">Account Status</SelectItem>
                      <SelectItem value="role">User Role</SelectItem>
                      <SelectItem value="subscription">Subscription Plan</SelectItem>
                      <SelectItem value="subscriptionStatus">Subscription Status</SelectItem>
                      <SelectItem value="accountType">Account Type</SelectItem>
                      <SelectItem value="twoFactorEnabled">Two-Factor Authentication</SelectItem>
                      <SelectItem value="emailVerified">Email Verification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {actionType && (
                  <div>
                    <Label className="text-sm font-medium">Value</Label>
                    <Select value={actionValue} onValueChange={setActionValue}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${getActionLabel(actionType).toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {renderValueOptions()}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {actionType && actionValue && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Confirm Action
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        This will update {getActionLabel(actionType).toLowerCase()} to "{actionValue}" for {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setActionType("");
                    setActionValue("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkAction}
                  disabled={!actionType || !actionValue || bulkUpdateMutation.isPending}
                >
                  {bulkUpdateMutation.isPending ? "Updating..." : "Apply Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Clear Selection
        </Button>
      </div>
    </div>
  );
}