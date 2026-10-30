import React from 'react';

export interface RemoteParticipant {
  userId: string;
  displayName: string;
  isVideoOff?: boolean;
  isMuted?: boolean;
}

export interface MobileMeetingRoomProps {
  meetingId: string;
  displayName: string;
  initialAudioOff?: boolean;
  initialVideoOff?: boolean;
  showInitialInvite?: boolean;
  callType?: 'audio' | 'video';
  peerName?: string;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onLeave: () => void;
}

export interface MobileBgPreset {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: 'none' | 'blur' | 'wallpaper' | 'custom';
  thumbnail: string;
  url?: string;
  blurRadius?: number;
}

export const MOBILE_BACKGROUND_PRESETS: MobileBgPreset[] = [
  {
    id: 'none',
    title: 'None',
    subtitle: 'Original Camera',
    description: 'Original camera background with zero effects',
    category: 'none',
    thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=70',
  },
  {
    id: 'office',
    title: 'Modern Office',
    subtitle: 'Executive Suite',
    description: 'Executive luxury office (glass windows aur daylight ke sath)',
    category: 'wallpaper',
    thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=300&q=70',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1280&q=80',
  },
  {
    id: 'library',
    title: 'Cozy Library',
    subtitle: 'Oak Bookshelves',
    description: 'Warm wooden bookshelves aur soft ambient study light',
    category: 'wallpaper',
    thumbnail: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=300&q=70',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1280&q=80',
  },
  {
    id: 'studio',
    title: 'Minimal Studio',
    subtitle: 'Acoustic Neon',
    description: 'Clean modern acoustic studio light neon accents ke sath',
    category: 'wallpaper',
    thumbnail: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=300&q=70',
    url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1280&q=80',
  },
  {
    id: 'cafe',
    title: 'Warm Cafe',
    subtitle: 'Coffee House',
    description: 'Stylish coffee house background with soft bokeh',
    category: 'wallpaper',
    thumbnail: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=300&q=70',
    url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1280&q=80',
  },
  {
    id: 'blur_light',
    title: 'Slight Blur',
    subtitle: 'Portrait Bokeh',
    description: 'Halki portrait depth-of-field (chehra ekdum sharp, background halka blur)',
    category: 'blur',
    blurRadius: 8,
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=70',
  },
  {
    id: 'blur_heavy',
    title: 'Deep Blur',
    subtitle: 'Complete Privacy',
    description: 'Poora background completely blur (complete privacy ke liye)',
    category: 'blur',
    blurRadius: 20,
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=70',
  },
  {
    id: 'custom',
    title: 'Custom Wallpaper',
    subtitle: 'Gallery / Company Logo',
    description: 'Aap phone ki gallery se apni company ka logo ya photo laga sakte hain',
    category: 'custom',
    thumbnail: '',
  },
];

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turns:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export interface ChatMessage {
  id?: string;
  sender: string;
  text: string;
  time: string;
  timestamp?: number;
  isPending?: boolean;
}

export interface ReactionItem {
  id: string;
  emoji: string;
  senderName: string;
  left?: number;
  leftPercent?: number;
}

