import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { useTwilioDeviceV2 } from "@/hooks/useTwilioDeviceV2";
import { useContactByPhone, useUpsertContact } from "@/hooks/useContacts";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import SmartContactModal from "@/components/contacts/SmartContactModal";
import { useToast } from "@/hooks/use-toast";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Pause, 
  Play, 
  User, 
  UserPlus,
  Circle,
  Square,
  Grid3x3
} from "lucide-react";

export default function OnCallScreen() {
  const {
    callStatus,
    setCallStatus,
    currentNumber,
    callStartTime,
    setCallStartTime,
    isMuted,
    setIsMuted,
    isOnHold,
    setIsOnHold,
    isRecording,
    setIsRecording,
    callerName,
    setCallerName
  } = useStore();

  const { hangupCall, muteCall, holdCall, sendDTMF, isMuted: getTwilioMuted } = useTwilioDeviceV2();
  const { toast } = useToast();
  
  // Contact hooks
  const existingContact = useContactByPhone(currentNumber);
  const upsertContactMutation = useUpsertContact();

  const [callDuration, setCallDuration] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDTMFPad, setShowDTMFPad] = useState(false);

  // Update caller name based on contact lookup
  useEffect(() => {
    if (existingContact && currentNumber) {
      setCallerName(existingContact.name);
    } else if (currentNumber && !callerName) {
      // Set default caller name if no contact found
      setCallerName('Unknown Caller');
    }
  }, [existingContact, currentNumber, setCallerName, callerName]);

  // Update call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'connected' && callStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - callStartTime.getTime()) / 1000);
        setCallDuration(duration);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus, callStartTime]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting':
        return 'Calling...';
      case 'connected':
        return isOnHold ? 'On Hold' : 'Connected';
      case 'on-hold':
        return 'On Hold';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'connecting':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'connected':
        return isOnHold ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400';
      case 'on-hold':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const handleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    muteCall(newMuteState);
  };

  const handleHold = () => {
    const newHoldState = !isOnHold;
    setIsOnHold(newHoldState);
    holdCall(newHoldState);
    if (newHoldState) {
      setCallStatus('on-hold');
    } else {
      setCallStatus('connected');
    }
  };

  const handleRecord = () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    
    if (newRecordingState) {
      toast({
        title: "Recording Started",
        description: "Call recording is now active",
      });
    } else {
      toast({
        title: "Recording Stopped", 
        description: "Call recording has been stopped",
      });
    }
    
    // Note: Twilio handles recording automatically via TwiML, 
    // this UI state helps user track recording status
  };

  const handleEndCall = () => {
    // Actually disconnect the Twilio call
    hangupCall();
    
    // Update UI state
    setCallStatus('ended');
    setCallStartTime(null);
    setIsMuted(false);
    setIsOnHold(false);
    setIsRecording(false);
  };

  const handleSaveContact = () => {
    setShowContactModal(true);
  };

  const handleDTMF = (digit: string) => {
    sendDTMF(digit);
    toast({
      title: "DTMF Sent",
      description: `Sent tone: ${digit}`,
      duration: 1000,
    });
  };

  const dtmfKeypad = [
    { digit: '1', letters: '' },
    { digit: '2', letters: 'ABC' },
    { digit: '3', letters: 'DEF' },
    { digit: '4', letters: 'GHI' },
    { digit: '5', letters: 'JKL' },
    { digit: '6', letters: 'MNO' },
    { digit: '7', letters: 'PQRS' },
    { digit: '8', letters: 'TUV' },
    { digit: '9', letters: 'WXYZ' },
    { digit: '*', letters: '' },
    { digit: '0', letters: '+' },
    { digit: '#', letters: '' },
  ];

  return (
    <div className="bg-gradient-to-br from-white/90 via-gray-50/80 to-blue-50/90 dark:from-slate-900/90 dark:via-slate-800/80 dark:to-slate-900/90 backdrop-blur-md flex flex-col h-full max-h-full overflow-hidden">
      {/* Ultra Compact Top Status Bar */}
      <div className="flex justify-between items-center px-4 py-2 bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm border-b border-white/20 dark:border-slate-700/30">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-gray-900 dark:text-white">Call Active</span>
        </div>
        <div className={cn("text-xs font-medium", getStatusColor())}>
          {getStatusText()}
        </div>
      </div>

      {/* Centered Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-3 min-h-0">
        {/* Centered Avatar */}
        <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mb-4 ring-2 ring-white/20 dark:ring-slate-700/30">
          <User className="w-14 h-14 text-white" />
        </div>

        {/* User Info */}
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2 drop-shadow-sm text-center">
          {callerName || "Unknown Caller"}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 drop-shadow-sm text-center">
          {currentNumber}
        </p>

        {/* Timer */}
        <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 dark:border-slate-700/30 shadow-lg mb-6">
          <span className="text-lg font-mono font-medium text-gray-900 dark:text-white drop-shadow-sm">
            {formatDuration(callDuration)}
          </span>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm border-t border-white/20 dark:border-slate-700/30 px-4 py-5">
        <div className="flex items-center justify-center gap-4 max-w-lg mx-auto">
          <TooltipProvider>
            {/* Hold Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="lg"
                  variant={isOnHold ? "default" : "outline"}
                  className={cn(
                    "w-12 h-12 rounded-full backdrop-blur-sm shadow-lg flex-shrink-0",
                    isOnHold 
                      ? "bg-orange-500/90 hover:bg-orange-600/90 text-white border-orange-500/50" 
                      : "border-white/30 dark:border-slate-700/30 hover:border-white/50 dark:hover:border-slate-600/50 bg-white/40 dark:bg-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-600/60 text-gray-700 dark:text-gray-300"
                  )}
                  onClick={handleHold}
                >
                  {isOnHold ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isOnHold ? "Resume" : "Hold"}</p>
              </TooltipContent>
            </Tooltip>

            {/* Mute Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="lg"
                  variant={isMuted ? "destructive" : "outline"}
                  className={cn(
                    "w-12 h-12 rounded-full backdrop-blur-sm shadow-lg flex-shrink-0",
                    isMuted 
                      ? "bg-red-500/90 hover:bg-red-600/90 text-white border-red-500/50" 
                      : "border-white/30 dark:border-slate-700/30 hover:border-white/50 dark:hover:border-slate-600/50 bg-white/40 dark:bg-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-600/60 text-gray-700 dark:text-gray-300"
                  )}
                  onClick={handleMute}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isMuted ? "Unmute" : "Mute"}</p>
              </TooltipContent>
            </Tooltip>

            {/* End Call Button - Largest */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="lg"
                  className="w-14 h-14 rounded-full bg-red-500/90 hover:bg-red-600/90 text-white border-red-500/50 shadow-xl backdrop-blur-sm flex-shrink-0"
                  onClick={handleEndCall}
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>End Call</p>
              </TooltipContent>
            </Tooltip>

            {/* Save Contact Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-12 h-12 rounded-full border-white/30 dark:border-slate-700/30 hover:border-white/50 dark:hover:border-slate-600/50 bg-white/40 dark:bg-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-600/60 text-gray-700 dark:text-gray-300 backdrop-blur-sm shadow-lg flex-shrink-0"
                  onClick={() => setShowContactModal(true)}
                >
                  <UserPlus className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save Contact</p>
              </TooltipContent>
            </Tooltip>

            {/* Recording Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="lg"
                  variant={isRecording ? "default" : "outline"}
                  className={cn(
                    "w-12 h-12 rounded-full backdrop-blur-sm shadow-lg flex-shrink-0",
                    isRecording 
                      ? "bg-red-500/90 hover:bg-red-600/90 text-white border-red-500/50" 
                      : "border-white/30 dark:border-slate-700/30 hover:border-white/50 dark:hover:border-slate-600/50 bg-white/40 dark:bg-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-600/60 text-gray-700 dark:text-gray-300"
                  )}
                  onClick={handleRecord}
                >
                  {isRecording ? <Square className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRecording ? "Stop Recording" : "Start Recording"}</p>
              </TooltipContent>
            </Tooltip>

            {/* DTMF Keypad Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="lg"
                  variant={showDTMFPad ? "default" : "outline"}
                  className={cn(
                    "w-12 h-12 rounded-full backdrop-blur-sm shadow-lg flex-shrink-0",
                    showDTMFPad 
                      ? "bg-blue-500/90 hover:bg-blue-600/90 text-white border-blue-500/50" 
                      : "border-white/30 dark:border-slate-700/30 hover:border-white/50 dark:hover:border-slate-600/50 bg-white/40 dark:bg-slate-700/40 hover:bg-white/60 dark:hover:bg-slate-600/60 text-gray-700 dark:text-gray-300"
                  )}
                  onClick={() => setShowDTMFPad(!showDTMFPad)}
                  data-testid="button-dtmf-keypad"
                >
                  <Grid3x3 className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>DTMF Keypad</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* DTMF Keypad */}
      {showDTMFPad && (
        <div className="absolute bottom-20 left-0 right-0 px-4 pb-4 z-50">
          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg rounded-2xl shadow-2xl p-6 max-w-sm mx-auto border border-white/30 dark:border-slate-700/30">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
              DTMF Keypad
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {dtmfKeypad.map((key) => (
                <Button
                  key={key.digit}
                  size="lg"
                  variant="outline"
                  className="h-16 text-xl font-semibold bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 border-gray-200 dark:border-slate-600"
                  onClick={() => handleDTMF(key.digit)}
                  data-testid={`button-dtmf-${key.digit}`}
                >
                  <div className="flex flex-col items-center">
                    <span>{key.digit}</span>
                    {key.letters && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {key.letters}
                      </span>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      <SmartContactModal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
        contact={existingContact || {
          id: 0,
          name: callerName || '',
          phone: currentNumber || '',
          email: '',
          company: '',
          notes: `Added during call on ${new Date().toLocaleDateString()}`,
          leadSource: 'call',
          priority: 'medium',
          tags: []
        } as any}
      />
    </div>
  );
}