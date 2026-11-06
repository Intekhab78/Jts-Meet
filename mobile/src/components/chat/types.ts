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

export interface MobileChatMessageReaction {
  userId: string;
  emoji: string;
  createdAt?: string | Date;
}

export interface MobileChatMessageCallInfo {
  meetingId: string;
  callType: 'audio' | 'video' | 'screenshare';
  status: 'completed' | 'missed' | 'declined' | 'cancelled';
  duration: number;
  callerId?: string;
  startedAt?: string | Date;
  endedAt?: string | Date;
}

export interface MobileChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  type?: 'text' | 'system' | 'call';
  messageType?: 'text' | 'call';
  callInfo?: MobileChatMessageCallInfo | null;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  reactions?: MobileChatMessageReaction[];
  isDeleted?: boolean;
  deletedAt?: string | Date;
}

