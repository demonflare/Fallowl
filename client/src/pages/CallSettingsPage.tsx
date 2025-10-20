import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, PhoneForwarded, Voicemail, BellOff, Mic, 
  Shield, Clock, Activity, Save, RotateCcw, Settings2,
  PhoneCall, UserCheck, Bell
} from "lucide-react";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CallSettingsFormData {
  callForwardingEnabled: boolean;
  forwardingNumber: string;
  forwardingCondition: "always" | "busy" | "no-answer" | "unavailable";
  forwardingTimeout: number;
  
  voicemailEnabled: boolean;
  voicemailGreetingType: "default" | "custom";
  voicemailTimeout: number;
  voicemailTranscription: boolean;
  
  doNotDisturbEnabled: boolean;
  doNotDisturbStart: string;
  doNotDisturbEnd: string;
  doNotDisturbWeekdaysOnly: boolean;
  doNotDisturbAllowVip: boolean;
  
  autoRecordCalls: boolean;
  recordingChannels: "mono" | "dual";
  trimSilence: boolean;
  recordingTranscription: boolean;
  
  callScreeningEnabled: boolean;
  answeringMachineDetection: boolean;
  amdSensitivity: "low" | "medium" | "high";
  
  callTimeout: number;
  ringTimeout: number;
  maxCallDuration: number;
  
  callWaitingEnabled: boolean;
  callQualityReporting: boolean;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  
  callerIdName: string;
  callerIdNumber: string;
  internationalCalling: boolean;
}

export default function CallSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  
  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm<CallSettingsFormData>({
    defaultValues: {
      callForwardingEnabled: false,
      forwardingNumber: "",
      forwardingCondition: "no-answer",
      forwardingTimeout: 20,
      
      voicemailEnabled: true,
      voicemailGreetingType: "default",
      voicemailTimeout: 30,
      voicemailTranscription: false,
      
      doNotDisturbEnabled: false,
      doNotDisturbStart: "22:00",
      doNotDisturbEnd: "08:00",
      doNotDisturbWeekdaysOnly: false,
      doNotDisturbAllowVip: false,
      
      autoRecordCalls: false,
      recordingChannels: "dual",
      trimSilence: true,
      recordingTranscription: false,
      
      callScreeningEnabled: false,
      answeringMachineDetection: false,
      amdSensitivity: "medium",
      
      callTimeout: 300,
      ringTimeout: 60,
      maxCallDuration: 14400,
      
      callWaitingEnabled: true,
      callQualityReporting: true,
      echoCancellation: true,
      noiseSuppression: true,
      
      callerIdName: "",
      callerIdNumber: "",
      internationalCalling: false,
    }
  });

  const watchedValues = {
    callForwardingEnabled: watch("callForwardingEnabled"),
    voicemailEnabled: watch("voicemailEnabled"),
    doNotDisturbEnabled: watch("doNotDisturbEnabled"),
    autoRecordCalls: watch("autoRecordCalls"),
    callScreeningEnabled: watch("callScreeningEnabled"),
    answeringMachineDetection: watch("answeringMachineDetection"),
  };

  const { data: callSettings, isLoading } = useQuery({
    queryKey: ["/api/settings", "call-settings"],
  });

  useEffect(() => {
    if (callSettings?.value) {
      Object.entries(callSettings.value).forEach(([key, value]) => {
        setValue(key as keyof CallSettingsFormData, value as any);
      });
    }
  }, [callSettings, setValue]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: CallSettingsFormData) => {
      const response = await apiRequest("POST", "/api/settings", {
        key: "call-settings",
        value: data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings", "call-settings"] });
      toast({
        title: "Settings saved",
        description: "Your call settings have been updated successfully.",
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

  const onSubmit = (data: CallSettingsFormData) => {
    saveSettingsMutation.mutate(data);
  };

  const handleReset = () => {
    reset();
    toast({
      title: "Settings reset",
      description: "All settings have been reset to default values.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-gray-600 dark:text-gray-400">Configure your call handling and voice preferences</p>
        <Settings2 className="w-8 h-8 text-gray-400" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="recording" className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Recording
            </TabsTrigger>
            <TabsTrigger value="screening" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Screening
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-4">
            <Card data-testid="card-call-forwarding">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <PhoneForwarded className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Call Forwarding</CardTitle>
                </div>
                <CardDescription>Forward calls to another number based on conditions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Call Forwarding</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Route calls to another number</p>
                  </div>
                  <Switch
                    data-testid="switch-call-forwarding"
                    checked={watchedValues.callForwardingEnabled}
                    onCheckedChange={(checked) => setValue("callForwardingEnabled", checked)}
                  />
                </div>
                {watchedValues.callForwardingEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    <div>
                      <Label htmlFor="forwardingNumber">Forwarding Number</Label>
                      <Input
                        data-testid="input-forwarding-number"
                        id="forwardingNumber"
                        type="tel"
                        {...register("forwardingNumber", { 
                          required: watchedValues.callForwardingEnabled ? "Forwarding number is required" : false 
                        })}
                        placeholder="+1 (555) 000-0000"
                        className="mt-1"
                      />
                      {errors.forwardingNumber && (
                        <p className="text-sm text-red-600 mt-1">{errors.forwardingNumber.message}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="forwardingCondition">Forward When</Label>
                        <Select
                          value={watch("forwardingCondition")}
                          onValueChange={(value: any) => setValue("forwardingCondition", value)}
                        >
                          <SelectTrigger data-testid="select-forwarding-condition" className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="always">Always</SelectItem>
                            <SelectItem value="busy">When Busy</SelectItem>
                            <SelectItem value="no-answer">No Answer</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="forwardingTimeout">Timeout (seconds)</Label>
                        <Input
                          data-testid="input-forwarding-timeout"
                          id="forwardingTimeout"
                          type="number"
                          {...register("forwardingTimeout", { min: 5, max: 60 })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-voicemail">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Voicemail className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Voicemail</CardTitle>
                </div>
                <CardDescription>Manage voicemail and greeting messages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Voicemail</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Allow callers to leave messages</p>
                  </div>
                  <Switch
                    data-testid="switch-voicemail"
                    checked={watchedValues.voicemailEnabled}
                    onCheckedChange={(checked) => setValue("voicemailEnabled", checked)}
                  />
                </div>
                {watchedValues.voicemailEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="voicemailGreetingType">Greeting Type</Label>
                        <Select
                          value={watch("voicemailGreetingType")}
                          onValueChange={(value: any) => setValue("voicemailGreetingType", value)}
                        >
                          <SelectTrigger data-testid="select-voicemail-greeting" className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="voicemailTimeout">Timeout (seconds)</Label>
                        <Input
                          data-testid="input-voicemail-timeout"
                          id="voicemailTimeout"
                          type="number"
                          {...register("voicemailTimeout", { min: 10, max: 60 })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Voicemail Transcription</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Convert voicemail to text</p>
                      </div>
                      <Switch
                        data-testid="switch-voicemail-transcription"
                        checked={watch("voicemailTranscription")}
                        onCheckedChange={(checked) => setValue("voicemailTranscription", checked)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-do-not-disturb">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BellOff className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Do Not Disturb</CardTitle>
                </div>
                <CardDescription>Block calls during specific hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Do Not Disturb</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Block incoming calls during set hours</p>
                  </div>
                  <Switch
                    data-testid="switch-dnd"
                    checked={watchedValues.doNotDisturbEnabled}
                    onCheckedChange={(checked) => setValue("doNotDisturbEnabled", checked)}
                  />
                </div>
                {watchedValues.doNotDisturbEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="doNotDisturbStart">Start Time</Label>
                        <Input
                          data-testid="input-dnd-start"
                          id="doNotDisturbStart"
                          type="time"
                          {...register("doNotDisturbStart")}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="doNotDisturbEnd">End Time</Label>
                        <Input
                          data-testid="input-dnd-end"
                          id="doNotDisturbEnd"
                          type="time"
                          {...register("doNotDisturbEnd")}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Weekdays Only</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Apply only Monday-Friday</p>
                      </div>
                      <Switch
                        data-testid="switch-dnd-weekdays"
                        checked={watch("doNotDisturbWeekdaysOnly")}
                        onCheckedChange={(checked) => setValue("doNotDisturbWeekdaysOnly", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Allow VIP Contacts</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Let starred contacts through</p>
                      </div>
                      <Switch
                        data-testid="switch-dnd-vip"
                        checked={watch("doNotDisturbAllowVip")}
                        onCheckedChange={(checked) => setValue("doNotDisturbAllowVip", checked)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recording Settings Tab */}
          <TabsContent value="recording" className="space-y-4">
            <Card data-testid="card-recording">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Mic className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Call Recording</CardTitle>
                </div>
                <CardDescription>Configure automatic call recording preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Record Calls</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Automatically record all calls</p>
                  </div>
                  <Switch
                    data-testid="switch-auto-record"
                    checked={watchedValues.autoRecordCalls}
                    onCheckedChange={(checked) => setValue("autoRecordCalls", checked)}
                  />
                </div>
                {watchedValues.autoRecordCalls && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    <div>
                      <Label htmlFor="recordingChannels">Recording Channels</Label>
                      <Select
                        value={watch("recordingChannels")}
                        onValueChange={(value: any) => setValue("recordingChannels", value)}
                      >
                        <SelectTrigger data-testid="select-recording-channels" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mono">Mono (Single Channel)</SelectItem>
                          <SelectItem value="dual">Dual (Separate Channels)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Dual channel records each participant separately
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Trim Silence</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Remove silence from recordings</p>
                      </div>
                      <Switch
                        data-testid="switch-trim-silence"
                        checked={watch("trimSilence")}
                        onCheckedChange={(checked) => setValue("trimSilence", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Recording Transcription</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Convert recordings to text</p>
                      </div>
                      <Switch
                        data-testid="switch-recording-transcription"
                        checked={watch("recordingTranscription")}
                        onCheckedChange={(checked) => setValue("recordingTranscription", checked)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Screening Settings Tab */}
          <TabsContent value="screening" className="space-y-4">
            <Card data-testid="card-screening">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Call Screening</CardTitle>
                </div>
                <CardDescription>Filter and screen incoming calls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Call Screening</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Screen unknown callers</p>
                  </div>
                  <Switch
                    data-testid="switch-call-screening"
                    checked={watchedValues.callScreeningEnabled}
                    onCheckedChange={(checked) => setValue("callScreeningEnabled", checked)}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Answering Machine Detection</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Detect voicemail systems</p>
                  </div>
                  <Switch
                    data-testid="switch-amd"
                    checked={watchedValues.answeringMachineDetection}
                    onCheckedChange={(checked) => setValue("answeringMachineDetection", checked)}
                  />
                </div>
                {watchedValues.answeringMachineDetection && (
                  <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    <Label htmlFor="amdSensitivity">Detection Sensitivity</Label>
                    <Select
                      value={watch("amdSensitivity")}
                      onValueChange={(value: any) => setValue("amdSensitivity", value)}
                    >
                      <SelectTrigger data-testid="select-amd-sensitivity" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (More Accurate)</SelectItem>
                        <SelectItem value="medium">Medium (Balanced)</SelectItem>
                        <SelectItem value="high">High (Faster)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-caller-id">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Caller ID</CardTitle>
                </div>
                <CardDescription>Configure outbound caller identification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="callerIdName">Caller ID Name</Label>
                  <Input
                    data-testid="input-caller-id-name"
                    id="callerIdName"
                    type="text"
                    {...register("callerIdName")}
                    placeholder="Your Business Name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="callerIdNumber">Caller ID Number</Label>
                  <Input
                    data-testid="input-caller-id-number"
                    id="callerIdNumber"
                    type="tel"
                    {...register("callerIdNumber")}
                    placeholder="+1 (555) 000-0000"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Must be a verified number from your Twilio account
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings Tab */}
          <TabsContent value="advanced" className="space-y-4">
            <Card data-testid="card-timeouts">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Timeout Settings</CardTitle>
                </div>
                <CardDescription>Configure call duration and timeout limits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="ringTimeout">Ring Timeout (seconds)</Label>
                  <Input
                    data-testid="input-ring-timeout"
                    id="ringTimeout"
                    type="number"
                    {...register("ringTimeout", { min: 10, max: 600 })}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    How long to ring before going to voicemail
                  </p>
                </div>
                <div>
                  <Label htmlFor="callTimeout">Call Timeout (seconds)</Label>
                  <Input
                    data-testid="input-call-timeout"
                    id="callTimeout"
                    type="number"
                    {...register("callTimeout", { min: 60, max: 3600 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="maxCallDuration">Max Call Duration (seconds)</Label>
                  <Input
                    data-testid="input-max-duration"
                    id="maxCallDuration"
                    type="number"
                    {...register("maxCallDuration", { min: 300, max: 86400 })}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Maximum allowed call length (up to 24 hours)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-quality">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Call Quality & Features</CardTitle>
                </div>
                <CardDescription>Enhance call quality and enable features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Call Waiting</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Accept calls while on another call</p>
                  </div>
                  <Switch
                    data-testid="switch-call-waiting"
                    checked={watch("callWaitingEnabled")}
                    onCheckedChange={(checked) => setValue("callWaitingEnabled", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Call Quality Reporting</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Monitor call quality metrics</p>
                  </div>
                  <Switch
                    data-testid="switch-quality-reporting"
                    checked={watch("callQualityReporting")}
                    onCheckedChange={(checked) => setValue("callQualityReporting", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Echo Cancellation</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Reduce echo on calls</p>
                  </div>
                  <Switch
                    data-testid="switch-echo-cancellation"
                    checked={watch("echoCancellation")}
                    onCheckedChange={(checked) => setValue("echoCancellation", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Noise Suppression</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Filter background noise</p>
                  </div>
                  <Switch
                    data-testid="switch-noise-suppression"
                    checked={watch("noiseSuppression")}
                    onCheckedChange={(checked) => setValue("noiseSuppression", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>International Calling</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enable international calls</p>
                  </div>
                  <Switch
                    data-testid="switch-international"
                    checked={watch("internationalCalling")}
                    onCheckedChange={(checked) => setValue("internationalCalling", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                data-testid="button-reset"
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </Button>
              <Button
                type="submit"
                disabled={saveSettingsMutation.isPending}
                data-testid="button-save"
                className="flex items-center gap-2"
              >
                {saveSettingsMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
