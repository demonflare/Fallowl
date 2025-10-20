import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface MicrophonePermissionState {
  permission: 'granted' | 'denied' | 'prompt' | 'unknown';
  isChecking: boolean;
  error: string | null;
  stream: MediaStream | null;
}

export const useMicrophonePermission = () => {
  const [state, setState] = useState<MicrophonePermissionState>({
    permission: 'unknown',
    isChecking: false,
    error: null,
    stream: null,
  });

  const { toast } = useToast();

  const checkPermission = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setState(prev => ({
        ...prev,
        permission: 'denied',
        error: 'Media devices not supported in this browser',
      }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, isChecking: true, error: null }));

      // Check permission status if available (non-intrusive check)
      if ('permissions' in navigator) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        if (permissionStatus.state === 'granted') {
          setState(prev => ({ ...prev, permission: 'granted', isChecking: false }));
          return true;
        } else if (permissionStatus.state === 'denied') {
          setState(prev => ({ ...prev, permission: 'denied', isChecking: false }));
          return false;
        } else {
          // Permission state is 'prompt' - user hasn't decided yet
          setState(prev => ({ ...prev, permission: 'prompt', isChecking: false }));
          return false;
        }
      }

      // Fallback for browsers without permissions API - assume prompt state
      setState(prev => ({ ...prev, permission: 'prompt', isChecking: false }));
      return false;

    } catch (error: any) {
      console.error('Microphone permission check failed:', error);
      
      // If permissions API fails, assume prompt state
      setState(prev => ({
        ...prev,
        permission: 'prompt',
        isChecking: false,
        error: null,
      }));

      return false;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    // First check current status without prompting
    const currentlyHasPermission = await checkPermission();
    
    if (currentlyHasPermission) {
      return true;
    }

    // Now actually request permission by accessing microphone (this triggers browser prompt)
    try {
      setState(prev => ({ ...prev, isChecking: true, error: null }));

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        } 
      });

      setState(prev => ({
        ...prev,
        permission: 'granted',
        isChecking: false,
        stream,
      }));

      return true;

    } catch (error: any) {
      console.error('Microphone permission request failed:', error);
      
      let permission: 'denied' | 'prompt' = 'denied';
      let errorMessage = 'Microphone access denied';

      if (error.name === 'NotAllowedError') {
        permission = 'denied';
        errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone device found. Please connect a microphone.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is being used by another application.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Microphone constraints not supported.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Microphone access blocked by security policy.';
      }

      setState(prev => ({
        ...prev,
        permission,
        isChecking: false,
        error: errorMessage,
      }));

      toast({
        title: 'Microphone Permission Required',
        description: errorMessage,
        variant: 'destructive',
      });

      return false;
    }
  }, [checkPermission, toast]);

  const releaseStream = useCallback(() => {
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
      setState(prev => ({ ...prev, stream: null }));
    }
  }, [state.stream]);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      releaseStream();
    };
  }, [releaseStream]);

  return {
    ...state,
    checkPermission,
    requestPermission,
    releaseStream,
    hasPermission: state.permission === 'granted',
  };
};