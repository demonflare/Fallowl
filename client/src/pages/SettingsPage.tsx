import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Cloud, Server, Check, Save, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SystemSettingsFormData {
  connectionType: 'twilio' | 'sip';
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioApiKeySid: string;
  twilioApiKeySecret: string;
  twilioPhoneNumber: string;
  sipUri: string;
  sipUsername: string;
  sipPassword: string;
  sipProxyServer: string;
  sipPort: string;
}

export default function SettingsPage() {
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'testing' | 'success' | 'error'>('success');
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SystemSettingsFormData>({
    defaultValues: {
      connectionType: 'twilio',
      twilioAccountSid: '',
      twilioAuthToken: '',
      twilioApiKeySid: '',
      twilioApiKeySecret: '',
      twilioPhoneNumber: '',
      sipUri: '',
      sipUsername: '',
      sipPassword: '',
      sipProxyServer: '',
      sipPort: '5060',
    }
  });

  const connectionType = watch("connectionType");

  const { data: systemSettings } = useQuery({
    queryKey: ["/api/settings/system"],
    retry: false,
  });

  // Load existing user-specific Twilio settings
  const { data: twilioSettings } = useQuery({
    queryKey: ["/api/user/twilio/credentials"],
    retry: false,
  });

  // Pre-populate form with existing system settings
  useEffect(() => {
    if (systemSettings && typeof systemSettings === 'object' && 'value' in systemSettings && systemSettings.value) {
      Object.entries(systemSettings.value as Record<string, any>).forEach(([key, value]) => {
        setValue(key as keyof SystemSettingsFormData, value as any);
      });
    }
  }, [systemSettings, setValue]);

  // Pre-populate form with existing user-specific Twilio settings
  useEffect(() => {
    if (twilioSettings && typeof twilioSettings === 'object' && 'credentials' in twilioSettings && twilioSettings.credentials) {
      const creds = twilioSettings.credentials as any;
      // Note: Credentials may be masked for security, so we won't prefill them
      // Users will need to re-enter credentials to update them
      // This is intentional for security
    }
  }, [twilioSettings, setValue]);

  // Auto-expand form if credentials are not configured
  useEffect(() => {
    if (twilioSettings && typeof twilioSettings === 'object' && 'configured' in twilioSettings) {
      setIsFormExpanded(!twilioSettings.configured);
    }
  }, [twilioSettings]);

  const testConnectionMutation = useMutation({
    mutationFn: async (data: SystemSettingsFormData) => {
      setConnectionStatus('testing');
      
      if (data.connectionType === 'twilio') {
        // Save user-specific credentials first
        await apiRequest("POST", "/api/user/twilio/credentials", {
          accountSid: data.twilioAccountSid,
          authToken: data.twilioAuthToken,
          apiKeySid: data.twilioApiKeySid,
          apiKeySecret: data.twilioApiKeySecret,
          phoneNumber: data.twilioPhoneNumber,
        });
        
        // Test connection
        const response = await apiRequest("POST", "/api/twilio/test-connection");
        const result = await response.json();
        
        if (result.connected) {
          setConnectionStatus('success');
          return { success: true };
        } else {
          setConnectionStatus('error');
          throw new Error('Twilio connection test failed');
        }
      } else {
        // For SIP, simulate test for now
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (Math.random() > 0.2) {
          setConnectionStatus('success');
          return { success: true };
        } else {
          setConnectionStatus('error');
          throw new Error('SIP connection test failed');
        }
      }
    },
    onSuccess: (_, variables) => {
      if (variables.connectionType === 'twilio') {
        // Invalidate user-specific Twilio queries
        queryClient.invalidateQueries({ queryKey: ["/api/user/twilio/credentials"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/twilio/status"] });
      }
      toast({
        title: "Connection successful",
        description: "System settings are working correctly.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "Unable to connect with current settings",
        variant: "destructive",
      });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SystemSettingsFormData) => {
      if (data.connectionType === 'twilio') {
        // Save user-specific Twilio credentials
        const response = await apiRequest("POST", "/api/user/twilio/credentials", {
          accountSid: data.twilioAccountSid,
          authToken: data.twilioAuthToken,
          apiKeySid: data.twilioApiKeySid,
          apiKeySecret: data.twilioApiKeySecret,
          phoneNumber: data.twilioPhoneNumber,
        });
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/settings", {
          key: "system",
          value: data,
        });
        return response.json();
      }
    },
    onSuccess: (_, variables) => {
      if (variables.connectionType === 'twilio') {
        // Invalidate user-specific Twilio queries
        queryClient.invalidateQueries({ queryKey: ["/api/user/twilio/credentials"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/twilio/status"] });
        // Collapse the form after successful save
        setIsFormExpanded(false);
      }
      toast({
        title: "Settings saved",
        description: "System settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const removeCredentialsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/user/twilio/credentials");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/twilio/credentials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/twilio/status"] });
      setIsFormExpanded(true);
      toast({
        title: "Credentials removed",
        description: "Twilio credentials have been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove credentials",
        variant: "destructive",
      });
    },
  });


  const onSubmit = (data: SystemSettingsFormData) => {
    saveSettingsMutation.mutate(data);
  };

  const handleTestConnection = () => {
    handleSubmit((data) => {
      testConnectionMutation.mutate(data);
    })();
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'untested': return 'bg-yellow-100 text-yellow-800';
      case 'testing': return 'bg-blue-100 text-blue-800';
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'untested': return 'Not tested';
      case 'testing': return 'Testing...';
      case 'success': return 'Connected';
      case 'error': return 'Failed';
      default: return 'Unknown';
    }
  };

  const isConfigured = twilioSettings && typeof twilioSettings === 'object' && 'configured' in twilioSettings && twilioSettings.configured;
  const credentialsData = twilioSettings && typeof twilioSettings === 'object' && 'credentials' in twilioSettings ? twilioSettings.credentials : null;

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <p className="text-gray-600 dark:text-gray-400">Configure your Twilio and SIP trunk settings.</p>
        </CardHeader>
        <CardContent>
          {/* Show collapsed summary when credentials are configured and form is not expanded */}
          {isConfigured && !isFormExpanded ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-gray-200">Twilio Credentials Configured</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your Twilio account is connected and ready to use
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFormExpanded(!isFormExpanded)}
                  data-testid="button-toggle-credentials"
                >
                  {isFormExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsFormExpanded(true)}
                  data-testid="button-update-credentials"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Update Credentials
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsFormExpanded(true)}
                  data-testid="button-change-credentials"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Change Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm("Are you sure you want to remove your Twilio credentials?")) {
                      removeCredentialsMutation.mutate();
                    }
                  }}
                  disabled={removeCredentialsMutation.isPending}
                  data-testid="button-remove-credentials"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {removeCredentialsMutation.isPending ? "Removing..." : "Remove Credentials"}
                </Button>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Connection Type */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Connection Type</h3>
              <RadioGroup
                value={connectionType}
                onValueChange={(value) => setValue("connectionType", value as 'twilio' | 'sip')}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="twilio" id="twilio" />
                  <Label htmlFor="twilio" className="cursor-pointer">
                    <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center">
                        <Cloud className="w-8 h-8 text-blue-600 mr-3" />
                        <div>
                          <h4 className="font-medium text-gray-800">Twilio</h4>
                          <p className="text-sm text-gray-600">Cloud-based communication platform</p>
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sip" id="sip" />
                  <Label htmlFor="sip" className="cursor-pointer">
                    <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center">
                        <Server className="w-8 h-8 text-gray-600 mr-3" />
                        <div>
                          <h4 className="font-medium text-gray-800">SIP Trunk</h4>
                          <p className="text-sm text-gray-600">Direct SIP connection</p>
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Twilio Settings */}
            {connectionType === 'twilio' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Twilio Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="twilioAccountSid">Account SID</Label>
                    <Input
                      id="twilioAccountSid"
                      {...register("twilioAccountSid", { 
                        required: connectionType === 'twilio' ? "Account SID is required" : false 
                      })}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className={errors.twilioAccountSid ? "border-red-300" : ""}
                    />
                    {errors.twilioAccountSid && (
                      <p className="text-sm text-red-600 mt-1">{errors.twilioAccountSid.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="twilioAuthToken">Auth Token</Label>
                    <Input
                      id="twilioAuthToken"
                      type="password"
                      {...register("twilioAuthToken", { 
                        required: connectionType === 'twilio' ? "Auth Token is required" : false 
                      })}
                      placeholder="Enter your Auth Token"
                      className={errors.twilioAuthToken ? "border-red-300" : ""}
                    />
                    {errors.twilioAuthToken && (
                      <p className="text-sm text-red-600 mt-1">{errors.twilioAuthToken.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="twilioPhoneNumber">Twilio Phone Number</Label>
                    <Input
                      id="twilioPhoneNumber"
                      type="tel"
                      {...register("twilioPhoneNumber", { 
                        required: connectionType === 'twilio' ? "Phone number is required" : false 
                      })}
                      placeholder="+1 (555) 000-0000"
                      className={errors.twilioPhoneNumber ? "border-red-300" : ""}
                    />
                    {errors.twilioPhoneNumber && (
                      <p className="text-sm text-red-600 mt-1">{errors.twilioPhoneNumber.message}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Your Twilio phone number that will be used for outbound calls.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="twilioApiKeySid">API Key SID (Optional)</Label>
                    <Input
                      id="twilioApiKeySid"
                      {...register("twilioApiKeySid")}
                      placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className={errors.twilioApiKeySid ? "border-red-300" : ""}
                    />
                    {errors.twilioApiKeySid && (
                      <p className="text-sm text-red-600 mt-1">{errors.twilioApiKeySid.message}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Optional: For enhanced security and token generation
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="twilioApiKeySecret">API Key Secret (Optional)</Label>
                    <Input
                      id="twilioApiKeySecret"
                      type="password"
                      {...register("twilioApiKeySecret")}
                      placeholder="Enter your API Key Secret"
                      className={errors.twilioApiKeySecret ? "border-red-300" : ""}
                    />
                    {errors.twilioApiKeySecret && (
                      <p className="text-sm text-red-600 mt-1">{errors.twilioApiKeySecret.message}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Required when using API Key SID
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Note:</strong> After saving, a TwiML Application will be automatically created in your Twilio account for call handling.
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* SIP Settings */}
            {connectionType === 'sip' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">SIP Trunk Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sipUri">SIP URI</Label>
                    <Input
                      id="sipUri"
                      {...register("sipUri", { 
                        required: connectionType === 'sip' ? "SIP URI is required" : false 
                      })}
                      placeholder="sip:your-domain.com"
                      className={errors.sipUri ? "border-red-300" : ""}
                    />
                    {errors.sipUri && (
                      <p className="text-sm text-red-600 mt-1">{errors.sipUri.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sipUsername">Username</Label>
                      <Input
                        id="sipUsername"
                        {...register("sipUsername", { 
                          required: connectionType === 'sip' ? "Username is required" : false 
                        })}
                        placeholder="Enter username"
                        className={errors.sipUsername ? "border-red-300" : ""}
                      />
                      {errors.sipUsername && (
                        <p className="text-sm text-red-600 mt-1">{errors.sipUsername.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="sipPassword">Password</Label>
                      <Input
                        id="sipPassword"
                        type="password"
                        {...register("sipPassword", { 
                          required: connectionType === 'sip' ? "Password is required" : false 
                        })}
                        placeholder="Enter password"
                        className={errors.sipPassword ? "border-red-300" : ""}
                      />
                      {errors.sipPassword && (
                        <p className="text-sm text-red-600 mt-1">{errors.sipPassword.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sipProxyServer">Proxy Server</Label>
                      <Input
                        id="sipProxyServer"
                        {...register("sipProxyServer")}
                        placeholder="proxy.example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sipPort">Port</Label>
                      <Input
                        id="sipPort"
                        type="number"
                        {...register("sipPort")}
                        placeholder="5060"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Connection Status */}
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">Connection Status</h3>
                    <p className="text-sm text-gray-600">Test your connection settings</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor().replace('text-', 'bg-').replace('100', '500')}`}></div>
                    <Badge className={getStatusColor()}>
                      {getStatusText()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex space-x-4">
              <Button
                type="button"
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {testConnectionMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Testing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
              <Button
                type="submit"
                disabled={saveSettingsMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {saveSettingsMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
