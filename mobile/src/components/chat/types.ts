export interface MobileContact {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'busy' | 'in_meeting';
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  role?: string;
}

export interface MobileChannel {
  id: string;
  name: string;
  topic?: string;
  isPrivate?: boolean;
  memberCount: number;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export interface MobileChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  type?: 'text' | 'system' | 'call';
}
