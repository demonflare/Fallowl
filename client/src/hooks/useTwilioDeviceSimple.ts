import { useCallback, useEffect, useRef, useState } from 'react';
import { Device } from '@twilio/voice-sdk';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useMicrophonePermission } from './useMicrophonePermission';
import { apiRequest } from '@/lib/queryClient';

interface TwilioDeviceState {
  device: Device | null;
  isReady: boolean;
  isConnecting: boolean;
  activeCall: any;
  incomingCall: any;
  error: string | null;
}

export function useTwilioDeviceSimple() {
  const { toast } = useToast();
  const { hasPermission, requestPermission } = useMicrophonePermission();
  const deviceRef = useRef<Device | null>(null);
  const [state, setState] = useState<TwilioDeviceState>({
    device: null,
    isReady: false,
    isConnecting: false,
    activeCall: null,
    incomingCall: null,
    error: null,
  });

  // Get Twilio status
  const { data: twilioStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/twilio/status'],
    refetchInterval: 30000,
  });

  // Get access token
  const { data: tokenData, refetch: refetchToken } = useQuery({
    queryKey: ['/api/twilio/access-token'],
    enabled: twilioStatus?.isConfigured && hasPermission,
    refetchInterval: 3300000, // 55 minutes
    staleTime: 3000000, // 50 minutes
  });

  // Simple device initialization
  const initializeDevice = useCallback(async () => {
    if (!tokenData?.accessToken || !twilioStatus?.isConfigured || !hasPermission) {
      console.log('❌ Cannot initialize: missing requirements');
      return;
    }

    if (deviceRef.current) {
      console.log('✅ Device already exists, skipping initialization');
      return;
    }

    try {
      console.log('🔑 Access token received successfully');
      console.log('✅ Access token obtained, initializing device...');
      
      setState(prev => ({ ...prev, isConnecting: true, error: null }));

      console.log('🔧 Creating new Twilio device...');
      const device = new Device(tokenData.accessToken, {
        logLevel: 'debug',
        answerOnBridge: true,
        allowIncomingWhileBusy: false,
        // Enable all call sounds
        sounds: {
          incoming: true,
          outgoing: true, 
          disconnect: true,
        },
        // Enhanced audio settings
        audioConstraints: {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
          }
        },
        // Force enable audio output
        enableImprovedSignalingErrorPrecision: true,
      });

      deviceRef.current = device;

      console.log('📱 Registering Twilio device...');

      // Device event listeners
      device.on('registered', () => {
        console.log('✅ Device registration completed');
        console.log('🎉 Device marked as ready after successful registration!');
        
        // Test audio setup
        console.log('🔊 Testing audio setup...');
        if (device.audio) {
          console.log('✅ Device audio object available');
        } else {
          console.warn('⚠️ Device audio object not available');
        }
        
        setState(prev => ({
          ...prev,
          device,
          isReady: true,
          isConnecting: false,
          error: null,
        }));

        // Register with backend
        apiRequest('POST', '/api/twilio/device/register').catch(console.error);

        toast({
          title: 'Phone ready',
          description: 'Connected to Twilio, ready to make calls',
        });
      });

      device.on('error', (error) => {
        console.error('❌ Device error:', error);
        setState(prev => ({
          ...prev,
          error: error.message,
          isConnecting: false,
        }));
      });

      device.on('incoming', (call) => {
        console.log('📞 Incoming call received');
        setState(prev => ({
          ...prev,
          incomingCall: call,
        }));

        // Setup call listeners for incoming calls
        if (call && typeof call.on === 'function') {
          call.on('accept', () => {
            console.log('✅ Incoming call accepted');
            setState(prev => ({
              ...prev,
              activeCall: call,
              incomingCall: null,
            }));


          });

          call.on('disconnect', () => {
            console.log('📞 Call ended');
            setState(prev => ({
              ...prev,
              activeCall: null,
              incomingCall: null,
            }));
          });

          call.on('error', (error: any) => {
            console.error('❌ Call error:', error);
            setState(prev => ({
              ...prev,
              activeCall: null,
              incomingCall: null,
            }));
          });
        }
      });

      // Ensure audio is enabled and set up speakers
      console.log('🔊 Setting up audio output...');
      
      // Try to set up speaker output
      try {
        if (device.audio) {
          // Get available audio devices
          const audioDevices = await device.audio.availableOutputDevices.get();
          console.log('Available audio devices:', audioDevices);
          
          if (audioDevices.length > 0) {
            // Set default speaker
            await device.audio.speakerDevices.set(audioDevices[0].deviceId);
            console.log('✅ Speaker output configured to:', audioDevices[0].label);
          }

          // Enable incoming call sounds
          device.audio.incoming(true);
          device.audio.outgoing(true);
          device.audio.disconnect(true);
          console.log('✅ Call sounds enabled');
        }
      } catch (audioError) {
        console.warn('⚠️ Audio setup warning:', audioError);
      }

      // Register the device
      console.log('📱 Registering device...');
      device.register();

    } catch (error: any) {
      console.error('❌ Device initialization failed:', error);
      setState(prev => ({
        ...prev,
        error: error.message,
        isConnecting: false,
      }));
    }
  }, [tokenData, twilioStatus, hasPermission, toast]);

  // Initialize device when conditions are met
  useEffect(() => {
    if (tokenData?.accessToken && twilioStatus?.isConfigured && hasPermission && !deviceRef.current) {
      initializeDevice();
    }
  }, [tokenData, twilioStatus, hasPermission, initializeDevice]);

  // Make outgoing call directly from browser device
  const makeCall = useCallback(async (to: string, from?: string) => {
    console.log('📞 Making direct call to:', to);

    // Ensure microphone permission is granted
    if (!hasPermission) {
      console.log('🎤 Requesting microphone permission...');
      const granted = await requestPermission();
      if (!granted) {
        toast({
          title: 'Microphone Required',
          description: 'Please allow microphone access to make calls',
          variant: 'destructive',
        });
        return;
      }
    }

    // Ensure device is ready and audio is working
    if (!deviceRef.current?.audio) {
      console.error('❌ No audio available on device');
      toast({
        title: 'Audio Not Available',
        description: 'Please refresh the page and allow audio permissions',
        variant: 'destructive',
      });
      return;
    }

    if (!deviceRef.current || !state.isReady) {
      toast({
        title: 'Phone not ready',
        description: 'Please wait for phone to connect',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('🚀 Connecting call directly from device...');
      
      // Make call directly from the browser device
      const call = await deviceRef.current.connect({
        params: { 
          To: to, 
          From: from || twilioStatus?.phoneNumber || '',
        }
      });

      console.log('✅ Call object created:', call);
      
      setState(prev => ({
        ...prev,
        activeCall: call,
      }));

      // Setup call listeners
      if (call && typeof call.on === 'function') {
        call.on('accept', () => {
          console.log('✅ Call connected');
          toast({
            title: 'Call connected',
            description: `Connected to ${to}`,
          });
        });

        call.on('disconnect', () => {
          console.log('📞 Call ended');
          setState(prev => ({
            ...prev,
            activeCall: null,
          }));
          toast({
            title: 'Call ended',
            description: 'Call disconnected',
          });
        });

        call.on('error', (error: any) => {
          console.error('❌ Call error:', error);
          setState(prev => ({
            ...prev,
            activeCall: null,
          }));
          toast({
            title: 'Call failed',
            description: error?.message || 'Unknown call error',
            variant: 'destructive',
          });
        });

        call.on('ringing', () => {
          console.log('📞 Call ringing - audio should play now');
          
          // Force audio context resume on ringing
          if (typeof window !== 'undefined' && window.AudioContext) {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioContext.state === 'suspended') {
              audioContext.resume().catch(console.error);
            }
          }
          
          toast({
            title: 'Calling...',
            description: `Ringing ${to}`,
          });
        });
      }

      toast({
        title: 'Call connecting',
        description: `Connecting to ${to}...`,
      });

    } catch (error: any) {
      console.error('❌ Call failed:', error);
      toast({
        title: 'Call failed',
        description: error.message || 'Failed to initiate call',
        variant: 'destructive',
      });
    }
  }, [state.isReady, hasPermission, requestPermission, toast, twilioStatus]);

  // Disconnect call
  const disconnectCall = useCallback(() => {
    if (state.activeCall) {
      state.activeCall.disconnect();
    }
  }, [state.activeCall]);

  // Accept incoming call
  const acceptCall = useCallback(() => {
    if (state.incomingCall) {
      state.incomingCall.accept();
      setState(prev => ({
        ...prev,
        activeCall: state.incomingCall,
        incomingCall: null,
      }));
    }
  }, [state.incomingCall]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (state.incomingCall) {
      state.incomingCall.reject();
      setState(prev => ({
        ...prev,
        incomingCall: null,
      }));
    }
  }, [state.incomingCall]);

  // Add missing methods to match interface
  const sendDTMF = useCallback((tone: string) => {
    if (state.activeCall && typeof state.activeCall.sendDigits === 'function') {
      state.activeCall.sendDigits(tone);
    }
  }, [state.activeCall]);

  const hangupCall = useCallback(() => {
    disconnectCall();
  }, [disconnectCall]);



  return {
    ...state,
    isConfigured: twilioStatus?.isConfigured || false,
    isLoading: statusLoading,
    phoneNumber: twilioStatus?.phoneNumber,
    deviceStatus: state.isReady ? 'registered' : state.isConnecting ? 'registering' : 'unregistered',
    makeCall,
    disconnectCall,
    hangupCall,
    acceptCall,
    rejectCall,
    sendDTMF,
    refreshToken: refetchToken,
  };
}