import React from 'react'
import {
    IconPhone,
    IconVideo,
    IconMonitor,
    IconSearch,
    IconUserPlus,
    IconTrash,
    IconX
} from '../../../components/common/Icons'
import { UserAvatar } from '../../../components/common/UserAvatar'
import { UserPresenceBadge, PresenceStatus } from '../../../components/common/UserPresenceBadge'
import { ChatContact, HeaderTab } from '../chat.types'
import {
    getResolvedPresence,
    getTeamsTabStyle,
    teamsHeaderActionBtnStyle
} from '../chat.helpers'

interface DirectChatHeaderProps {
    activeContact: ChatContact
    isSidebarCollapsed: boolean
    onToggleSidebarCollapse: () => void
    presences: Record<string, { status: PresenceStatus; customStatus?: string }>
    headerTab: HeaderTab
    setHeaderTab: (tab: HeaderTab) => void
    sharedFilesCount: number
    showChatSearch: boolean
    setShowChatSearch: (show: boolean) => void
    chatSearchQuery: string
    setChatSearchQuery: (query: string) => void
    matchedMessagesCount: number
    onStartVoiceCall: () => void
    onStartInstantCall: () => void
    onStartScreenShareCall: () => void
    onOpenNewChat: () => void
    onOpenClearChat: () => void
}

export function DirectChatHeader({
    activeContact,
    isSidebarCollapsed,
    onToggleSidebarCollapse,
    presences,
    headerTab,
    setHeaderTab,
    sharedFilesCount,
    showChatSearch,
    setShowChatSearch,
    chatSearchQuery,
    setChatSearchQuery,
    matchedMessagesCount,
    onStartVoiceCall,
    onStartInstantCall,
    onStartScreenShareCall,
    onOpenNewChat,
    onOpenClearChat
}: DirectChatHeaderProps) {
    const presence = getResolvedPresence(presences, activeContact._id, activeContact.status, activeContact.customStatus)

    return (
        <div style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(18, 20, 29, 0.95)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0
        }}>
            {/* Upper Header Row: Contact Info & Action Buttons */}
            <div style={{
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    {isSidebarCollapsed && (
                        <button
                            type="button"
                            onClick={onToggleSidebarCollapse}
                            title="Show chat sidebar (Expand)"
                            aria-label="Show chat sidebar"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 30,
                                height: 30,
                                borderRadius: 7,
                                background: 'rgba(98, 100, 167, 0.25)',
                                border: '1px solid rgba(98, 100, 167, 0.45)',
                                color: '#c7c9ff',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                flexShrink: 0
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(98, 100, 167, 0.45)'
                                e.currentTarget.style.borderColor = '#818cf8'
                                e.currentTarget.style.color = '#fff'
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(98, 100, 167, 0.25)'
                                e.currentTarget.style.borderColor = 'rgba(98, 100, 167, 0.45)'
                                e.currentTarget.style.color = '#c7c9ff'
                            }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="9" y1="3" x2="9" y2="21" />
                                <path d="m13 15 3-3-3-3" />
                            </svg>
                        </button>
                    )}
                    <UserAvatar
                        src={activeContact.profileImage}
                        name={activeContact.fullName}
                        size={38}
                        presence={presence.status}
                        customPresenceStatus={presence.customStatus}
                    />

                    <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {activeContact.fullName}
                            </h3>
                            <UserPresenceBadge status={presence.status} size="xs" showLabel />
                        </div>
                        {presence.customStatus && (
                            <div style={{ fontSize: '0.71875rem', color: '#94a3b8', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                                "{presence.customStatus}"
                            </div>
                        )}
                    </div>
                </div>

                {/* Teams Action Toolbar (Audio, Video, Screen Share, Search, Add, Clear) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {/* Audio Call */}
                    <button
                        type="button"
                        onClick={onStartVoiceCall}
                        title="Audio call"
                        style={teamsHeaderActionBtnStyle}
                    >
                        <IconPhone size={16} />
                    </button>

                    {/* Video / Meet Now Icon Button */}
                    <button
                        type="button"
                        onClick={onStartInstantCall}
                        title="Meet Now (Instant video call)"
                        style={{
                            ...teamsHeaderActionBtnStyle,
                            background: '#6264a7',
                            color: '#fff'
                        }}
                    >
                        <IconVideo size={16} />
                    </button>

                    {/* Screen Share Call */}
                    <button
                        type="button"
                        onClick={onStartScreenShareCall}
                        title="Screen share"
                        style={teamsHeaderActionBtnStyle}
                    >
                        <IconMonitor size={16} />
                    </button>

                    <div style={{ width: 1, height: 20, background: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />

                    {/* Inline Chat Search */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowChatSearch(!showChatSearch)
                            if (showChatSearch) setChatSearchQuery('')
                        }}
                        title="Search in this chat"
                        style={{
                            ...teamsHeaderActionBtnStyle,
                            background: showChatSearch ? 'rgba(98, 100, 167, 0.3)' : 'transparent',
                            color: showChatSearch ? '#c7c9ff' : 'var(--color-text-secondary)'
                        }}
                    >
                        <IconSearch size={16} />
                    </button>

                    {/* Add People indicator */}
                    <button
                        type="button"
                        onClick={onOpenNewChat}
                        title="Add people to create group"
                        style={teamsHeaderActionBtnStyle}
                    >
                        <IconUserPlus size={16} />
                    </button>

                    {/* Clear Chat Button */}
                    <button
                        type="button"
                        onClick={onOpenClearChat}
                        title="Clear chat for me"
                        style={teamsHeaderActionBtnStyle}
                        onMouseEnter={e => {
                            e.currentTarget.style.color = '#f87171'
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.color = 'var(--color-text-secondary)'
                            e.currentTarget.style.background = 'transparent'
                        }}
                    >
                        <IconTrash size={16} />
                    </button>
                </div>
            </div>

            {/* Lower Header Row: MS Teams Tabs [Chat] [Files] [About] */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', gap: 24 }}>
                <button
                    type="button"
                    onClick={() => setHeaderTab('chat')}
                    style={getTeamsTabStyle(headerTab === 'chat')}
                >
                    Chat
                </button>
                <button
                    type="button"
                    onClick={() => setHeaderTab('files')}
                    style={getTeamsTabStyle(headerTab === 'files')}
                >
                    Files {sharedFilesCount > 0 && `(${sharedFilesCount})`}
                </button>
                <button
                    type="button"
                    onClick={() => setHeaderTab('about')}
                    style={getTeamsTabStyle(headerTab === 'about')}
                >
                    About
                </button>
            </div>

            {/* In-Chat Search Bar Drawer */}
            {showChatSearch && (
                <div style={{
                    padding: '8px 20px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                }}>
                    <IconSearch size={14} color="#94a3b8" />
                    <input
                        type="text"
                        autoFocus
                        value={chatSearchQuery}
                        onChange={e => setChatSearchQuery(e.target.value)}
                        placeholder="Find in conversation..."
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            fontSize: '0.8125rem',
                            outline: 'none'
                        }}
                    />
                    {chatSearchQuery && (
                        <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                            {matchedMessagesCount} match{matchedMessagesCount !== 1 ? 'es' : ''}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setChatSearchQuery('')
                            setShowChatSearch(false)
                        }}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                        <IconX size={14} />
                    </button>
                </div>
            )}
        </div>
    )
}
