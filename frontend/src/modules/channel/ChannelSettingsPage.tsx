import React, { useEffect, useMemo, useState, useRef } from 'react'
import type { Channel, UpdateChannelPayload } from './channel.types'
import {
    createChannel,
    getChannel,
    listTeamChannels,
    updateChannel,
    archiveChannel,
    restoreChannel,
    deleteChannel,
    joinChannel,
    leaveChannel,
    inviteChannelMember,
    removeChannelMember,
    updateChannelMemberRole,
    listChannelFiles,
    uploadChannelFile,
    addChannelMessageReaction,
    deleteChannelMessage,
    undoDeleteChannelMessage
} from './channel.service'
import { CreateChannelDialog } from './CreateChannelDialog'
import { EditChannelDialog } from './EditChannelDialog'
import { InviteChannelMemberDialog } from './InviteChannelMemberDialog'
import { ChannelMembersPage } from './ChannelMembersPage'
import {
    IconMessage, IconFileText, IconUsers, IconEye, IconShield,
    IconAlertTriangle, IconHash, IconCheck, IconTrash, IconPlus, IconX,
    IconPin, IconFolder, IconSparkles, IconMonitor, IconDownload, IconHand,
    IconSearch, IconBell, IconBellOff, IconMic, IconLock, IconUndo,
    IconUserPlus, IconEdit, IconLogOut
} from '../../components/common/Icons'
import { FileCard } from './components/FileCard'
import { DocumentPreviewModal, type PreviewDocument } from '../../components/common/DocumentPreviewModal'
import { CodeSnippetModal } from './components/CodeSnippetModal'
import { CodeSnippetCard } from './components/CodeSnippetCard'
import type { ChannelAttachment, CodeSnippet } from './channel.types'
import { soundEffects } from '../../utils/soundEffects'
import { AsyncClipRecorderModal } from '../chat/components/AsyncClipRecorderModal'
import io from 'socket.io-client'
import { SOCKET_URL, API_BASE, normalizeMediaUrl } from '../../config'
import { renderFormattedMessage } from '../../utils/formatMessage'

interface ChannelSettingsPageProps {
    token: string
    organizationId?: string
    teamId?: string
    currentUserId?: string
    teams?: any[]
    onSelectTeam?: (teamId: string) => void
    onStartMeeting?: (meetingId: string) => void
    onStartGroupCall?: (targetUserIds: string[], channelName: string, channelId: string, callType?: 'video' | 'audio') => void
}

/**
 * Format timestamp into conversational date dividers: Today, Yesterday, or formatted date.
 */
function formatMessageDateDivider(dateStr: string): string {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
        return 'Today'
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday'
    }
    return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    })
}

function formatDuration(sec: number): string {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
}

/**
 * VoiceMessageCard
 * Rich interactive audio waveform player for channel voice notes.
 */
function VoiceMessageCard({ url, duration, name }: { url: string; duration?: number; name?: string }) {
    const [playing, setPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [audioDuration, setAudioDuration] = useState(duration || 0)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    const togglePlay = () => {
        const audio = audioRef.current
        if (!audio) return
        if (playing) {
            audio.pause()
        } else {
            audio.play().catch(() => { })
        }
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 14px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(168, 85, 247, 0.12) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            maxWidth: 320,
            marginTop: 4,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)'
        }}>
            <audio
                ref={audioRef}
                src={normalizeMediaUrl(url)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => { setPlaying(false); setCurrentTime(0); }}
                onTimeUpdate={() => {
                    if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
                }}
                onLoadedMetadata={() => {
                    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
                        setAudioDuration(audioRef.current.duration)
                    }
                }}
            />
            <button
                type="button"
                onClick={togglePlay}
                style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: playing ? '#818cf8' : '#6366f1',
                    border: 'none',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.45)',
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                }}
                title={playing ? 'Pause' : 'Play voice message'}
            >
                {playing ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
                        <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                )}
            </button>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 18 }}>
                    {[35, 70, 50, 90, 65, 85, 45, 95, 60, 80, 50, 75, 40, 65].map((h, i) => {
                        const progress = audioDuration > 0 ? currentTime / audioDuration : 0
                        const barProgress = i / 14
                        const isActive = barProgress <= progress
                        return (
                            <div
                                key={i}
                                style={{
                                    width: 3,
                                    height: `${h}%`,
                                    borderRadius: 2,
                                    background: isActive ? '#818cf8' : 'rgba(255, 255, 255, 0.25)',
                                    transition: 'all 0.1s ease'
                                }}
                            />
                        )
                    })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.675rem', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                    <span style={{ color: playing ? '#818cf8' : '#94a3b8', fontWeight: 600 }}>
                        {formatDuration(Math.floor(currentTime))}
                    </span>
                    <span>
                        {audioDuration > 0 ? formatDuration(Math.floor(audioDuration)) : name || 'Voice Note'}
                    </span>
                </div>
            </div>
        </div>
    )
}

/**
 * Convert rich contenteditable HTML into clean, standard Markdown for storage
 */
function htmlToMarkdown(html: string): string {
    if (!html || !html.trim()) return ''
    const temp = document.createElement('div')
    temp.innerHTML = html

    // Replace <b> and <strong> with **...**
    temp.querySelectorAll('b, strong').forEach(el => {
        const text = el.textContent || ''
        el.replaceWith(document.createTextNode(text ? `**${text}**` : ''))
    })
    // Replace <i> and <em> with *...*
    temp.querySelectorAll('i, em').forEach(el => {
        const text = el.textContent || ''
        el.replaceWith(document.createTextNode(text ? `*${text}*` : ''))
    })
    // Replace <strike>, <s>, <del> with ~~...~~
    temp.querySelectorAll('strike, s, del').forEach(el => {
        const text = el.textContent || ''
        el.replaceWith(document.createTextNode(text ? `~~${text}~~` : ''))
    })
    // Replace <code> with `...`
    temp.querySelectorAll('code').forEach(el => {
        const text = el.textContent || ''
        el.replaceWith(document.createTextNode(text ? `\`${text}\`` : ''))
    })
    // Replace <br> with \n
    temp.querySelectorAll('br').forEach(el => {
        el.replaceWith(document.createTextNode('\n'))
    })
    // Replace <div> and <p> with \n
    temp.querySelectorAll('div, p').forEach(el => {
        el.prepend(document.createTextNode('\n'))
    })

    return temp.textContent?.trim() || ''
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
    const [chatInput, setChatInput] = useState('')
    const [isEditorEmpty, setIsEditorEmpty] = useState(true)
    const [activeFormats, setActiveFormats] = useState<{ bold: boolean; italic: boolean; strike: boolean; code: boolean }>({
        bold: false,
        italic: false,
        strike: false,
        code: false
    })
    const [activeThreadParent, setActiveThreadParent] = useState<any | null>(null)
    const [threadMessages, setThreadMessages] = useState<any[]>([])
    const [threadInput, setThreadInput] = useState('')
    const [pinnedMessages, setPinnedMessages] = useState<any[]>([])
    const [showPinnedDrawer, setShowPinnedDrawer] = useState(false)
    const [socketInstance, setSocketInstance] = useState<any | null>(null)
    const [showClipModal, setShowClipModal] = useState(false)

    // Feature 1: In-Channel Message Search
    const [showInChannelSearch, setShowInChannelSearch] = useState(false)
    const [inChannelSearchQuery, setInChannelSearchQuery] = useState('')

    // Feature 3: Live Real-Time Typing Indicator
    const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; username: string; timestamp: number }>>([])
    const typingDebounceRef = useRef<any>(null)

    // Feature 4: Quick Voice Note Recorder
    const [isRecordingAudio, setIsRecordingAudio] = useState(false)
    const [audioRecordDuration, setAudioRecordDuration] = useState(0)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const audioStreamRef = useRef<MediaStream | null>(null)
    const audioTimerRef = useRef<any>(null)

    // Feature 6: Unread Channel Count Badges
    const [unreadChannelCounts, setUnreadChannelCounts] = useState<Record<string, number>>({})

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
            } catch (_) {}
            return next
        })
    }

    // Next-Gen Feature 2: Channel Live Huddle (Slack 2.0 Style)
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

    // MS Teams-Style Notification State
    const [incomingNotificationToast, setIncomingNotificationToast] = useState<{
        id: string
        senderName: string
        senderAvatar?: string
        channelName: string
        channelId: string
        content: string
        time: string
    } | null>(null)

    const requestBrowserNotificationPermission = () => {
        if (typeof Notification !== 'undefined') {
            Notification.requestPermission().catch(() => { })
        }
    }

    useEffect(() => {
        requestBrowserNotificationPermission()
    }, [])

    useEffect(() => {
        if (!incomingNotificationToast) return
        const timer = setTimeout(() => {
            setIncomingNotificationToast(null)
        }, 6000)
        return () => clearTimeout(timer)
    }, [incomingNotificationToast])

    // Real Channel Files state
    const [files, setFiles] = useState<any[]>([])
    const [uploadingFile, setUploadingFile] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
    const [showCodeModal, setShowCodeModal] = useState(false)
    const [isDraggingOver, setIsDraggingOver] = useState(false)
    const [dragCounter, setDragCounter] = useState(0)
    const [fileSearchQuery, setFileSearchQuery] = useState('')

    const chatFeedRef = useRef<HTMLDivElement>(null)
    const threadFeedRef = useRef<HTMLDivElement>(null)
    const mainChatEndRef = useRef<HTMLDivElement>(null)
    const threadChatEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const chatInputRef = useRef<HTMLInputElement>(null)
    const composerEditorRef = useRef<HTMLDivElement>(null)

    const currentUserName = useMemo(() => {
        const found = members.find(m => ((m as any).userId?._id || (m as any).userId)?.toString() === resolvedUserId)
        return (found as any)?.fullName || (found as any)?.userId?.fullName || 'Colleague'
    }, [members, resolvedUserId])

    // Channel mute state sync
    useEffect(() => {
        if (selectedChannel?._id) {
            const saved = localStorage.getItem(`jts_channel_muted_${selectedChannel._id}`)
            setIsChannelMuted(saved === 'true')
            setTypingUsers([])
            setShowInChannelSearch(false)
            setInChannelSearchQuery('')
        }
    }, [selectedChannel?._id])

    // Cleanup expired typing indicator users
    useEffect(() => {
        const timer = setInterval(() => {
            setTypingUsers(prev => {
                const now = Date.now()
                const active = prev.filter(u => now - u.timestamp < 3500)
                return active.length !== prev.length ? active : prev
            })
        }, 1500)
        return () => clearInterval(timer)
    }, [])

    const toggleChannelMute = () => {
        if (!selectedChannel) return
        const next = !isChannelMuted
        setIsChannelMuted(next)
        try {
            localStorage.setItem(`jts_channel_muted_${selectedChannel._id}`, String(next))
        } catch (_) { }
    }

    const handleChatInputChange = (val: string) => {
        setChatInput(val)
        if (socketInstance && selectedChannel) {
            socketInstance.emit('channel:typing', {
                channelId: selectedChannel._id,
                userId: resolvedUserId,
                username: currentUserName,
                typing: true
            })
            if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
            typingDebounceRef.current = setTimeout(() => {
                if (socketInstance && selectedChannel) {
                    socketInstance.emit('channel:typing', {
                        channelId: selectedChannel._id,
                        userId: resolvedUserId,
                        username: currentUserName,
                        typing: false
                    })
                }
            }, 2500)
        }
    }

    const checkEditorState = () => {
        const text = composerEditorRef.current?.innerText || ''
        setIsEditorEmpty(!text.trim())
    }

    const updateActiveFormats = () => {
        try {
            const isBold = document.queryCommandState('bold')
            const isItalic = document.queryCommandState('italic')
            const isStrike = document.queryCommandState('strikeThrough')

            let isCode = false
            const sel = window.getSelection()
            if (sel && sel.anchorNode && composerEditorRef.current) {
                let node: Node | null = sel.anchorNode
                while (node && node !== composerEditorRef.current) {
                    if (node.nodeName === 'CODE') {
                        isCode = true
                        break
                    }
                    node = node.parentNode
                }
            }

            setActiveFormats({
                bold: isBold,
                italic: isItalic,
                strike: isStrike,
                code: isCode
            })
        } catch (_) { }
    }

    const toggleBold = () => {
        composerEditorRef.current?.focus()
        document.execCommand('bold', false)
        updateActiveFormats()
        checkEditorState()
    }

    const toggleItalic = () => {
        composerEditorRef.current?.focus()
        document.execCommand('italic', false)
        updateActiveFormats()
        checkEditorState()
    }

    const toggleStrike = () => {
        composerEditorRef.current?.focus()
        document.execCommand('strikeThrough', false)
        updateActiveFormats()
        checkEditorState()
    }

    const toggleInlineCode = () => {
        const editor = composerEditorRef.current
        if (!editor) return
        editor.focus()
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0) return
        const range = sel.getRangeAt(0)

        let node: Node | null = sel.anchorNode
        let codeParent: HTMLElement | null = null
        while (node && node !== editor) {
            if (node.nodeName === 'CODE') {
                codeParent = node as HTMLElement
                break
            }
            node = node.parentNode
        }

        if (codeParent) {
            const parent = codeParent.parentNode
            while (codeParent.firstChild) {
                parent?.insertBefore(codeParent.firstChild, codeParent)
            }
            parent?.removeChild(codeParent)
        } else {
            const selectedText = range.toString() || 'code'
            const codeEl = document.createElement('code')
            codeEl.style.background = 'rgba(255, 255, 255, 0.1)'
            codeEl.style.color = '#f43f5e'
            codeEl.style.padding = '1px 5px'
            codeEl.style.borderRadius = '4px'
            codeEl.style.fontFamily = 'Consolas, Monaco, monospace'
            codeEl.style.fontSize = '0.85em'
            codeEl.textContent = selectedText
            range.deleteContents()
            range.insertNode(codeEl)

            const newRange = document.createRange()
            newRange.selectNodeContents(codeEl)
            sel.removeAllRanges()
            sel.addRange(newRange)
        }
        updateActiveFormats()
        checkEditorState()
    }

    const handleEditorInput = () => {
        checkEditorState()
        updateActiveFormats()
        const text = composerEditorRef.current?.innerText || ''
        if (socketInstance && selectedChannel) {
            socketInstance.emit('channel:typing', {
                channelId: selectedChannel._id,
                userId: resolvedUserId,
                username: currentUserName,
                typing: !!text.trim()
            })
            if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
            typingDebounceRef.current = setTimeout(() => {
                if (socketInstance && selectedChannel) {
                    socketInstance.emit('channel:typing', {
                        channelId: selectedChannel._id,
                        userId: resolvedUserId,
                        username: currentUserName,
                        typing: false
                    })
                }
            }, 2500)
        }
    }

    const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
            e.preventDefault()
            toggleInlineCode()
        }
    }

    const handleInsertEmoji = (emoji: string) => {
        const editor = composerEditorRef.current
        if (!editor) return
        editor.focus()
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
            const range = sel.getRangeAt(0)
            range.deleteContents()
            const textNode = document.createTextNode(emoji)
            range.insertNode(textNode)
            range.setStartAfter(textNode)
            range.setEndAfter(textNode)
            sel.removeAllRanges()
            sel.addRange(range)
        } else {
            editor.innerText += emoji
        }
        checkEditorState()
        setShowEmojiPicker(false)
    }

    // Audio recording methods
    const startAudioRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            audioStreamRef.current = stream
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.start(200)
            setIsRecordingAudio(true)
            setAudioRecordDuration(0)

            if (audioTimerRef.current) clearInterval(audioTimerRef.current)
            audioTimerRef.current = setInterval(() => {
                setAudioRecordDuration(prev => prev + 1)
            }, 1000)
        } catch (err: any) {
            console.error('Failed to access microphone for voice note:', err)
            alert('Could not access microphone: ' + (err?.message || 'Permission denied'))
        }
    }

    const stopAudioRecording = async (send: boolean) => {
        if (audioTimerRef.current) {
            clearInterval(audioTimerRef.current)
            audioTimerRef.current = null
        }

        const duration = audioRecordDuration

        if (!send || !mediaRecorderRef.current || !selectedChannel) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop()
            }
            if (audioStreamRef.current) {
                audioStreamRef.current.getTracks().forEach(track => track.stop())
                audioStreamRef.current = null
            }
            setIsRecordingAudio(false)
            setAudioRecordDuration(0)
            audioChunksRef.current = []
            return
        }

        mediaRecorderRef.current.onstop = async () => {
            if (audioStreamRef.current) {
                audioStreamRef.current.getTracks().forEach(track => track.stop())
                audioStreamRef.current = null
            }
            setIsRecordingAudio(false)
            setAudioRecordDuration(0)

            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            audioChunksRef.current = []
            if (audioBlob.size === 0) return

            const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' })

            try {
                setUploadingFile(true)
                const uploaded = await uploadChannelFile(selectedChannel._id, audioFile, token)
                const fileUrl = uploaded.secureUrl || `${API_BASE}/api/file/${uploaded._id}/download`

                const attachmentData: ChannelAttachment = {
                    name: audioFile.name,
                    url: fileUrl,
                    fileType: 'audio',
                    size: audioFile.size,
                    mimeType: 'audio/webm'
                }

                const res = await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        content: `🎙️ Voice Note (${formatDuration(duration)})`,
                        messageType: 'audio',
                        attachments: [attachmentData]
                    })
                })
                const data = await res.json()
                if (data.success && socketInstance) {
                    if (data.data?._id) {
                        sentByCurrentTabIds.current.add(data.data._id.toString())
                    }
                    socketInstance.emit('channel:message:send', data.data)
                    setMessages(prev => {
                        if (prev.some(m => m._id === data.data._id)) return prev
                        return [...prev, data.data]
                    })
                }
            } catch (err: any) {
                console.error('Failed to send voice note:', err)
                alert(err?.message || 'Failed to upload voice note')
            } finally {
                setUploadingFile(false)
            }
        }

        if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
        }
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

    // Load real channel files
    const loadFiles = async (channelId: string) => {
        try {
            const list = await listChannelFiles(channelId, token)
            setFiles(list || [])
        } catch (err) {
            console.error('Failed to load channel files:', err)
        }
    }

    // Load messages and socket for selected channel
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

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling']
        })

        const joinChannelRoom = () => {
            if (selectedChannel?._id) {
                socket.emit('channel:join', { channelId: selectedChannel._id })
            }
        }

        socket.on('connect', joinChannelRoom)
        if (socket.connected) {
            joinChannelRoom()
        }

        socket.on('channel:message:receive', (msg: any) => {
            const msgId = (msg._id || msg.id)?.toString()
            const targetCId = (msg.channelId?._id || msg.channelId)?.toString()

            // Accurately resolve current user's identity
            const myUserId = (currentUserId || (() => {
                try {
                    const u = localStorage.getItem('user')
                    if (!u) return ''
                    const parsed = JSON.parse(u)
                    return (parsed._id || parsed.id || '').toString()
                } catch (_) {
                    return ''
                }
            })() || (() => {
                try {
                    if (!token) return ''
                    const payload = JSON.parse(atob(token.split('.')[1]))
                    return (payload._id || payload.id || payload.userId || payload.sub || '').toString()
                } catch (_) {
                    return ''
                }
            })()).toString()

            const myUserEmail = (() => {
                try {
                    const u = localStorage.getItem('user')
                    return u ? (JSON.parse(u).email || '').toLowerCase() : ''
                } catch (_) {
                    return ''
                }
            })()

            const senderIdStr = (typeof msg.senderId === 'object' && msg.senderId !== null
                ? (msg.senderId._id || msg.senderId.id || '')
                : (msg.senderId || '')).toString()

            const senderEmailStr = (typeof msg.senderId === 'object' && msg.senderId !== null && msg.senderId.email
                ? msg.senderId.email
                : '').toLowerCase()

            const isSentByMe = Boolean(
                (myUserId && senderIdStr && myUserId === senderIdStr) ||
                (myUserEmail && senderEmailStr && myUserEmail === senderEmailStr) ||
                (msgId && sentByCurrentTabIds.current.has(msgId))
            )

            // NEVER notify or show toast/chime for messages sent by ME
            if (!isSentByMe) {
                // 1. Update unread count if message belongs to another channel
                const isDifferentChannel = targetCId && selectedChannel && targetCId !== selectedChannel._id.toString()
                if (isDifferentChannel) {
                    setUnreadChannelCounts(prev => ({
                        ...prev,
                        [targetCId]: (prev[targetCId] || 0) + 1
                    }))
                }

                // Check if channel is muted by user
                const isMuted = selectedChannel && localStorage.getItem(`jts_channel_muted_${selectedChannel._id}`) === 'true'
                if (!isMuted) {
                    // Play signature Microsoft Teams notification chime
                    try {
                        soundEffects.playMessageNotificationChime()
                    } catch (e) {
                        console.error('Sound chime error:', e)
                    }
                }

                const isAppFocused = typeof document !== 'undefined' && !document.hidden && document.hasFocus()

                if (isAppFocused) {
                    // When user is inside the app, only show in-app toast if message is from ANOTHER channel
                    if (isDifferentChannel) {
                        setIncomingNotificationToast({
                            id: msgId || String(Date.now()),
                            senderName: msg.senderId?.fullName || 'Colleague',
                            senderAvatar: msg.senderId?.profileImage,
                            channelName: msg.channelId?.name || selectedChannel?.name || 'Channel',
                            channelId: targetCId || selectedChannel?._id || '',
                            content: msg.content || (msg.attachments?.length ? '📎 Sent an attachment' : 'Shared a message'),
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        })
                    }
                } else {
                    // When browser is minimized or user is on another tab, show OS Desktop Push notification
                    if (typeof Notification !== 'undefined') {
                        if (Notification.permission === 'granted') {
                            try {
                                const senderName = msg.senderId?.fullName || 'Colleague'
                                const chName = msg.channelId?.name || selectedChannel?.name || 'General'
                                const n = new Notification(`💬 ${senderName} in #${chName}`, {
                                    body: msg.content || (msg.attachments?.length ? '📎 Sent an attachment' : 'Shared a message'),
                                    icon: msg.senderId?.profileImage || '/icon.svg',
                                    tag: `channel-msg-${msgId || Date.now()}`,
                                    silent: true
                                })
                                n.onclick = () => {
                                    window.focus()
                                    n.close()
                                }
                            } catch (_) { }
                        } else if (Notification.permission === 'default') {
                            Notification.requestPermission().catch(() => { })
                        }
                    }
                }
            }

            if (msg.replyTo) {
                if (activeThreadParent && activeThreadParent._id === msg.replyTo) {
                    setThreadMessages(prev => {
                        if (prev.some(m => m._id === msg._id)) return prev.map(m => m._id === msg._id ? msg : m)
                        return [...prev, msg]
                    })
                }
                setMessages(prev => prev.map(m => {
                    if (m._id === msg.replyTo) {
                        return { ...m, replyCount: (m.replyCount || 0) + 1 }
                    }
                    return m
                }))
            } else {
                setMessages(prev => {
                    if (prev.some(m => m._id === msg._id)) return prev.map(m => m._id === msg._id ? msg : m)
                    return [...prev, msg]
                })
            }
        })

        socket.on('channel:message:delete', ({ messageId }: { messageId: string }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: true } : m))
            setThreadMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: true } : m))
            setPinnedMessages(prev => prev.filter(m => m._id !== messageId))
        })

        socket.on('channel:message:undo', ({ message }: { message: any }) => {
            if (!message) return
            setMessages(prev => prev.map(m => m._id === message._id ? { ...m, ...message, deleted: false } : m))
            setThreadMessages(prev => prev.map(m => m._id === message._id ? { ...m, ...message, deleted: false } : m))
        })

        socket.on('channel:message:reaction', ({ messageId, reactions }: any) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m))
            setThreadMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m))
        })

        socket.on('channel:message:pin', ({ messageId, pinned, pinnedBy, pinnedAt, message }: any) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, pinned, pinnedBy, pinnedAt } : m))
            setPinnedMessages(prev => {
                if (pinned) {
                    if (prev.some(m => m._id === messageId)) {
                        return prev.map(m => m._id === messageId ? (message || { ...m, pinned, pinnedBy, pinnedAt }) : m)
                    }
                    return [message || { _id: messageId, pinned, pinnedBy, pinnedAt }, ...prev]
                } else {
                    return prev.filter(m => m._id !== messageId)
                }
            })
        })

        socket.on('channel:typing', (payload: { channelId: string; userId: string; username: string; typing: boolean }) => {
            if (payload?.channelId === selectedChannel?._id && payload?.userId !== resolvedUserIdRef.current) {
                if (payload.typing) {
                    setTypingUsers(prev => {
                        const filtered = prev.filter(u => u.userId !== payload.userId)
                        return [...filtered, { userId: payload.userId, username: payload.username || 'Colleague', timestamp: Date.now() }]
                    })
                } else {
                    setTypingUsers(prev => prev.filter(u => u.userId !== payload.userId))
                }
            }
        })

        setSocketInstance(socket)

        return () => {
            socket.emit('channel:leave', { channelId: selectedChannel._id })
            socket.disconnect()
        }
    }, [selectedChannel?._id, token, activeThreadParent?._id])

    const handleTogglePin = async (messageId: string) => {
        if (!selectedChannel) return
        try {
            const res = await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat/${messageId}/pin`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success && data.data) {
                const updated = data.data
                setMessages(prev => prev.map(m => m._id === messageId ? { ...m, pinned: updated.pinned, pinnedBy: updated.pinnedBy, pinnedAt: updated.pinnedAt } : m))
                setPinnedMessages(prev => {
                    if (updated.pinned) {
                        return [updated, ...prev.filter(m => m._id !== messageId)]
                    } else {
                        return prev.filter(m => m._id !== messageId)
                    }
                })
            }
        } catch (err) {
            console.error('[handleTogglePin] error:', err)
        }
    }

    const handleDeleteChannelMessage = async (messageId: string) => {
        if (!selectedChannel) return
        // Optimistic UI update
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: true } : m))
        setThreadMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: true } : m))
        setPinnedMessages(prev => prev.filter(m => m._id !== messageId))

        try {
            await deleteChannelMessage(selectedChannel._id, messageId, token)
        } catch (err: any) {
            console.error('Failed to delete channel message:', err)
        }
    }

    const handleUndoDeleteChannelMessage = async (messageId: string) => {
        if (!selectedChannel) return
        // Optimistic UI update
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: false } : m))
        setThreadMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: false } : m))

        try {
            const res = await undoDeleteChannelMessage(selectedChannel._id, messageId, token)
            if (res && res.data) {
                setMessages(prev => prev.map(m => m._id === messageId ? { ...m, ...res.data, deleted: false } : m))
                setThreadMessages(prev => prev.map(m => m._id === messageId ? { ...m, ...res.data, deleted: false } : m))
            }
        } catch (err: any) {
            console.error('Failed to undo delete channel message:', err)
        }
    }

    // Load thread messages
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

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!selectedChannel) return

        let content = ''
        if (composerEditorRef.current) {
            content = htmlToMarkdown(composerEditorRef.current.innerHTML)
        } else if (chatInput) {
            content = chatInput.trim()
        }

        if (!content.trim()) return

        if (composerEditorRef.current) {
            composerEditorRef.current.innerHTML = ''
        }
        setChatInput('')
        setIsEditorEmpty(true)
        setShowEmojiPicker(false)
        setActiveFormats({ bold: false, italic: false, strike: false, code: false })

        try {
            const res = await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            })
            const data = await res.json()
            if (data.success) {
                if (data.data?._id) {
                    sentByCurrentTabIds.current.add(data.data._id.toString())
                }
                if (socketInstance) {
                    socketInstance.emit('channel:message:send', data.data)
                }
                setMessages(prev => {
                    if (prev.some(m => m._id === data.data._id)) return prev
                    return [...prev, data.data]
                })
            }
        } catch (err) {
            console.error('Failed to send message:', err)
        }
    }

    const handleSendThreadMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!threadInput.trim() || !selectedChannel || !activeThreadParent) return

        const content = threadInput.trim()
        setThreadInput('')

        try {
            const res = await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content, replyTo: activeThreadParent._id })
            })
            const data = await res.json()
            if (data.success) {
                if (data.data?._id) {
                    sentByCurrentTabIds.current.add(data.data._id.toString())
                }
                if (socketInstance) {
                    socketInstance.emit('channel:message:send', data.data)
                }
                setThreadMessages(prev => {
                    if (prev.some(m => m._id === data.data._id)) return prev
                    return [...prev, data.data]
                })
            }
        } catch (err) {
            console.error('Failed to send thread reply:', err)
        }
    }

    const handleClipUploaded = async (clip: { _id: string; title: string; videoUrl: string; duration: number }) => {
        if (!selectedChannel) return
        const clipUrl = `${API_BASE}${clip.videoUrl}`
        const clipContent = `[Video Clip] ${clip.title} (${Math.round(clip.duration)}s)\n${clipUrl}`
        try {
            await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ content: clipContent, messageType: 'text' })
            })
        } catch (e) {
            console.error('Failed to post clip in channel:', e)
        }
    }

    // Reaction handler
    const handleReaction = async (messageId: string, emoji: string) => {
        if (!selectedChannel) return
        try {
            const updated = await addChannelMessageReaction(selectedChannel._id, messageId, emoji, token)
            if (updated) {
                setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions: updated.reactions } : m))
                if (socketInstance) {
                    socketInstance.emit('channel:message:reaction:send', { channelId: selectedChannel._id, messageId, reactions: updated.reactions })
                }
            }
        } catch (err) {
            console.error('Failed to react:', err)
        }
    }

    // Multi-File upload and Teams attachment post handler
    const uploadFilesAndPost = async (fileList: FileList | File[]) => {
        if (!fileList || fileList.length === 0 || !selectedChannel) return

        setUploadingFile(true)
        try {
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i]
                const uploaded = await uploadChannelFile(selectedChannel._id, file, token)

                const ext = file.name.split('.').pop()?.toLowerCase() || ''
                let fileCategory = 'other'
                if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || file.type.startsWith('image/')) {
                    fileCategory = 'image'
                } else if (['pdf'].includes(ext) || file.type === 'application/pdf') {
                    fileCategory = 'pdf'
                } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
                    fileCategory = 'sheet'
                } else if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
                    fileCategory = 'doc'
                } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
                    fileCategory = 'archive'
                } else if (['js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'json', 'sql', 'sh'].includes(ext)) {
                    fileCategory = 'code'
                }

                const fileUrl = uploaded.secureUrl || `${API_BASE}/api/file/${uploaded._id}/download`

                const attachmentData: ChannelAttachment = {
                    name: file.name,
                    url: fileUrl,
                    fileType: fileCategory,
                    size: file.size,
                    mimeType: file.type
                }

                // Post file attachment message into channel chat
                const res = await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        content: `Shared attachment: ${file.name}`,
                        messageType: fileCategory === 'image' ? 'image' : 'file',
                        attachments: [attachmentData]
                    })
                })
                const data = await res.json()
                if (data.success && socketInstance) {
                    if (data.data?._id) {
                        sentByCurrentTabIds.current.add(data.data._id.toString())
                    }
                    socketInstance.emit('channel:message:send', data.data)
                    setMessages(prev => {
                        if (prev.some(m => m._id === data.data._id)) return prev
                        return [...prev, data.data]
                    })
                }
            }
            await loadFiles(selectedChannel._id)
        } catch (err: any) {
            alert(err?.message || 'Failed to upload files')
        } finally {
            setUploadingFile(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            uploadFilesAndPost(e.target.files)
        }
    }

    // Drag-and-Drop file handlers
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragCounter(prev => prev + 1)
        setIsDraggingOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragCounter(prev => {
            const next = prev - 1
            if (next <= 0) {
                setIsDraggingOver(false)
                return 0
            }
            return next
        })
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDraggingOver(false)
        setDragCounter(0)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            uploadFilesAndPost(e.dataTransfer.files)
        }
    }

    // Code snippet posting handler
    const handlePostCodeSnippet = async (snippet: CodeSnippet, caption?: string) => {
        if (!selectedChannel) return
        try {
            const res = await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: caption || `Shared a ${snippet.language || ''} code snippet`,
                    messageType: 'code',
                    codeSnippet: snippet
                })
            })
            const data = await res.json()
            if (data.success && socketInstance) {
                if (data.data?._id) {
                    sentByCurrentTabIds.current.add(data.data._id.toString())
                }
                socketInstance.emit('channel:message:send', data.data)
                setMessages(prev => {
                    if (prev.some(m => m._id === data.data._id)) return prev
                    return [...prev, data.data]
                })
            }
        } catch (err) {
            console.error('Failed to post code snippet:', err)
        }
    }

    // Instant Channel Meeting ("Meet Now" - Video)
    const handleStartChannelMeeting = () => {
        if (!selectedChannel) return
        const meetingId = `meet_${selectedChannel.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36).slice(-5)}`

        try {
            sessionStorage.removeItem('jts_initial_camera_off')
        } catch { }

        // Notify in channel chat
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

        // Extract all other member IDs from the channel
        const otherMemberIds = (selectedChannel.members || []).map((m: any) => {
            const userObj = typeof m.userId === 'object' && m.userId !== null ? m.userId : null
            return userObj?._id ? userObj._id.toString() : (typeof m.userId === 'string' ? m.userId : ((m.user as any)?._id || ''))
        }).filter(id => id && String(id) !== String(resolvedUserId))

        // Notify in channel chat
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

    // Next-Gen Feature 2: Channel Live Huddle Handler (Slack 2.0 Style)
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

    const loadChannels = async (tId: string) => {
        setLoading(true)
        setError('')
        try {
            const list = await listTeamChannels(tId, token)
            setChannels(list)
            const savedChannelId = localStorage.getItem('jts_current_channel_id')
            const matchedSaved = list.find((channel) => channel._id === savedChannelId)
            if (matchedSaved) {
                setSelectedChannel(matchedSaved)
            } else if (!selectedChannel && list.length > 0) {
                setSelectedChannel(list[0])
            } else if (selectedChannel) {
                setSelectedChannel(list.find((channel) => channel._id === selectedChannel._id) || list[0] || null)
            }
        } catch (err: any) {
            setError(err?.message || 'Unable to load channels')
        } finally {
            setLoading(false)
        }
    }

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

    const handleCreateChannel = async (payload: { name: string; description?: string; type: 'public' | 'private' }) => {
        if (!teamId || !organizationId) {
            throw new Error('Organization and team are required')
        }
        const channel = await createChannel({ ...payload, teamId, organizationId }, token)
        await loadChannels(teamId)
        setSelectedChannel(channel)
        try {
            localStorage.setItem('jts_current_channel_id', channel._id)
        } catch (_) { }
    }

    const handleSelectChannel = async (channelId: string) => {
        try {
            localStorage.setItem('jts_current_channel_id', channelId)
        } catch (_) { }
        setUnreadChannelCounts(prev => ({ ...prev, [channelId]: 0 }))
        const channel = channels.find((item) => item._id === channelId)
        if (channel) {
            setSelectedChannel(channel)
            return
        }

        try {
            const loaded = await getChannel(channelId, token)
            setSelectedChannel(loaded)
        } catch (err: any) {
            setError(err?.message || 'Unable to load channel')
        }
    }

    const handleUpdateChannel = async (payload: UpdateChannelPayload) => {
        if (!selectedChannel) return
        try {
            const updated = await updateChannel(selectedChannel._id, payload, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to update channel')
        }
    }

    const handleArchiveChannel = async () => {
        if (!selectedChannel) return
        try {
            const updated = await archiveChannel(selectedChannel._id, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to archive channel')
        }
    }

    const handleRestoreChannel = async () => {
        if (!selectedChannel) return
        try {
            const updated = await restoreChannel(selectedChannel._id, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to restore channel')
        }
    }

    const handleDeleteChannel = async () => {
        if (!selectedChannel || !teamId) return
        try {
            await deleteChannel(selectedChannel._id, token)
            await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to delete channel')
        }
    }

    const handleJoinChannel = async () => {
        if (!selectedChannel || !currentUserId) return
        try {
            const updated = await joinChannel({ channelId: selectedChannel._id, userId: currentUserId }, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to join channel')
        }
    }

    const handleLeaveChannel = async () => {
        if (!selectedChannel || !currentUserId) return
        try {
            const updated = await leaveChannel({ channelId: selectedChannel._id, userId: currentUserId }, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to leave channel')
        }
    }

    const handleInviteMember = async (userId: string, role: Exclude<Channel['members'][number]['role'], 'owner'>) => {
        if (!selectedChannel) return
        try {
            const updated = await inviteChannelMember({ channelId: selectedChannel._id, userId, role }, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to invite member')
        }
    }

    const handleRemoveMember = async (userId: string) => {
        if (!selectedChannel) return
        try {
            const updated = await removeChannelMember({ channelId: selectedChannel._id, userId }, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to remove member')
        }
    }

    const handleUpdateMemberRole = async (userId: string, role: Exclude<Channel['members'][number]['role'], 'owner'>) => {
        if (!selectedChannel) return
        try {
            const updated = await updateChannelMemberRole({ channelId: selectedChannel._id, userId, role }, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to update member role')
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

    // Real Online Count (No hardcoded formula!)
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
        return teams.find(t => t._id === teamId) || null
    }, [teams, teamId])

    function formatFileSize(bytes: number) {
        if (!bytes || bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

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

                    {/* LEFT PANE: CHANNELS LIST + TEAM SWITCHER (Teams Style) */}
                    <div style={{
                        width: isChannelListCollapsed ? 0 : 'clamp(210px, 20vw, 260px)',
                        minWidth: isChannelListCollapsed ? 0 : 210,
                        maxWidth: isChannelListCollapsed ? 0 : 280,
                        flexShrink: 0,
                        background: 'rgba(10, 11, 16, 0.65)',
                        borderRight: isChannelListCollapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
                        display: isChannelListCollapsed ? 'none' : 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        minHeight: 0,
                        overflow: 'hidden',
                        transition: 'width 0.2s ease'
                    }}>
                        {/* Team / Department Selector Header */}
                        <div style={{
                            padding: '12px 14px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            background: 'rgba(255, 255, 255, 0.015)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                    <div style={{
                                        width: 22, height: 22, borderRadius: 5,
                                        background: currentTeam?.color ? `${currentTeam.color}30` : 'rgba(99, 102, 241, 0.25)',
                                        border: `1px solid ${currentTeam?.color || '#6366F1'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.65rem', fontWeight: 800, color: currentTeam?.color || '#6366F1'
                                    }}>
                                        {currentTeam?.name ? currentTeam.name.slice(0, 2).toUpperCase() : 'DE'}
                                    </div>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {currentTeam?.name || 'Department'}
                                    </span>
                                </div>

                                {teams.length > 1 && onSelectTeam && (
                                    <select
                                        value={teamId}
                                        onChange={(e) => onSelectTeam(e.target.value)}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: 6,
                                            padding: '2px 6px',
                                            fontSize: '0.65rem',
                                            color: '#818cf8',
                                            outline: 'none',
                                            cursor: 'pointer',
                                            maxWidth: 90
                                        }}
                                        title="Switch Department"
                                    >
                                        {teams.map(t => (
                                            <option key={t._id} value={t._id} style={{ background: '#18181b', color: '#fff' }}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Channels ({channels.length})
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateDialog(true)}
                                        style={{
                                            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                            border: 'none',
                                            borderRadius: 6,
                                            padding: '3px 9px',
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                            color: '#fff',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 3,
                                            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                                        }}
                                        title="Create new channel"
                                    >
                                        <span>+</span>
                                        <span>New</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={toggleChannelListCollapse}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: 6,
                                            padding: '3px 6px',
                                            color: 'var(--color-text-muted)',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.15s ease'
                                        }}
                                        title="Collapse channels sidebar"
                                        aria-label="Collapse channels sidebar"
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'
                                            e.currentTarget.style.color = '#fff'
                                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                                            e.currentTarget.style.color = 'var(--color-text-muted)'
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                                        }}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                            <line x1="9" y1="3" x2="9" y2="21" />
                                            <path d="m14 9-3 3 3 3" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Search Bar */}
                        {channels.length > 2 && (
                            <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <svg
                                        width="13"
                                        height="13"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{
                                            position: 'absolute',
                                            left: 9,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: 'var(--color-text-muted)',
                                            pointerEvents: 'none',
                                            opacity: 0.75
                                        }}
                                    >
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Filter channels..."
                                        value={channelSearch}
                                        onChange={(e) => setChannelSearch(e.target.value)}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: 6,
                                            padding: '5px 8px 5px 28px',
                                            fontSize: '0.75rem',
                                            color: '#fff',
                                            outline: 'none',
                                            width: '100%',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Channel Items List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 3, scrollbarWidth: 'thin' }}>
                            {filteredChannels.length === 0 ? (
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', padding: '16px 8px', textAlign: 'center' }}>
                                    {channelSearch ? 'No matching channel' : 'No channels in this department'}
                                </div>
                            ) : (
                                filteredChannels.map((channel) => {
                                    const isActive = selectedChannel?._id === channel._id
                                    return (
                                        <button
                                            key={channel._id}
                                            type="button"
                                            onClick={() => handleSelectChannel(channel._id)}
                                            style={{
                                                width: '100%',
                                                textAlign: 'left',
                                                borderRadius: 7,
                                                padding: '8px 10px',
                                                transition: 'all 0.15s ease',
                                                cursor: 'pointer',
                                                border: isActive ? '1px solid rgba(99, 102, 241, 0.45)' : '1px solid transparent',
                                                background: isActive ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                                                color: isActive ? '#fff' : '#a1a1aa',
                                                outline: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 6
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) e.currentTarget.style.background = 'transparent'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                                {channel.type === 'private' ? (
                                                    <IconLock size={13} color={isActive ? '#c084fc' : '#a1a1aa'} style={{ flexShrink: 0 }} />
                                                ) : (
                                                    <span style={{ color: isActive ? '#818cf8' : '#71717A', fontWeight: 800, fontSize: '0.875rem', flexShrink: 0 }}>#</span>
                                                )}
                                                <span style={{ fontWeight: isActive ? 700 : 500, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {channel.name}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                {unreadChannelCounts[channel._id] > 0 && !isActive && (
                                                    <span style={{
                                                        background: '#6366f1',
                                                        color: '#fff',
                                                        fontSize: '0.625rem',
                                                        fontWeight: 800,
                                                        padding: '1px 6px',
                                                        borderRadius: 10,
                                                        boxShadow: '0 0 8px rgba(99, 102, 241, 0.6)'
                                                    }}>
                                                        {unreadChannelCounts[channel._id] > 99 ? '99+' : unreadChannelCounts[channel._id]}
                                                    </span>
                                                )}
                                                <span style={{
                                                    fontSize: '0.6rem',
                                                    fontWeight: 700,
                                                    color: channel.type === 'public' ? '#4ade80' : '#c084fc',
                                                    textTransform: 'uppercase',
                                                    flexShrink: 0
                                                }}>
                                                    {channel.type}
                                                </span>
                                            </div>
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANE: ACTIVE CHANNEL WORKSPACE & CHAT */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0, background: 'rgba(0, 0, 0, 0.2)', overflow: 'hidden', position: 'relative' }}>
                        {selectedChannel ? (
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
                                                onClick={toggleChannelListCollapse}
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
                                            onClick={handleStartChannelMeeting}
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
                                            onClick={handleStartChannelAudioCall}
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
                                            onClick={handleToggleHuddle}
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
                                            onClick={() => {
                                                setShowInChannelSearch(prev => !prev)
                                                if (showInChannelSearch) setInChannelSearchQuery('')
                                            }}
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
                                            onClick={toggleChannelMute}
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
                                                onClick={handleJoinChannel}
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
                                                onClick={handleLeaveChannel}
                                                className="btn btn-danger"
                                                style={{ height: 30, width: 32, borderRadius: 8, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                title="Leave Channel"
                                            >
                                                <IconLogOut size={14} />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setShowInviteDialog(true)}
                                            className="btn btn-secondary"
                                            style={{ height: 30, width: 32, borderRadius: 8, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', transition: 'all 0.15s ease' }}
                                            title="Invite channel members"
                                        >
                                            <IconUserPlus size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowEditDialog(true)}
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
                                            { id: 'files', label: `Files (${files.length})`, icon: <IconFileText size={15} /> },
                                            { id: 'members', label: `Members (${members.length})`, icon: <IconUsers size={15} /> },
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
                                                {displayedMessages.length} {displayedMessages.length === 1 ? 'match' : 'matches'}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowInChannelSearch(false)
                                                setInChannelSearchQuery('')
                                            }}
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

                                {/* TAB 1: CHAT STREAM */}
                                {activePanelTab === 'chat' && (
                                    <div
                                        onDragEnter={handleDragEnter}
                                        onDragLeave={handleDragLeave}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                        style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: 0 }}
                                    >
                                        {/* Drag and drop full dropzone overlay */}
                                        {isDraggingOver && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    zIndex: 50,
                                                    background: 'rgba(17, 19, 31, 0.94)',
                                                    backdropFilter: 'blur(10px)',
                                                    border: '2px dashed #6366f1',
                                                    borderRadius: 12,
                                                    margin: 8,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 12,
                                                    pointerEvents: 'none',
                                                    boxShadow: '0 0 30px rgba(99, 102, 241, 0.3)'
                                                }}
                                            >
                                                <IconDownload size={44} color="#818cf8" style={{ animation: 'bounce 1s infinite' }} />
                                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', textAlign: 'center' }}>
                                                    Drop files to share in #{selectedChannel.name}
                                                </div>
                                                <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: 0, textAlign: 'center', maxWidth: 400 }}>
                                                    PDFs, Images, Excel sheets, Word documents, Code files & Archives
                                                </p>
                                                <span style={{ fontSize: '0.75rem', color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)', padding: '4px 12px', borderRadius: 8, fontWeight: 600 }}>
                                                    Release to upload instantly
                                                </span>
                                            </div>
                                        )}

                                        {/* PINNED ANNOUNCEMENT DRAWER (Slack / Teams style) */}
                                        {pinnedMessages.length > 0 && (
                                            <>
                                                <div
                                                    onClick={() => setShowPinnedDrawer(prev => !prev)}
                                                    style={{
                                                        padding: '7px 14px',
                                                        background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%)',
                                                        borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        cursor: 'pointer',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                                                        <div style={{
                                                            width: 20, height: 20, borderRadius: 5,
                                                            background: 'rgba(245, 158, 11, 0.25)',
                                                            color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                        }}>
                                                            <IconPin size={12} />
                                                        </div>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fef3c7', flexShrink: 0 }}>
                                                            {pinnedMessages.length} Pinned {pinnedMessages.length === 1 ? 'Message' : 'Messages'}
                                                        </span>
                                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>•</span>
                                                        <span style={{ fontSize: '0.72rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {pinnedMessages[0]?.content || 'Pinned item'}
                                                        </span>
                                                    </div>
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        color: '#f59e0b',
                                                        padding: '2px 8px',
                                                        borderRadius: 4,
                                                        background: 'rgba(245, 158, 11, 0.15)',
                                                        flexShrink: 0
                                                    }}>
                                                        {showPinnedDrawer ? 'Hide' : 'View'}
                                                    </span>
                                                </div>

                                                {/* Expanded Pinned Items Drawer */}
                                                {showPinnedDrawer && (
                                                    <div style={{
                                                        maxHeight: 180,
                                                        overflowY: 'auto',
                                                        background: 'rgba(15, 17, 26, 0.96)',
                                                        borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
                                                        padding: '8px 14px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 6,
                                                        flexShrink: 0
                                                    }}>
                                                        {pinnedMessages.map((pm: any) => (
                                                            <div key={pm._id} style={{
                                                                display: 'flex',
                                                                alignItems: 'flex-start',
                                                                justifyContent: 'space-between',
                                                                background: 'rgba(255, 255, 255, 0.03)',
                                                                borderRadius: 6,
                                                                padding: '6px 10px',
                                                                border: '1px solid rgba(255, 255, 255, 0.06)'
                                                            }}>
                                                                <div style={{ overflow: 'hidden', paddingRight: 8 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f8fafc' }}>
                                                                            {pm.senderId?.fullName || 'Member'}
                                                                        </span>
                                                                        <span style={{ fontSize: '0.625rem', color: '#94a3b8' }}>
                                                                            {new Date(pm.createdAt).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.35 }}>
                                                                        {pm.content}
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            const el = document.getElementById(`msg-${pm._id}`)
                                                                            if (el) {
                                                                                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                                                                el.style.backgroundColor = 'rgba(99, 102, 241, 0.25)'
                                                                                setTimeout(() => { el.style.backgroundColor = '' }, 2000)
                                                                            }
                                                                        }}
                                                                        style={{
                                                                            background: 'rgba(99, 102, 241, 0.2)',
                                                                            border: '1px solid rgba(99, 102, 241, 0.35)',
                                                                            color: '#a5b4fc',
                                                                            cursor: 'pointer',
                                                                            padding: '2px 8px',
                                                                            borderRadius: 4,
                                                                            fontSize: '0.6875rem',
                                                                            fontWeight: 600
                                                                        }}
                                                                        title="Jump to message"
                                                                    >
                                                                        Jump
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.stopPropagation(); handleTogglePin(pm._id); }}
                                                                        style={{
                                                                            background: 'transparent',
                                                                            border: 'none',
                                                                            color: '#ef4444',
                                                                            cursor: 'pointer',
                                                                            padding: '2px 6px',
                                                                            fontSize: '0.6875rem',
                                                                            fontWeight: 600
                                                                        }}
                                                                        title="Unpin from channel"
                                                                    >
                                                                        Unpin
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Messages Feed */}
                                        <div ref={chatFeedRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
                                            {displayedMessages.length === 0 ? (
                                                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <IconHand size={28} color="#f59e0b" style={{ marginBottom: 6 }} />
                                                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', marginBottom: 4 }}>
                                                        {inChannelSearchQuery ? 'No matching messages found' : `Welcome to #${selectedChannel.name}!`}
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.5 }}>
                                                        {inChannelSearchQuery
                                                            ? `No messages matched "${inChannelSearchQuery}". Try another keyword or clear search.`
                                                            : `This is the start of the #${selectedChannel.name} channel. Post an announcement, drag & drop documents, share code snippets, or click Meet Now to start a video call.`}
                                                    </p>
                                                    {inChannelSearchQuery && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setInChannelSearchQuery('')}
                                                            style={{
                                                                marginTop: 10,
                                                                padding: '4px 12px',
                                                                borderRadius: 6,
                                                                background: 'rgba(99, 102, 241, 0.2)',
                                                                border: '1px solid rgba(99, 102, 241, 0.4)',
                                                                color: '#c7c9ff',
                                                                fontSize: '0.75rem',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Clear Search
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                 displayedMessages.map((msg, index) => {
                                                    const msgSenderId = typeof msg.senderId === 'object' && msg.senderId !== null
                                                        ? (msg.senderId._id || msg.senderId.id || '').toString()
                                                        : (msg.senderId || '').toString()
                                                    const isMe = Boolean(resolvedUserId && msgSenderId && (msgSenderId === resolvedUserId))
                                                    const senderName = isMe ? 'You' : (msg.senderId?.fullName || 'Colleague')
                                                    const isHovered = hoveredMessageId === msg._id
                                                    const isChannelAdmin = selectedChannel?.members?.some((m: any) => 
                                                        (m.userId === resolvedUserId || m.userId?._id === resolvedUserId) && 
                                                        (m.role === 'owner' || m.role === 'moderator')
                                                    ) || false
                                                    const canDelete = isMe || isChannelAdmin

                                                    const msgDate = msg.createdAt ? new Date(msg.createdAt).toDateString() : ''
                                                    const prevMsg = index > 0 ? displayedMessages[index - 1] : null
                                                    const prevMsgDate = prevMsg?.createdAt ? new Date(prevMsg.createdAt).toDateString() : ''
                                                    const showDateDivider = msgDate && msgDate !== prevMsgDate

                                                    return (
                                                        <React.Fragment key={msg._id}>
                                                            {showDateDivider && (
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    margin: '14px 0 8px 0',
                                                                    gap: 12
                                                                }}>
                                                                    <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
                                                                    <span style={{
                                                                        fontSize: '0.6875rem',
                                                                        fontWeight: 700,
                                                                        color: '#94a3b8',
                                                                        background: 'rgba(255, 255, 255, 0.06)',
                                                                        padding: '2px 10px',
                                                                        borderRadius: 10,
                                                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                        letterSpacing: '0.02em',
                                                                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                                                                    }}>
                                                                        {formatMessageDateDivider(msg.createdAt)}
                                                                    </span>
                                                                    <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
                                                                </div>
                                                            )}
                                                            <div
                                                                id={`msg-${msg._id}`}
                                                                onMouseEnter={() => setHoveredMessageId(msg._id)}
                                                                onMouseLeave={() => setHoveredMessageId(null)}
                                                                style={{
                                                                    display: 'flex',
                                                                    flexDirection: isMe ? 'row-reverse' : 'row',
                                                                    gap: 10,
                                                                    padding: '6px 8px',
                                                                    borderRadius: 8,
                                                                    position: 'relative',
                                                                    transition: 'background 0.2s',
                                                                    background: isHovered ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                                                                    width: '100%',
                                                                    boxSizing: 'border-box'
                                                                }}
                                                            >
                                                                {/* User Avatar */}
                                                                {msg.senderId?.profileImage ? (
                                                                    <img
                                                                        src={normalizeMediaUrl(msg.senderId.profileImage)}
                                                                        alt={senderName}
                                                                        style={{ width: 30, height: 30, minWidth: 30, borderRadius: '50%', objectFit: 'cover' }}
                                                                    />
                                                                ) : (
                                                                    <div style={{
                                                                        width: 30, height: 30, minWidth: 30, borderRadius: '50%',
                                                                        background: isMe ? 'linear-gradient(135deg, #6264a7 0%, #4f518a 100%)' : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                                                                        color: '#fff', display: 'flex', alignItems: 'center',
                                                                        justifyContent: 'center', fontWeight: 700, fontSize: '0.725rem'
                                                                    }}>
                                                                        {senderName.charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}

                                                                <div style={{
                                                                    flex: 1,
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    alignItems: isMe ? 'flex-end' : 'flex-start',
                                                                    gap: 3,
                                                                    minWidth: 0
                                                                }}>
                                                                    {/* Sender Header */}
                                                                    <div style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        flexDirection: isMe ? 'row-reverse' : 'row',
                                                                        gap: 6
                                                                    }}>
                                                                        <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: isMe ? '#c7c9ff' : '#fff' }}>
                                                                            {senderName}
                                                                        </span>
                                                                        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                                                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                        {msg.edited && !msg.deleted && (
                                                                            <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                                                                (edited)
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Pinned Announcement Tag */}
                                                                    {msg.pinned && !msg.deleted && (
                                                                        <div style={{
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: 4,
                                                                            padding: '2px 6px',
                                                                            borderRadius: 4,
                                                                            background: 'rgba(245, 158, 11, 0.15)',
                                                                            color: '#fbbf24',
                                                                            fontSize: '0.65rem',
                                                                            fontWeight: 700,
                                                                            width: 'fit-content',
                                                                            marginBottom: 2
                                                                        }}>
                                                                            <IconPin size={10} />
                                                                            <span>Pinned Announcement</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Deleted Message Tombstone (MS Teams Style) */}
                                                                    {msg.deleted ? (
                                                                        <div
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: 6,
                                                                                padding: '8px 12px',
                                                                                borderRadius: '10px',
                                                                                background: 'rgba(255, 255, 255, 0.04)',
                                                                                border: '1px dashed rgba(255, 255, 255, 0.18)',
                                                                                color: '#94a3b8',
                                                                                fontSize: '0.8125rem',
                                                                                fontStyle: 'italic',
                                                                                userSelect: 'none',
                                                                                marginTop: 2,
                                                                                alignSelf: isMe ? 'flex-end' : 'flex-start'
                                                                            }}
                                                                        >
                                                                            <IconTrash size={13} color="#94a3b8" />
                                                                            <span>This message was deleted.</span>
                                                                            {isMe && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleUndoDeleteChannelMessage(msg._id)}
                                                                                    style={{
                                                                                        background: 'none',
                                                                                        border: 'none',
                                                                                        color: '#818cf8',
                                                                                        fontWeight: 700,
                                                                                        fontSize: '0.8125rem',
                                                                                        cursor: 'pointer',
                                                                                        padding: '2px 4px',
                                                                                        marginLeft: 6,
                                                                                        textDecoration: 'underline',
                                                                                        display: 'inline-flex',
                                                                                        alignItems: 'center',
                                                                                        gap: 3
                                                                                    }}
                                                                                    title="Undo deletion"
                                                                                >
                                                                                    <IconUndo size={12} />
                                                                                    <span>Undo</span>
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            {/* Accompanying note, text or Zoom Clip */}
                                                                            {msg.content && (!msg.attachments?.length || msg.messageType !== 'file') && (!msg.codeSnippet || msg.messageType !== 'code') && msg.messageType !== 'audio' && (
                                                                                msg.content.includes('/uploads/clips/') ? (
                                                                                    <div style={{
                                                                                        marginTop: 4,
                                                                                        borderRadius: 8,
                                                                                        overflow: 'hidden',
                                                                                        maxWidth: 380,
                                                                                        background: '#000',
                                                                                        alignSelf: isMe ? 'flex-end' : 'flex-start'
                                                                                    }}>
                                                                                        <div style={{
                                                                                            fontSize: '0.6875rem', fontWeight: 700, color: '#c084fc',
                                                                                            padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6,
                                                                                            background: 'rgba(168, 85, 247, 0.15)', borderBottom: '1px solid rgba(168, 85, 247, 0.2)'
                                                                                        }}>
                                                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                                                                <polygon points="23 7 16 12 23 17 23 7" />
                                                                                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                                                                            </svg>
                                                                                            <span>Zoom Clip &bull; Video Message</span>
                                                                                        </div>
                                                                                        <video
                                                                                            src={(() => {
                                                                                                const match = msg.content.match(/(\/uploads\/clips\/[^\s\)]+)/)
                                                                                                return normalizeMediaUrl(match ? match[1] : msg.content)
                                                                                            })()}
                                                                                            controls
                                                                                            playsInline
                                                                                            style={{ width: '100%', maxHeight: 220, objectFit: 'contain', display: 'block' }}
                                                                                        />
                                                                                        {msg.content.split('\n')[0] && !msg.content.split('\n')[0].startsWith('/uploads') && (
                                                                                            <div style={{ padding: '6px 8px', fontSize: '0.75rem', color: '#e2e8f0' }}>
                                                                                                {msg.content.split('\n')[0].replace('[Video Clip] ', '')}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div style={{
                                                                                        fontSize: '0.8125rem',
                                                                                        color: isMe ? '#fff' : '#e5e7eb',
                                                                                        lineHeight: 1.45,
                                                                                        wordBreak: 'break-word',
                                                                                        whiteSpace: 'pre-wrap',
                                                                                        background: isMe
                                                                                            ? 'linear-gradient(135deg, #6264a7 0%, #4f518a 100%)'
                                                                                            : 'rgba(255, 255, 255, 0.05)',
                                                                                        border: isMe
                                                                                            ? '1px solid rgba(129, 140, 248, 0.4)'
                                                                                            : '1px solid rgba(255, 255, 255, 0.08)',
                                                                                        padding: '7px 12px',
                                                                                        borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                                                                        maxWidth: '75%',
                                                                                        boxShadow: isMe ? '0 2px 8px rgba(98, 100, 167, 0.25)' : 'none',
                                                                                        textAlign: 'left'
                                                                                    }}>
                                                                                        {renderFormattedMessage(msg.content)}
                                                                                    </div>
                                                                                )
                                                                            )}

                                                                            {/* If code snippet has caption */}
                                                                            {msg.codeSnippet && msg.content && msg.content !== `Shared a ${msg.codeSnippet.language || ''} code snippet` && (
                                                                                <div style={{
                                                                                    fontSize: '0.8125rem',
                                                                                    color: '#e5e7eb',
                                                                                    lineHeight: 1.45,
                                                                                    marginBottom: 2,
                                                                                    alignSelf: isMe ? 'flex-end' : 'flex-start'
                                                                                }}>
                                                                                    {renderFormattedMessage(msg.content)}
                                                                                </div>
                                                                            )}

                                                                            {/* Code Snippet Card */}
                                                                            {msg.codeSnippet && (
                                                                                <div style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                                                                    <CodeSnippetCard snippet={msg.codeSnippet} />
                                                                                </div>
                                                                            )}

                                                                            {/* Attachments (PDF, Excel, Images, Docs, Voice Notes) */}
                                                                            {msg.attachments && msg.attachments.length > 0 && (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    flexDirection: 'column',
                                                                                    gap: 6,
                                                                                    marginTop: 4,
                                                                                    alignSelf: isMe ? 'flex-end' : 'flex-start'
                                                                                }}>
                                                                                    {msg.attachments.map((att: ChannelAttachment, idx: number) => {
                                                                                        const isAudio = att.fileType === 'audio' || (att.mimeType && att.mimeType.startsWith('audio/')) || (att.url && (att.url.endsWith('.webm') || att.url.endsWith('.mp3') || att.url.endsWith('.wav') || att.url.endsWith('.ogg')))
                                                                                        if (isAudio) {
                                                                                            return <VoiceMessageCard key={idx} url={att.url} name={att.name} />
                                                                                        }
                                                                                        return <FileCard key={idx} attachment={att} />
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    )}

                                                                    {/* Emoji reactions row with toggle action */}
                                                                    {!msg.deleted && msg.reactions && msg.reactions.length > 0 && (
                                                                        <div style={{
                                                                            display: 'flex',
                                                                            gap: 4,
                                                                            marginTop: 4,
                                                                            flexWrap: 'wrap',
                                                                            justifyContent: isMe ? 'flex-end' : 'flex-start'
                                                                        }}>
                                                                            {Array.from(new Set(msg.reactions.map((r: any) => r.emoji))).map((emoji: any) => {
                                                                                const count = msg.reactions.filter((r: any) => r.emoji === emoji).length
                                                                                const userReacted = msg.reactions.some((r: any) => (r.userId?._id || r.userId)?.toString() === resolvedUserId && r.emoji === emoji)
                                                                                return (
                                                                                    <button
                                                                                        key={emoji}
                                                                                        type="button"
                                                                                        onClick={() => handleReaction(msg._id, emoji)}
                                                                                        style={{
                                                                                            background: userReacted ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.1)',
                                                                                            border: userReacted ? '1px solid #818cf8' : '1px solid rgba(99, 102, 241, 0.25)',
                                                                                            borderRadius: 12,
                                                                                            padding: '1px 7px',
                                                                                            fontSize: '0.725rem',
                                                                                            color: '#fff',
                                                                                            display: 'inline-flex',
                                                                                            alignItems: 'center',
                                                                                            gap: 3,
                                                                                            cursor: 'pointer',
                                                                                            boxShadow: userReacted ? '0 0 8px rgba(99, 102, 241, 0.3)' : 'none',
                                                                                            transition: 'all 0.15s ease'
                                                                                        }}
                                                                                        title={userReacted ? `You reacted with ${emoji} (click to toggle)` : `React with ${emoji}`}
                                                                                    >
                                                                                        <span>{emoji}</span>
                                                                                        <span style={{ fontSize: '0.625rem', fontWeight: 700, color: userReacted ? '#fff' : '#818cf8' }}>{count}</span>
                                                                                    </button>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    )}

                                                                    {/* Thread Reply Link */}
                                                                    <div style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 8,
                                                                        marginTop: 2,
                                                                        flexDirection: isMe ? 'row-reverse' : 'row'
                                                                    }}>
                                                                        {!msg.deleted && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setActiveThreadParent(msg)}
                                                                                style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '0.6875rem', cursor: 'pointer', padding: 0, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                                                className="hover:underline"
                                                                            >
                                                                                <IconMessage size={12} /> Reply in thread
                                                                            </button>
                                                                        )}
                                                                        {msg.replyCount > 0 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setActiveThreadParent(msg)}
                                                                                style={{ background: 'transparent', border: 'none', fontSize: '0.6875rem', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0 }}
                                                                                className="hover:underline"
                                                                            >
                                                                                {msg.deleted ? '' : '• '}{msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Quick Reaction Bar on Hover (MS Teams Style) */}
                                                                {isHovered && !msg.deleted && (
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        [isMe ? 'left' : 'right']: 8,
                                                                        top: -12,
                                                                        background: '#1e1f29',
                                                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                                                        borderRadius: 18,
                                                                        padding: '2px 6px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 3,
                                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                                                        zIndex: 10
                                                                    }}>
                                                                        {['👍', '❤️', '🎉', '😂', '😮', '🚀'].map((em) => (
                                                                            <button
                                                                                key={em}
                                                                                type="button"
                                                                                onClick={() => handleReaction(msg._id, em)}
                                                                                style={{ background: 'transparent', border: 'none', fontSize: '0.85rem', cursor: 'pointer', padding: '1px 3px', borderRadius: 4 }}
                                                                                title={`React with ${em}`}
                                                                            >
                                                                                {em}
                                                                            </button>
                                                                        ))}
                                                                        <div style={{ width: 1, height: 16, background: 'rgba(255, 255, 255, 0.15)', margin: '0 2px' }} />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleTogglePin(msg._id)}
                                                                            style={{
                                                                                background: msg.pinned ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                                                                                border: 'none',
                                                                                color: msg.pinned ? '#f59e0b' : '#94a3b8',
                                                                                cursor: 'pointer',
                                                                                padding: '2px 4px',
                                                                                borderRadius: 4,
                                                                                display: 'flex',
                                                                                alignItems: 'center'
                                                                            }}
                                                                            title={msg.pinned ? 'Unpin message' : 'Pin message to channel'}
                                                                        >
                                                                            <IconPin size={13} />
                                                                        </button>
                                                                        {canDelete && (
                                                                            <>
                                                                                <div style={{ width: 1, height: 16, background: 'rgba(255, 255, 255, 0.15)', margin: '0 2px' }} />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleDeleteChannelMessage(msg._id)}
                                                                                    style={{
                                                                                        background: 'transparent',
                                                                                        border: 'none',
                                                                                        color: '#f87171',
                                                                                        cursor: 'pointer',
                                                                                        padding: '2px 4px',
                                                                                        borderRadius: 4,
                                                                                        display: 'flex',
                                                                                        alignItems: 'center'
                                                                                    }}
                                                                                    title="Delete message"
                                                                                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                                                                                    onMouseLeave={e => { e.currentTarget.style.color = '#f87171' }}
                                                                                >
                                                                                    <IconTrash size={13} />
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </React.Fragment>
                                                    )
                                                })
                                            )}
                                            <div ref={mainChatEndRef} />
                                        </div>

                                        {/* RICH PINNED CHAT COMPOSER WITH FILE ATTACH & EMOJIS (MS Teams Style) */}
                                        <div style={{
                                            borderTop: '1px solid rgba(255,255,255,0.06)',
                                            background: 'rgba(10, 11, 16, 0.85)',
                                            padding: '8px 14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6
                                        }}>
                                            {/* Formatting & Attachment Action Bar */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {/* Hidden multiple file input */}
                                                    <input
                                                        type="file"
                                                        multiple
                                                        ref={fileInputRef}
                                                        onChange={handleFileUpload}
                                                        style={{ display: 'none' }}
                                                    />

                                                    {/* Paperclip Attach */}
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={uploadingFile || selectedChannel.archived}
                                                        title="Attach / Upload files (PDF, Images, Excel, Docs)"
                                                        style={{
                                                            background: 'rgba(255, 255, 255, 0.05)',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            borderRadius: 6,
                                                            padding: '4px 8px',
                                                            fontSize: '0.75rem',
                                                            color: '#d4d4d8',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}
                                                    >
                                                        <IconPin size={13} />
                                                        <span>{uploadingFile ? 'Uploading...' : 'Attach'}</span>
                                                    </button>

                                                    {/* Code Snippet Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCodeModal(true)}
                                                        disabled={selectedChannel.archived}
                                                        title="Share code snippet with syntax styling"
                                                        style={{
                                                            background: 'rgba(99, 102, 241, 0.12)',
                                                            border: '1px solid rgba(99, 102, 241, 0.25)',
                                                            borderRadius: 6,
                                                            padding: '4px 8px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            color: '#818cf8',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}
                                                    >
                                                        <IconMonitor size={13} />
                                                        <span>Code Snippet</span>
                                                    </button>

                                                    {/* Zoom Clips Async Video Recorder Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowClipModal(true)}
                                                        disabled={selectedChannel.archived}
                                                        title="Record Video Clip (Zoom Clips / Loom)"
                                                        style={{
                                                            background: 'rgba(168, 85, 247, 0.12)',
                                                            border: '1px solid rgba(168, 85, 247, 0.25)',
                                                            borderRadius: 6,
                                                            padding: '4px 8px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            color: '#c084fc',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                            <polygon points="23 7 16 12 23 17 23 7" />
                                                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                                        </svg>
                                                        <span>Record Clip</span>
                                                    </button>

                                                    {/* Feature 4: Quick Voice Note Button */}
                                                    <button
                                                        type="button"
                                                        onClick={isRecordingAudio ? () => stopAudioRecording(true) : startAudioRecording}
                                                        disabled={selectedChannel.archived || uploadingFile}
                                                        title={isRecordingAudio ? "Stop & send voice message" : "Record voice note"}
                                                        style={{
                                                            background: isRecordingAudio ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.12)',
                                                            border: `1px solid ${isRecordingAudio ? '#ef4444' : 'rgba(16, 185, 129, 0.3)'}`,
                                                            borderRadius: 6,
                                                            padding: '4px 8px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            color: isRecordingAudio ? '#ef4444' : '#10b981',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}
                                                    >
                                                        <IconMic size={13} />
                                                        <span>{isRecordingAudio ? `Recording (${formatDuration(audioRecordDuration)})` : 'Voice Note'}</span>
                                                    </button>

                                                    {/* Emoji toggle */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowEmojiPicker(prev => !prev)}
                                                        title="Insert Emoji"
                                                        style={{
                                                            background: showEmojiPicker ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                                            border: `1px solid ${showEmojiPicker ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                                                            borderRadius: 6,
                                                            padding: '4px 8px',
                                                            fontSize: '0.75rem',
                                                            color: '#d4d4d8',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <IconSparkles size={14} color="#facc15" />
                                                    </button>

                                                    {/* Divider */}
                                                    <div style={{ width: 1, height: 16, background: 'rgba(255, 255, 255, 0.12)', margin: '0 2px' }} />

                                                    {/* Professional MS Teams / Slack Formatting Toolbar */}
                                                    <div style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: 6,
                                                        padding: '1px 2px',
                                                        gap: 2
                                                    }}>
                                                        {/* Bold Button */}
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={toggleBold}
                                                            title="Bold (Ctrl+B)"
                                                            style={{
                                                                width: 24,
                                                                height: 24,
                                                                borderRadius: 4,
                                                                background: activeFormats.bold ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                                                                border: activeFormats.bold ? '1px solid rgba(99, 102, 241, 0.6)' : 'none',
                                                                color: activeFormats.bold ? '#a5b4fc' : '#e2e8f0',
                                                                fontSize: '0.8125rem',
                                                                fontWeight: 900,
                                                                fontFamily: 'system-ui, sans-serif',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                        >
                                                            B
                                                        </button>

                                                        {/* Italic Button */}
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={toggleItalic}
                                                            title="Italic (Ctrl+I)"
                                                            style={{
                                                                width: 24,
                                                                height: 24,
                                                                borderRadius: 4,
                                                                background: activeFormats.italic ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                                                                border: activeFormats.italic ? '1px solid rgba(99, 102, 241, 0.6)' : 'none',
                                                                color: activeFormats.italic ? '#a5b4fc' : '#e2e8f0',
                                                                fontSize: '0.8125rem',
                                                                fontStyle: 'italic',
                                                                fontFamily: 'Georgia, serif',
                                                                fontWeight: 600,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                        >
                                                            I
                                                        </button>

                                                        {/* Strikethrough Button */}
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={toggleStrike}
                                                            title="Strikethrough"
                                                            style={{
                                                                width: 24,
                                                                height: 24,
                                                                borderRadius: 4,
                                                                background: activeFormats.strike ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                                                                border: activeFormats.strike ? '1px solid rgba(99, 102, 241, 0.6)' : 'none',
                                                                color: activeFormats.strike ? '#a5b4fc' : '#94a3b8',
                                                                fontSize: '0.8125rem',
                                                                fontWeight: 600,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s ease',
                                                                textDecoration: 'line-through'
                                                            }}
                                                        >
                                                            S
                                                        </button>

                                                        {/* Inline Code Button */}
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={toggleInlineCode}
                                                            title="Inline Code (Ctrl+E)"
                                                            style={{
                                                                height: 24,
                                                                padding: '0 6px',
                                                                borderRadius: 4,
                                                                background: activeFormats.code ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                                                                border: activeFormats.code ? '1px solid rgba(99, 102, 241, 0.6)' : 'none',
                                                                color: activeFormats.code ? '#a5b4fc' : '#cbd5e1',
                                                                fontSize: '0.725rem',
                                                                fontFamily: 'Consolas, Monaco, monospace',
                                                                fontWeight: 700,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                        >
                                                            &lt;/&gt;
                                                        </button>
                                                    </div>
                                                </div>

                                                <span style={{ fontSize: '0.675rem', color: 'var(--color-text-muted)' }}>
                                                    Shift + Enter for new line • Enter to send
                                                </span>
                                            </div>

                                            {/* Emoji Picker Row */}
                                            {showEmojiPicker && (
                                                <div style={{
                                                    display: 'flex',
                                                    gap: 6,
                                                    padding: '6px 10px',
                                                    background: 'rgba(255, 255, 255, 0.04)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRadius: 8,
                                                    flexWrap: 'wrap'
                                                }}>
                                                    {['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '🚀', '👏', '💯', '✨', '🤝'].map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            type="button"
                                                            onClick={() => handleInsertEmoji(emoji)}
                                                            style={{ background: 'transparent', border: 'none', fontSize: '1.1rem', cursor: 'pointer', padding: '2px 4px' }}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Feature 3: Live Real-Time Typing Indicator */}
                                            {typingUsers.length > 0 && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    fontSize: '0.725rem',
                                                    color: '#818cf8',
                                                    padding: '2px 4px',
                                                    animation: 'fadeIn 0.15s ease'
                                                }}>
                                                    <span>✍️</span>
                                                    <span style={{ fontWeight: 600 }}>
                                                        {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                                                    </span>
                                                </div>
                                            )}

                                            {/* Feature 4: Active Audio Recording Banner */}
                                            {isRecordingAudio ? (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    background: 'rgba(239, 68, 68, 0.12)',
                                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                                    borderRadius: 8,
                                                    padding: '8px 14px'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{
                                                            width: 9,
                                                            height: 9,
                                                            borderRadius: '50%',
                                                            background: '#ef4444',
                                                            boxShadow: '0 0 8px #ef4444'
                                                        }} />
                                                        <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.8125rem' }}>
                                                            Recording Voice Note... ({formatDuration(audioRecordDuration)})
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => stopAudioRecording(false)}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: '#94a3b8',
                                                                cursor: 'pointer',
                                                                fontSize: '0.75rem',
                                                                padding: '4px 8px'
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => stopAudioRecording(true)}
                                                            className="btn btn-primary"
                                                            style={{
                                                                height: 30,
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                borderRadius: 6,
                                                                padding: '0 12px',
                                                                background: '#10b981',
                                                                border: 'none',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Send Audio
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Rich WYSIWYG Composer */
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', width: '100%' }}>
                                                    <div style={{ position: 'relative', flex: 1, minHeight: 38, display: 'flex' }}>
                                                        {isEditorEmpty && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                left: 12,
                                                                top: 9,
                                                                color: '#64748b',
                                                                fontSize: '0.8125rem',
                                                                pointerEvents: 'none',
                                                                userSelect: 'none'
                                                            }}>
                                                                Send a message to #{selectedChannel.name}...
                                                            </div>
                                                        )}
                                                        <div
                                                            ref={composerEditorRef}
                                                            contentEditable={!selectedChannel.archived}
                                                            role="textbox"
                                                            aria-multiline="true"
                                                            onInput={handleEditorInput}
                                                            onKeyDown={handleEditorKeyDown}
                                                            onKeyUp={updateActiveFormats}
                                                            onMouseUp={updateActiveFormats}
                                                            style={{
                                                                flex: 1,
                                                                minHeight: 38,
                                                                maxHeight: 140,
                                                                overflowY: 'auto',
                                                                borderRadius: 8,
                                                                padding: '8px 12px',
                                                                fontSize: '0.8125rem',
                                                                background: 'rgba(255, 255, 255, 0.03)',
                                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                                color: '#fff',
                                                                outline: 'none',
                                                                lineHeight: 1.5,
                                                                wordBreak: 'break-word',
                                                                whiteSpace: 'pre-wrap'
                                                            }}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSendMessage()}
                                                        className="btn btn-primary"
                                                        style={{
                                                            height: 38,
                                                            padding: '0 16px',
                                                            borderRadius: 8,
                                                            fontSize: '0.8125rem',
                                                            fontWeight: 700,
                                                            background: !isEditorEmpty ? '#6366F1' : 'rgba(99, 102, 241, 0.4)',
                                                            border: 'none',
                                                            color: '#fff',
                                                            cursor: !isEditorEmpty ? 'pointer' : 'default',
                                                            boxShadow: !isEditorEmpty ? '0 2px 10px rgba(99, 102, 241, 0.4)' : 'none',
                                                            transition: 'all 0.15s ease',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        disabled={selectedChannel.archived || isEditorEmpty}
                                                    >
                                                        Send
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Slide-in Thread Sidebar */}
                                        {activeThreadParent && (
                                            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 320, borderLeft: '1px solid rgba(255,255,255,0.08)', background: '#111218', display: 'flex', flexDirection: 'column', zIndex: 20, boxShadow: '-4px 0 16px rgba(0,0,0,0.5)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                    <span style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#fff' }}>Thread Conversation</span>
                                                    <button onClick={() => setActiveThreadParent(null)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
                                                        <IconX size={14} />
                                                    </button>
                                                </div>

                                                <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 8 }}>
                                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.65rem', color: '#fff' }}>
                                                        {activeThreadParent.senderId?.fullName ? activeThreadParent.senderId.fullName.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{activeThreadParent.senderId?.fullName || 'User'}</div>
                                                        {activeThreadParent.deleted ? (
                                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: 2 }}>This message was deleted.</div>
                                                        ) : (
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{renderFormattedMessage(activeThreadParent.content)}</div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div ref={threadFeedRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
                                                    {threadMessages.length === 0 ? (
                                                        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                            <IconMessage size={14} /> No replies in this thread yet. Be the first to respond!
                                                        </div>
                                                    ) : (
                                                        threadMessages.map((reply) => {
                                                            const rSenderId = typeof reply.senderId === 'object' && reply.senderId !== null
                                                                ? (reply.senderId._id || reply.senderId.id || '').toString()
                                                                : (reply.senderId || '').toString()
                                                            const isMeReply = Boolean(resolvedUserId && rSenderId && (rSenderId === resolvedUserId))
                                                            const rSenderName = isMeReply ? 'You' : (reply.senderId?.fullName || 'User')
                                                            const isChannelAdminMember = selectedChannel?.members?.some((m: any) => 
                                                                (m.userId === resolvedUserId || m.userId?._id === resolvedUserId) && 
                                                                (m.role === 'owner' || m.role === 'moderator')
                                                            ) || false
                                                            const canDeleteReply = isMeReply || isChannelAdminMember

                                                            return (
                                                                <div key={reply._id} style={{ display: 'flex', flexDirection: isMeReply ? 'row-reverse' : 'row', gap: 8, padding: '4px 0' }}>
                                                                    <div style={{
                                                                        width: 22,
                                                                        height: 22,
                                                                        borderRadius: '50%',
                                                                        background: isMeReply ? 'linear-gradient(135deg, #6264a7 0%, #4f518a 100%)' : 'rgba(99, 102, 241, 0.2)',
                                                                        color: isMeReply ? '#fff' : '#818cf8',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        fontWeight: 700,
                                                                        fontSize: '0.65rem'
                                                                    }}>
                                                                        {rSenderName.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: isMeReply ? 'flex-end' : 'flex-start' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', flexDirection: isMeReply ? 'row-reverse' : 'row', gap: 6 }}>
                                                                            <span style={{ fontWeight: 700, fontSize: '0.725rem', color: isMeReply ? '#c7c9ff' : '#fff' }}>{rSenderName}</span>
                                                                            <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>{new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                            {canDeleteReply && !reply.deleted && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleDeleteChannelMessage(reply._id)}
                                                                                    style={{
                                                                                        background: 'none',
                                                                                        border: 'none',
                                                                                        color: '#f87171',
                                                                                        cursor: 'pointer',
                                                                                        padding: '0 2px',
                                                                                        display: 'inline-flex',
                                                                                        alignItems: 'center',
                                                                                        opacity: 0.75
                                                                                    }}
                                                                                    title="Delete reply"
                                                                                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ef4444' }}
                                                                                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.75'; e.currentTarget.style.color = '#f87171' }}
                                                                                >
                                                                                    <IconTrash size={11} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        {reply.deleted ? (
                                                                            <div style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: 6,
                                                                                padding: '6px 10px',
                                                                                borderRadius: 6,
                                                                                background: 'rgba(255, 255, 255, 0.03)',
                                                                                border: '1px dashed rgba(255, 255, 255, 0.15)',
                                                                                color: '#94a3b8',
                                                                                fontSize: '0.75rem',
                                                                                fontStyle: 'italic',
                                                                                margin: '2px 0'
                                                                            }}>
                                                                                <IconTrash size={11} color="#94a3b8" />
                                                                                <span>This message was deleted.</span>
                                                                                {isMeReply && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleUndoDeleteChannelMessage(reply._id)}
                                                                                        style={{
                                                                                            background: 'none',
                                                                                            border: 'none',
                                                                                            color: '#818cf8',
                                                                                            cursor: 'pointer',
                                                                                            fontSize: '0.75rem',
                                                                                            fontWeight: 600,
                                                                                            textDecoration: 'underline',
                                                                                            padding: '0 2px',
                                                                                            display: 'inline-flex',
                                                                                            alignItems: 'center',
                                                                                            gap: 2
                                                                                        }}
                                                                                    >
                                                                                        <IconUndo size={10} />
                                                                                        <span>Undo</span>
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{
                                                                                margin: 0,
                                                                                fontSize: '0.75rem',
                                                                                color: isMeReply ? '#fff' : '#d1d5db',
                                                                                marginTop: 2,
                                                                                wordBreak: 'break-word',
                                                                                whiteSpace: 'pre-wrap',
                                                                                background: isMeReply ? 'linear-gradient(135deg, #6264a7 0%, #4f518a 100%)' : 'rgba(255, 255, 255, 0.05)',
                                                                                padding: '4px 8px',
                                                                                borderRadius: isMeReply ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                                                                                maxWidth: '85%'
                                                                            }}>
                                                                                {renderFormattedMessage(reply.content)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })
                                                    )}
                                                    <div ref={threadChatEndRef} />
                                                </div>

                                                <form onSubmit={handleSendThreadMessage} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: 8, display: 'flex', gap: 6, background: '#0e0f14' }}>
                                                    <input
                                                        value={threadInput}
                                                        onChange={(e) => setThreadInput(e.target.value)}
                                                        className="input"
                                                        placeholder="Reply in thread..."
                                                        style={{ flex: 1, borderRadius: 6, height: 30, fontSize: '0.75rem' }}
                                                        disabled={selectedChannel.archived}
                                                    />
                                                    <button type="submit" className="btn btn-primary" style={{ padding: '0 10px', borderRadius: 6, height: 30, fontSize: '0.75rem' }} disabled={selectedChannel.archived || !threadInput.trim()}>
                                                        Reply
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 2: FILES & DOCUMENTS (Teams Style) */}
                                {activePanelTab === 'files' && (() => {
                                    const filteredFiles = files.filter(f => {
                                        if (!fileSearchQuery.trim()) return true
                                        const q = fileSearchQuery.toLowerCase()
                                        return (f.originalName || f.fileName || '').toLowerCase().includes(q) ||
                                            (f.uploadedBy?.fullName || '').toLowerCase().includes(q)
                                    })

                                    return (
                                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                                                <div>
                                                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span>Channel Files & Shared Documents</span>
                                                        <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                                                            {files.length} Files
                                                        </span>
                                                    </h3>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                                                        All attachments, documents, and media shared in #{selectedChannel.name}.
                                                    </p>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    {files.length > 0 && (
                                                        <input
                                                            type="text"
                                                            placeholder="Filter files..."
                                                            value={fileSearchQuery}
                                                            onChange={(e) => setFileSearchQuery(e.target.value)}
                                                            className="input"
                                                            style={{
                                                                height: 32,
                                                                padding: '0 12px',
                                                                fontSize: '0.75rem',
                                                                borderRadius: 8,
                                                                width: 180,
                                                                background: 'rgba(255, 255, 255, 0.04)'
                                                            }}
                                                        />
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={uploadingFile}
                                                        className="btn btn-primary"
                                                        style={{
                                                            height: 32,
                                                            padding: '0 14px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            borderRadius: 8,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                                                            border: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <IconPlus size={13} />
                                                        <span>{uploadingFile ? 'Uploading...' : 'Upload File'}</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {files.length === 0 ? (
                                                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <IconFolder size={36} color="#818cf8" style={{ marginBottom: 8 }} />
                                                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', marginBottom: 4 }}>
                                                        No files uploaded yet
                                                    </div>
                                                    <p style={{ fontSize: '0.75rem', margin: '0 0 16px', maxWidth: 360, marginInline: 'auto' }}>
                                                        Drag & drop documents, PDFs, or design assets in the chat or click upload so your team can access them anytime.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '6px 14px', fontSize: '0.75rem', borderRadius: 8, cursor: 'pointer' }}
                                                    >
                                                        Upload Document Now
                                                    </button>
                                                </div>
                                            ) : filteredFiles.length === 0 ? (
                                                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                    No files match "{fileSearchQuery}".
                                                </div>
                                            ) : (
                                                <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, background: 'rgba(255,255,255,0.01)' }}>
                                                    <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                                                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>File Name</th>
                                                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Size</th>
                                                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Shared By</th>
                                                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Date</th>
                                                                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {filteredFiles.map((file) => {
                                                                const uploader = file.uploadedBy?.fullName || 'Colleague'
                                                                const dateStr = file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Recent'
                                                                const fileName = file.originalName || file.fileName || 'document'
                                                                const fileUrl = file.url || `${API_BASE}/api/file/${file._id}/download`

                                                                return (
                                                                    <tr
                                                                        key={file._id}
                                                                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.15s ease' }}
                                                                        className="hover:bg-white/5"
                                                                        onClick={() => setPreviewFile({ name: fileName, url: fileUrl, size: file.size })}
                                                                    >
                                                                        <td style={{ padding: '10px 14px' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                {file.mimeType?.startsWith('image/') ? <IconSparkles size={16} color="#38bdf8" /> : fileName.endsWith('.pdf') ? <IconFileText size={16} color="#f87171" /> : <IconFileText size={16} color="#94a3b8" />}
                                                                                <span style={{ fontWeight: 600, color: '#fff' }}>{fileName}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>
                                                                            {formatFileSize(file.size)}
                                                                        </td>
                                                                        <td style={{ padding: '10px 14px', color: '#e4e4e7' }}>
                                                                            {uploader}
                                                                        </td>
                                                                        <td style={{ padding: '10px 14px', color: 'var(--color-text-muted)' }}>
                                                                            {dateStr}
                                                                        </td>
                                                                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation()
                                                                                        setPreviewFile({ name: fileName, url: fileUrl, size: file.size })
                                                                                    }}
                                                                                    style={{
                                                                                        display: 'inline-flex',
                                                                                        alignItems: 'center',
                                                                                        gap: 4,
                                                                                        padding: '4px 10px',
                                                                                        borderRadius: 6,
                                                                                        background: 'rgba(99, 102, 241, 0.15)',
                                                                                        border: '1px solid rgba(99, 102, 241, 0.35)',
                                                                                        color: '#c7c9ff',
                                                                                        fontWeight: 600,
                                                                                        fontSize: '0.72rem',
                                                                                        cursor: 'pointer',
                                                                                        transition: 'all 0.15s ease'
                                                                                    }}
                                                                                    title="Preview document"
                                                                                >
                                                                                    <IconEye size={13} />
                                                                                    <span>Preview</span>
                                                                                </button>

                                                                                <a
                                                                                    href={fileUrl}
                                                                                    download={fileName}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    style={{
                                                                                        display: 'inline-flex',
                                                                                        alignItems: 'center',
                                                                                        gap: 4,
                                                                                        padding: '4px 10px',
                                                                                        borderRadius: 6,
                                                                                        background: 'rgba(255, 255, 255, 0.06)',
                                                                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                                                                        color: '#e2e8f0',
                                                                                        textDecoration: 'none',
                                                                                        fontWeight: 600,
                                                                                        fontSize: '0.72rem',
                                                                                        cursor: 'pointer',
                                                                                        transition: 'all 0.15s ease'
                                                                                    }}
                                                                                    title="Download file"
                                                                                >
                                                                                    <IconDownload size={13} />
                                                                                    <span>Download</span>
                                                                                </a>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })()}

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
                                    <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                                        <div className="glass-card" style={{ padding: 16, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <h4 style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                                                Channel Specification
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.75rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                                                    <span style={{ color: 'var(--color-text-secondary)' }}>Channel Name:</span>
                                                    <span style={{ fontWeight: 700, color: '#fff' }}>#{selectedChannel.name}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                                                    <span style={{ color: 'var(--color-text-secondary)' }}>Department:</span>
                                                    <span style={{ fontWeight: 600, color: '#818cf8' }}>{currentTeam?.name || 'Department'}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                                                    <span style={{ color: 'var(--color-text-secondary)' }}>Access Type:</span>
                                                    <span style={{ fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>{selectedChannel.type}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                                                    <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
                                                    <span style={{ fontWeight: 600, color: selectedChannel.archived ? '#fbbf24' : '#4ade80', textTransform: 'capitalize' }}>
                                                        {selectedChannel.archived ? 'Archived (Read Only)' : selectedChannel.status}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                                                    <span style={{ color: 'var(--color-text-secondary)' }}>Total Messages:</span>
                                                    <span style={{ fontWeight: 700, color: '#fff' }}>{messages.length}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 6 }}>
                                                    <span style={{ color: 'var(--color-text-secondary)' }}>Shared Files:</span>
                                                    <span style={{ fontWeight: 700, color: '#fff' }}>{files.length}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'var(--color-text-secondary)' }}>Created:</span>
                                                    <span style={{ fontWeight: 600, color: '#fff' }}>{new Date(selectedChannel.createdAt || Date.now()).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="glass-card" style={{ padding: 16, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <h4 style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                                                Topic & Mission
                                            </h4>
                                            <p style={{ fontSize: '0.8125rem', color: '#d1d5db', lineHeight: 1.5, margin: 0 }}>
                                                {selectedChannel.description || 'No description has been added for this channel yet. Use the Edit button in the header toolbar to configure topics and team objectives.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 5: PERMISSIONS */}
                                {activePanelTab === 'permissions' && (
                                    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                                            {[
                                                { title: 'Channel Owner', desc: 'Full administration, edit channel properties, archive, purge messages, and member moderation.', color: '#F59E0B' },
                                                { title: 'Moderator', desc: 'Can manage channel settings, invite teammates, pin messages, and manage files.', color: '#8B5CF6' },
                                                { title: 'Member / Collaborator', desc: 'Full chat stream participation, live meeting join, file uploads, and reactions.', color: '#22C55E' }
                                            ].map((p, idx) => (
                                                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color }} />
                                                        <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#fff' }}>{p.title}</span>
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '0.725rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{p.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TAB 6: DANGER ZONE */}
                                {activePanelTab === 'danger' && (
                                    <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 16px', flexWrap: 'wrap', gap: 10 }}>
                                            <div>
                                                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>Archive or Restore Channel</div>
                                                <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>Archiving makes the channel read-only while keeping message history intact.</div>
                                            </div>
                                            {selectedChannel.archived ? (
                                                <button
                                                    onClick={handleRestoreChannel}
                                                    className="btn btn-success"
                                                    style={{ height: 30, borderRadius: 7, fontSize: '0.75rem', fontWeight: 600, padding: '0 12px', background: 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)', border: 'none', cursor: 'pointer' }}
                                                >
                                                    Restore Channel
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleArchiveChannel}
                                                    className="btn btn-secondary"
                                                    style={{ height: 30, borderRadius: 7, fontSize: '0.75rem', fontWeight: 600, padding: '0 12px', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.1)', cursor: 'pointer' }}
                                                >
                                                    Archive Channel
                                                </button>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.03)', border: '1px dashed rgba(239, 68, 68, 0.25)', borderRadius: 10, padding: '12px 16px', flexWrap: 'wrap', gap: 10 }}>
                                            <div>
                                                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#EF4444' }}>Delete Channel Permanently</div>
                                                <div style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>Completely purge #{selectedChannel.name}, shared files, and all chat records.</div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Delete this channel? This will delete all chat history permanently.')) {
                                                        handleDeleteChannel();
                                                    }
                                                }}
                                                className="btn btn-danger"
                                                style={{ height: 30, borderRadius: 7, fontSize: '0.75rem', fontWeight: 600, padding: '0 12px', background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', border: 'none', cursor: 'pointer' }}
                                            >
                                                Delete Channel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                                {isChannelListCollapsed && (
                                    <div style={{
                                        padding: '12px 18px',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        background: 'rgba(255, 255, 255, 0.02)'
                                    }}>
                                        <button
                                            type="button"
                                            onClick={toggleChannelListCollapse}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                padding: '6px 12px',
                                                borderRadius: 7,
                                                background: 'rgba(99, 102, 241, 0.18)',
                                                border: '1px solid rgba(99, 102, 241, 0.4)',
                                                color: '#818cf8',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                            title="Show channels list"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                <line x1="9" y1="3" x2="9" y2="21" />
                                                <path d="m13 15 3-3-3-3" />
                                            </svg>
                                            <span>Show Channels</span>
                                        </button>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                                            Channels list collapsed
                                        </span>
                                    </div>
                                )}
                                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', maxWidth: 440, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                                    <div style={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: 14,
                                        background: 'rgba(99, 102, 241, 0.12)',
                                        border: '1px solid rgba(99, 102, 241, 0.25)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#818cf8'
                                    }}>
                                        <IconHash size={26} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: '0 0 6px 0' }}>
                                            Channel Workspace
                                        </h3>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                                            {isChannelListCollapsed
                                                ? 'Channels sidebar is collapsed. Click below to expand your team channels list.'
                                                : 'Select a channel from the left sidebar or create a new one to start collaborating.'}
                                        </p>
                                    </div>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                                        {isChannelListCollapsed && (
                                            <button
                                                type="button"
                                                onClick={toggleChannelListCollapse}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 7,
                                                    padding: '8px 16px',
                                                    borderRadius: 8,
                                                    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                                    border: 'none',
                                                    color: '#fff',
                                                    fontWeight: 700,
                                                    fontSize: '0.8125rem',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                                                }}
                                            >
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                    <line x1="9" y1="3" x2="9" y2="21" />
                                                    <path d="m13 15 3-3-3-3" />
                                                </svg>
                                                <span>Show Channels List</span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateDialog(true)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                padding: '8px 16px',
                                                borderRadius: 8,
                                                background: isChannelListCollapsed ? 'rgba(255, 255, 255, 0.08)' : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                                border: isChannelListCollapsed ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                                                color: '#fff',
                                                fontWeight: 700,
                                                fontSize: '0.8125rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <span>+</span>
                                            <span>Create New Channel</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
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
            {incomingNotificationToast && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        width: 360,
                        maxWidth: 'calc(100vw - 48px)',
                        background: 'linear-gradient(135deg, rgba(30, 32, 44, 0.96) 0%, rgba(20, 22, 34, 0.98) 100%)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(123, 131, 235, 0.35)',
                        borderLeft: '4px solid #6264A7',
                        borderRadius: 12,
                        boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.6), 0 0 20px rgba(98, 100, 167, 0.25)',
                        padding: '14px 16px',
                        zIndex: 99999,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        animation: 'teamsToastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onClick={() => {
                        setActivePanelTab('chat')
                        setIncomingNotificationToast(null)
                    }}
                >
                    {/* Header bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                                width: 20,
                                height: 20,
                                borderRadius: 5,
                                background: '#6366F1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFFFFF'
                            }}>
                                <IconMessage size={12} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A5B4FC', letterSpacing: '0.02em' }}>
                                #{incomingNotificationToast.channelName}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
                                {incomingNotificationToast.time}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setIncomingNotificationToast(null)
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.5)',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                    fontSize: '0.85rem',
                                    lineHeight: 1,
                                    borderRadius: 4
                                }}
                                title="Dismiss notification"
                            >
                                <IconX size={12} />
                            </button>
                        </div>
                    </div>

                    {/* Content body */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        {incomingNotificationToast.senderAvatar ? (
                            <img
                                src={incomingNotificationToast.senderAvatar}
                                alt={incomingNotificationToast.senderName}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                    border: '2px solid rgba(98, 100, 167, 0.4)'
                                }}
                            />
                        ) : (
                            <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6264A7 0%, #464775 100%)',
                                color: '#FFFFFF',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                border: '2px solid rgba(123, 131, 235, 0.3)'
                            }}>
                                {incomingNotificationToast.senderName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: '0.825rem',
                                fontWeight: 700,
                                color: '#FFFFFF',
                                marginBottom: 2,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {incomingNotificationToast.senderName}
                            </div>
                            <div style={{
                                fontSize: '0.78rem',
                                color: 'rgba(255, 255, 255, 0.75)',
                                lineHeight: 1.35,
                                maxHeight: '2.7em',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                            }}>
                                {incomingNotificationToast.content}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Zoom Clips Async Video Recorder Modal (Feature 1) */}
            <AsyncClipRecorderModal
                isOpen={showClipModal}
                onClose={() => setShowClipModal(false)}
                token={token}
                channelId={selectedChannel?._id}
                onClipUploaded={handleClipUploaded}
            />

            {/* Next-Gen Feature 2: Slack 2.0 Channel Live Huddle Dock (Corner Anchored & Collapsible) */}
            {isHuddleActive && selectedChannel && (
                isHuddleCollapsed ? (
                    /* COLLAPSED MINI-PILL IN BOTTOM-RIGHT CORNER */
                    <div style={{
                        position: 'fixed',
                        bottom: 80,
                        right: 24,
                        zIndex: 9999,
                        background: 'rgba(15, 17, 26, 0.95)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(168, 85, 247, 0.4)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(168, 85, 247, 0.25)',
                        borderRadius: 9999,
                        padding: '5px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        animation: 'fadeInUp 0.2s ease'
                    }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>Huddle</span>
                        <button
                            type="button"
                            onClick={() => setIsHuddleMuted(!isHuddleMuted)}
                            style={{
                                background: isHuddleMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                color: isHuddleMuted ? '#f87171' : '#fff',
                                borderRadius: '50%',
                                width: 24,
                                height: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                            title={isHuddleMuted ? "Unmute Mic" : "Mute Mic"}
                        >
                            <IconMic size={11} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsHuddleCollapsed(false)}
                            style={{
                                background: 'rgba(168, 85, 247, 0.2)',
                                border: '1px solid rgba(168, 85, 247, 0.4)',
                                color: '#c084fc',
                                borderRadius: 6,
                                padding: '2px 7px',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                            title="Open Huddle controls"
                        >
                            ▲ Open
                        </button>
                        <button
                            type="button"
                            onClick={handleToggleHuddle}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                padding: '0 3px',
                                lineHeight: 1
                            }}
                            title="Leave Huddle"
                        >
                            ✕
                        </button>
                    </div>
                ) : (
                    /* EXPANDED CORNER WIDGET WITH COLLAPSE TOGGLE */
                    <div style={{
                        position: 'fixed',
                        bottom: 80,
                        right: 24,
                        zIndex: 9999,
                        background: 'rgba(15, 17, 26, 0.96)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(168, 85, 247, 0.45)',
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65), 0 0 20px rgba(168, 85, 247, 0.25)',
                        borderRadius: 14,
                        padding: '10px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        minWidth: 280,
                        animation: 'fadeInUp 0.2s ease'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                                <span style={{ fontWeight: 800, fontSize: '0.78rem', color: '#fff' }}>
                                    #{selectedChannel.name} Huddle
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#c084fc', background: 'rgba(168, 85, 247, 0.18)', padding: '1px 6px', borderRadius: 9999 }}>
                                    Live Audio
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsHuddleCollapsed(true)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    color: '#94a3b8',
                                    borderRadius: 6,
                                    padding: '2px 7px',
                                    fontSize: '0.68rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}
                                title="Collapse to corner"
                            >
                                <span>▼</span>
                                <span>Hide</span>
                            </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/* Mic Toggle */}
                            <button
                                type="button"
                                onClick={() => setIsHuddleMuted(!isHuddleMuted)}
                                style={{
                                    background: isHuddleMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                    border: isHuddleMuted ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
                                    color: isHuddleMuted ? '#f87171' : '#fff',
                                    borderRadius: 8,
                                    padding: '5px 10px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5
                                }}
                            >
                                <IconMic size={13} />
                                <span>{isHuddleMuted ? 'Muted' : 'Mute'}</span>
                            </button>

                            {/* Ambient Focus Sounds */}
                            <button
                                type="button"
                                onClick={() => {
                                    const next = ambientAudioMode === 'off' ? 'lofi' : (ambientAudioMode === 'lofi' ? 'rain' : 'off')
                                    setAmbientAudioMode(next)
                                }}
                                style={{
                                    background: ambientAudioMode !== 'off' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                    border: ambientAudioMode !== 'off' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
                                    color: ambientAudioMode !== 'off' ? '#a5b4fc' : '#94a3b8',
                                    borderRadius: 8,
                                    padding: '5px 10px',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5
                                }}
                            >
                                <span>🎵</span>
                                <span>{ambientAudioMode === 'off' ? 'Ambient' : (ambientAudioMode === 'lofi' ? 'Lo-Fi' : 'Rain')}</span>
                            </button>

                            {/* Leave */}
                            <button
                                type="button"
                                onClick={handleToggleHuddle}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.45)',
                                    color: '#fca5a5',
                                    borderRadius: 8,
                                    padding: '5px 10px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    marginLeft: 'auto'
                                }}
                            >
                                Leave
                            </button>
                        </div>
                    </div>
                )
            )}

            {/* Document / File Preview Modal */}
            <DocumentPreviewModal
                isOpen={Boolean(previewFile)}
                onClose={() => setPreviewFile(null)}
                file={previewFile}
            />
        </div>
    )
}
