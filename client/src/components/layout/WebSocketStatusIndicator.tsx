import { useWebSocket } from "@/hooks/useWebSocket";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export function WebSocketStatusIndicator() {
  const { isConnected, connectionError, connect } = useWebSocket();

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
    const isMaxAttemptsReached = connectionError.includes("Max reconnection attempts");
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 h-auto p-1"
              onClick={isMaxAttemptsReached ? connect : undefined}
              disabled={!isMaxAttemptsReached}
              data-testid="websocket-status-reconnecting"
            >
              <RefreshCw className={`h-4 w-4 ${!isMaxAttemptsReached ? 'animate-spin' : ''}`} />
              <span className="text-xs font-medium hidden md:inline">
                {isMaxAttemptsReached ? 'Retry' : 'Reconnecting'}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{connectionError}</p>
            {isMaxAttemptsReached && <p className="text-xs mt-1">Click to retry connection</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 h-auto p-1"
            onClick={connect}
            data-testid="websocket-status-disconnected"
          >
            <WifiOff className="h-4 w-4" />
            <span className="text-xs font-medium hidden md:inline">Connect</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Real-time connection unavailable</p>
          <p className="text-xs mt-1">Click to connect</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
