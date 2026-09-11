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
    addChannelMessageReaction
} from './channel.service'
import { CreateChannelDialog } from './CreateChannelDialog'
import { EditChannelDialog } from './EditChannelDialog'
import { InviteChannelMemberDialog } from './InviteChannelMemberDialog'
import { ChannelMembersPage } from './ChannelMembersPage'
import { FileCard } from './components/FileCard'
import { CodeSnippetModal } from './components/CodeSnippetModal'
import { CodeSnippetCard } from './components/CodeSnippetCard'
import type { ChannelAttachment, CodeSnippet } from './channel.types'
import { soundEffects } from '../../utils/soundEffects'
import io from 'socket.io-client'
import { SOCKET_URL, API_BASE } from '../../config'

interface ChannelSettingsPageProps {
    token: string
    organizationId?: string
    teamId?: string
    currentUserId?: string
    teams?: any[]
    onSelectTeam?: (teamId: string) => void
    onStartMeeting?: (meetingId: string) => void
}

export function ChannelSettingsPage({
    token,
    organizationId,
    teamId,
    currentUserId,
    teams = [],
    onSelectTeam,
    onStartMeeting
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

    const [activePanelTab, setActivePanelTab] = useState<'chat' | 'files' | 'members' | 'info' | 'permissions' | 'danger'>(() => {
        try {
            const saved = localStorage.getItem('jts_channel_panel_tab')
            if (saved && ['chat', 'files', 'members', 'info', 'permissions', 'danger'].includes(saved)) {
                return saved as any
            }
        } catch (_) {}
        return 'chat'
    })

    useEffect(() => {
        try {
            localStorage.setItem('jts_channel_panel_tab', activePanelTab)
        } catch (_) {}
    }, [activePanelTab])
    const [messages, setMessages] = useState<any[]>([])
    const [chatInput, setChatInput] = useState('')
    const [activeThreadParent, setActiveThreadParent] = useState<any | null>(null)
    const [threadMessages, setThreadMessages] = useState<any[]>([])
    const [threadInput, setThreadInput] = useState('')
    const [socketInstance, setSocketInstance] = useState<any | null>(null)

    // Resolved current user ID with JWT token decoding fallback
    const resolvedUserId = useMemo(() => {
        if (currentUserId) return currentUserId.toString()
        if (!token) return ''
        try {
            const base64Url = token.split('.')[1]
            if (base64Url) {
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
                const parsed = JSON.parse(jsonPayload)
                return (parsed.userId || parsed.id || parsed._id || parsed.sub || '').toString()
            }
        } catch (_) {}
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
            Notification.requestPermission().catch(() => {})
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

        fetchMessages()
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

            // Do not notify if this message was sent directly by this active tab
            const isFromCurrentTab = msgId && sentByCurrentTabIds.current.has(msgId)

            if (!isFromCurrentTab) {
                // 1. Play signature Microsoft Teams notification chime
                try {
                    soundEffects.playMessageNotificationChime()
                } catch (e) {
                    console.error('Sound chime error:', e)
                }

                const isAppFocused = typeof document !== 'undefined' && !document.hidden && document.hasFocus()

                if (isAppFocused) {
                    // 2. When user is inside the app, show only the sleek In-App Teams toast banner
                    setIncomingNotificationToast({
                        id: msgId || String(Date.now()),
                        senderName: msg.senderId?.fullName || 'Colleague',
                        senderAvatar: msg.senderId?.profileImage,
                        channelName: selectedChannel?.name || 'General',
                        channelId: selectedChannel?._id || '',
                        content: msg.content || (msg.attachments?.length ? '📎 Sent an attachment' : 'Shared a message'),
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    })
                } else {
                    // 3. When browser is minimized or user is on another tab, show OS Desktop Push notification
                    if (typeof Notification !== 'undefined') {
                        if (Notification.permission === 'granted') {
                            try {
                                const senderName = msg.senderId?.fullName || 'Colleague'
                                const chName = selectedChannel?.name || 'General'
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
                            Notification.requestPermission().catch(() => {})
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
            setMessages(prev => prev.filter(m => m._id !== messageId))
            setThreadMessages(prev => prev.filter(m => m._id !== messageId))
        })

        socket.on('channel:message:reaction', ({ messageId, reactions }: any) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m))
            setThreadMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m))
        })

        setSocketInstance(socket)

        return () => {
            socket.emit('channel:leave', { channelId: selectedChannel._id })
            socket.disconnect()
        }
    }, [selectedChannel?._id, token, activeThreadParent?._id])

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
        if (!chatInput.trim() || !selectedChannel) return

        const content = chatInput.trim()
        setChatInput('')
        setShowEmojiPicker(false)

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

    // Instant Channel Meeting ("Meet Now")
    const handleStartChannelMeeting = () => {
        if (!selectedChannel) return
        const meetingId = `meet_${selectedChannel.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36).slice(-5)}`
        
        // Notify in channel chat
        const meetMsg = `🎥 **Live Meeting Started in #${selectedChannel.name}**\n👉 Click **[Join Meeting](#meeting?room=${meetingId})** to participate!`
        fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: meetMsg })
        }).catch(() => {})

        if (onStartMeeting) {
            onStartMeeting(meetingId)
        } else {
            window.location.hash = `#meeting?room=${meetingId}`
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
            } catch (_) {}
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
        } catch (_) {}
    }

    const handleSelectChannel = async (channelId: string) => {
        try {
            localStorage.setItem('jts_current_channel_id', channelId)
        } catch (_) {}
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
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', marginBottom: 8 }}>
                    ⚠️ {error}
                </div>
            )}

            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div className="animate-spin" style={{ width: 24, height: 24, border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1', borderRadius: '50%' }} />
                    Loading channels workspace...
                </div>
            ) : !teamId ? (
                <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    💬 No department/team selected. Choose a team in the workspace sidebar.
                </div>
            ) : (
                /* UNIFIED FULL-HEIGHT WORKSPACE CONTAINER */
                <div className="glass-card" style={{
                    display: 'grid',
                    gridTemplateColumns: 'clamp(210px, 20vw, 260px) 1fr',
                    gridTemplateRows: '100%',
                    flex: 1,
                    height: '100%',
                    minHeight: 0,
                    borderRadius: 14,
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: 0
                }} id="unified-channel-container">
                    <style>{`
                        @media (max-width: 580px) {
                            #unified-channel-container {
                                grid-template-columns: 1fr !important;
                            }
                        }
                    `}</style>

                    {/* LEFT PANE: CHANNELS LIST + TEAM SWITCHER (Teams Style) */}
                    <div style={{
                        background: 'rgba(10, 11, 16, 0.65)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        minHeight: 0,
                        overflow: 'hidden'
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
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                                                <span style={{ color: isActive ? '#818cf8' : '#71717A', fontWeight: 800, fontSize: '0.875rem' }}>#</span>
                                                <span style={{ fontWeight: isActive ? 700 : 500, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {channel.name}
                                                </span>
                                            </div>
                                            <span style={{
                                                fontSize: '0.6rem',
                                                fontWeight: 700,
                                                color: channel.type === 'public' ? '#4ade80' : '#c084fc',
                                                textTransform: 'uppercase',
                                                flexShrink: 0
                                            }}>
                                                {channel.type}
                                            </span>
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANE: ACTIVE CHANNEL WORKSPACE & CHAT */}
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0, background: 'rgba(0, 0, 0, 0.2)', overflow: 'hidden' }}>
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
                                        <div style={{
                                            width: 28, height: 28, borderRadius: 6,
                                            background: 'rgba(99, 102, 241, 0.15)',
                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1rem', fontWeight: 800, color: '#818cf8'
                                        }}>
                                            #
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
                                        {/* MICROSOFT TEAMS "MEET NOW" BUTTON */}
                                        <button
                                            type="button"
                                            onClick={handleStartChannelMeeting}
                                            className="btn btn-primary"
                                            style={{
                                                height: 30,
                                                borderRadius: 8,
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                padding: '0 12px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                                                border: 'none',
                                                color: '#fff',
                                                boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)',
                                                cursor: 'pointer'
                                            }}
                                            title="Start instant video meeting with channel members"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <polygon points="23 7 16 12 23 17 23 7" />
                                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                            </svg>
                                            <span>Meet Now</span>
                                        </button>

                                        {selectedChannel.type === 'public' && !isMember && (
                                            <button
                                                onClick={handleJoinChannel}
                                                className="btn btn-success"
                                                style={{ height: 30, borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, padding: '0 12px', background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', border: 'none', color: '#fff', cursor: 'pointer' }}
                                            >
                                                Join Channel
                                            </button>
                                        )}
                                        {isMember && currentUserId && selectedChannel.members.some((member) => member.userId === currentUserId && member.role !== 'owner') && (
                                            <button
                                                onClick={handleLeaveChannel}
                                                className="btn btn-danger"
                                                style={{ height: 30, borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, padding: '0 10px', cursor: 'pointer' }}
                                            >
                                                Leave
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowInviteDialog(true)}
                                            className="btn btn-secondary"
                                            style={{ height: 30, borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                        >
                                            <span>+</span>
                                            <span>Invite</span>
                                        </button>
                                        <button
                                            onClick={() => setShowEditDialog(true)}
                                            className="btn btn-secondary"
                                            style={{ height: 30, borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, padding: '0 10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer' }}
                                        >
                                            Edit
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
                                    <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
                                        {[
                                            { id: 'chat', label: 'Posts & Chat', icon: '💬' },
                                            { id: 'files', label: `Files (${files.length})`, icon: '📁' },
                                            { id: 'members', label: `Members (${members.length})`, icon: '👥' },
                                            { id: 'info', label: 'Info', icon: 'ℹ️' },
                                            { id: 'permissions', label: 'Roles', icon: '🛡️' },
                                            { id: 'danger', label: 'Danger', icon: '⚠️' }
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActivePanelTab(tab.id as any)}
                                                style={{
                                                    padding: '8px 10px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: activePanelTab === tab.id ? 700 : 500,
                                                    background: 'transparent',
                                                    color: activePanelTab === tab.id ? '#818cf8' : 'var(--color-text-muted)',
                                                    border: 'none',
                                                    borderBottom: activePanelTab === tab.id ? '2px solid #6366F1' : '2px solid transparent',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                <span>{tab.icon}</span>
                                                <span>{tab.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* REAL METRICS INFO (Zero hardcoded formulas!) */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.7rem', color: 'var(--color-text-muted)', padding: '4px 0' }}>
                                        <span>👥 {members.length} members</span>
                                        <span>•</span>
                                        <span>🟢 {realOnlineCount} online</span>
                                        <span>•</span>
                                        <span>📁 {files.length} files</span>
                                    </div>
                                </div>

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
                                                <div style={{ fontSize: '3.2rem', animation: 'bounce 1s infinite' }}>📥</div>
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

                                        {/* Messages Feed */}
                                        <div ref={chatFeedRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
                                            {messages.length === 0 ? (
                                                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem', maxWidth: 420 }}>
                                                    <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>👋</div>
                                                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', marginBottom: 4 }}>
                                                        Welcome to #{selectedChannel.name}!
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.5 }}>
                                                        This is the start of the #{selectedChannel.name} channel. Post an announcement, drag & drop documents, share code snippets, or click <strong>Meet Now</strong> to start a video call.
                                                    </p>
                                                </div>
                                            ) : (
                                                messages.map((msg) => {
                                                    const senderName = msg.senderId?.fullName || 'Colleague'
                                                    const isHovered = hoveredMessageId === msg._id

                                                    return (
                                                        <div
                                                            key={msg._id}
                                                            onMouseEnter={() => setHoveredMessageId(msg._id)}
                                                            onMouseLeave={() => setHoveredMessageId(null)}
                                                            style={{
                                                                display: 'flex',
                                                                gap: 10,
                                                                padding: '6px 8px',
                                                                borderRadius: 8,
                                                                position: 'relative',
                                                                transition: 'background 0.15s',
                                                                background: isHovered ? 'rgba(255, 255, 255, 0.03)' : 'transparent'
                                                            }}
                                                        >
                                                            {/* User Avatar */}
                                                            {msg.senderId?.profileImage ? (
                                                                <img
                                                                    src={msg.senderId.profileImage}
                                                                    alt={senderName}
                                                                    style={{ width: 30, height: 30, minWidth: 30, borderRadius: '50%', objectFit: 'cover' }}
                                                                />
                                                            ) : (
                                                                <div style={{
                                                                    width: 30, height: 30, minWidth: 30, borderRadius: '50%',
                                                                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                                                                    color: '#fff', display: 'flex', alignItems: 'center',
                                                                    justifyContent: 'center', fontWeight: 700, fontSize: '0.725rem'
                                                                }}>
                                                                    {senderName.charAt(0).toUpperCase()}
                                                                </div>
                                                            )}

                                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#fff' }}>{senderName}</span>
                                                                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    {msg.edited && (
                                                                        <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                                                            (edited)
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Accompanying note or text */}
                                                                {msg.content && (!msg.attachments?.length || msg.messageType !== 'file') && (!msg.codeSnippet || msg.messageType !== 'code') && (
                                                                    <div style={{ fontSize: '0.8125rem', color: '#e5e7eb', lineHeight: 1.45, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                                        {msg.content}
                                                                    </div>
                                                                )}

                                                                {/* If code snippet has caption */}
                                                                {msg.codeSnippet && msg.content && msg.content !== `Shared a ${msg.codeSnippet.language || ''} code snippet` && (
                                                                    <div style={{ fontSize: '0.8125rem', color: '#e5e7eb', lineHeight: 1.45, marginBottom: 2 }}>
                                                                        {msg.content}
                                                                    </div>
                                                                )}

                                                                {/* Code Snippet Card */}
                                                                {msg.codeSnippet && (
                                                                    <CodeSnippetCard snippet={msg.codeSnippet} />
                                                                )}

                                                                {/* Attachments (PDF, Excel, Images, Docs) */}
                                                                {msg.attachments && msg.attachments.length > 0 && (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                                                                        {msg.attachments.map((att: ChannelAttachment, idx: number) => (
                                                                            <FileCard key={idx} attachment={att} />
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Emoji reactions row with toggle action */}
                                                                {msg.reactions && msg.reactions.length > 0 && (
                                                                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                                                                        {Array.from(new Set(msg.reactions.map((r: any) => r.emoji))).map((emoji: any) => {
                                                                            const count = msg.reactions.filter((r: any) => r.emoji === emoji).length
                                                                            const userReacted = msg.reactions.some((r: any) => (r.userId?._id || r.userId)?.toString() === currentUserId?.toString() && r.emoji === emoji)
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
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setActiveThreadParent(msg)}
                                                                        style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '0.6875rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                                                                        className="hover:underline"
                                                                    >
                                                                        💬 Reply in thread
                                                                    </button>
                                                                    {msg.replyCount > 0 && (
                                                                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                                                                            • {msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Quick Reaction Bar on Hover (MS Teams Style) */}
                                                            {isHovered && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    right: 8,
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
                                                                </div>
                                                            )}
                                                        </div>
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
                                                        <span>📎</span>
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
                                                        <span>{'</>'}</span>
                                                        <span>Code Snippet</span>
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
                                                        😀
                                                    </button>

                                                    {/* Quick Format Pills */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setChatInput(prev => prev + '**bold text**')}
                                                        title="Bold"
                                                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', padding: '2px 6px' }}
                                                    >
                                                        B
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setChatInput(prev => prev + '*italic text*')}
                                                        title="Italic"
                                                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic', cursor: 'pointer', padding: '2px 6px' }}
                                                    >
                                                        I
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setChatInput(prev => prev + '`code`')}
                                                        title="Inline Code"
                                                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace', cursor: 'pointer', padding: '2px 6px' }}
                                                    >
                                                        &lt;/&gt;
                                                    </button>
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
                                                            onClick={() => {
                                                                setChatInput(prev => prev + emoji)
                                                                setShowEmojiPicker(false)
                                                            }}
                                                            style={{ background: 'transparent', border: 'none', fontSize: '1.1rem', cursor: 'pointer', padding: '2px 4px' }}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Input Bar Form */}
                                            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8 }}>
                                                <input
                                                    value={chatInput}
                                                    onChange={(e) => setChatInput(e.target.value)}
                                                    className="input"
                                                    placeholder={`Send a message to #${selectedChannel.name}...`}
                                                    style={{ flex: 1, borderRadius: 8, height: 36, fontSize: '0.8125rem', background: 'rgba(255,255,255,0.03)' }}
                                                    disabled={selectedChannel.archived}
                                                />
                                                <button
                                                    type="submit"
                                                    className="btn btn-primary"
                                                    style={{
                                                        padding: '0 18px',
                                                        borderRadius: 8,
                                                        height: 36,
                                                        fontSize: '0.8125rem',
                                                        fontWeight: 700,
                                                        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                                        border: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                    disabled={selectedChannel.archived || !chatInput.trim()}
                                                >
                                                    Send
                                                </button>
                                            </form>
                                        </div>

                                        {/* Slide-in Thread Sidebar */}
                                        {activeThreadParent && (
                                            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 320, borderLeft: '1px solid rgba(255,255,255,0.08)', background: '#111218', display: 'flex', flexDirection: 'column', zIndex: 20, boxShadow: '-4px 0 16px rgba(0,0,0,0.5)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                    <span style={{ fontWeight: 800, fontSize: '0.8125rem', color: '#fff' }}>Thread Conversation</span>
                                                    <button onClick={() => setActiveThreadParent(null)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2, fontSize: '1rem' }}>
                                                        ✕
                                                    </button>
                                                </div>

                                                <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 8 }}>
                                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.65rem', color: '#fff' }}>
                                                        {activeThreadParent.senderId?.fullName ? activeThreadParent.senderId.fullName.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{activeThreadParent.senderId?.fullName || 'User'}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2, wordBreak: 'break-word' }}>{activeThreadParent.content}</div>
                                                    </div>
                                                </div>

                                                <div ref={threadFeedRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
                                                    {threadMessages.length === 0 ? (
                                                        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                                            💬 No replies in this thread yet. Be the first to respond!
                                                        </div>
                                                    ) : (
                                                        threadMessages.map((reply) => (
                                                            <div key={reply._id} style={{ display: 'flex', gap: 8, padding: '4px 0' }}>
                                                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.65rem' }}>
                                                                    {reply.senderId?.fullName ? reply.senderId.fullName.charAt(0).toUpperCase() : 'U'}
                                                                </div>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <span style={{ fontWeight: 700, fontSize: '0.725rem', color: '#fff' }}>{reply.senderId?.fullName || 'User'}</span>
                                                                        <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>{new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </div>
                                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#d1d5db', marginTop: 2, wordBreak: 'break-word' }}>{reply.content}</p>
                                                                </div>
                                                            </div>
                                                        ))
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
                                                        placeholder="🔍 Filter files..."
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
                                                    <span>+</span>
                                                    <span>{uploadingFile ? 'Uploading...' : 'Upload File'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {files.length === 0 ? (
                                            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📁</div>
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
                                                            <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'right' }}>Download</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredFiles.map((file) => {
                                                            const uploader = file.uploadedBy?.fullName || 'Colleague'
                                                            const dateStr = file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Recent'
                                                            return (
                                                                <tr key={file._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/2">
                                                                    <td style={{ padding: '10px 14px' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                            <span style={{ fontSize: '1.1rem' }}>
                                                                                {file.mimeType?.startsWith('image/') ? '🖼️' : file.originalName?.endsWith('.pdf') ? '📕' : '📄'}
                                                                            </span>
                                                                            <span style={{ fontWeight: 600, color: '#fff' }}>{file.originalName || file.fileName}</span>
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
                                                                        <a
                                                                            href={`${API_BASE}/api/file/${file._id}/download`}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: 4,
                                                                                padding: '4px 10px',
                                                                                borderRadius: 6,
                                                                                background: 'rgba(99, 102, 241, 0.1)',
                                                                                border: '1px solid rgba(99, 102, 241, 0.25)',
                                                                                color: '#818cf8',
                                                                                textDecoration: 'none',
                                                                                fontWeight: 600,
                                                                                fontSize: '0.7rem'
                                                                            }}
                                                                        >
                                                                            Download ⬇
                                                                        </a>
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
                            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                                💬 Select a channel from the left sidebar to start collaborating.
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
                                fontSize: '0.7rem',
                                color: '#FFFFFF'
                            }}>
                                💬
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
                                ✕
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
        </div>
    )
}
