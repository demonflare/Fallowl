import { useEffect, useState, useRef } from "react";
import { useStore } from "@/store/useStore";
import { useTwilioDeviceV2 } from "@/hooks/useTwilioDeviceV2";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Pause, 
  Play, 
  X,
  User,
  Clock
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function CallNotificationBar() {
  const {
    currentView,
    setCurrentView,
    callStatus,
    setCallStatus,
    currentNumber,
    callStartTime,
    setCallStartTime,
    isMuted,
    setIsMuted,
    isOnHold,
    setIsOnHold,
    callerName,
    setIsMuted: setGlobalMuted,
    setIsOnHold: setGlobalHold,
    setIsRecording
  } = useStore();

  const { hangupCall, muteCall, holdCall } = useTwilioDeviceV2();

  const [callDuration, setCallDuration] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const barRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Show notification bar when on call but not on dialer page
  useEffect(() => {
    const shouldShow = ['connecting', 'connected', 'on-hold'].includes(callStatus) && currentView !== 'dialer';
    setIsVisible(shouldShow);
  }, [callStatus, currentView]);

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

  const handleEndCall = () => {
    // Actually disconnect the Twilio call
    hangupCall();
    
    // Update UI state
    setCallStatus('ended');
    setCallStartTime(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsOnHold(false);
    setIsRecording(false);
    setTimeout(() => {
      setCallStatus('ready');
    }, 1500);
  };

  const handleReturnToCall = () => {
    setCurrentView('dialer');
  };

  // Drag functionality - draggable from anywhere except interactive elements
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on interactive elements
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button, input, select, textarea, a');
    
    if (isInteractive || !barRef.current) return;
    
    e.preventDefault();
    setIsDragging(true);
    const rect = barRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && barRef.current) {
      // Use requestAnimationFrame for smooth dragging performance
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      rafRef.current = requestAnimationFrame(() => {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Keep the bar within viewport bounds
        const maxX = window.innerWidth - (barRef.current?.offsetWidth || 0);
        const maxY = window.innerHeight - (barRef.current?.offsetHeight || 0);
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }
  }, [isDragging, dragOffset]);

  const getStatusColor = () => {
    switch (callStatus) {
      case 'connecting':
        return 'bg-yellow-500';
      case 'connected':
        return 'bg-green-500';
      case 'on-hold':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return isOnHold ? 'On Hold' : 'Connected';
      case 'on-hold':
        return 'On Hold';
      default:
        return 'Unknown';
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      ref={barRef}
      onMouseDown={handleMouseDown}
      className={cn(
        "fixed z-50 max-w-4xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md shadow-md backdrop-blur-sm transition-shadow",
        isDragging ? "cursor-grabbing" : "cursor-grab hover:shadow-lg",
        "select-none"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        minWidth: '580px'
      }}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-1.5">
        {/* Left: Call Info */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0", getStatusColor())} />
          
          <div className="flex items-center gap-1 text-gray-900 dark:text-white">
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-medium text-xs truncate">
              {callerName || "Unknown Caller"}
            </span>
          </div>
          
          <div className="text-gray-600 dark:text-slate-300 text-xs truncate">
            {currentNumber}
          </div>
          
          <div className="flex items-center gap-1 text-gray-600 dark:text-slate-300 flex-shrink-0">
            <Clock className="w-3 h-3" />
            <span className="font-mono text-xs">
              {formatDuration(callDuration)}
            </span>
          </div>
          
          <div className="text-xs text-gray-700 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-sm flex-shrink-0">
            {getStatusText()}
          </div>
        </div>

        {/* Center: Quick Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <TooltipProvider>
            {/* Mute Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isMuted ? "default" : "outline"}
                  className={cn(
                    "w-7 h-7 p-0 rounded-full transition-all",
                    isMuted 
                      ? "bg-red-500 hover:bg-red-600 text-white" 
                      : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
                  )}
                  onClick={handleMute}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isMuted ? "Unmute" : "Mute"}</p>
              </TooltipContent>
            </Tooltip>

            {/* Hold Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isOnHold ? "default" : "outline"}
                  className={cn(
                    "w-7 h-7 p-0 rounded-full transition-all",
                    isOnHold 
                      ? "bg-orange-500 hover:bg-orange-600 text-white" 
                      : "text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
                  )}
                  onClick={handleHold}
                >
                  {isOnHold ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isOnHold ? "Resume" : "Hold"}</p>
              </TooltipContent>
            </Tooltip>

            {/* End Call Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="w-7 h-7 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all"
                  onClick={handleEndCall}
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>End Call</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Right: Navigation Actions */}
        <div className="flex items-center flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 px-2.5 py-0.5 h-7 text-xs transition-all"
            onClick={handleReturnToCall}
          >
            <Phone className="w-3 h-3 mr-1" />
            Return to Call
          </Button>
        </div>
      </div>
    </div>
  );
}