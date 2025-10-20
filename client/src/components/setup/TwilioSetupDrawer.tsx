import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, Phone, Key, Hash } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  apiKeySid: string;
  apiKeySecret: string;
}

interface TwilioStatus {
  isConfigured: boolean;
  hasCredentials: boolean;
  phoneNumber: string | null;
  connection: any;
  registeredDevices: number;
  lastHealthCheck: string;
}

interface TwilioSetupDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TwilioSetupDrawer({ open, onOpenChange }: TwilioSetupDrawerProps) {
  const [isConfigured, setIsConfigured] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isValid } } = useForm<TwilioCredentials>({
    mode: 'onChange',
    defaultValues: {
      accountSid: '',
      authToken: '',
      phoneNumber: '',
      apiKeySid: '',
      apiKeySecret: '',
    }
  });

  const formValues = watch();

  // Check if all fields are filled
  const allFieldsFilled = Object.values(formValues).every(value => value.trim() !== '');

  // Load existing Twilio settings (per-user)
  const { data: twilioSettings, isLoading } = useQuery<any>({
    queryKey: ["/api/user/twilio/credentials"],
    retry: false,
  });

  // Update form when data loads (credentials are masked for security)
  useEffect(() => {
    if (twilioSettings?.configured && twilioSettings?.credentials) {
      // We can't pre-fill masked credentials, so just mark as configured
      setIsConfigured(twilioSettings.configured);
    }
  }, [twilioSettings]);

  // Check Twilio status (user-specific)
  const { data: twilioStatus } = useQuery<TwilioStatus>({
    queryKey: ["/api/user/twilio/status"],
    refetchInterval: isConfigured ? false : 5000, // Stop polling when configured
    retry: false,
  });

  // Reset states when drawer closes
  useEffect(() => {
    if (!open) {
      setShowSuccess(false);
      reset();
    }
  }, [open, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: TwilioCredentials) => {
      // Save user-specific Twilio credentials (encrypted on server)
      return apiRequest("POST", "/api/user/twilio/credentials", {
        accountSid: data.accountSid,
        authToken: data.authToken,
        phoneNumber: data.phoneNumber,
        apiKeySid: data.apiKeySid,
        apiKeySecret: data.apiKeySecret,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/twilio/credentials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/twilio/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/twilio/status"] });
      
      setShowSuccess(true);
      setIsConfigured(true);
      
      setTimeout(() => {
        onOpenChange(false);
        toast({
          title: "Configuration Complete",
          description: "Your Twilio credentials have been securely saved and verified.",
        });
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save Twilio credentials",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: TwilioCredentials) => {
    saveMutation.mutate(data);
  };

  const getFieldStatus = (fieldName: keyof TwilioCredentials) => {
    const value = formValues[fieldName];
    if (!value || value.trim() === '') return 'empty';
    return 'filled';
  };

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[500px] sm:w-[600px]">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:w-[600px]">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Twilio Setup
          </SheetTitle>
          <SheetDescription>
            Enter your Twilio credentials to enable calling and SMS functionality.
            The drawer will close automatically when all credentials are configured.
          </SheetDescription>
        </SheetHeader>

        {showSuccess && (
          <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3 text-green-800">
              <div className="relative">
                <Check className="w-6 h-6 animate-in zoom-in duration-300" strokeWidth={3} />
                <div className="absolute inset-0 w-6 h-6 bg-green-400 rounded-full animate-ping opacity-30" />
              </div>
              <div>
                <p className="font-semibold text-base">Credentials Saved Successfully!</p>
                <p className="text-sm text-green-700">Closing automatically...</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={cn(
          "space-y-4 transition-opacity duration-300",
          showSuccess && "opacity-50 pointer-events-none"
        )}>
          {/* Account SID */}
          <div className="space-y-2">
            <Label htmlFor="accountSid" className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Account SID
              <Badge variant={getFieldStatus('accountSid') === 'filled' ? 'default' : 'secondary'} className="ml-auto">
                {getFieldStatus('accountSid') === 'filled' ? 'Filled' : 'Required'}
              </Badge>
            </Label>
            <Input
              id="accountSid"
              {...register("accountSid", { 
                required: "Account SID is required",
                pattern: {
                  value: /^AC[a-f0-9]{32}$/i,
                  message: "Invalid Account SID format"
                }
              })}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className={cn(
                errors.accountSid && "border-red-300",
                getFieldStatus('accountSid') === 'filled' && "border-green-300"
              )}
            />
            {errors.accountSid && (
              <p className="text-sm text-red-600">{errors.accountSid.message}</p>
            )}
          </div>

          {/* Auth Token */}
          <div className="space-y-2">
            <Label htmlFor="authToken" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Auth Token
              <Badge variant={getFieldStatus('authToken') === 'filled' ? 'default' : 'secondary'} className="ml-auto">
                {getFieldStatus('authToken') === 'filled' ? 'Filled' : 'Required'}
              </Badge>
            </Label>
            <Input
              id="authToken"
              type="password"
              {...register("authToken", { 
                required: "Auth Token is required",
                minLength: {
                  value: 32,
                  message: "Auth Token must be at least 32 characters"
                }
              })}
              placeholder="Your Twilio Auth Token"
              className={cn(
                errors.authToken && "border-red-300",
                getFieldStatus('authToken') === 'filled' && "border-green-300"
              )}
            />
            {errors.authToken && (
              <p className="text-sm text-red-600">{errors.authToken.message}</p>
            )}
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Twilio Phone Number
              <Badge variant={getFieldStatus('phoneNumber') === 'filled' ? 'default' : 'secondary'} className="ml-auto">
                {getFieldStatus('phoneNumber') === 'filled' ? 'Filled' : 'Required'}
              </Badge>
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              {...register("phoneNumber", { 
                required: "Phone number is required",
                pattern: {
                  value: /^\+[1-9]\d{1,14}$/,
                  message: "Phone number must be in E.164 format (+1234567890)"
                }
              })}
              placeholder="+1234567890"
              className={cn(
                errors.phoneNumber && "border-red-300",
                getFieldStatus('phoneNumber') === 'filled' && "border-green-300"
              )}
            />
            {errors.phoneNumber && (
              <p className="text-sm text-red-600">{errors.phoneNumber.message}</p>
            )}
          </div>

          {/* API Key SID */}
          <div className="space-y-2">
            <Label htmlFor="apiKeySid" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Key SID
              <Badge variant={getFieldStatus('apiKeySid') === 'filled' ? 'default' : 'secondary'} className="ml-auto">
                {getFieldStatus('apiKeySid') === 'filled' ? 'Filled' : 'Required'}
              </Badge>
            </Label>
            <Input
              id="apiKeySid"
              {...register("apiKeySid", { 
                required: "API Key SID is required",
                pattern: {
                  value: /^SK[a-f0-9]{32}$/i,
                  message: "Invalid API Key SID format"
                }
              })}
              placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className={cn(
                errors.apiKeySid && "border-red-300",
                getFieldStatus('apiKeySid') === 'filled' && "border-green-300"
              )}
            />
            {errors.apiKeySid && (
              <p className="text-sm text-red-600">{errors.apiKeySid.message}</p>
            )}
          </div>

          {/* API Key Secret */}
          <div className="space-y-2">
            <Label htmlFor="apiKeySecret" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Key Secret
              <Badge variant={getFieldStatus('apiKeySecret') === 'filled' ? 'default' : 'secondary'} className="ml-auto">
                {getFieldStatus('apiKeySecret') === 'filled' ? 'Filled' : 'Required'}
              </Badge>
            </Label>
            <Input
              id="apiKeySecret"
              type="password"
              {...register("apiKeySecret", { 
                required: "API Key Secret is required",
                minLength: {
                  value: 32,
                  message: "API Key Secret must be at least 32 characters"
                }
              })}
              placeholder="Your API Key Secret"
              className={cn(
                errors.apiKeySecret && "border-red-300",
                getFieldStatus('apiKeySecret') === 'filled' && "border-green-300"
              )}
            />
            {errors.apiKeySecret && (
              <p className="text-sm text-red-600">{errors.apiKeySecret.message}</p>
            )}
          </div>

          {/* Status Display */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Configuration Status</span>
              <Badge variant={twilioStatus?.isConfigured ? 'default' : 'secondary'}>
                {twilioStatus?.isConfigured ? 'Connected' : allFieldsFilled ? 'Testing...' : 'Incomplete'}
              </Badge>
            </div>
            {twilioStatus?.isConfigured && (
              <p className="text-xs text-green-600 mt-1">
                ✓ All credentials verified and working
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={!allFieldsFilled || saveMutation.isPending || showSuccess}
              className="flex-1 transition-all"
              data-testid="button-save-twilio-credentials"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving & Testing...
                </>
              ) : showSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved Successfully!
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save & Test Configuration
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}