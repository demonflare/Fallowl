import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Mic, 
  MicOff, 
  Phone, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Monitor,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MicrophonePermissionModalV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

export const MicrophonePermissionModalV2 = ({
  open,
  onOpenChange,
  onPermissionGranted,
  onPermissionDenied
}: MicrophonePermissionModalV2Props) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [error, setError] = useState<string | null>(null);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        }
      });

      // Stop the stream immediately - we just needed to check permission
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionStatus('granted');
      onPermissionGranted();
      
      // Auto-close modal after success
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);

    } catch (err: any) {
      console.error('Microphone permission request failed:', err);
      setPermissionStatus('denied');
      
      let errorMessage = 'Microphone access was denied.';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission was denied. Please allow microphone access to use voice features.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No microphone device found. Please connect a microphone and try again.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Microphone is being used by another application. Please close other applications and try again.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Microphone constraints are not supported by your device.';
      }
      
      setError(errorMessage);
      onPermissionDenied();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    onPermissionDenied();
    onOpenChange(false);
  };

  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome')) {
      return {
        icon: Monitor,
        name: 'Chrome',
        instructions: [
          'Click the microphone icon in the address bar',
          'Select "Allow" for microphone access',
          'Refresh the page if needed'
        ]
      };
    } else if (userAgent.includes('Firefox')) {
      return {
        icon: Monitor,
        name: 'Firefox',
        instructions: [
          'Click the microphone icon in the address bar',
          'Select "Allow" to grant microphone access',
          'Check "Remember this decision" to avoid future prompts'
        ]
      };
    } else if (userAgent.includes('Safari')) {
      return {
        icon: Monitor,
        name: 'Safari',
        instructions: [
          'Go to Safari > Settings > Websites',
          'Click "Microphone" in the left sidebar',
          'Set this website to "Allow"'
        ]
      };
    } else {
      return {
        icon: Monitor,
        name: 'Browser',
        instructions: [
          'Look for a microphone icon in your browser',
          'Click "Allow" when prompted for microphone access',
          'Refresh the page if needed'
        ]
      };
    }
  };

  const browserInfo = getBrowserInstructions();
  const BrowserIcon = browserInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Microphone Permission Required
          </DialogTitle>
          <DialogDescription>
            To make and receive calls, we need access to your microphone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Permission Status */}
          {permissionStatus === 'unknown' && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Mic className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900 dark:text-blue-100">
                      Microphone Access
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                      Your microphone will be used only for voice calls. We don't record or store any audio.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {permissionStatus === 'granted' && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <h3 className="font-medium text-green-900 dark:text-green-100">
                      Permission Granted
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-200">
                      You can now make and receive calls!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {permissionStatus === 'denied' && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-900 dark:text-red-100">
                      Permission Denied
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-200 mt-1">
                      {error || 'Microphone access was denied.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Browser Instructions */}
          {permissionStatus === 'denied' && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <BrowserIcon className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-orange-900 dark:text-orange-100">
                      Enable in {browserInfo.name}
                    </h3>
                    <ul className="text-sm text-orange-700 dark:text-orange-200 mt-1 space-y-1">
                      {browserInfo.instructions.map((instruction, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="font-medium text-orange-600 mt-0.5">•</span>
                          {instruction}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Privacy Notice */}
          <Card className="border-gray-200 bg-gray-50 dark:bg-gray-900/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    Privacy & Security
                  </h3>
                  <ul className="text-sm text-gray-700 dark:text-gray-200 mt-1 space-y-1">
                    <li>• Microphone is used only during active calls</li>
                    <li>• No audio recording or storage</li>
                    <li>• Secure encrypted voice transmission</li>
                    <li>• You can revoke permission anytime</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleRequestPermission}
              disabled={isRequesting || permissionStatus === 'granted'}
              className="flex-1"
            >
              {isRequesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Requesting...
                </>
              ) : permissionStatus === 'granted' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Granted
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Allow Microphone
                </>
              )}
            </Button>
            
            {permissionStatus !== 'granted' && (
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={isRequesting}
                className="px-4"
              >
                Skip
              </Button>
            )}
          </div>

          {/* Skip Notice */}
          {permissionStatus === 'unknown' && (
            <p className="text-xs text-muted-foreground text-center">
              You can enable microphone access later in Settings to use voice features
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MicrophonePermissionModalV2;