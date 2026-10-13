import React, { useEffect, useMemo, useState, useRef } from 'react'
import type { Channel } from './channel.types'
import { CreateChannelDialog } from './CreateChannelDialog'
import { EditChannelDialog } from './EditChannelDialog'
import { InviteChannelMemberDialog } from './InviteChannelMemberDialog'
import { ChannelMembersPage } from './ChannelMembersPage'
import { IconAlertTriangle, IconUsers } from '../../components/common/Icons'
import { DocumentPreviewModal, type PreviewDocument } from '../../components/common/DocumentPreviewModal'
import { CodeSnippetModal } from './components/CodeSnippetModal'
import { AsyncClipRecorderModal } from '../chat/components/AsyncClipRecorderModal'
import { ChannelSidebar } from './components/ChannelSidebar'
import { ChannelHeaderToolbar } from './components/ChannelHeaderToolbar'
import { ChannelChatFeed } from './components/ChannelChatFeed'
import { ChannelMessageComposer } from './components/ChannelMessageComposer'
import { ChannelThreadDrawer } from './components/ChannelThreadDrawer'
import { ChannelHuddleDock } from './components/ChannelHuddleDock'
import { ChannelFilesTab } from './components/ChannelFilesTab'
import { ChannelInfoTab } from './components/ChannelInfoTab'
import { ChannelPermissionsTab } from './components/ChannelPermissionsTab'
import { ChannelDangerTab } from './components/ChannelDangerTab'
import { ChannelNotificationToast } from './components/ChannelNotificationToast'
import { ChannelEmptyWorkspace } from './components/ChannelEmptyWorkspace'
import { useChannelAudioRecorder } from './hooks/useChannelAudioRecorder'
import { useChannelEditor } from './hooks/useChannelEditor'
import { useChannelSocket } from './hooks/useChannelSocket'
import { useChannelFiles } from './hooks/useChannelFiles'
import { useChannelActions } from './hooks/useChannelActions'
import { useChannelChatOps } from './hooks/useChannelChatOps'
import { API_BASE } from '../../config'
import { soundEffects } from '../../utils/soundEffects'

export interface ChannelSettingsPageProps {
    token: string
    organizationId?: string
    teamId?: string
    currentUserId?: string
    teams?: any[]
    onSelectTeam?: (teamId: string) => void
    onStartMeeting?: (meetingId: string) => void
    onStartGroupCall?: (memberIds: string[], channelName: string, channelId: string, callType: 'video' | 'audio') => void
}

export function ChannelSettingsPage({
    token,
    organizationId,
    teamId,
    currentUserId,
    teams = [],
    onSelectTeam,
    onStartMeeting,
    onStartGroupCall
}: ChannelSettingsPageProps) {
    const [channels, setChannels] = useState<Channel[]>([])
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [showInviteDialog, setShowInviteDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [channelSearch, setChannelSearch] = useState('')
    const [members, setMembers] = useState<Channel['members']>([])
    const [previewFile, setPreviewFile] = useState<PreviewDocument | null>(null)

    const [activePanelTab, setActivePanelTab] = useState<'chat' | 'files' | 'members' | 'info' | 'permissions' | 'danger'>(() => {
        try {
            const saved = localStorage.getItem('jts_channel_panel_tab')
            if (saved && ['chat', 'files', 'members', 'info', 'permissions', 'danger'].includes(saved)) {
                return saved as any
            }
        } catch (_) { }
        return 'chat'
    })

    useEffect(() => {
        try {
            localStorage.setItem('jts_channel_panel_tab', activePanelTab)
        } catch (_) { }
    }, [activePanelTab])

    const [messages, setMessages] = useState<any[]>([])
    const [activeThreadParent, setActiveThreadParent] = useState<any | null>(null)
    const [threadMessages, setThreadMessages] = useState<any[]>([])
    const [threadInput, setThreadInput] = useState('')
    const [pinnedMessages, setPinnedMessages] = useState<any[]>([])
    const [showPinnedDrawer, setShowPinnedDrawer] = useState(false)
    const [showClipModal, setShowClipModal] = useState(false)
    const [showCodeModal, setShowCodeModal] = useState(false)
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)

    // Feature 1: In-Channel Message Search
    const [showInChannelSearch, setShowInChannelSearch] = useState(false)
    const [inChannelSearchQuery, setInChannelSearchQuery] = useState('')

    // Feature 7: Per-Channel Notification Mute Toggle
    const [isChannelMuted, setIsChannelMuted] = useState(false)

    // Channel List Sidebar Collapse Toggle
    const [isChannelListCollapsed, setIsChannelListCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem('jts_channel_list_collapsed') === 'true'
        } catch (_) {
            return false
        }
    })

    const toggleChannelListCollapse = () => {
        setIsChannelListCollapsed(prev => {
            const next = !prev
            try {
                localStorage.setItem('jts_channel_list_collapsed', String(next))
            } catch (_) { }
            return next
        })
    }

    // Feature 2: Channel Live Huddle (Slack 2.0 Style)
    const [isHuddleActive, setIsHuddleActive] = useState(false)
    const [isHuddleMuted, setIsHuddleMuted] = useState(false)
    const [isHuddleCollapsed, setIsHuddleCollapsed] = useState(false)
    const [ambientAudioMode, setAmbientAudioMode] = useState<'off' | 'lofi' | 'rain'>('off')

    // Resolved current user ID with JWT token decoding fallback
    const resolvedUserId = useMemo(() => {
        if (currentUserId) return currentUserId.toString()
        try {
            const stored = localStorage.getItem('user') || localStorage.getItem('auth_user')
            if (stored) {
                const u = JSON.parse(stored)
                if (u._id || u.id) return (u._id || u.id).toString()
            }
        } catch (_) { }
        if (!token) return ''
        try {
            const base64Url = token.split('.')[1]
            if (base64Url) {
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
                const parsed = JSON.parse(jsonPayload)
                return (parsed.userId || parsed.id || parsed._id || parsed.sub || '').toString()
            }
        } catch (_) { }
        return ''
    }, [currentUserId, token])

    const resolvedUserIdRef = useRef(resolvedUserId)
    useEffect(() => {
        resolvedUserIdRef.current = resolvedUserId
    }, [resolvedUserId])

    // Set of message IDs sent directly from this active tab instance
    const sentByCurrentTabIds = useRef(new Set<string>())

    const chatFeedRef = useRef<HTMLDivElement>(null)
    const threadFeedRef = useRef<HTMLDivElement>(null)
    const mainChatEndRef = useRef<HTMLDivElement>(null)
    const threadChatEndRef = useRef<HTMLDivElement>(null)

    const currentUserName = useMemo(() => {
        const found = members.find(m => ((m as any).userId?._id || (m as any).userId)?.toString() === resolvedUserId)
        return (found as any)?.fullName || (found as any)?.userId?.fullName || 'Colleague'
    }, [members, resolvedUserId])

    // Channel actions hook (CRUD, join, leave, members)
    const {
        loadChannels,
        handleCreateChannel,
        handleSelectChannel,
        handleUpdateChannel,
        handleArchiveChannel,
        handleRestoreChannel,
        handleDeleteChannel,
        handleJoinChannel,
        handleLeaveChannel,
        handleInviteMember,
        handleRemoveMember,
        handleUpdateMemberRole
    } = useChannelActions({
        teamId,
        organizationId,
        token,
        currentUserId,
        channels,
        setChannels,
        selectedChannel,
        setSelectedChannel,
        setLoading,
        setError,
        setUnreadChannelCounts: () => { }
    })

    // Realtime Socket Hook
    const {
        socketInstance,
        typingUsers,
        unreadChannelCounts,
        setUnreadChannelCounts,
        incomingNotificationToast,
        setIncomingNotificationToast
    } = useChannelSocket({
        selectedChannel,
        token,
        currentUserId,
        resolvedUserId,
        resolvedUserIdRef,
        sentByCurrentTabIds,
        activeThreadParent,
        setMessages,
        setThreadMessages,
        setPinnedMessages
    })

    // Channel Files Hook
    const {
        files,
        setFiles,
        uploadingFile,
        loadFiles,
        handleFileUpload,
        fileInputRef,
        isDraggingOver,
        handleDragEnter,
        handleDragLeave,
        handleDragOver,
        handleDrop,
        fileSearchQuery,
        setFileSearchQuery
    } = useChannelFiles({
        selectedChannel,
        token,
        socketInstance,
        sentByCurrentTabIds,
        setMessages
    })

    // Audio Voice Note Recorder Hook
    const {
        isRecordingAudio,
        audioRecordDuration,
        startAudioRecording,
        stopAudioRecording
    } = useChannelAudioRecorder({
        selectedChannel,
        token,
        socketInstance,
        sentByCurrentTabIds,
        setMessages
    })

    // Editor formatting and composition hook
    const {
        composerEditorRef,
        isEditorEmpty,
        activeFormats,
        showEmojiPicker,
        setShowEmojiPicker,
        chatInput,
        handleInsertEmoji,
        handleEditorInput,
        handleEditorKeyDown,
        updateActiveFormats,
        toggleBold,
        toggleItalic,
        toggleStrike,
        toggleInlineCode,
        resetEditor
    } = useChannelEditor({
        selectedChannel,
        resolvedUserId,
        currentUserName,
        socketInstance,
        onSendMessage: () => handleSendMessage()
    })

    // Core message / thread operations hook
    const {
        handleSendMessage,
        handleSendThreadMessage,
        handleTogglePin,
        handleDeleteChannelMessage,
        handleUndoDeleteChannelMessage,
        handleReaction,
        handlePostCodeSnippet,
        handleClipUploaded
    } = useChannelChatOps({
        selectedChannel,
        token,
        socketInstance,
        sentByCurrentTabIds,
        composerEditorRef,
        chatInput,
        resetEditor,
        setMessages,
        activeThreadParent,
        threadInput,
        setThreadInput,
        setThreadMessages,
        setPinnedMessages
    })

    // Channel mute state sync
    useEffect(() => {
        if (selectedChannel?._id) {
            const saved = localStorage.getItem(`jts_channel_muted_${selectedChannel._id}`)
            setIsChannelMuted(saved === 'true')
            setShowInChannelSearch(false)
            setInChannelSearchQuery('')
        }
    }, [selectedChannel?._id])

    const toggleChannelMute = () => {
        if (!selectedChannel) return
        const next = !isChannelMuted
        setIsChannelMuted(next)
        try {
            localStorage.setItem(`jts_channel_muted_${selectedChannel._id}`, String(next))
        } catch (_) { }
    }

    // Filtered message stream for In-Channel Search
    const displayedMessages = useMemo(() => {
        if (!inChannelSearchQuery.trim()) return messages
        const q = inChannelSearchQuery.toLowerCase()
        return messages.filter(m => {
            const c = (m.content || '').toLowerCase()
            const sender = (m.senderId?.fullName || '').toLowerCase()
            const attNames = (m.attachments || []).map((a: any) => (a.name || '').toLowerCase()).join(' ')
            return c.includes(q) || sender.includes(q) || attNames.includes(q)
        })
    }, [messages, inChannelSearchQuery])

    useEffect(() => {
        if (chatFeedRef.current) {
            chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight
        }
    }, [messages])

    useEffect(() => {
        if (threadFeedRef.current) {
            threadFeedRef.current.scrollTop = threadFeedRef.current.scrollHeight
        }
    }, [threadMessages])

    // Load messages and pinned messages when selected channel changes
    useEffect(() => {
        if (!selectedChannel || !token) {
            setMessages([])
            setFiles([])
            return
        }

        const fetchMessages = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await res.json()
                if (data.success) {
                    setMessages(data.data.reverse())
                }
            } catch (err) {
                console.error('Failed to load chat history:', err)
            }
        }

        const fetchPinnedMessages = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat/pinned/all`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await res.json()
                if (data.success && Array.isArray(data.data)) {
                    setPinnedMessages(data.data)
                }
            } catch (err) {
                console.error('Failed to load pinned messages:', err)
            }
        }

        fetchMessages()
        fetchPinnedMessages()
        loadFiles(selectedChannel._id)
    }, [selectedChannel?._id, token])

    // Load thread messages when thread drawer opens
    useEffect(() => {
        if (!selectedChannel || !activeThreadParent || !token) {
            setThreadMessages([])
            return
        }

        const fetchThreadMessages = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat?threadParentId=${activeThreadParent._id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await res.json()
                if (data.success) {
                    setThreadMessages(data.data.reverse())
                }
            } catch (err) {
                console.error('Failed to load thread history:', err)
            }
        }

        fetchThreadMessages()
    }, [selectedChannel?._id, activeThreadParent?._id, token])

    // Load channels on teamId change
    useEffect(() => {
        if (teamId) {
            loadChannels(teamId)
        } else {
            setChannels([])
            setSelectedChannel(null)
        }
    }, [teamId, token])

    useEffect(() => {
        if (selectedChannel) {
            setMembers(selectedChannel.members)
            try {
                localStorage.setItem('jts_current_channel_id', selectedChannel._id)
            } catch (_) { }
        } else {
            setMembers([])
        }
    }, [selectedChannel])

    // Instant Channel Meeting ("Meet Now" - Video)
    const handleStartChannelMeeting = () => {
        if (!selectedChannel) return
        const meetingId = `meet_${selectedChannel.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36).slice(-5)}`

        try {
            sessionStorage.removeItem('jts_initial_camera_off')
        } catch { }

        const meetMsg = `🎥 **Live Meeting Started in #${selectedChannel.name}**\n👉 Click **[Join Meeting](#meeting?room=${meetingId})** to participate!`
        fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: meetMsg })
        }).catch(() => { })

        if (onStartMeeting) {
            onStartMeeting(meetingId)
        } else {
            window.location.hash = `#meeting?room=${meetingId}`
        }
    }

    // Instant Group Audio Call ("Audio Call")
    const handleStartChannelAudioCall = () => {
        if (!selectedChannel) return

        const otherMemberIds = (selectedChannel.members || []).map((m: any) => {
            const userObj = typeof m.userId === 'object' && m.userId !== null ? m.userId : null
            return userObj?._id ? userObj._id.toString() : (typeof m.userId === 'string' ? m.userId : ((m.user as any)?._id || ''))
        }).filter(id => id && String(id) !== String(resolvedUserId))

        const meetMsg = `📞 **Group Audio Call started in #${selectedChannel.name}**\n🔔 *Ringing channel members...*`
        fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: meetMsg })
        }).catch(() => { })

        if (otherMemberIds.length === 0) {
            alert(`No other members found in #${selectedChannel.name} to call. Please invite members to this channel first.`)
            return
        }

        if (onStartGroupCall) {
            onStartGroupCall(otherMemberIds, selectedChannel.name, selectedChannel._id, 'audio')
        }
    }

    // Live Huddle Handler (Slack 2.0 Style)
    const handleToggleHuddle = () => {
        if (!selectedChannel) return
        if (isHuddleActive) {
            setIsHuddleActive(false)
            if (socketInstance) {
                socketInstance.emit('channel:huddle:leave', {
                    channelId: selectedChannel._id,
                    userId: resolvedUserId,
                    username: currentUserName
                })
            }
            soundEffects.playLeaveChime()
        } else {
            setIsHuddleActive(true)
            setIsHuddleMuted(false)
            if (socketInstance) {
                socketInstance.emit('channel:huddle:join', {
                    channelId: selectedChannel._id,
                    userId: resolvedUserId,
                    username: currentUserName
                })
            }
            soundEffects.playJoinChime()
        }
    }

    const isMember = useMemo(() => {
        if (!selectedChannel || !currentUserId) return false
        return selectedChannel.members.some((member) => {
            const mId = typeof member.userId === 'object' && member.userId !== null
                ? (member.userId as any)._id || (member.userId as any).id
                : member.userId
            return String(mId) === String(currentUserId)
        })
    }, [selectedChannel, currentUserId])

    const realOnlineCount = useMemo(() => {
        if (!selectedChannel) return 0
        const activeMembers = selectedChannel.members.filter(m => (m as any).user?.status === 'online')
        return Math.max(1, activeMembers.length)
    }, [selectedChannel])

    const filteredChannels = useMemo(() => {
        if (!channelSearch.trim()) return channels
        return channels.filter(c => c.name.toLowerCase().includes(channelSearch.toLowerCase().trim()))
    }, [channels, channelSearch])

    const currentTeam = useMemo(() => {
        return teams.find((t: any) => t._id === teamId) || null
    }, [teams, teamId])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', color: '#fff', fontFamily: 'var(--font-sans)', minHeight: 0, overflow: 'hidden' }}>
            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconAlertTriangle size={14} color="#f87171" /> {error}
                </div>
            )}

            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div className="animate-spin" style={{ width: 24, height: 24, border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1', borderRadius: '50%' }} />
                    Loading channels workspace...
                </div>
            ) : !teamId ? (
                <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <IconUsers size={16} /> No department/team selected. Choose a team in the workspace sidebar.
                </div>
            ) : (
                /* UNIFIED FULL-HEIGHT WORKSPACE CONTAINER */
                <div className="glass-card" style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flex: 1,
                    height: '100%',
                    minHeight: 0,
                    width: '100%',
                    borderRadius: 14,
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: 0
                }} id="unified-channel-container">

                    {/* LEFT PANE: MODULAR CHANNELS LIST + TEAM SWITCHER */}
                    <ChannelSidebar
                        isCollapsed={isChannelListCollapsed}
                        currentTeam={currentTeam}
                        teams={teams}
                        teamId={teamId}
                        onSelectTeam={onSelectTeam}
                        channels={channels}
                        filteredChannels={filteredChannels}
                        selectedChannelId={selectedChannel?._id}
                        channelSearch={channelSearch}
                        setChannelSearch={setChannelSearch}
                        unreadChannelCounts={unreadChannelCounts}
                        onSelectChannel={(cId) => {
                            setUnreadChannelCounts(prev => ({ ...prev, [cId]: 0 }))
                            handleSelectChannel(cId)
                        }}
                        onCreateChannelClick={() => setShowCreateDialog(true)}
                        onToggleCollapse={toggleChannelListCollapse}
                    />

                    {/* RIGHT PANE: ACTIVE CHANNEL WORKSPACE & CHAT */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0, background: 'rgba(0, 0, 0, 0.2)', overflow: 'hidden', position: 'relative' }}>
                        {selectedChannel ? (
                            <>
                                {/* MODULAR TEAMS-STYLE HEADER TOOLBAR */}
                                <ChannelHeaderToolbar
                                    selectedChannel={selectedChannel}
                                    isChannelListCollapsed={isChannelListCollapsed}
                                    onToggleChannelListCollapse={toggleChannelListCollapse}
                                    activePanelTab={activePanelTab}
                                    setActivePanelTab={setActivePanelTab}
                                    filesCount={files.length}
                                    membersCount={members.length}
                                    realOnlineCount={realOnlineCount}
                                    isMember={isMember}
                                    currentUserId={resolvedUserId}
                                    isChannelMuted={isChannelMuted}
                                    onToggleChannelMute={toggleChannelMute}
                                    isHuddleActive={isHuddleActive}
                                    onToggleHuddle={handleToggleHuddle}
                                    showInChannelSearch={showInChannelSearch}
                                    onToggleInChannelSearch={() => {
                                        setShowInChannelSearch(prev => !prev)
                                        if (showInChannelSearch) setInChannelSearchQuery('')
                                    }}
                                    inChannelSearchQuery={inChannelSearchQuery}
                                    setInChannelSearchQuery={setInChannelSearchQuery}
                                    matchedMessagesCount={displayedMessages.length}
                                    onStartChannelMeeting={handleStartChannelMeeting}
                                    onStartChannelAudioCall={handleStartChannelAudioCall}
                                    onJoinChannel={handleJoinChannel}
                                    onLeaveChannel={handleLeaveChannel}
                                    onShowInviteDialog={() => setShowInviteDialog(true)}
                                    onShowEditDialog={() => setShowEditDialog(true)}
                                />

                                {/* TAB 1: MODULAR CHAT STREAM & COMPOSER & THREAD */}
                                {activePanelTab === 'chat' && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: 0 }}>
                                        <ChannelChatFeed
                                            selectedChannel={selectedChannel}
                                            displayedMessages={displayedMessages}
                                            resolvedUserId={resolvedUserId}
                                            hoveredMessageId={hoveredMessageId}
                                            setHoveredMessageId={setHoveredMessageId}
                                            chatFeedRef={chatFeedRef}
                                            mainChatEndRef={mainChatEndRef}
                                            isDraggingOver={isDraggingOver}
                                            inChannelSearchQuery={inChannelSearchQuery}
                                            setInChannelSearchQuery={setInChannelSearchQuery}
                                            pinnedMessages={pinnedMessages}
                                            showPinnedDrawer={showPinnedDrawer}
                                            setShowPinnedDrawer={setShowPinnedDrawer}
                                            handleTogglePin={handleTogglePin}
                                            handleReaction={handleReaction}
                                            handleDeleteChannelMessage={handleDeleteChannelMessage}
                                            handleUndoDeleteChannelMessage={handleUndoDeleteChannelMessage}
                                            setActiveThreadParent={setActiveThreadParent}
                                            handleDragEnter={handleDragEnter}
                                            handleDragLeave={handleDragLeave}
                                            handleDragOver={handleDragOver}
                                            handleDrop={handleDrop}
                                        />

                                        <ChannelMessageComposer
                                            selectedChannel={selectedChannel}
                                            composerEditorRef={composerEditorRef}
                                            fileInputRef={fileInputRef}
                                            handleFileUpload={handleFileUpload}
                                            uploadingFile={uploadingFile}
                                            isEditorEmpty={isEditorEmpty}
                                            activeFormats={activeFormats}
                                            showEmojiPicker={showEmojiPicker}
                                            setShowEmojiPicker={setShowEmojiPicker}
                                            handleInsertEmoji={handleInsertEmoji}
                                            typingUsers={typingUsers}
                                            isRecordingAudio={isRecordingAudio}
                                            audioRecordDuration={audioRecordDuration}
                                            startAudioRecording={startAudioRecording}
                                            stopAudioRecording={stopAudioRecording}
                                            handleEditorInput={handleEditorInput}
                                            handleEditorKeyDown={handleEditorKeyDown}
                                            updateActiveFormats={updateActiveFormats}
                                            toggleBold={toggleBold}
                                            toggleItalic={toggleItalic}
                                            toggleStrike={toggleStrike}
                                            toggleInlineCode={toggleInlineCode}
                                            handleSendMessage={() => handleSendMessage()}
                                            setShowCodeModal={setShowCodeModal}
                                            setShowClipModal={setShowClipModal}
                                        />

                                        <ChannelThreadDrawer
                                            activeThreadParent={activeThreadParent}
                                            onClose={() => setActiveThreadParent(null)}
                                            threadMessages={threadMessages}
                                            threadFeedRef={threadFeedRef}
                                            threadChatEndRef={threadChatEndRef}
                                            resolvedUserId={resolvedUserId}
                                            selectedChannel={selectedChannel}
                                            handleDeleteChannelMessage={handleDeleteChannelMessage}
                                            handleUndoDeleteChannelMessage={handleUndoDeleteChannelMessage}
                                            threadInput={threadInput}
                                            setThreadInput={setThreadInput}
                                            handleSendThreadMessage={handleSendThreadMessage}
                                        />
                                    </div>
                                )}

                                {/* TAB 2: FILES & DOCUMENTS */}
                                {activePanelTab === 'files' && (
                                    <ChannelFilesTab
                                        files={files}
                                        fileSearchQuery={fileSearchQuery}
                                        setFileSearchQuery={setFileSearchQuery}
                                        uploadingFile={uploadingFile}
                                        channelName={selectedChannel.name}
                                        onUploadClick={() => fileInputRef.current?.click()}
                                        onPreviewFile={setPreviewFile}
                                    />
                                )}

                                {/* TAB 3: MEMBERS */}
                                {activePanelTab === 'members' && (
                                    <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                                        <ChannelMembersPage
                                            members={members}
                                            currentUserId={currentUserId}
                                            onRemove={handleRemoveMember}
                                            onRoleChange={handleUpdateMemberRole}
                                        />
                                    </div>
                                )}

                                {/* TAB 4: DETAILS & REAL INFO */}
                                {activePanelTab === 'info' && (
                                    <ChannelInfoTab
                                        selectedChannel={selectedChannel}
                                        currentTeamName={currentTeam?.name}
                                        messageCount={messages.length}
                                        fileCount={files.length}
                                    />
                                )}

                                {/* TAB 5: PERMISSIONS */}
                                {activePanelTab === 'permissions' && (
                                    <ChannelPermissionsTab />
                                )}

                                {/* TAB 6: DANGER ZONE */}
                                {activePanelTab === 'danger' && (
                                    <ChannelDangerTab
                                        selectedChannel={selectedChannel}
                                        handleArchiveChannel={handleArchiveChannel}
                                        handleRestoreChannel={handleRestoreChannel}
                                        handleDeleteChannel={handleDeleteChannel}
                                    />
                                )}
                            </>
                        ) : (
                            <ChannelEmptyWorkspace
                                isChannelListCollapsed={isChannelListCollapsed}
                                onToggleCollapse={toggleChannelListCollapse}
                                onCreateChannelClick={() => setShowCreateDialog(true)}
                            />
                        )}
                    </div>
                </div>
            )}

            <CreateChannelDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} onCreate={handleCreateChannel} />
            <EditChannelDialog open={showEditDialog} channel={selectedChannel} onClose={() => setShowEditDialog(false)} onSave={handleUpdateChannel} />
            <InviteChannelMemberDialog open={showInviteDialog} onClose={() => setShowInviteDialog(false)} onInvite={handleInviteMember} />
            <CodeSnippetModal
                isOpen={showCodeModal}
                onClose={() => setShowCodeModal(false)}
                onSubmit={handlePostCodeSnippet}
                channelName={selectedChannel?.name}
            />

            {/* Microsoft Teams Style Incoming Message Notification Toast Banner */}
            <ChannelNotificationToast
                notification={incomingNotificationToast}
                onClick={() => {
                    setActivePanelTab('chat')
                    setIncomingNotificationToast(null)
                }}
                onDismiss={() => setIncomingNotificationToast(null)}
            />

            {/* Zoom Clips Async Video Recorder Modal */}
            <AsyncClipRecorderModal
                isOpen={showClipModal}
                onClose={() => setShowClipModal(false)}
                token={token}
                channelId={selectedChannel?._id}
                onClipUploaded={handleClipUploaded}
            />

            {/* Next-Gen Slack 2.0 Channel Live Huddle Dock */}
            <ChannelHuddleDock
                isHuddleActive={isHuddleActive && !!selectedChannel}
                isHuddleCollapsed={isHuddleCollapsed}
                channelName={selectedChannel?.name || ''}
                isHuddleMuted={isHuddleMuted}
                ambientAudioMode={ambientAudioMode}
                onToggleMute={() => setIsHuddleMuted(!isHuddleMuted)}
                onToggleCollapse={setIsHuddleCollapsed}
                onCycleAmbient={() => {
                    const next = ambientAudioMode === 'off' ? 'lofi' : (ambientAudioMode === 'lofi' ? 'rain' : 'off')
                    setAmbientAudioMode(next)
                }}
                onLeaveHuddle={handleToggleHuddle}
            />

            {/* Document / File Preview Modal */}
            <DocumentPreviewModal
                isOpen={Boolean(previewFile)}
                onClose={() => setPreviewFile(null)}
                file={previewFile}
            />
        </div>
    )
}
