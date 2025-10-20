import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, AlertTriangle, Settings } from 'lucide-react';
import { useMicrophonePermission } from '@/hooks/useMicrophonePermission';

interface MicrophonePermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPermissionGranted?: () => void;
}

export function MicrophonePermissionModal({ 
  open, 
  onOpenChange, 
  onPermissionGranted 
}: MicrophonePermissionModalProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const { permission, error, requestPermission } = useMicrophonePermission();

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        onPermissionGranted?.();
        onOpenChange(false);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const openBrowserSettings = () => {
    // Instructions for common browsers
    const userAgent = navigator.userAgent.toLowerCase();
    let instructions = '';
    
    if (userAgent.includes('chrome')) {
      instructions = 'Click the microphone icon in the address bar, then select "Always allow" for this site.';
    } else if (userAgent.includes('firefox')) {
      instructions = 'Click the shield icon in the address bar, then enable microphone permissions.';
    } else if (userAgent.includes('safari')) {
      instructions = 'Go to Safari > Preferences > Websites > Microphone, then allow access for this site.';
    } else {
      instructions = 'Check your browser settings to allow microphone access for this site.';
    }

    alert(`To enable microphone access:\n\n${instructions}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Microphone Permission Required
          </DialogTitle>
          <DialogDescription>
            Voice calling requires microphone access to work properly. Please allow microphone permissions to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mic className="h-4 w-4 text-green-600" />
              What you'll enable:
            </div>
            <ul className="text-sm text-muted-foreground ml-6 space-y-1">
              <li>• Make and receive voice calls</li>
              <li>• High-quality audio communication</li>
              <li>• Real-time voice features</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
              <Settings className="h-4 w-4" />
              Privacy Note:
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Your microphone is only used during active calls and is never recorded or stored without your permission.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleRequestPermission}
              disabled={isRequesting || permission === 'granted'}
              className="w-full"
            >
              {isRequesting ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Requesting Permission...
                </>
              ) : permission === 'granted' ? (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Permission Granted
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Allow Microphone Access
                </>
              )}
            </Button>

            {permission === 'denied' && (
              <Button variant="outline" onClick={openBrowserSettings}>
                <Settings className="h-4 w-4 mr-2" />
                Browser Settings Help
              </Button>
            )}

            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}