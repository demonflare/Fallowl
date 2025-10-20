import { createRoot } from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App";
import "./index.css";

const domain = import.meta.env.VITE_AUTH0_DOMAIN || "auth.fallowl.com";
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID || "placeholder";

// Use Replit domain if available, otherwise use window.location.origin
// This ensures Auth0 redirect works correctly in Replit's environment
const replitDomains = import.meta.env.VITE_REPLIT_DOMAINS;

// Detect if we're in Replit environment by checking hostname
const isReplit = window.location.hostname.includes('replit.dev');
const redirectUri = replitDomains 
  ? `https://${replitDomains}` 
  : isReplit 
    ? `https://${window.location.hostname}`
    : window.location.origin;

// Don't use Management API audience for user authentication
// If you have a custom API, set VITE_AUTH0_AUDIENCE in your environment
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

console.log("Auth0 Config:", {
  domain,
  clientId: clientId.substring(0, 8) + "...",
  redirect_uri: redirectUri,
  audience: audience || 'none (basic auth)'
});

const onRedirectCallback = (appState: any) => {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  const errorDescription = params.get('error_description');
  
  if (error) {
    console.error('Auth0 Error:', error, errorDescription);
    // Store error in sessionStorage so App can display it
    sessionStorage.setItem('auth0_error', JSON.stringify({ error, errorDescription }));
  }
  
  // Navigate to the target URL or home
  window.history.replaceState(
    {},
    document.title,
    appState?.returnTo || window.location.pathname
  );
};

createRoot(document.getElementById("root")!).render(
  <Auth0Provider
    domain={domain}
    clientId={clientId}
    authorizationParams={{
      redirect_uri: redirectUri,
      ...(audience ? { audience } : {}),
      scope: "openid profile email"
    }}
    onRedirectCallback={onRedirectCallback}
  >
    <App />
  </Auth0Provider>
);
