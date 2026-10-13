import React from 'react'
import {
    IconMessage,
    IconSearch,
    IconPlus,
    IconX,
    IconPin
} from '../../../components/common/Icons'
import { UserAvatar } from '../../../components/common/UserAvatar'
import { PresenceStatus } from '../../../components/common/UserPresenceBadge'
import { ChatContact, RecentChat, SidebarTab } from '../chat.types'
import { getResolvedPresence, formatTimestamp } from '../chat.helpers'

interface DirectChatSidebarProps {
    isSidebarCollapsed: boolean
    toggleSidebarCollapse: () => void
    sidebarTab: SidebarTab
    setSidebarTab: (tab: SidebarTab) => void
    searchQuery: string
    setSearchQuery: (query: string) => void
    recentChats: RecentChat[]
    pinnedChats: RecentChat[]
    regularChats: RecentChat[]
    contacts: ChatContact[]
    activeContact: ChatContact | null
    currentUserId: string
    presences: Record<string, { status: PresenceStatus; customStatus?: string }>
    pinnedIds: string[]
    onSelectContact: (contact: ChatContact) => void
    onTogglePinChat: (contactId: string, e: React.MouseEvent) => void
    onOpenNewChat: () => void
}

export function DirectChatSidebar({
    isSidebarCollapsed,
    toggleSidebarCollapse,
    sidebarTab,
    setSidebarTab,
    searchQuery,
    setSearchQuery,
    recentChats,
    pinnedChats,
    regularChats,
    contacts,
    activeContact,
    currentUserId,
    presences,
    pinnedIds,
    onSelectContact,
    onTogglePinChat,
    onOpenNewChat
}: DirectChatSidebarProps) {

    function renderChatItem(chat: RecentChat, isPinned: boolean, idx: number = 0) {
        const contact = chat.user || {
            _id: chat.conversationWith,
            fullName: 'Colleague',
            email: ''
        }
        const isSelected = activeContact?._id === contact._id
        const presence = getResolvedPresence(presences, contact._id, contact.status, contact.customStatus)
        const isLastSentByMe = typeof chat.latestMessage.sender === 'object'
            ? chat.latestMessage.sender._id === currentUserId
            : chat.latestMessage.sender === currentUserId

        return (
            <div
                key={`chat_row_${String(chat.conversationWith)}_${isPinned ? 'pinned' : 'reg'}_${idx}`}
                onClick={() => onSelectContact(contact)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    marginBottom: 2,
                    background: isSelected ? 'rgba(98, 100, 167, 0.25)' : 'transparent',
                    border: isSelected ? '1px solid rgba(98, 100, 167, 0.45)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                }}
                className="teams-sidebar-chat-row"
                onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                    const pinBtn = e.currentTarget.querySelector('.pin-action-btn') as HTMLElement
                    if (pinBtn) pinBtn.style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                    const pinBtn = e.currentTarget.querySelector('.pin-action-btn') as HTMLElement
                    if (pinBtn) pinBtn.style.opacity = isPinned ? '1' : '0'
                }}
            >
                {/* Avatar with Presence Badge */}
                <UserAvatar
                    src={contact.profileImage}
                    name={contact.fullName}
                    size={36}
                    presence={presence.status}
                    customPresenceStatus={presence.customStatus}
                />

                {/* Name & Snippet */}
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {contact.fullName}
                        </span>
                        <span style={{ fontSize: '0.65625rem', color: 'var(--color-text-muted)', marginLeft: 4 }}>
                            {formatTimestamp(chat.latestMessage.createdAt)}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{
                            fontSize: '0.71875rem',
                            color: isSelected ? '#c7c9ff' : 'var(--color-text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 160
                        }}>
                            {chat.latestMessage.isDeleted ? (
                                <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>This message was deleted</span>
                            ) : (
                                <>{isLastSentByMe ? 'You: ' : ''}{chat.latestMessage.message.replace(/\[File:\s*(.*?)\s*\|.*?\]/, '📎 $1')}</>
                            )}
                        </span>
                        {isLastSentByMe && (
                            <span style={{ color: chat.latestMessage.isSeen ? '#38bdf8' : '#94a3b8', fontSize: '0.625rem', marginLeft: 4 }}>
                                {chat.latestMessage.isSeen ? '✓✓' : '✓'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Pin/Unpin action button on hover */}
                <button
                    type="button"
                    className="pin-action-btn"
                    onClick={(e) => onTogglePinChat(contact._id, e)}
                    title={isPinned ? 'Unpin chat' : 'Pin chat'}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: isPinned ? '#6264a7' : '#94a3b8',
                        cursor: 'pointer',
                        padding: 2,
                        opacity: isPinned ? 1 : 0,
                        transition: 'opacity 0.15s ease'
                    }}
                >
                    <IconPin size={13} />
                </button>
            </div>
        )
    }

    return (
        <div style={{
            width: isSidebarCollapsed ? 0 : 320,
            minWidth: isSidebarCollapsed ? 0 : 280,
            borderRight: isSidebarCollapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 17, 23, 0.96)',
            display: isSidebarCollapsed ? 'none' : 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden'
        }}>
            {/* Header & New Chat Button */}
            <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: 'linear-gradient(135deg, #6264a7, #464775)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            boxShadow: '0 2px 8px rgba(98, 100, 167, 0.4)'
                        }}>
                            <IconMessage size={15} />
                        </div>
                        <div>
                            <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                                Chat
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {/* Teams "+ New Chat" Button */}
                        <button
                            type="button"
                            onClick={onOpenNewChat}
                            title="Start new chat"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '5px 11px',
                                borderRadius: 6,
                                background: '#6264a7',
                                border: 'none',
                                color: '#fff',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                boxShadow: '0 2px 8px rgba(98, 100, 167, 0.35)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#7375b8' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#6264a7' }}
                        >
                            <IconPlus size={13} />
                            <span>New Chat</span>
                        </button>

                        {/* Collapse Sidebar Button */}
                        <button
                            type="button"
                            onClick={toggleSidebarCollapse}
                            title="Collapse chat sidebar"
                            aria-label="Collapse chat sidebar"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(98, 100, 167, 0.3)'
                                e.currentTarget.style.color = '#fff'
                                e.currentTarget.style.borderColor = 'rgba(98, 100, 167, 0.6)'
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                                e.currentTarget.style.color = 'var(--color-text-muted)'
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="9" y1="3" x2="9" y2="21" />
                                <path d="m14 9-3 3 3 3" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Switcher tabs (Recent vs Directory) */}
                <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 8, padding: 2, marginBottom: 10 }}>
                    <button
                        type="button"
                        onClick={() => setSidebarTab('recent')}
                        style={{
                            flex: 1,
                            border: 'none',
                            padding: '5px 0',
                            borderRadius: 6,
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: sidebarTab === 'recent' ? '#6264a7' : 'transparent',
                            color: sidebarTab === 'recent' ? '#fff' : 'var(--color-text-muted)',
                            transition: 'all 0.15s'
                        }}
                    >
                        Recent Chats {recentChats.length > 0 && `(${recentChats.length})`}
                    </button>
                    <button
                        type="button"
                        onClick={() => setSidebarTab('contacts')}
                        style={{
                            flex: 1,
                            border: 'none',
                            padding: '5px 0',
                            borderRadius: 6,
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: sidebarTab === 'contacts' ? '#6264a7' : 'transparent',
                            color: sidebarTab === 'contacts' ? '#fff' : 'var(--color-text-muted)',
                            transition: 'all 0.15s'
                        }}
                    >
                        Directory {contacts.length > 0 && `(${contacts.length})`}
                    </button>
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative' }}>
                    <IconSearch size={13} color="var(--color-text-muted)" style={{ position: 'absolute', left: 10, top: 10 }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter by name or message..."
                        className="input"
                        style={{
                            width: '100%',
                            paddingLeft: 30,
                            paddingRight: 24,
                            height: 32,
                            fontSize: '0.78125rem',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: 8,
                            color: '#fff'
                        }}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                        >
                            <IconX size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Sidebar List Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
                {sidebarTab === 'recent' ? (
                    recentChats.length === 0 ? (
                        <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.78125rem' }}>
                            <IconMessage size={32} color="#6264a7" style={{ marginBottom: 8, opacity: 0.6 }} />
                            <div style={{ fontWeight: 600, color: '#e2e8f0' }}>No recent chats yet</div>
                            <div style={{ fontSize: '0.71875rem', marginTop: 4 }}>Select a colleague to start chatting</div>
                            <button
                                type="button"
                                onClick={onOpenNewChat}
                                style={{ marginTop: 12, background: '#6264a7', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', padding: '6px 14px', borderRadius: 6 }}
                            >
                                Start New Chat &rarr;
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* PINNED SECTION */}
                            {pinnedChats.length > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{
                                        padding: '4px 10px',
                                        fontSize: '0.65625rem',
                                        fontWeight: 800,
                                        letterSpacing: '0.05em',
                                        color: '#94a3b8',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}>
                                        <IconPin size={11} color="#6264a7" />
                                        <span>PINNED</span>
                                    </div>
                                    {pinnedChats.map((chat, idx) => renderChatItem(chat, true, idx))}
                                </div>
                            )}

                            {/* RECENT SECTION */}
                            <div>
                                {pinnedChats.length > 0 && (
                                    <div style={{
                                        padding: '4px 10px',
                                        fontSize: '0.65625rem',
                                        fontWeight: 800,
                                        letterSpacing: '0.05em',
                                        color: '#94a3b8',
                                        marginBottom: 2
                                    }}>
                                        RECENT
                                    </div>
                                )}
                                {regularChats.map((chat, idx) => renderChatItem(chat, false, idx))}
                            </div>
                        </>
                    )
                ) : (
                    /* Directory List */
                    contacts.length === 0 ? (
                        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.78125rem' }}>
                            No colleagues found.
                        </div>
                    ) : (
                        contacts.map((c, idx) => {
                            const isSelected = activeContact?._id === c._id
                            const presence = getResolvedPresence(presences, c._id, c.status, c.customStatus)
                            return (
                                <div
                                    key={`dir_user_${c._id}_${idx}`}
                                    onClick={() => onSelectContact(c)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '8px 10px',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        marginBottom: 2,
                                        background: isSelected ? 'rgba(98, 100, 167, 0.2)' : 'transparent',
                                        border: isSelected ? '1px solid rgba(98, 100, 167, 0.4)' : '1px solid transparent',
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) e.currentTarget.style.background = 'transparent'
                                    }}
                                >
                                    <UserAvatar
                                        src={c.profileImage}
                                        name={c.fullName}
                                        size={34}
                                        presence={presence.status}
                                        customPresenceStatus={presence.customStatus}
                                    />

                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {c.fullName}
                                        </div>
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {presence.customStatus || c.email}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )
                )}
            </div>
        </div>
    )
}
