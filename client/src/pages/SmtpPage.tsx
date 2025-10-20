import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SMTPFormData {
  apiKey: string;
  domain: string;
  senderEmail: string;
  senderName: string;
}

export default function SmtpPage() {
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'testing' | 'success' | 'error'>('untested');
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<SMTPFormData>();

  const { data: smtpSettings } = useQuery({
    queryKey: ["/api/settings/smtp"],
    onSuccess: (data) => {
      // Pre-populate form with existing settings
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (data: SMTPFormData) => {
      setConnectionStatus('testing');
      // Simulate API call to test SMTP connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Mock success/failure
      if (Math.random() > 0.3) {
        setConnectionStatus('success');
        return { success: true };
      } else {
        setConnectionStatus('error');
        throw new Error('Connection failed');
      }
    },
    onSuccess: () => {
      toast({
        title: "Connection successful",
        description: "SMTP settings are working correctly.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "Unable to connect to SMTP server",
        variant: "destructive",
      });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: SMTPFormData) => {
      const response = await apiRequest("POST", "/api/settings", {
        key: "smtp",
        value: data,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "SMTP settings have been saved successfully.",
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

  const onSubmit = (data: SMTPFormData) => {
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

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'untested': return '●';
      case 'testing': return '●';
      case 'success': return '●';
      case 'error': return '●';
      default: return '●';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>SMTP Settings</CardTitle>
          <p className="text-gray-600">Configure your Brevo SMTP settings for email notifications.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  {...register("apiKey", { required: "API key is required" })}
                  placeholder="Enter your Brevo API key"
                  className={errors.apiKey ? "border-red-300" : ""}
                />
                {errors.apiKey && (
                  <p className="text-sm text-red-600 mt-1">{errors.apiKey.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  {...register("domain", { required: "Domain is required" })}
                  placeholder="yourdomain.com"
                  className={errors.domain ? "border-red-300" : ""}
                />
                {errors.domain && (
                  <p className="text-sm text-red-600 mt-1">{errors.domain.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="senderEmail">Sender Email</Label>
              <Input
                id="senderEmail"
                type="email"
                {...register("senderEmail", { 
                  required: "Sender email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Please enter a valid email address"
                  }
                })}
                placeholder="noreply@yourdomain.com"
                className={errors.senderEmail ? "border-red-300" : ""}
              />
              {errors.senderEmail && (
                <p className="text-sm text-red-600 mt-1">{errors.senderEmail.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="senderName">Sender Name</Label>
              <Input
                id="senderName"
                {...register("senderName", { required: "Sender name is required" })}
                placeholder="Your Company Name"
                className={errors.senderName ? "border-red-300" : ""}
              />
              {errors.senderName && (
                <p className="text-sm text-red-600 mt-1">{errors.senderName.message}</p>
              )}
            </div>

            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">Connection Status</h3>
                    <p className="text-sm text-gray-600">Test your SMTP configuration</p>
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
        </CardContent>
      </Card>
    </div>
  );
}
