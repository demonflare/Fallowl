import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Phone, 
  PhoneOff, 
  User
} from "lucide-react";
import { useTwilioDeviceV2 } from "@/hooks/useTwilioDeviceV2";

export default function IncomingCallScreen() {
  const { 
    callStatus, 
    incomingCallInfo
  } = useStore();

  const { acceptCall, rejectCall } = useTwilioDeviceV2();

  if (callStatus !== 'incoming' || !incomingCallInfo) {
    return null;
  }

  const handleAnswer = () => {
    // Accept the actual Twilio call - this will trigger the device manager's
    // call.on('accept') event which updates the global store state
    acceptCall();
  };

  const handleDecline = () => {
    // Reject the actual Twilio call - this will trigger the device manager's
    // call.on('reject') event which updates the global store state
    rejectCall();
  };

  return (
    <div className="bg-white dark:bg-gray-900 backdrop-blur-xl min-h-screen">
      {/* Header with status */}
      <div className="flex items-center justify-between p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Call Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-green-600 dark:text-green-400">Incoming</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-8">
        {/* Caller Avatar with ring animation */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping scale-110"></div>
          <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping animation-delay-150 scale-105"></div>
          <div className="absolute inset-0 rounded-full bg-blue-500/40 animate-ping animation-delay-300"></div>
          <Avatar className="w-32 h-32 relative z-10 ring-4 ring-blue-500/30 shadow-2xl">
            <AvatarFallback className="bg-blue-500 text-white text-3xl font-bold">
              <User className="w-16 h-16" />
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Caller Info */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {incomingCallInfo.name}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
            {incomingCallInfo.phone}
          </p>
        </div>

        {/* Control Buttons - Answer and Decline side by side */}
        <div className="flex items-center justify-center gap-8">
          <Button
            onClick={handleAnswer}
            size="lg"
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 animate-pulse"
          >
            <Phone className="w-7 h-7" />
          </Button>
          
          <Button
            onClick={handleDecline}
            size="lg"
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <PhoneOff className="w-7 h-7" />
          </Button>
        </div>
      </div>
    </div>
  );
}