import { useWebSocket } from "@/hooks/useWebSocket";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function WebSocketStatusIndicator() {
  const { isConnected, connectionError } = useWebSocket();

  if (isConnected) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="flex items-center gap-2 text-green-600 dark:text-green-400"
              data-testid="websocket-status-connected"
            >
              <Wifi className="h-4 w-4" />
              <span className="text-xs font-medium hidden md:inline">Live</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Real-time connection active</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (connectionError) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="flex items-center gap-2 text-amber-600 dark:text-amber-400"
              data-testid="websocket-status-reconnecting"
            >
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-xs font-medium hidden md:inline">Reconnecting</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{connectionError}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="flex items-center gap-2 text-red-600 dark:text-red-400"
            data-testid="websocket-status-disconnected"
          >
            <WifiOff className="h-4 w-4" />
            <span className="text-xs font-medium hidden md:inline">Offline</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Real-time connection unavailable</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
