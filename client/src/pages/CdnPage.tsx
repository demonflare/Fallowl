import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CloudUpload, Check, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CDNFormData {
  apiKey: string;
  storageZone: string;
  pullZoneUrl: string;
  storagePassword: string;
}

export default function CdnPage() {
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'testing' | 'success' | 'error'>('untested');
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<CDNFormData>();

  // Mock storage data
  const storageUsage = {
    used: 2.4,
    total: 100,
    unit: 'GB'
  };

  const { data: cdnSettings } = useQuery({
    queryKey: ["/api/settings/cdn"],
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (data: CDNFormData) => {
      setConnectionStatus('testing');
      // Simulate API call to test CDN connection
      await new Promise(resolve => setTimeout(resolve, 2000));
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
        description: "CDN settings are working correctly.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "Unable to connect to CDN",
        variant: "destructive",
      });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: CDNFormData) => {
      const response = await apiRequest("POST", "/api/settings", {
        key: "cdn",
        value: data,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "CDN settings have been saved successfully.",
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

  const onSubmit = (data: CDNFormData) => {
    saveSettingsMutation.mutate(data);
  };

  const handleTestConnection = () => {
    handleSubmit((data) => {
      testConnectionMutation.mutate(data);
    })();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Simulate file upload
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            toast({
              title: "Upload complete",
              description: `${file.name} has been uploaded successfully.`,
            });
            return 100;
          }
          return prev + 10;
        });
      }, 200);
    }
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

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>CDN Configuration</CardTitle>
          <p className="text-gray-600">Configure your Bunny CDN settings for optimal file delivery.</p>
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
                  placeholder="Enter your Bunny API key"
                  className={errors.apiKey ? "border-red-300" : ""}
                />
                {errors.apiKey && (
                  <p className="text-sm text-red-600 mt-1">{errors.apiKey.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="storageZone">Storage Zone</Label>
                <Input
                  id="storageZone"
                  {...register("storageZone", { required: "Storage zone is required" })}
                  placeholder="your-storage-zone"
                  className={errors.storageZone ? "border-red-300" : ""}
                />
                {errors.storageZone && (
                  <p className="text-sm text-red-600 mt-1">{errors.storageZone.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="pullZoneUrl">Pull Zone URL</Label>
              <Input
                id="pullZoneUrl"
                type="url"
                {...register("pullZoneUrl", { required: "Pull zone URL is required" })}
                placeholder="https://your-zone.b-cdn.net"
                className={errors.pullZoneUrl ? "border-red-300" : ""}
              />
              {errors.pullZoneUrl && (
                <p className="text-sm text-red-600 mt-1">{errors.pullZoneUrl.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="storagePassword">Storage Password</Label>
              <Input
                id="storagePassword"
                type="password"
                {...register("storagePassword", { required: "Storage password is required" })}
                placeholder="Enter storage password"
                className={errors.storagePassword ? "border-red-300" : ""}
              />
              {errors.storagePassword && (
                <p className="text-sm text-red-600 mt-1">{errors.storagePassword.message}</p>
              )}
            </div>

            {/* File Upload Test */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <CloudUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Test file upload</p>
              <p className="text-sm text-gray-500 mb-4">Drag and drop a file or click to browse</p>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Choose File
              </Button>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-4">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-gray-500 mt-2">{uploadProgress}% complete</p>
                </div>
              )}
            </div>

            {/* Storage Status */}
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">Storage Status</h3>
                    <p className="text-sm text-gray-600">Current storage usage and limits</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800">
                      {storageUsage.used} {storageUsage.unit} / {storageUsage.total} {storageUsage.unit}
                    </p>
                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(storageUsage.used / storageUsage.total) * 100}%` }}
                      ></div>
                    </div>
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
