import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Phone, PhoneCall, PhoneOff, Play, Pause, SkipForward, Settings,
  Activity, TrendingUp, Clock, CheckCircle, XCircle, Users,
  Zap, Target, BarChart3, Mic, MicOff, AlertCircle, Info, Mail, Building2, Briefcase
} from "lucide-react";
import { ParallelDialerSkeleton } from "@/components/skeletons/ParallelDialerSkeleton";
import { useTwilioDeviceV2 } from "@/hooks/useTwilioDeviceV2";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Contact, ContactList } from "@shared/schema";

interface ParallelCallLine {
  id: string;
  contactId?: number;
  phone: string;
  name: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  status: 'idle' | 'dialing' | 'ringing' | 'answered' | 'failed' | 'busy' | 'voicemail' | 'connected' | 'in-progress' | 'completed' | 'no-answer' | 'canceled' | 'human-detected' | 'machine-detected' | 'paused' | 'on-hold';
  duration: number;
  callSid?: string;
  callId?: number;
  startTime?: number;
  isAnsweringMachine?: boolean;
  answeredBy?: 'human' | 'machine' | 'fax' | 'unknown';
  statsRecorded?: boolean;
  disposition?: string;
}

interface DialerStats {
  totalDialed: number;
  connected: number;
  voicemails: number;
  failed: number;
  avgConnectTime: number;
  connectRate: number;
  talkTime: number;
  skippedDnc: number;
  skippedMaxAttempts: number;
}

export default function ParallelDialerPage() {
  const [isDialing, setIsDialing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [parallelLines, setParallelLines] = useState(3);
  const [callsPerSecond, setCallsPerSecond] = useState(1);
  const [callLines, setCallLines] = useState<ParallelCallLine[]>([]);
  const [queuedContacts, setQueuedContacts] = useState<Contact[]>([]);
  const [currentContactIndex, setCurrentContactIndex] = useState(0);
  const [amdEnabled, setAmdEnabled] = useState(true);
  const [amdTimeout, setAmdTimeout] = useState(30);
  const [amdSensitivity, setAmdSensitivity] = useState<'standard' | 'high' | 'low'>('standard');
  const [autoSkipVoicemail, setAutoSkipVoicemail] = useState(true);
  const [useConferenceMode, setUseConferenceMode] = useState(false);
  const [greetingUrl, setGreetingUrl] = useState<string>('');
  const [stats, setStats] = useState<DialerStats>({
    totalDialed: 0,
    connected: 0,
    voicemails: 0,
    failed: 0,
    avgConnectTime: 0,
    connectRate: 0,
    talkTime: 0,
    skippedDnc: 0,
    skippedMaxAttempts: 0
  });
  const [conferenceActive, setConferenceActive] = useState(false);
  const [conferenceReady, setConferenceReady] = useState(false);
  
  // Mutex to prevent concurrent dialNextBatch executions
  const isDialingBatchRef = useRef(false);
  
  // Track if a dial was requested while mutex was locked
  const dialRequestedRef = useRef(false);
  
  // Track timeouts for line resets to allow cancellation on stop
  const lineResetTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Track which lines have had stats recorded to prevent duplicate counting
  const statsRecordedLinesRef = useRef<Set<string>>(new Set());
  
  // Track which phone numbers have been dialed in current session to prevent duplicates
  const dialedPhonesRef = useRef<Set<string>>(new Set());
  
  // Store toast function in ref for stable event handlers
  const toastRef = useRef<any>(null);
  
  // Abort controller for cancelling async operations on unmount/stop
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Track dialing state in refs for timeout callbacks
  const isDialingRef = useRef(isDialing);
  const isPausedRef = useRef(isPaused);
  const autoSkipVoicemailRef = useRef(autoSkipVoicemail);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { makeCall, isReady } = useTwilioDeviceV2();
  
  // Keep refs in sync with state
  useEffect(() => {
    isDialingRef.current = isDialing;
  }, [isDialing]);
  
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  
  useEffect(() => {
    autoSkipVoicemailRef.current = autoSkipVoicemail;
  }, [autoSkipVoicemail]);
  
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Abort all ongoing async operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear all pending line reset timeouts
      lineResetTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      lineResetTimeoutsRef.current.clear();
      
      // Clear stats tracking
      statsRecordedLinesRef.current.clear();
      
      console.log('🧹 Parallel dialer component unmounted - cleaned up all timeouts and refs');
    };
  }, []);

  // Update agent availability status when device readiness changes
  useEffect(() => {
    const updateAgentStatus = async () => {
      try {
        await apiRequest('POST', '/api/settings', {
          key: 'agent_webrtc_status',
          value: {
            isReady,
            lastUpdate: Date.now()
          }
        });
        console.log(`📡 Updated agent WebRTC status: ${isReady ? 'ready' : 'not ready'}`);
      } catch (error) {
        console.error('Failed to update agent status:', error);
      }
    };
    
    updateAgentStatus();
    
    // Send heartbeat every 30 seconds while ready
    let heartbeatInterval: NodeJS.Timeout | null = null;
    if (isReady) {
      heartbeatInterval = setInterval(updateAgentStatus, 30000);
    }
    
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };
  }, [isReady]);

  const { data: contactLists = [] } = useQuery<ContactList[]>({
    queryKey: ["/api/lists"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  // Fetch list-specific contacts when a list is selected
  const { data: listContacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/lists", selectedListId, "contacts"],
    enabled: !!selectedListId,
  });

  // Load greeting URL setting
  const { data: greetingSetting } = useQuery<{ id: number; key: string; value: string; updatedAt: string }>({
    queryKey: ["/api/settings", "parallel_dialer_greeting"],
  });

  // Load greeting URL when setting is fetched
  useEffect(() => {
    if (greetingSetting?.value) {
      setGreetingUrl(greetingSetting.value as string);
    }
  }, [greetingSetting]);

  // Save greeting URL mutation
  const saveGreetingMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/settings", {
        key: "parallel_dialer_greeting",
        value: url,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings", "parallel_dialer_greeting"] });
      toast({
        title: "Greeting saved",
        description: "Pre-recorded greeting URL has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save greeting URL",
        variant: "destructive",
      });
    },
  });

  // Use list contacts if a specific list is selected, otherwise use all contacts
  const filteredContacts = selectedListId ? listContacts : contacts;

  const initializeDialer = useCallback(() => {
    const lines: ParallelCallLine[] = Array.from({ length: parallelLines }, (_, i) => ({
      id: `line-${i}`,
      phone: '',
      name: '',
      status: 'idle',
      duration: 0
    }));
    setCallLines(lines);
  }, [parallelLines]);

  useEffect(() => {
    initializeDialer();
  }, [initializeDialer]);

  // WebSocket event handlers wrapped in useCallback to prevent stale closures
  const handleCallStarted = useCallback((event: any) => {
    const data = event.detail;
    console.log('📞 Parallel call started event:', data);
    
    setCallLines(lines => lines.map(line => 
      line.id === data.lineId
        ? { 
            ...line, 
            callSid: data.callSid,
            callId: data.callId,
            name: data.contact.name,
            phone: data.contact.phone,
            company: data.contact.company,
            jobTitle: data.contact.jobTitle,
            email: data.contact.email,
            status: 'ringing',
            startTime: data.startTime
          }
        : line
    ));
  }, []);

  const handleCallStatus = useCallback((event: any) => {
    const data = event.detail;
    console.log('📞 Parallel call status event:', data);
    
    // Map Twilio status to UI-friendly status with detailed AMD outcomes
    // With answerOnBridge=true, 'in-progress' means call was actually answered
    let uiStatus: any = data.status;
    let isTerminalStatus = false;
    
    // Check AMD results for more specific status
    if (data.answeredBy) {
      if (data.answeredBy === 'human') {
        uiStatus = 'human-detected';
      } else if (data.answeredBy.startsWith('machine') || data.answeredBy === 'fax') {
        uiStatus = 'machine-detected';
      }
    }
    
    // Map Twilio status to UI status
    switch(data.status) {
      case 'initiated':
      case 'queued':
        uiStatus = 'dialing';
        break;
      case 'ringing':
        uiStatus = 'ringing';
        break;
      case 'in-progress':
      case 'answered':
        // Use AMD result if available, otherwise show connected
        if (!data.answeredBy || data.answeredBy === 'unknown') {
          uiStatus = 'connected';
        }
        break;
      case 'completed':
        // More specific terminal statuses based on AMD
        if (data.answeredBy === 'human') {
          uiStatus = 'completed';
        } else if (data.answeredBy === 'machine' || data.answeredBy === 'fax' || data.isAnsweringMachine) {
          uiStatus = 'voicemail';
        } else {
          uiStatus = 'completed';
        }
        isTerminalStatus = true;
        break;
      case 'busy':
        uiStatus = 'busy';
        isTerminalStatus = true;
        break;
      case 'no-answer':
        uiStatus = 'no-answer';
        isTerminalStatus = true;
        break;
      case 'canceled':
        uiStatus = 'canceled';
        isTerminalStatus = true;
        break;
      case 'failed':
      case 'call-dropped':
        uiStatus = 'failed';
        isTerminalStatus = true;
        break;
    }
    
    setCallLines(lines => lines.map(line => {
      if (line.id === data.lineId) {
        // Update the line with new status
        const updatedLine = { 
          ...line,
          name: data.contact?.name || line.name,
          phone: data.contact?.phone || line.phone,
          company: data.contact?.company || line.company,
          status: uiStatus,
          duration: data.duration || line.duration,
          isAnsweringMachine: data.isAnsweringMachine,
          answeredBy: data.answeredBy,
          disposition: data.disposition,
          callSid: data.callSid || line.callSid,
          callId: data.callId || line.callId
        };
        
        // IMPORTANT: If this is a terminal status, log it for debugging
        // handleCallEnded will handle the actual stats update and line reset
        if (isTerminalStatus) {
          console.log(`🔄 Terminal status detected for line ${line.id}: ${uiStatus} (AMD: ${data.answeredBy}) - awaiting 'ended' event`);
        }
        
        return updatedLine;
      }
      return line;
    }));
  }, []);

  const handleCallConnected = useCallback((event: any) => {
    const data = event.detail;
    console.log('📞 Parallel call connected event:', data);
    
    // Update UI state only - stats will be counted in handleCallEnded for accuracy
    setCallLines(lines => lines.map(line => {
      if (line.id === data.lineId) {
        return { 
          ...line,
          status: 'connected',
          duration: data.duration || 0,
          isAnsweringMachine: data.isAnsweringMachine,
          answeredBy: data.answeredBy,
          startTime: line.startTime || Date.now()
        };
      }
      return line;
    }));

    // Auto-skip voicemail if enabled - hangup immediately to free the line
    if (autoSkipVoicemailRef.current && data.isAnsweringMachine && data.callSid) {
      console.log('🤖 Auto-skipping voicemail, hanging up call:', data.callSid);
      apiRequest('POST', '/api/dialer/hangup', { callSid: data.callSid })
        .then(() => {
          console.log('✅ Successfully hung up voicemail');
        })
        .catch(error => {
          console.error('❌ Failed to hangup voicemail:', error);
          if (toastRef.current) {
            toastRef.current({
              title: "Failed to skip voicemail",
              description: "Could not automatically hang up the voicemail call",
              variant: "destructive"
            });
          }
        });
    }
  }, []);

  const handleCallEnded = useCallback((event: any) => {
    const data = event.detail;
    console.log('📞 Parallel call ended event:', data);
    
    // Use lineId only for stable tracking across events
    const lineKey = data.lineId;
    
    // Clear any pending line reset timeout to prevent race conditions
    const existingTimeout = lineResetTimeoutsRef.current.get(data.lineId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      lineResetTimeoutsRef.current.delete(data.lineId);
      console.log(`🔄 Cleared pending timeout for line ${data.lineId}`);
    }
    
    setCallLines(lines => lines.map(line => {
      if (line.id === data.lineId) {
        // Count stats exactly once per call based on final outcome
        // Use callSid for tracking instead of lineId since lines are reused
        const callKey = data.callSid || lineKey;
        if (line.status !== 'idle' && !statsRecordedLinesRef.current.has(callKey)) {
          statsRecordedLinesRef.current.add(callKey);
          
          // Determine final outcome category
          const isFailure = ['failed', 'busy', 'no-answer', 'canceled', 'call-dropped', 'paused'].includes(data.status);
          const isVoicemail = data.status === 'completed' && data.isAnsweringMachine;
          const isConnected = data.status === 'completed' && !data.isAnsweringMachine;
          
          // Count in exactly one category
          if (isFailure) {
            console.log(`📊 Counted failed call for line ${line.id} (status: ${data.status})`);
            setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
          } else if (isVoicemail) {
            console.log(`📊 Counted voicemail for line ${line.id}`);
            setStats(prev => ({ ...prev, voicemails: prev.voicemails + 1 }));
          } else if (isConnected) {
            console.log(`📊 Counted connected call for line ${line.id}`);
            setStats(prev => ({ ...prev, connected: prev.connected + 1 }));
            
            // Add talk time for completed human calls
            const callDuration = data.duration || line.duration || 0;
            if (callDuration > 0) {
              console.log(`📊 Recording talk time: ${callDuration}s for line ${line.id}`);
              setStats(prev => ({ ...prev, talkTime: prev.talkTime + callDuration }));
            }
          }
        } else if (statsRecordedLinesRef.current.has(callKey)) {
          console.log(`⏭️  Skipping stats for line ${line.id} - already counted for callSid ${callKey}`);
        }
        
        // IMMEDIATELY mark line as idle to trigger auto-dial
        console.log(`✅ Line ${line.id} reset to idle - ready for next call`);
        return {
          id: line.id,
          phone: '',
          name: '',
          status: 'idle',
          duration: 0
        };
      }
      return line;
    }));
  }, []);

  // WebSocket event listeners for real-time parallel dialer updates
  useEffect(() => {
    window.addEventListener('parallel_call_started', handleCallStarted);
    window.addEventListener('parallel_call_status', handleCallStatus);
    window.addEventListener('parallel_call_connected', handleCallConnected);
    window.addEventListener('parallel_call_ended', handleCallEnded);

    return () => {
      window.removeEventListener('parallel_call_started', handleCallStarted);
      window.removeEventListener('parallel_call_status', handleCallStatus);
      window.removeEventListener('parallel_call_connected', handleCallConnected);
      window.removeEventListener('parallel_call_ended', handleCallEnded);
    };
  }, [handleCallStarted, handleCallStatus, handleCallConnected, handleCallEnded]);

  // Listen for agent joining conference
  useEffect(() => {
    const handleConferenceReady = () => {
      if (conferenceActive && !conferenceReady) {
        console.log('✅ Agent joined conference - ready to start dialing');
        setConferenceReady(true);
        toast({
          title: "Conference Connected",
          description: "Starting dialer...",
          duration: 2000
        });
      }
    };

    window.addEventListener('conference_ready', handleConferenceReady);
    return () => window.removeEventListener('conference_ready', handleConferenceReady);
  }, [conferenceActive, conferenceReady, toast]);

  // Listen for primary call connected - stop auto-dialing
  useEffect(() => {
    const handlePrimaryConnected = (event: any) => {
      const data = event.detail;
      console.log('🎯 Primary call connected on line:', data.lineId, '- stopping auto-dial');
      
      // Pause the dialer to prevent new calls
      setIsPaused(true);
      
      toast({
        title: "Call Connected",
        description: "Primary call connected. Other lines paused.",
        duration: 3000
      });
    };

    window.addEventListener('parallel_dialer_primary_connected', handlePrimaryConnected);
    return () => window.removeEventListener('parallel_dialer_primary_connected', handlePrimaryConnected);
  }, [toast]);

  // Listen for calls being put on hold
  useEffect(() => {
    const handleCallOnHold = (event: any) => {
      const data = event.detail;
      console.log('🔇 Call on hold:', data.lineId, data.callSid);
      
      setCallLines(lines => lines.map(line => 
        line.id === data.lineId
          ? { ...line, status: 'on-hold' as any }
          : line
      ));
      
      toast({
        title: "Call On Hold",
        description: `Line ${data.lineId.split('-')[1]} is on hold`,
        duration: 3000
      });
    };

    window.addEventListener('parallel_dialer_call_on_hold', handleCallOnHold);
    return () => window.removeEventListener('parallel_dialer_call_on_hold', handleCallOnHold);
  }, [toast]);

  // Live duration tracking for connected calls + safety mechanism for stuck lines
  useEffect(() => {
    const warningShownRef = new Set<string>(); // Track which lines have shown warnings
    
    const interval = setInterval(() => {
      setCallLines(prevLines => 
        prevLines.map(line => {
          // Update duration for active calls
          if ((line.status === 'connected' || line.status === 'in-progress') && line.startTime) {
            const duration = Math.floor((Date.now() - line.startTime) / 1000);
            return { ...line, duration };
          }
          
          // SAFETY MECHANISM: Auto-reset lines stuck in transient states for too long
          // Only applies to dialing/ringing states - never auto-reset connected calls
          if (line.startTime && (line.status === 'dialing' || line.status === 'ringing')) {
            const timeInCurrentStatus = Math.floor((Date.now() - line.startTime) / 1000);
            
            // Very generous timeouts to accommodate poor network conditions
            const warningThreshold = line.status === 'dialing' ? 150 : 120; // 2.5min/2min
            const maxTimeInStatus = line.status === 'dialing' ? 180 : 150; // 3min/2.5min
            
            // Show warning at threshold
            if (timeInCurrentStatus === warningThreshold && !warningShownRef.has(line.id)) {
              warningShownRef.add(line.id);
              toast({
                title: "Call Taking Longer Than Expected",
                description: `Line ${line.id.split('-')[1]} (${line.name || line.phone}) has been ${line.status} for ${Math.floor(warningThreshold / 60)} minutes. Will auto-reset in ${Math.floor((maxTimeInStatus - warningThreshold) / 60)} minute if not resolved.`,
                variant: "default"
              });
              console.warn(`⚠️ Line ${line.id} stuck in '${line.status}' for ${timeInCurrentStatus}s - warning shown`);
            }
            
            // Auto-reset only as last resort
            if (timeInCurrentStatus > maxTimeInStatus) {
              console.error(`❌ Line ${line.id} stuck in '${line.status}' for ${timeInCurrentStatus}s - force auto-resetting`);
              toast({
                title: "Line Auto-Reset",
                description: `Line ${line.id.split('-')[1]} was stuck and has been reset. This may indicate network issues.`,
                variant: "destructive"
              });
              
              // Mark this as counted to prevent double-counting if 'ended' event arrives later
              const callKey = line.callSid || line.id;
              if (!statsRecordedLinesRef.current.has(callKey)) {
                statsRecordedLinesRef.current.add(callKey);
                setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
              }
              
              warningShownRef.delete(line.id);
              
              return {
                id: line.id,
                phone: '',
                name: '',
                status: 'idle' as const,
                duration: 0
              };
            }
          } else {
            // Clear warning flag if line changes state
            warningShownRef.delete(line.id);
          }
          
          return line;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [toast]);

  const dialNextBatch = useCallback(async () => {
    // Prevent concurrent executions to enforce CPS rate limiting
    if (isDialingBatchRef.current) {
      // Mark that a dial was requested while mutex was locked
      dialRequestedRef.current = true;
      console.log('⏳ Dial requested while batch in progress, will retry after completion');
      return;
    }
    
    if (isPaused || currentContactIndex >= queuedContacts.length) {
      setIsDialing(false);
      return;
    }

    // Clone current state to avoid stale closures
    const currentLines = [...callLines];
    const availableLines = currentLines.filter(line => line.status === 'idle');
    const contactsToDial = queuedContacts.slice(
      currentContactIndex, 
      currentContactIndex + availableLines.length
    );

    // If no idle lines, mark request and return
    // This ensures dialNextBatch retries when mutex unlocks or lines become idle
    if (contactsToDial.length === 0) {
      console.log('⏸️ No idle lines available - will retry when lines free up');
      dialRequestedRef.current = true;
      return;
    }

    // Set mutex to prevent concurrent executions
    isDialingBatchRef.current = true;

    try {
      // Calculate delay between calls based on CPS rate limit (default 1 CPS = 1000ms delay)
      const delayBetweenCalls = 1000 / callsPerSecond;
      
      let idleLineIndex = 0;
      let successfullyDialedCount = 0;
      
      // Dial contacts with CPS rate limiting
      for (let i = 0; i < contactsToDial.length; i++) {
        const contact = contactsToDial[i];
        
        // Skip if already dialed in this session to prevent duplicates
        if (dialedPhonesRef.current.has(contact.phone)) {
          console.log(`⏭️ Skipping ${contact.phone} - already dialed in this session`);
          successfullyDialedCount++;
          continue;
        }
      
      // Find next available idle line
      while (idleLineIndex < currentLines.length && currentLines[idleLineIndex].status !== 'idle') {
        idleLineIndex++;
      }
      
      if (idleLineIndex < currentLines.length) {
        const lineId = currentLines[idleLineIndex].id;
        
        // Update line to dialing status
        setCallLines(lines => lines.map(line => 
          line.id === lineId
            ? {
                id: lineId,
                contactId: contact.id,
                phone: contact.phone,
                name: contact.name,
                status: 'dialing' as const,
                duration: 0,
                startTime: Date.now()
              }
            : line
        ));

        // CRITICAL: Wait BEFORE making the API call to respect CPS limit
        // This ensures we don't exceed Twilio's rate limit
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenCalls));
        }

        // Initiate the call with rate limiting
        try {
          const response = await apiRequest('POST', '/api/dialer/parallel-call', {
            contactId: contact.id,
            phone: contact.phone,
            name: contact.name,
            lineId: lineId,
            amdEnabled,
            amdTimeout,
            amdSensitivity
          });
          
          if (response.ok) {
            const data = await response.json();
            successfullyDialedCount++;
            
            // Mark phone as dialed to prevent duplicates
            dialedPhonesRef.current.add(contact.phone);
            
            setCallLines(lines => lines.map(line => 
              line.id === lineId
                ? { ...line, callSid: data.callSid, status: 'ringing' as const }
                : line
            ));
          } else {
            const errorData = await response.json();
            
            // Show user-friendly error toast
            toast({
              title: "Call Failed",
              description: errorData.message || "Failed to initiate call",
              variant: "destructive"
            });
            
            setCallLines(lines => lines.map(line => 
              line.id === lineId
                ? { ...line, status: 'failed' as const }
                : line
            ));
            
            // Stop dialing if trial account error
            if (errorData.code === 'TRIAL_ACCOUNT_RESTRICTION') {
              setIsDialing(false);
              toast({
                title: "Trial Account Limitation",
                description: "Your Twilio account is in trial mode. Please verify phone numbers or upgrade to continue.",
                variant: "destructive"
              });
              return;
            }
            
            // Stats will be counted by handleCallEnded event when it arrives
            // Clean up any existing timeout to prevent race condition
            const existingTimeout = lineResetTimeoutsRef.current.get(lineId);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
              lineResetTimeoutsRef.current.delete(lineId);
            }
            
            // IMPORTANT: Count this as a dialed attempt so we move to next contact
            // This prevents infinite retries of the same failed contact
            successfullyDialedCount++;
            
            // Reset line to idle after brief delay to allow dialing next contact
            const timeoutId = setTimeout(() => {
              // Only reset if still actively dialing (not stopped)
              if (!isDialingRef.current) {
                lineResetTimeoutsRef.current.delete(lineId);
                return;
              }
              
              setCallLines(lines => 
                lines.map(line => 
                  line.id === lineId && line.status === 'failed'
                    ? { id: lineId, phone: '', name: '', status: 'idle' as const, duration: 0 }
                    : line
                )
              );
              lineResetTimeoutsRef.current.delete(lineId);
            }, 500);
            lineResetTimeoutsRef.current.set(lineId, timeoutId);
          }
        } catch (error: any) {
          setCallLines(lines => lines.map(line => 
            line.id === lineId
              ? { ...line, status: 'failed' as const }
              : line
          ));
          
          // CRITICAL: Prevent duplicate stat counting for rapid failures
          // Only increment stats if no timeout already exists for this line
          const existingTimeout = lineResetTimeoutsRef.current.get(lineId);
          if (!existingTimeout) {
            setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
          } else {
            // Cancel existing timeout to prevent race condition
            clearTimeout(existingTimeout);
            lineResetTimeoutsRef.current.delete(lineId);
          }
          
          // IMPORTANT: Count this as a dialed attempt so we move to next contact
          // This prevents infinite retries of the same failed contact
          successfullyDialedCount++;
          
          // Reset line to idle after brief delay to allow dialing next contact
          const timeoutId = setTimeout(() => {
            // Only reset if still actively dialing (not stopped)
            if (!isDialingRef.current) {
              lineResetTimeoutsRef.current.delete(lineId);
              return;
            }
            
            setCallLines(lines => 
              lines.map(line => 
                line.id === lineId && line.status === 'failed'
                  ? { id: lineId, phone: '', name: '', status: 'idle' as const, duration: 0 }
                  : line
              )
            );
            lineResetTimeoutsRef.current.delete(lineId);
          }, 500);
          lineResetTimeoutsRef.current.set(lineId, timeoutId);
        }

        idleLineIndex++;
      }
    }
      
    // Only increment index and stats by successfully initiated calls
    if (successfullyDialedCount > 0) {
      setCurrentContactIndex(prev => prev + successfullyDialedCount);
      setStats(prev => ({ ...prev, totalDialed: prev.totalDialed + successfullyDialedCount }));
    }
    } finally {
      // Release mutex to allow next batch
      isDialingBatchRef.current = false;
      
      // CRITICAL: Check if a dial was requested while mutex was locked
      // If so, schedule another dialNextBatch to process it
      if (dialRequestedRef.current) {
        dialRequestedRef.current = false;
        console.log('🔄 Processing queued dial request after batch completion...');
        
        // Use setTimeout to allow state updates to propagate before next batch
        setTimeout(() => {
          if (isDialingRef.current && !isPausedRef.current) {
            dialNextBatch();
          }
        }, 0);
      }
    }
  }, [currentContactIndex, queuedContacts, isPaused, amdEnabled, callLines, callsPerSecond, toast]);

  // Removed: Conference ready check - conference is now created on-demand when first human answers

  // Auto-dial when lines become idle (progressive dialing)
  useEffect(() => {
    if (!isDialing || isPaused) return;
    
    const hasIdleLines = callLines.some(line => line.status === 'idle');
    const hasMoreContacts = currentContactIndex < queuedContacts.length;
    
    if (hasIdleLines && hasMoreContacts) {
      console.log('🔄 Idle lines detected - auto-dialing next batch');
      dialNextBatch();
    }
  }, [callLines, isDialing, isPaused, currentContactIndex, queuedContacts.length, dialNextBatch]);

  const startDialing = async () => {
    if (!selectedListId) {
      toast({
        title: "Select a list",
        description: "Please select a contact list to start dialing",
        variant: "destructive"
      });
      return;
    }

    if (filteredContacts.length === 0) {
      toast({
        title: "No contacts",
        description: "The selected list has no contacts",
        variant: "destructive"
      });
      return;
    }

    // CRITICAL: Check if WebRTC device is registered and ready before starting
    // This ensures the agent's browser can receive incoming calls
    if (!isReady) {
      toast({
        title: "WebRTC Not Ready",
        description: "Your call device is not ready yet. Please wait a moment and try again.",
        variant: "destructive"
      });
      console.error('❌ Cannot start parallel dialer - WebRTC device not registered');
      return;
    }

    // Clear any previous primary call setting from prior sessions
    try {
      await apiRequest('POST', '/api/dialer/clear-primary-call', {});
      console.log('✅ Cleared previous primary call setting');
    } catch (error) {
      console.warn('⚠️ Failed to clear previous primary call setting:', error);
    }

    // UPFRONT CONFERENCE CREATION: Create conference and have agent join BEFORE dialing
    if (useConferenceMode) {
      console.log('🎯 Conference mode enabled - creating conference and joining agent BEFORE dialing');
      setConferenceActive(true);
      
      try {
        // Create conference and call agent to join
        const response = await apiRequest('POST', '/api/dialer/conference/create', {});
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Failed to create conference');
        }
        
        console.log('✅ Conference creation initiated, waiting for agent to join...');
        toast({
          title: "Joining Conference",
          description: "Please answer the incoming call to join the conference...",
          duration: 5000
        });
        
        // Conference ready will be set when agent joins (via conference_ready event)
        // The auto-dial effect will wait for conferenceReady to be true before dialing
      } catch (error: any) {
        console.error('❌ Failed to create conference:', error);
        toast({
          title: "Conference Error",
          description: error.message || "Failed to create conference",
          variant: "destructive"
        });
        setConferenceActive(false);
        return;
      }
    } else {
      console.log('🎯 Starting parallel dialer in direct call mode (conference disabled)');
    }

    // Create new abort controller for this dialing session
    abortControllerRef.current = new AbortController();
    
    // Filter out DNC contacts and contacts with 2+ call attempts
    let dncCount = 0;
    let maxAttemptsCount = 0;
    
    const eligibleContacts = filteredContacts.filter(contact => {
      // Skip DNC contacts
      if (contact.doNotCall) {
        dncCount++;
        console.log(`⛔ Skipping DNC contact: ${contact.name} (${contact.phone})`);
        return false;
      }
      
      // Skip contacts with 2 or more call attempts
      const callAttempts = contact.callAttempts || 0;
      if (callAttempts >= 2) {
        maxAttemptsCount++;
        console.log(`⏭️ Skipping contact with ${callAttempts} attempts: ${contact.name} (${contact.phone})`);
        return false;
      }
      
      return true;
    });
    
    // Update stats with skipped counts
    setStats(prev => ({
      ...prev,
      skippedDnc: prev.skippedDnc + dncCount,
      skippedMaxAttempts: prev.skippedMaxAttempts + maxAttemptsCount
    }));
    
    if (eligibleContacts.length === 0) {
      const skipReasons = [];
      if (dncCount > 0) skipReasons.push(`${dncCount} DNC`);
      if (maxAttemptsCount > 0) skipReasons.push(`${maxAttemptsCount} max attempts`);
      
      toast({
        title: "No Eligible Contacts",
        description: `All contacts filtered out: ${skipReasons.join(', ')}`,
        variant: "destructive"
      });
      return;
    }
    
    console.log(`📋 Filtered ${filteredContacts.length} contacts to ${eligibleContacts.length} eligible contacts (skipped: ${dncCount} DNC, ${maxAttemptsCount} max attempts)`);
    
    // Expand contacts to include all phone numbers (primary and alternate)
    const expandedContacts: Contact[] = [];
    eligibleContacts.forEach(contact => {
      // Add entry for primary phone
      if (contact.phone) {
        expandedContacts.push({
          ...contact,
          phone: contact.phone
        });
      }
      
      // Add entry for alternate phone if it exists (only if call attempts < 2)
      if (contact.alternatePhone && (contact.callAttempts || 0) < 2) {
        expandedContacts.push({
          ...contact,
          phone: contact.alternatePhone
        });
      }
    });
    
    console.log(`📞 Expanded ${eligibleContacts.length} contacts to ${expandedContacts.length} dial attempts (including alternate numbers)`);
    
    // Clear dialed phones tracker for new session
    dialedPhonesRef.current.clear();
    
    setQueuedContacts(expandedContacts);
    setCurrentContactIndex(0);
    setIsDialing(true);
    setIsPaused(false);
    
    console.log('✅ Starting parallel dialer - WebRTC device is ready and registered');
  };

  const stopDialing = async () => {
    setIsDialing(false);
    setIsPaused(false);
    
    // Abort all ongoing async operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Clear all pending line reset timeouts to prevent race conditions
    lineResetTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    lineResetTimeoutsRef.current.clear();
    
    // Clear stats tracking to prevent unbounded memory growth
    statsRecordedLinesRef.current.clear();
    console.log('🧹 Cleared stats tracking ref');
    
    // Hangup ALL active calls (including connected ones) with proper error handling
    callLines.forEach(async (line) => {
      if (line.callSid && line.status !== 'idle') {
        try {
          await apiRequest('POST', '/api/dialer/hangup', { callSid: line.callSid });
          console.log(`Hung up call ${line.callSid} (status: ${line.status})`);
        } catch (error) {
          console.error(`Failed to hangup call ${line.callSid}:`, error);
        }
      }
    });
    
    // End conference session
    try {
      console.log('🔚 Ending conference session...');
      const response = await apiRequest('POST', '/api/dialer/conference/end', {});
      if (response.ok) {
        console.log('✅ Conference session ended');
        setConferenceActive(false);
        setConferenceReady(false);
      }
    } catch (error) {
      console.error('Conference end error:', error);
    }
    
    initializeDialer();
    setCurrentContactIndex(0);
    setQueuedContacts([]);
  };

  const disconnectCall = async (callSid: string, lineId: string) => {
    try {
      // Find the line to get additional info for logging
      const line = callLines.find(l => l.id === lineId);
      console.log(`🔌 Disconnecting call:`, {
        callSid,
        lineId,
        lineName: line?.name,
        linePhone: line?.phone,
        lineStatus: line?.status
      });
      
      const response = await apiRequest('POST', '/api/dialer/hangup', { callSid });
      
      if (response.ok) {
        console.log(`✅ Call ${callSid} disconnected successfully`);
        
        // Update line status to completed immediately for better UX
        setCallLines(prev => prev.map(line => 
          line.id === lineId 
            ? { ...line, status: 'completed', callSid: undefined }
            : line
        ));
        
        toast({
          title: "Call Disconnected",
          description: "The call has been ended successfully.",
          duration: 2000
        });
      } else {
        const errorText = await response.text();
        console.error(`❌ Disconnect failed with status ${response.status}:`, errorText);
        throw new Error(errorText || 'Failed to disconnect call');
      }
    } catch (error: any) {
      console.error(`❌ Failed to disconnect call ${callSid}:`, error);
      toast({
        title: "Disconnect Failed",
        description: error.message || "Unable to disconnect the call.",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  const togglePause = () => {
    if (!isPaused) {
      // Pausing - abort ongoing operations and clear timeouts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        // Create new controller for when we resume
        abortControllerRef.current = new AbortController();
      }
      
      lineResetTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      lineResetTimeoutsRef.current.clear();
      console.log('⏸️ Dialer paused - aborted operations and cleared timeouts');
    } else {
      // Resuming
      console.log('▶️ Dialer resumed');
    }
    
    setIsPaused(!isPaused);
    if (isPaused) {
      dialNextBatch();
    }
  };

  // Initial dial when contacts are queued
  useEffect(() => {
    // Start dialing immediately - conference will be created on-demand when first human answers
    if (isDialing && !isPaused && queuedContacts.length > 0 && currentContactIndex === 0) {
      console.log('🎯 Starting initial dial batch');
      dialNextBatch();
    }
  }, [isDialing, isPaused, queuedContacts.length, currentContactIndex, dialNextBatch]);

  // Calculate connect rate
  useEffect(() => {
    if (stats.totalDialed > 0) {
      const connectRate = ((stats.connected / stats.totalDialed) * 100);
      const avgConnectTime = stats.connected > 0 ? Math.floor(stats.talkTime / stats.connected) : 0;
      setStats(prev => ({
        ...prev,
        connectRate: parseFloat(connectRate.toFixed(1)),
        avgConnectTime
      }));
    }
  }, [stats.totalDialed, stats.connected, stats.talkTime]);

  // Dial next batch when lines become idle
  useEffect(() => {
    // Wait for conference to be ready before dialing (or skip if no conference)
    const canStartDialing = !conferenceActive || conferenceReady;
    
    if (isDialing && !isPaused && currentContactIndex > 0 && canStartDialing) {
      const hasIdleLines = callLines.some(line => line.status === 'idle');
      if (hasIdleLines && currentContactIndex < queuedContacts.length) {
        dialNextBatch();
      }
    }
  }, [callLines, isDialing, isPaused, currentContactIndex, queuedContacts.length, conferenceActive, conferenceReady, dialNextBatch]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: ParallelCallLine['status']) => {
    switch (status) {
      case 'idle': return <Phone className="w-4 h-4 text-muted-foreground" />;
      case 'dialing': return <PhoneCall className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'ringing': return <Activity className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'answered': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'connected': return <Mic className="w-4 h-4 text-green-600 animate-pulse" />;
      case 'in-progress': return <Mic className="w-4 h-4 text-green-600 animate-pulse" />;
      case 'human-detected': return <CheckCircle className="w-4 h-4 text-green-500 animate-pulse" />;
      case 'machine-detected': return <MicOff className="w-4 h-4 text-orange-500" />;
      case 'voicemail': return <MicOff className="w-4 h-4 text-orange-500" />;
      case 'busy': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'no-answer': return <PhoneOff className="w-4 h-4 text-gray-500" />;
      case 'canceled': return <XCircle className="w-4 h-4 text-gray-600" />;
      case 'paused': return <Pause className="w-4 h-4 text-purple-500" />;
      case 'on-hold': return <Pause className="w-4 h-4 text-amber-500 animate-pulse" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getStatusColor = (status: ParallelCallLine['status']) => {
    switch (status) {
      case 'idle': return 'bg-gray-100 dark:bg-gray-800';
      case 'dialing': return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
      case 'ringing': return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
      case 'answered': return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
      case 'connected': return 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700';
      case 'in-progress': return 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700';
      case 'human-detected': return 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700';
      case 'machine-detected': return 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800';
      case 'voicemail': return 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800';
      case 'paused': return 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800';
      case 'on-hold': return 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800';
      case 'busy': return 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700';
      case 'no-answer': return 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600';
      case 'canceled': return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
      case 'failed': return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
      case 'completed': return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
    }
  };

  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-3 p-4 max-w-[1600px] mx-auto" data-testid="parallel-dialer-page">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Parallel Dialer</h2>
          </div>
          <Badge variant="outline" className="gap-1">
            <Zap className="w-3 h-3" />
            {parallelLines}x Speed
          </Badge>
          {conferenceActive && (
            <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
              <PhoneCall className="w-3 h-3" />
              Conference Active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isDialing ? (
            <Button 
              onClick={startDialing} 
              disabled={!isReady || !selectedListId}
              data-testid="button-start-dialing"
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Dialing
            </Button>
          ) : (
            <>
              <Button 
                onClick={togglePause} 
                variant="outline" 
                data-testid="button-pause-dialing"
                size="sm"
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              <Button 
                onClick={stopDialing} 
                variant="destructive"
                data-testid="button-stop-dialing"
                size="sm"
              >
                <PhoneOff className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          <Card className="border-muted">
            <CardContent className="pt-4 pb-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="contact-list" className="text-xs font-medium">Contact List</Label>
                  <Select value={selectedListId} onValueChange={setSelectedListId}>
                    <SelectTrigger id="contact-list" data-testid="select-contact-list" className="h-9">
                      <SelectValue placeholder="Select a list" />
                    </SelectTrigger>
                    <SelectContent>
                      {contactLists.map(list => (
                        <SelectItem key={list.id} value={list.id.toString()}>
                          {list.name} ({list.contactCount || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="parallel-lines" className="text-xs font-medium">Lines</Label>
                    <span className="text-xs font-semibold tabular-nums">{parallelLines}</span>
                  </div>
                  <Slider
                    id="parallel-lines"
                    min={2}
                    max={10}
                    step={1}
                    value={[parallelLines]}
                    onValueChange={(value) => setParallelLines(value[0])}
                    disabled={isDialing}
                    className="mt-1.5"
                    data-testid="slider-parallel-lines"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cps-rate" className="text-xs font-medium">CPS Rate</Label>
                    <span className="text-xs font-semibold tabular-nums">{callsPerSecond}</span>
                  </div>
                  <Slider
                    id="cps-rate"
                    min={0.5}
                    max={5}
                    step={0.5}
                    value={[callsPerSecond]}
                    onValueChange={(value) => setCallsPerSecond(value[0])}
                    disabled={isDialing}
                    className="mt-1.5"
                    data-testid="slider-cps-rate"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="amd"
                      checked={amdEnabled}
                      onCheckedChange={setAmdEnabled}
                      disabled={isDialing}
                      data-testid="switch-amd"
                      className="scale-90"
                    />
                    <Label htmlFor="amd" className="text-xs font-medium cursor-pointer">
                      AMD
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="auto-skip"
                      checked={autoSkipVoicemail}
                      onCheckedChange={setAutoSkipVoicemail}
                      disabled={isDialing}
                      data-testid="switch-auto-skip"
                      className="scale-90"
                    />
                    <Label htmlFor="auto-skip" className="text-xs font-medium cursor-pointer">
                      Auto-skip VM
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="conference-mode"
                      checked={useConferenceMode}
                      onCheckedChange={setUseConferenceMode}
                      disabled={isDialing}
                      data-testid="switch-conference-mode"
                      className="scale-90"
                    />
                    <Label htmlFor="conference-mode" className="text-xs font-medium cursor-pointer">
                      Conference Mode
                    </Label>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="h-7 text-xs"
                >
                  {showAdvanced ? 'Hide' : 'Advanced'}
                  <Settings className="w-3 h-3 ml-1" />
                </Button>
              </div>

              {showAdvanced && (
                <div className="space-y-3">
                  {/* Pre-recorded Greeting Configuration */}
                  <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="greeting-url" className="text-xs font-medium">Pre-recorded Greeting URL</Label>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id="greeting-url"
                          type="url"
                          placeholder="https://example.com/greeting.mp3"
                          value={greetingUrl}
                          onChange={(e) => setGreetingUrl(e.target.value)}
                          disabled={isDialing}
                          className="h-9 text-xs"
                          data-testid="input-greeting-url"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => saveGreetingMutation.mutate(greetingUrl)}
                          disabled={isDialing || saveGreetingMutation.isPending}
                          className="h-9 text-xs"
                        >
                          {saveGreetingMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Plays before connecting to agent. Leave empty to skip greeting.
                      </p>
                    </div>
                  </div>

                  {/* AMD Settings */}
                  {amdEnabled && (
                    <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="amd-timeout" className="text-xs font-medium">AMD Timeout</Label>
                            <span className="text-xs font-semibold tabular-nums">{amdTimeout}s</span>
                          </div>
                          <Slider
                            id="amd-timeout"
                            min={5}
                            max={60}
                            step={5}
                            value={[amdTimeout]}
                            onValueChange={(value) => setAmdTimeout(value[0])}
                            disabled={isDialing}
                            className="mt-1.5"
                            data-testid="slider-amd-timeout"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="amd-sensitivity" className="text-xs font-medium">AMD Sensitivity</Label>
                          <Select
                            value={amdSensitivity}
                            onValueChange={(value: 'standard' | 'high' | 'low') => setAmdSensitivity(value)}
                            disabled={isDialing}
                          >
                            <SelectTrigger id="amd-sensitivity" data-testid="select-amd-sensitivity" className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Active Lines
                </CardTitle>
                <Badge variant="secondary">
                  {currentContactIndex}/{queuedContacts.length} Dialed
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <div className="space-y-2">
                  {callLines.map((line, index) => (
                    <div
                      key={line.id}
                      className={cn(
                        "p-3 rounded-lg border transition-all",
                        getStatusColor(line.status)
                      )}
                      data-testid={`call-line-${index}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getStatusIcon(line.status)}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex-1 min-w-0 cursor-help">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium truncate">
                                    {line.name || `Line ${index + 1}`}
                                  </p>
                                  {line.isAnsweringMachine && (
                                    <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-950 border-orange-200">
                                      VM
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {line.phone || 'Waiting...'}
                                </p>
                                {(line.company || line.jobTitle) && line.status !== 'idle' && (
                                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                                    {line.jobTitle && <span className="truncate">{line.jobTitle}</span>}
                                    {line.jobTitle && line.company && <span>•</span>}
                                    {line.company && <span className="truncate">{line.company}</span>}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            {line.status !== 'idle' && (line.name || line.email || line.company || line.jobTitle) && (
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="space-y-2">
                                  <div className="font-semibold border-b pb-1.5 mb-1.5">
                                    Contact Details
                                  </div>
                                  {line.name && (
                                    <div className="flex items-start gap-2">
                                      <Users className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Name</p>
                                        <p className="text-sm font-medium">{line.name}</p>
                                      </div>
                                    </div>
                                  )}
                                  {line.phone && (
                                    <div className="flex items-start gap-2">
                                      <Phone className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Phone</p>
                                        <p className="text-sm font-medium">{line.phone}</p>
                                      </div>
                                    </div>
                                  )}
                                  {line.email && (
                                    <div className="flex items-start gap-2">
                                      <Mail className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Email</p>
                                        <p className="text-sm font-medium break-all">{line.email}</p>
                                      </div>
                                    </div>
                                  )}
                                  {line.jobTitle && (
                                    <div className="flex items-start gap-2">
                                      <Briefcase className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Job Title</p>
                                        <p className="text-sm font-medium">{line.jobTitle}</p>
                                      </div>
                                    </div>
                                  )}
                                  {line.company && (
                                    <div className="flex items-start gap-2">
                                      <Building2 className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Company</p>
                                        <p className="text-sm font-medium">{line.company}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {line.status}
                          </Badge>
                          {line.duration > 0 && (
                            <span className="text-sm font-mono text-muted-foreground tabular-nums">
                              {formatDuration(line.duration)}
                            </span>
                          )}
                          {line.status !== 'idle' && line.status !== 'completed' && line.status !== 'failed' && line.callSid && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => disconnectCall(line.callSid!, line.id)}
                              className="h-7 px-2"
                              data-testid={`button-disconnect-${line.id}`}
                              title="Disconnect this call"
                            >
                              <PhoneOff className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {line.status === 'ringing' && (
                        <Progress value={33} className="mt-2 h-1" />
                      )}
                      {(line.status === 'connected' || line.status === 'in-progress') && (
                        <Progress value={100} className="mt-2 h-1 bg-green-100 dark:bg-green-950" />
                      )}
                    </div>
                  ))}
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <Card className="border-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Session Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-muted rounded-lg">
                  <div className="text-xl font-bold tabular-nums">{stats.totalDialed}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Dialed</div>
                </div>
                <div className="p-2.5 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-xl font-bold text-green-600 dark:text-green-400 tabular-nums">{stats.connected}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Connected</div>
                </div>
                <div className="p-2.5 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <div className="text-xl font-bold text-orange-600 dark:text-orange-400 tabular-nums">{stats.voicemails}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Voicemails</div>
                </div>
                <div className="p-2.5 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">{stats.failed}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Failed</div>
                </div>
              </div>

              {(stats.skippedDnc > 0 || stats.skippedMaxAttempts > 0) && (
                <div className="pt-2 border-t space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Filtered Contacts</div>
                  <div className="grid grid-cols-2 gap-2">
                    {stats.skippedDnc > 0 && (
                      <div className="flex items-center justify-between text-xs p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                        <span className="text-yellow-700 dark:text-yellow-400">DNC</span>
                        <span className="font-bold text-yellow-700 dark:text-yellow-400 tabular-nums">{stats.skippedDnc}</span>
                      </div>
                    )}
                    {stats.skippedMaxAttempts > 0 && (
                      <div className="flex items-center justify-between text-xs p-2 bg-purple-50 dark:bg-purple-950 rounded">
                        <span className="text-purple-700 dark:text-purple-400">Max Attempts</span>
                        <span className="font-bold text-purple-700 dark:text-purple-400 tabular-nums">{stats.skippedMaxAttempts}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-1.5 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Connect Rate</span>
                  <span className="text-sm font-bold tabular-nums">
                    {stats.totalDialed > 0 
                      ? `${Math.round((stats.connected / stats.totalDialed) * 100)}%`
                      : '0%'
                    }
                  </span>
                </div>
                <Progress 
                  value={stats.totalDialed > 0 ? (stats.connected / stats.totalDialed) * 100 : 0} 
                  className="h-1.5"
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Avg. Connect</span>
                  <span className="text-sm font-semibold tabular-nums">{stats.avgConnectTime}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Talk Time</span>
                  <span className="text-sm font-semibold tabular-nums">{formatDuration(stats.talkTime)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted">
            <CardHeader className="pb-2">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity"
              >
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Quick Tips
                </CardTitle>
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex gap-2">
                  <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                  <p>Dials {parallelLines} contacts simultaneously</p>
                </div>
                <div className="flex gap-2">
                  <Zap className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                  <p>AMD detects voicemails automatically</p>
                </div>
                <div className="flex gap-2">
                  <TrendingUp className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                  <p>{parallelLines}x more efficient than manual</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
