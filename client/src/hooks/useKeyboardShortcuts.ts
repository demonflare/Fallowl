import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useTwilioDeviceV2 } from '@/hooks/useTwilioDeviceV2';
import { useToast } from '@/hooks/use-toast';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts() {
  const { setCurrentView, callStatus } = useStore();
  const { hangupCall, activeCall } = useTwilioDeviceV2();
  const { toast } = useToast();

  useEffect(() => {
    const shortcuts: KeyboardShortcut[] = [
      {
        key: 'd',
        ctrl: true,
        description: 'Open Dialer',
        action: () => {
          setCurrentView('dialer');
          toast({
            title: 'Keyboard Shortcut',
            description: 'Navigated to Dialer',
          });
        },
      },
      {
        key: 'h',
        ctrl: true,
        description: 'Hangup Call',
        action: () => {
          if (activeCall) {
            hangupCall();
            toast({
              title: 'Keyboard Shortcut',
              description: 'Call ended',
            });
          }
        },
      },
      {
        key: 'k',
        ctrl: true,
        description: 'Focus Search',
        action: () => {
          const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search" i]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            toast({
              title: 'Keyboard Shortcut',
              description: 'Search focused',
            });
          }
        },
      },
      {
        key: '1',
        ctrl: true,
        description: 'Go to Dashboard',
        action: () => {
          setCurrentView('dashboard');
        },
      },
      {
        key: '2',
        ctrl: true,
        description: 'Go to Contacts',
        action: () => {
          setCurrentView('contacts');
        },
      },
      {
        key: '3',
        ctrl: true,
        description: 'Go to Call Log',
        action: () => {
          setCurrentView('call-log');
        },
      },
      {
        key: '4',
        ctrl: true,
        description: 'Go to SMS',
        action: () => {
          setCurrentView('sms');
        },
      },
      {
        key: '5',
        ctrl: true,
        description: 'Go to Recordings',
        action: () => {
          setCurrentView('recordings');
        },
      },
      {
        key: 'Escape',
        description: 'Hangup Call / Close Modal',
        action: () => {
          if (activeCall) {
            hangupCall();
          }
        },
      },
      {
        key: '/',
        ctrl: true,
        description: 'Show Keyboard Shortcuts',
        action: () => {
          toast({
            title: 'Keyboard Shortcuts',
            description: 'Ctrl+D: Dialer | Ctrl+H/Esc: Hangup | Ctrl+K: Search | Ctrl+1-5: Navigate',
          });
        },
      },
    ];

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' || 
                           target.isContentEditable;

      for (const shortcut of shortcuts) {
        const ctrlMatch = !shortcut.ctrl || (event.ctrlKey || event.metaKey);
        const shiftMatch = !shortcut.shift || event.shiftKey;
        const altMatch = !shortcut.alt || event.altKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          if (shortcut.key === 'Escape' || !isInputField || (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            shortcut.action();
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentView, hangupCall, activeCall, callStatus, toast]);
}
