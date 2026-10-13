import { PresenceStatus } from '../../components/common/UserPresenceBadge'

export interface ChatContact {
    _id: string
    fullName: string
    email: string
    profileImage?: string
    status?: PresenceStatus | string
    customStatus?: string
    lastSeen?: Date | string
}

export interface ChatMessage {
    _id: string
    sender: string | { _id: string; fullName: string; profileImage?: string }
    receiver: string | { _id: string; fullName: string; profileImage?: string }
    message: string
    isDelivered?: boolean
    isSeen?: boolean
    reactions?: { userId: string; emoji: string; createdAt?: Date }[]
    createdAt: string
    parentMessageId?: string | null
    threadCount?: number
    isDeleted?: boolean
    deletedAt?: string | null
}

export interface RecentChat {
    conversationWith: string
    latestMessage: ChatMessage
    user?: ChatContact
}

export interface DirectMessagesHubProps {
    token: string
    currentUserId: string
    currentUserName?: string
    userPlan?: string
    onStartCall?: (targetUserId: string, targetName: string, callType?: 'video' | 'audio' | 'screenshare', targetAvatar?: string, screenStream?: MediaStream) => void
    onStartMeeting?: (roomId: string) => void
}

export interface SharedFileItem {
    id: string
    name: string
    url: string
    size: string
    senderName: string
    isMe: boolean
    date: string
}

export type HeaderTab = 'chat' | 'files' | 'about'
export type SidebarTab = 'recent' | 'contacts'

export interface ActiveFormats {
    bold: boolean
    italic: boolean
    code: boolean
    list: boolean
    quote: boolean
}
