import { useAuth0 } from "@auth0/auth0-react";
import { useQueryClient } from "@tanstack/react-query";

export function useAuth() {
  const { 
    user: auth0User, 
    isAuthenticated, 
    isLoading, 
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
    error: auth0Error
  } = useAuth0();
  
  const queryClient = useQueryClient();

  const user = auth0User ? {
    id: auth0User.sub ? parseInt(auth0User.sub.split('|')[1] || '0') : 0,
    username: auth0User.name || auth0User.email || '',
    email: auth0User.email || '',
    role: auth0User['https://app.com/roles']?.[0] || 'user',
    status: 'active',
  } : null;

  const login = {
    mutate: () => loginWithRedirect(),
    mutateAsync: async () => {
      await loginWithRedirect();
    },
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
  };

  const logout = {
    mutate: () => {
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
      queryClient.clear();
      auth0Logout({ 
        logoutParams: { 
          returnTo: window.location.origin 
        } 
      });
    },
    mutateAsync: async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } catch (error) {
        console.error('Backend logout failed:', error);
      }
      queryClient.clear();
      await auth0Logout({ 
        logoutParams: { 
          returnTo: window.location.origin 
        } 
      });
    },
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    getAccessTokenSilently,
    error: auth0Error,
  };
}