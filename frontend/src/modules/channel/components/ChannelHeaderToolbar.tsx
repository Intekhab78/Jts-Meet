import React from 'react'
import type { Channel } from '../channel.types'
import {
    IconLock, IconHash, IconSearch, IconBell, IconBellOff,
    IconPlus, IconLogOut, IconUserPlus, IconEdit, IconMessage,
    IconFileText, IconUsers, IconEye, IconShield, IconAlertTriangle, IconX
} from '../../../components/common/Icons'

interface ChannelHeaderToolbarProps {
    selectedChannel: Channel
    isChannelListCollapsed: boolean
    onToggleChannelListCollapse: () => void
    activePanelTab: 'chat' | 'files' | 'members' | 'info' | 'permissions' | 'danger'
    setActivePanelTab: (tab: 'chat' | 'files' | 'members' | 'info' | 'permissions' | 'danger') => void
    filesCount: number
    membersCount: number
    realOnlineCount: number
    isMember: boolean
    currentUserId?: string
    isChannelMuted: boolean
    onToggleChannelMute: () => void
    isHuddleActive: boolean
    onToggleHuddle: () => void
    showInChannelSearch: boolean
    onToggleInChannelSearch: () => void
    inChannelSearchQuery: string
    setInChannelSearchQuery: (query: string) => void
    matchedMessagesCount: number
    onStartChannelMeeting: () => void
    onStartChannelAudioCall: () => void
    onJoinChannel: () => void
    onLeaveChannel: () => void
    onShowInviteDialog: () => void
    onShowEditDialog: () => void
}

export const ChannelHeaderToolbar: React.FC<ChannelHeaderToolbarProps> = ({
    selectedChannel,
    isChannelListCollapsed,
    onToggleChannelListCollapse,
    activePanelTab,
    setActivePanelTab,
    filesCount,
    membersCount,
    realOnlineCount,
    isMember,
    currentUserId,
    isChannelMuted,
    onToggleChannelMute,
    isHuddleActive,
    onToggleHuddle,
    showInChannelSearch,
    onToggleInChannelSearch,
    inChannelSearchQuery,
    setInChannelSearchQuery,
    matchedMessagesCount,
    onStartChannelMeeting,
    onStartChannelAudioCall,
    onJoinChannel,
    onLeaveChannel,
    onShowInviteDialog,
    onShowEditDialog
}) => {
    return (
        <>
            {/* TEAMS-STYLE HEADER TOOLBAR WITH "MEET NOW" CAMERA BUTTON */}
            <div style={{
                padding: '10px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                background: 'rgba(255, 255, 255, 0.015)'
            }}>
                {/* Left: Channel Name + Description */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {isChannelListCollapsed && (
                        <button
                            type="button"
                            onClick={onToggleChannelListCollapse}
                            style={{
                                background: 'rgba(99, 102, 241, 0.14)',
                                border: '1px solid rgba(99, 102, 241, 0.35)',
                                borderRadius: 7,
                                color: '#818cf8',
                                width: 28,
                                height: 28,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                flexShrink: 0
                            }}
                            title="Show channels list (Expand)"
                            aria-label="Show channels list"
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)'
                                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.6)'
                                e.currentTarget.style.color = '#fff'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.14)'
                                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.35)'
                                e.currentTarget.style.color = '#818cf8'
                            }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="9" y1="3" x2="9" y2="21" />
                                <path d="m13 15 3-3-3-3" />
                            </svg>
                        </button>
                    )}
                    <div
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            background: selectedChannel.type === 'private' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            border: selectedChannel.type === 'private' ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid rgba(99, 102, 241, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: selectedChannel.type === 'private' ? '#c084fc' : '#818cf8',
                            flexShrink: 0
                        }}
                        title={selectedChannel.type === 'private' ? 'Private Channel (Members only)' : 'Public Channel'}
                    >
                        {selectedChannel.type === 'private' ? (
                            <IconLock size={15} />
                        ) : (
                            <IconHash size={15} />
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                            {selectedChannel.name}
                        </span>
                        <span style={{
                            background: selectedChannel.type === 'public' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                            color: selectedChannel.type === 'public' ? '#4ade80' : '#c084fc',
                            border: selectedChannel.type === 'public' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(139, 92, 246, 0.3)',
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: 4,
                            textTransform: 'uppercase'
                        }}>
                            {selectedChannel.type}
                        </span>
                        {selectedChannel.description && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                                • {selectedChannel.description}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right: Signature "Meet Now" + Actions Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {/* MICROSOFT TEAMS "MEET NOW" BUTTON (VIDEO) */}
                    <button
                        type="button"
                        onClick={onStartChannelMeeting}
                        className="btn btn-primary"
                        style={{
                            height: 30,
                            width: 32,
                            borderRadius: 8,
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                            border: 'none',
                            color: '#fff',
                            boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        title="Meet Now (Start instant video meeting)"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polygon points="23 7 16 12 23 17 23 7" />
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                    </button>

                    {/* INSTANT GROUP AUDIO CALL BUTTON */}
                    <button
                        type="button"
                        onClick={onStartChannelAudioCall}
                        className="btn btn-secondary"
                        style={{
                            height: 30,
                            width: 32,
                            borderRadius: 8,
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            border: 'none',
                            color: '#fff',
                            boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        title="Audio Call (Start group voice call)"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                    </button>

                    {/* NEXT-GEN SLACK 2.0 STYLE LIVE HUDDLE BUTTON */}
                    <button
                        type="button"
                        onClick={onToggleHuddle}
                        className="btn btn-secondary"
                        style={{
                            height: 30,
                            width: 32,
                            borderRadius: 8,
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isHuddleActive
                                ? 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)'
                                : 'rgba(168, 85, 247, 0.15)',
                            border: `1px solid ${isHuddleActive ? '#a855f7' : 'rgba(168, 85, 247, 0.35)'}`,
                            color: '#fff',
                            boxShadow: isHuddleActive ? '0 0 14px rgba(168, 85, 247, 0.45)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        title={isHuddleActive ? "In Huddle (Click to leave)" : "Huddle (Ambient voice)"}
                    >
                        <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: isHuddleActive ? '#22c55e' : '#c084fc',
                            boxShadow: isHuddleActive ? '0 0 8px #22c55e' : 'none'
                        }} />
                    </button>

                    {/* IN-CHANNEL SEARCH TOGGLE BUTTON */}
                    <button
                        type="button"
                        onClick={onToggleInChannelSearch}
                        style={{
                            height: 30,
                            width: 32,
                            borderRadius: 8,
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: showInChannelSearch ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.05)',
                            border: showInChannelSearch ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.1)',
                            color: showInChannelSearch ? '#c7c9ff' : '#d4d4d8',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        title="Search messages in this channel"
                    >
                        <IconSearch size={14} />
                    </button>

                    {/* CHANNEL NOTIFICATION BELL MUTE TOGGLE */}
                    <button
                        type="button"
                        onClick={onToggleChannelMute}
                        style={{
                            height: 30,
                            width: 32,
                            borderRadius: 8,
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isChannelMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
                            border: isChannelMuted ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(255,255,255,0.1)',
                            color: isChannelMuted ? '#f87171' : '#d4d4d8',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        title={isChannelMuted ? "Channel notifications muted (Click to unmute)" : "Notifications active (Click to mute)"}
                    >
                        {isChannelMuted ? <IconBellOff size={14} /> : <IconBell size={14} />}
                    </button>

                    {selectedChannel.type === 'public' && !isMember && (
                        <button
                            type="button"
                            onClick={onJoinChannel}
                            className="btn btn-success"
                            style={{ height: 30, width: 32, borderRadius: 8, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', border: 'none', color: '#fff', cursor: 'pointer' }}
                            title="Join Channel"
                        >
                            <IconPlus size={14} />
                        </button>
                    )}
                    {isMember && currentUserId && selectedChannel.members.some((member) => member.userId === currentUserId && member.role !== 'owner') && (
                        <button
                            type="button"
                            onClick={onLeaveChannel}
                            className="btn btn-danger"
                            style={{ height: 30, width: 32, borderRadius: 8, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            title="Leave Channel"
                        >
                            <IconLogOut size={14} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onShowInviteDialog}
                        className="btn btn-secondary"
                        style={{ height: 30, width: 32, borderRadius: 8, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', transition: 'all 0.15s ease' }}
                        title="Invite channel members"
                    >
                        <IconUserPlus size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={onShowEditDialog}
                        className="btn btn-secondary"
                        style={{ height: 30, width: 32, borderRadius: 8, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', transition: 'all 0.15s ease' }}
                        title="Edit channel settings"
                    >
                        <IconEdit size={14} />
                    </button>
                </div>
            </div>

            {/* SLIM METRICS & SEGMENTED TABS STRIP (Teams Style) */}
            <div style={{
                padding: '0 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                background: 'rgba(255, 255, 255, 0.01)'
            }}>
                {/* Sub-Tabs */}
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                    {[
                        { id: 'chat', label: 'Posts & Chat', icon: <IconMessage size={15} /> },
                        { id: 'files', label: `Files (${filesCount})`, icon: <IconFileText size={15} /> },
                        { id: 'members', label: `Members (${membersCount})`, icon: <IconUsers size={15} /> },
                        { id: 'info', label: 'Info', icon: <IconEye size={15} /> },
                        { id: 'permissions', label: 'Roles', icon: <IconShield size={15} /> },
                        { id: 'danger', label: 'Danger', icon: <IconAlertTriangle size={15} /> }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActivePanelTab(tab.id as any)}
                            title={tab.label}
                            style={{
                                padding: '8px 12px',
                                background: 'transparent',
                                color: activePanelTab === tab.id ? '#818cf8' : 'var(--color-text-muted)',
                                border: 'none',
                                borderBottom: activePanelTab === tab.id ? '2px solid #6366F1' : '2px solid transparent',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {tab.icon}
                        </button>
                    ))}
                </div>

                {/* Active online members status badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.7rem', color: 'var(--color-text-muted)', padding: '4px 0' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)' }} />
                        <span style={{ color: '#e4e4e7', fontWeight: 600 }}>{realOnlineCount}</span> online
                    </span>
                </div>
            </div>

            {/* IN-CHANNEL SEARCH EXPANDED BAR */}
            {showInChannelSearch && (
                <div style={{
                    padding: '8px 16px',
                    background: 'rgba(17, 19, 29, 0.98)',
                    borderBottom: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    animation: 'fadeIn 0.15s ease'
                }}>
                    <IconSearch size={14} color="#818cf8" />
                    <input
                        autoFocus
                        type="text"
                        value={inChannelSearchQuery}
                        onChange={(e) => setInChannelSearchQuery(e.target.value)}
                        placeholder={`Search messages, files, or snippets in #${selectedChannel.name}...`}
                        style={{
                            flex: 1,
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: 6,
                            padding: '5px 12px',
                            color: '#fff',
                            fontSize: '0.78rem',
                            outline: 'none'
                        }}
                    />
                    {inChannelSearchQuery && (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                            {matchedMessagesCount} {matchedMessagesCount === 1 ? 'match' : 'matches'}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onToggleInChannelSearch}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Close search"
                    >
                        <IconX size={14} />
                    </button>
                </div>
            )}
        </>
    )
}
