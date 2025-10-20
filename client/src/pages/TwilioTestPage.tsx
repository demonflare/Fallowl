import { useState } from 'react';
import { useTwilioDeviceV2 } from '@/hooks/useTwilioDeviceV2';
import TwilioDeviceStatus from '@/components/TwilioDeviceStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, PhoneCall, PhoneOff, Mic, MicOff } from 'lucide-react';

export default function TwilioTestPage() {
  const [testNumber, setTestNumber] = useState('');
  const [callInProgress, setCallInProgress] = useState(false);
  
  const {
    isReady,
    isConnecting,
    isConfigured,
    deviceStatus,
    activeCall,
    incomingCall,
    makeCall,
    acceptCall,
    rejectCall,
    hangupCall,
    sendDTMF,
    error,
    phoneNumber,
    microphonePermission,
    requestMicrophonePermission,
    connectionQuality
  } = useTwilioDeviceV2();

  const handleMakeCall = async () => {
    if (!testNumber) return;
    
    try {
      setCallInProgress(true);
      await makeCall(testNumber);
    } catch (error) {
      console.error('Call failed:', error);
      setCallInProgress(false);
    }
  };

  const handleHangup = () => {
    hangupCall();
    setCallInProgress(false);
  };

  const handleAcceptCall = () => {
    acceptCall();
    setCallInProgress(true);
  };

  const handleRejectCall = () => {
    rejectCall();
  };

  const handleDTMF = (tone: string) => {
    sendDTMF(tone);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Twilio Device Test
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test the Twilio Voice SDK integration
        </p>
      </div>

      {/* Device Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TwilioDeviceStatus variant="card" showMicButton={true} />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Device Information
            </CardTitle>
            <CardDescription>
              Current device and connection details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Status:</span>
                <span className="ml-2">{deviceStatus}</span>
              </div>
              <div>
                <span className="font-medium">Quality:</span>
                <span className="ml-2">{connectionQuality}</span>
              </div>
              <div>
                <span className="font-medium">Configured:</span>
                <span className="ml-2">{isConfigured ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="font-medium">Ready:</span>
                <span className="ml-2">{isReady ? 'Yes' : 'No'}</span>
              </div>
            </div>
            {phoneNumber && (
              <div className="text-sm">
                <span className="font-medium">Phone Number:</span>
                <span className="ml-2">{phoneNumber}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Microphone Permission */}
      {microphonePermission !== 'granted' && (
        <Alert>
          <Mic className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Microphone permission is required for voice calls.</span>
            <Button 
              size="sm" 
              onClick={requestMicrophonePermission}
              className="ml-4"
            >
              <MicOff className="h-4 w-4 mr-2" />
              Grant Permission
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Call Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Outbound Call */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5" />
              Make Call
            </CardTitle>
            <CardDescription>
              Enter a phone number to make a test call
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-number">Phone Number</Label>
              <Input
                id="test-number"
                type="tel"
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value)}
                placeholder="+1234567890"
                className="font-mono"
              />
            </div>
            <Button 
              onClick={handleMakeCall}
              disabled={!testNumber || !isReady || callInProgress || activeCall}
              className="w-full"
            >
              <PhoneCall className="h-4 w-4 mr-2" />
              {callInProgress ? 'Calling...' : 'Make Call'}
            </Button>
          </CardContent>
        </Card>

        {/* Call Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Call Status
            </CardTitle>
            <CardDescription>
              Current call information and controls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeCall && (
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Call SID:</span>
                  <span className="ml-2 font-mono text-xs">{activeCall.parameters?.CallSid}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Status:</span>
                  <span className="ml-2">{activeCall.status()}</span>
                </div>
                <Button 
                  onClick={handleHangup}
                  variant="destructive"
                  className="w-full"
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Hang Up
                </Button>
              </div>
            )}

            {incomingCall && (
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Incoming from:</span>
                  <span className="ml-2">{incomingCall.parameters?.From}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={handleAcceptCall}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Accept
                  </Button>
                  <Button 
                    onClick={handleRejectCall}
                    variant="destructive"
                  >
                    <PhoneOff className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {!activeCall && !incomingCall && (
              <div className="text-center text-muted-foreground">
                No active calls
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DTMF Keypad */}
      {activeCall && (
        <Card>
          <CardHeader>
            <CardTitle>DTMF Keypad</CardTitle>
            <CardDescription>
              Send touch tones during the call
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                <Button
                  key={digit}
                  onClick={() => handleDTMF(digit)}
                  variant="outline"
                  className="aspect-square"
                >
                  {digit}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}