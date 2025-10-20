import { useEffect, useRef, useCallback, useState } from "react";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";

interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
}

export function useWebSocket() {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      const token = await getAccessTokenSilently();
      
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log("🔌 Connecting to WebSocket:", wsUrl);

      const ws = new WebSocket(wsUrl, [`auth-${token}`]);

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log("📨 WebSocket message received:", message);

        switch (message.type) {
          case "connected":
            console.log("✅ WebSocket connection confirmed");
            break;

          case "new_call":
            console.log("📞 New call received:", message.data);
            queryClient.invalidateQueries({ 
              predicate: (query) => {
                return query.queryKey.some(key => 
                  typeof key === 'string' && (
                    key === "/api/calls" || 
                    key.startsWith("/api/calls/recent") ||
                    key.startsWith("/api/calls?") ||
                    key === "/api/calls/stats"
                  )
                );
              }
            });
            break;

          case "call_update":
            console.log("📞 Call updated:", message.data);
            queryClient.invalidateQueries({ 
              predicate: (query) => {
                return query.queryKey.some(key => 
                  typeof key === 'string' && (
                    key === "/api/calls" || 
                    key.startsWith("/api/calls/recent") ||
                    key.startsWith("/api/calls?") ||
                    key === "/api/calls/stats"
                  )
                );
              }
            });
            break;

          case "new_recording":
            console.log("🎙️ New recording received:", message.data);
            queryClient.invalidateQueries({ 
              predicate: (query) => {
                return query.queryKey.some(key => 
                  typeof key === 'string' && key.startsWith("/api/recordings")
                );
              }
            });
            break;

          case "recording_update":
            console.log("🎙️ Recording updated:", message.data);
            queryClient.invalidateQueries({ 
              predicate: (query) => {
                return query.queryKey.some(key => 
                  typeof key === 'string' && key.startsWith("/api/recordings")
                );
              }
            });
            break;

          case "pong":
            break;

          case "parallel_call_started":
            console.log("📞 Parallel call started:", message.data);
            window.dispatchEvent(new CustomEvent("parallel_call_started", { detail: message.data }));
            break;

          case "parallel_call_status":
            console.log("📞 Parallel call status update:", message.data);
            window.dispatchEvent(new CustomEvent("parallel_call_status", { detail: message.data }));
            break;

          case "parallel_call_connected":
            console.log("📞 Parallel call connected:", message.data);
            window.dispatchEvent(new CustomEvent("parallel_call_connected", { detail: message.data }));
            break;

          case "parallel_call_ended":
            console.log("📞 Parallel call ended:", message.data);
            window.dispatchEvent(new CustomEvent("parallel_call_ended", { detail: message.data }));
            break;

          case "conference-ready":
            console.log("✅ Conference ready:", message.data);
            window.dispatchEvent(new CustomEvent("conference_ready", { detail: message.data }));
            break;

          case "import_progress":
            console.log("📊 Import progress:", message.data);
            window.dispatchEvent(new CustomEvent("import_progress", { detail: message.data }));
            break;

          case "import_complete":
            console.log("✅ Import complete:", message.data);
            window.dispatchEvent(new CustomEvent("import_complete", { detail: message.data }));
            queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
            break;

          case "import_error":
            console.log("❌ Import error:", message.data);
            window.dispatchEvent(new CustomEvent("import_error", { detail: message.data }));
            break;

          default:
            console.log("📨 Unknown message type:", message.type);
        }
      } catch (error) {
        console.error("❌ Failed to parse WebSocket message:", error);
      }
    };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log("🔌 WebSocket disconnected");
        setIsConnected(false);
        wsRef.current = null;

        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms... (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          console.log("❌ Max reconnection attempts reached");
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("❌ Failed to get access token for WebSocket:", error);
    }
  }, [isAuthenticated, user?.id, getAccessTokenSilently, queryClient]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("⚠️ WebSocket not connected, cannot send message");
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const pingInterval = setInterval(() => {
      sendMessage({ type: "ping" });
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [sendMessage]);

  return {
    isConnected,
    sendMessage,
    connect,
    disconnect,
  };
}
