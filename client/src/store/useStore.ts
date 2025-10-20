import { create } from 'zustand';

interface AppState {
  currentView: string;
  setCurrentView: (view: string) => void;
  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  currentNumber: string;
  setCurrentNumber: (number: string) => void;
  callStatus: 'ready' | 'connecting' | 'connected' | 'ended' | 'failed' | 'on-hold' | 'incoming';
  setCallStatus: (status: 'ready' | 'connecting' | 'connected' | 'ended' | 'failed' | 'on-hold' | 'incoming') => void;
  selectedContact: number | null;
  setSelectedContact: (contactId: number | null) => void;
  // On-call screen state
  callStartTime: Date | null;
  setCallStartTime: (time: Date | null) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  isOnHold: boolean;
  setIsOnHold: (hold: boolean) => void;
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  callNotes: string;
  setCallNotes: (notes: string) => void;
  callerName: string;
  setCallerName: (name: string) => void;
  // Incoming call state
  incomingCallInfo: {
    name: string;
    phone: string;
    avatar?: string;
    company?: string;
    location?: string;
    priority?: string;
    tags?: string[];
    relationship?: string;
    lastContact?: string;
  } | null;
  setIncomingCallInfo: (info: {
    name: string;
    phone: string;
    avatar?: string;
    company?: string;
    location?: string;
    priority?: string;
    tags?: string[];
    relationship?: string;
    lastContact?: string;
  } | null) => void;
}

export const useStore = create<AppState>((set) => ({
  currentView: 'dashboard',
  setCurrentView: (view) => set({ currentView: view }),
  sidebarExpanded: false,
  setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  darkMode: false,
  setDarkMode: (dark) => set({ darkMode: dark }),
  currentNumber: '',
  setCurrentNumber: (number) => set({ currentNumber: number }),
  callStatus: 'ready',
  setCallStatus: (status) => set({ callStatus: status }),
  selectedContact: null,
  setSelectedContact: (contactId) => set({ selectedContact: contactId }),
  // On-call screen state
  callStartTime: null,
  setCallStartTime: (time) => set({ callStartTime: time }),
  isMuted: false,
  setIsMuted: (muted) => set({ isMuted: muted }),
  isOnHold: false,
  setIsOnHold: (hold) => set({ isOnHold: hold }),
  isRecording: false,
  setIsRecording: (recording) => set({ isRecording: recording }),
  callNotes: '',
  setCallNotes: (notes) => set({ callNotes: notes }),
  callerName: '',
  setCallerName: (name) => set({ callerName: name }),
  // Incoming call state
  incomingCallInfo: null,
  setIncomingCallInfo: (info) => set({ incomingCallInfo: info }),
}));
