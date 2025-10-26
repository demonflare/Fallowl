/**
 * WebSocket configuration utility for environment-aware connection URLs
 * Handles different environments: Replit, production, and local development
 */

export interface WebSocketConfig {
  url: string;
  reconnectOptions: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
  };
  heartbeatInterval: number;
}

/**
 * Get the appropriate WebSocket URL based on the current environment
 */
export function getWebSocketUrl(): string {
  // Use the same protocol as the current page (ws: for http:, wss: for https:)
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  
  // In Replit, always use the current host
  // This handles both .replit.dev and .replit.app domains
  const host = window.location.host;
  
  // WebSocket path configured on the server
  const path = "/ws";
  
  const url = `${protocol}//${host}${path}`;
  
  console.log("🔧 WebSocket URL configured:", url);
  return url;
}

/**
 * Get WebSocket configuration with reconnection settings
 */
export function getWebSocketConfig(): WebSocketConfig {
  return {
    url: getWebSocketUrl(),
    reconnectOptions: {
      maxAttempts: 10, // Increased from 5 for better reliability
      baseDelay: 1000, // Start with 1 second
      maxDelay: 30000, // Max 30 seconds between attempts
    },
    heartbeatInterval: 30000, // Send ping every 30 seconds
  };
}

/**
 * Calculate exponential backoff delay for reconnection attempts
 */
export function getReconnectDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return delay + jitter;
}

/**
 * Check if the current environment is production
 */
export function isProduction(): boolean {
  return import.meta.env.MODE === 'production' || 
         window.location.hostname.includes('.replit.app');
}

/**
 * Check if the current environment is Replit
 */
export function isReplit(): boolean {
  return window.location.hostname.includes('.replit.dev') || 
         window.location.hostname.includes('.replit.app');
}
