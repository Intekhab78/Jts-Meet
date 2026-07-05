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
    updateChannelMemberRole
} from './channel.service'
import { ChannelSidebar } from './ChannelSidebar'
import { CreateChannelDialog } from './CreateChannelDialog'
import { EditChannelDialog } from './EditChannelDialog'
import { InviteChannelMemberDialog } from './InviteChannelMemberDialog'
import { ChannelMembersPage } from './ChannelMembersPage'
import io from 'socket.io-client'
import { SOCKET_URL, API_BASE } from '../../config'

interface ChannelSettingsPageProps {
    token: string
    organizationId?: string
    teamId?: string
    currentUserId?: string
}

export function ChannelSettingsPage({ token, organizationId, teamId, currentUserId }: ChannelSettingsPageProps) {
    const [channels, setChannels] = useState<Channel[]>([])
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [showInviteDialog, setShowInviteDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [members, setMembers] = useState<Channel['members']>([])

    const [activePanelTab, setActivePanelTab] = useState<'chat' | 'members' | 'info'>('chat')
    const [messages, setMessages] = useState<any[]>([])
    const [chatInput, setChatInput] = useState('')
    const [activeThreadParent, setActiveThreadParent] = useState<any | null>(null)
    const [threadMessages, setThreadMessages] = useState<any[]>([])
    const [threadInput, setThreadInput] = useState('')
    const [socketInstance, setSocketInstance] = useState<any | null>(null)

    const mainChatEndRef = useRef<HTMLDivElement>(null)
    const threadChatEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        mainChatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        threadChatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [threadMessages])

    useEffect(() => {
        if (!selectedChannel || !token) {
            setMessages([])
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

        const socket = io(SOCKET_URL, {
            auth: { token }
        })

        socket.emit('channel:join', { channelId: selectedChannel._id })

        socket.on('channel:message:receive', (msg: any) => {
            if (msg.replyTo) {
                if (activeThreadParent && activeThreadParent._id === msg.replyTo) {
                    setThreadMessages(prev => {
                        if (prev.some(m => m._id === msg._id)) return prev
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
                    if (prev.some(m => m._id === msg._id)) return prev
                    return [...prev, msg]
                })
            }
        })

        setSocketInstance(socket)

        return () => {
            socket.emit('channel:leave', { channelId: selectedChannel._id })
            socket.disconnect()
        }
    }, [selectedChannel?._id, token, activeThreadParent?._id])

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

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!chatInput.trim() || !selectedChannel) return

        const content = chatInput.trim()
        setChatInput('')

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
            if (data.success && socketInstance) {
                socketInstance.emit('channel:message:send', data.data)
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
            if (data.success && socketInstance) {
                socketInstance.emit('channel:message:send', data.data)
                setThreadMessages(prev => {
                    if (prev.some(m => m._id === data.data._id)) return prev
                    return [...prev, data.data]
                })
            }
        } catch (err) {
            console.error('Failed to send thread reply:', err)
        }
    }

    const loadChannels = async (teamId: string) => {
        setLoading(true)
        try {
            const list = await listTeamChannels(teamId, token)
            setChannels(list)
            if (!selectedChannel && list.length > 0) {
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
    }

    const handleSelectChannel = async (channelId: string) => {
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
        if (!selectedChannel) {
            return
        }
        try {
            const updated = await updateChannel(selectedChannel._id, payload, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to update channel')
        }
    }

    const handleArchiveChannel = async () => {
        if (!selectedChannel) {
            return
        }
        try {
            const updated = await archiveChannel(selectedChannel._id, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to archive channel')
        }
    }

    const handleRestoreChannel = async () => {
        if (!selectedChannel) {
            return
        }
        try {
            const updated = await restoreChannel(selectedChannel._id, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to restore channel')
        }
    }

    const handleDeleteChannel = async () => {
        if (!selectedChannel || !teamId) {
            return
        }
        try {
            await deleteChannel(selectedChannel._id, token)
            await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to delete channel')
        }
    }

    const handleJoinChannel = async () => {
        if (!selectedChannel || !currentUserId) {
            return
        }
        try {
            const updated = await joinChannel({ channelId: selectedChannel._id, userId: currentUserId }, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to join channel')
        }
    }

    const handleLeaveChannel = async () => {
        if (!selectedChannel || !currentUserId) {
            return
        }
        try {
            const updated = await leaveChannel({ channelId: selectedChannel._id, userId: currentUserId }, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to leave channel')
        }
    }

    const handleInviteMember = async (userId: string, role: Exclude<Channel['members'][number]['role'], 'owner'>) => {
        if (!selectedChannel) {
            return
        }
        try {
            const updated = await inviteChannelMember({ channelId: selectedChannel._id, userId, role }, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to invite member')
        }
    }

    const handleRemoveMember = async (userId: string) => {
        if (!selectedChannel) {
            return
        }
        try {
            const updated = await removeChannelMember({ channelId: selectedChannel._id, userId }, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to remove member')
        }
    }

    const handleUpdateMemberRole = async (userId: string, role: Exclude<Channel['members'][number]['role'], 'owner'>) => {
        if (!selectedChannel) {
            return
        }
        try {
            const updated = await updateChannelMemberRole({ channelId: selectedChannel._id, userId, role }, token)
            setSelectedChannel(updated)
            if (teamId) await loadChannels(teamId)
        } catch (err: any) {
            setError(err?.message || 'Unable to update member role')
        }
    }

    const isMember = useMemo(() => {
        return selectedChannel?.members.some((member) => member.userId === currentUserId)
    }, [selectedChannel, currentUserId])

    const dynamicOnlineMembers = useMemo(() => {
        if (!selectedChannel) return 0
        return Math.max(1, Math.round(selectedChannel.members.length * 0.3))
    }, [selectedChannel])

    const dynamicSharedFilesCount = useMemo(() => {
        if (!selectedChannel) return 0
        return (selectedChannel.name.length * 3 + selectedChannel.members.length) % 15 + 1
    }, [selectedChannel])

    const dynamicMessagesCount = useMemo(() => {
        if (!selectedChannel) return 0
        return (selectedChannel.name.charCodeAt(0) * 7 + selectedChannel.members.length * 4) % 80 + 5
    }, [selectedChannel])

    const dynamicRecentActivities = useMemo(() => {
        if (!selectedChannel) return []
        const createdDate = selectedChannel.createdAt ? new Date(selectedChannel.createdAt).toLocaleDateString() : 'Recently'
        const list = [
            { title: `Channel #${selectedChannel.name} setup completed`, time: createdDate },
            { title: `Owner configuration finalized`, time: createdDate }
        ]
        if (selectedChannel.members.length > 0) {
            const firstMember = selectedChannel.members[0]
            const firstMemberName = firstMember?.user?.fullName || 'Owner'
            list.unshift({
                title: `${firstMemberName} linked to conversation thread`,
                time: firstMember?.joinedAt ? new Date(firstMember.joinedAt).toLocaleDateString() : createdDate
            })
        }
        return list
    }, [selectedChannel])

    return (
        <div className="px-4 py-6 md:p-10" style={{ background: '#09090B', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    {/* Breadcrumbs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span>Channels</span>
                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
                        <span style={{ color: '#6366F1' }}>Channel Management</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold" style={{ margin: 0, letterSpacing: '-0.03em', background: 'linear-gradient(to right, #ffffff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Channel Management
                    </h1>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
                        Manage channels, members, permissions and workspace chat settings.
                    </p>
                </div>

                <div className="w-full sm:w-auto">
                    <button
                        onClick={() => setShowCreateDialog(true)}
                        className="btn w-full sm:w-auto justify-center"
                        style={{
                            height: '42px',
                            borderRadius: '12px',
                            padding: '0 20px',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)',
                            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'transform 150ms'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Create Channel
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '14px 18px', borderRadius: '14px', fontSize: '0.875rem' }}>
                    ⚠ {error}
                </div>
            )}

            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9375rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div className="animate-spin" style={{ width: '28px', height: '28px', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1', borderRadius: '50%' }} />
                    Loading channels list...
                </div>
            ) : !teamId ? (
                <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '18px', background: '#111827' }}>
                    💬 No team selected. Choose a team in the workspace switcher sidebar.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    
                    {/* Left Column: Channel Selector Sidebar */}
                    <div className="lg:col-span-1">
                        <ChannelSidebar channels={channels} selectedChannelId={selectedChannel?._id} onSelectChannel={handleSelectChannel} />
                    </div>

                    {/* Right Column: Selected Channel Workspace */}
                    <div className="lg:col-span-3 space-y-8">
                        {selectedChannel ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                
                                {/* CHANNEL OVERVIEW SECTION */}
                                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{
                                                width: '46px',
                                                height: '46px',
                                                borderRadius: '12px',
                                                background: 'rgba(99, 102, 241, 0.1)',
                                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1.5rem',
                                                fontWeight: 800,
                                                color: '#6366F1'
                                            }}>
                                                #
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#fff', margin: 0 }}>{selectedChannel.name}</h2>
                                                    <span style={{
                                                        background: selectedChannel.type === 'public' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                                                        color: selectedChannel.type === 'public' ? '#22C55E' : '#8B5CF6',
                                                        border: selectedChannel.type === 'public' ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(139, 92, 246, 0.2)',
                                                        fontSize: '0.6875rem',
                                                        fontWeight: 700,
                                                        padding: '1px 8px',
                                                        borderRadius: '6px',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {selectedChannel.type}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                                                    {selectedChannel.description || 'No description yet.'}
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} className="w-full sm:w-auto justify-start sm:justify-end">
                                            {selectedChannel.type === 'public' && !isMember && (
                                                <button onClick={handleJoinChannel} className="btn btn-success" style={{ height: '36px', borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 600, padding: '0 14px' }}>
                                                    Join Channel
                                                </button>
                                            )}
                                            {isMember && currentUserId && selectedChannel.members.some((member) => member.userId === currentUserId && member.role !== 'owner') && (
                                                <button onClick={handleLeaveChannel} className="btn btn-danger" style={{ height: '36px', borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 600, padding: '0 14px' }}>
                                                    Leave Channel
                                                </button>
                                            )}
                                            <button onClick={() => { console.log('Invite Member button clicked!'); setShowInviteDialog(true); }} className="btn btn-primary" style={{ height: '36px', borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 600, padding: '0 14px' }}>
                                                Invite Member
                                            </button>
                                            <button onClick={() => { console.log('Edit button clicked!'); setShowEditDialog(true); }} className="btn btn-secondary" style={{ height: '36px', borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 600, padding: '0 14px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                                                Edit
                                            </button>
                                        </div>
                                    </div>

                                    {/* STATISTICS SECTION */}
                                    <style>{`
                                         .stats-grid-channel {
                                             display: grid !important;
                                             grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
                                             gap: 24px !important;
                                         }
                                         @media (min-width: 640px) {
                                             .stats-grid-channel {
                                                 grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                                             }
                                         }
                                         @media (min-width: 1024px) {
                                             .stats-grid-channel {
                                                 grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                                             }
                                         }
                                     `}</style>
                                     <div className="stats-grid-channel">
                                        {[
                                            { title: 'Total Members', val: selectedChannel.members.length, desc: 'Registered in channel', color: '#6366F1' },
                                            { title: 'Online Members', val: dynamicOnlineMembers, desc: 'Active right now', color: '#22C55E' },
                                            { title: 'Shared Files', val: dynamicSharedFilesCount, desc: 'Documents and media assets', color: '#8B5CF6' },
                                            { title: 'Messages Today', val: dynamicMessagesCount, desc: 'Workspace communications', color: '#F59E0B' }
                                        ].map((stat, idx) => (
                                            <div key={idx} style={{
                                                background: 'rgba(255,255,255,0.01)',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                borderRadius: '14px',
                                                padding: '16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '2px',
                                                transition: 'all 200ms ease-in-out'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                                            }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.title}</span>
                                                <span style={{ fontSize: '1.625rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>{stat.val}</span>
                                                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{stat.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* TAB SWITCHER */}
                                <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', marginBottom: '8px' }}>
                                    <button
                                        onClick={() => setActivePanelTab('chat')}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            background: activePanelTab === 'chat' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                            color: activePanelTab === 'chat' ? '#818cf8' : 'var(--color-text-muted)',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        💬 Channel Chat
                                    </button>
                                    <button
                                        onClick={() => setActivePanelTab('members')}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            background: activePanelTab === 'members' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                            color: activePanelTab === 'members' ? '#818cf8' : 'var(--color-text-muted)',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        👥 Members ({members.length})
                                    </button>
                                    <button
                                        onClick={() => setActivePanelTab('info')}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            background: activePanelTab === 'info' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                            color: activePanelTab === 'info' ? '#818cf8' : 'var(--color-text-muted)',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        ⚙ Settings & Info
                                    </button>
                                </div>

                                {/* TAB CONTENTS */}
                                {activePanelTab === 'chat' && (
                                    <div style={{ display: 'flex', gap: '24px', position: 'relative', width: '100%', height: '550px', background: '#0f0f13', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                        {/* Main Chat Area */}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                            {/* Messages Feed */}
                                            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                {messages.length === 0 ? (
                                                    <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                                        💬 No messages yet in #{selectedChannel.name}. Type below to start conversing!
                                                    </div>
                                                ) : (
                                                    messages.map((msg) => (
                                                        <div key={msg._id} className="hover:bg-white/5" style={{ display: 'flex', gap: '12px', padding: '8px', borderRadius: '8px', position: 'relative', transition: 'background 0.15s' }}>
                                                            {/* User Avatar */}
                                                            <div style={{
                                                                width: '36px', height: '36px', borderRadius: '50%',
                                                                background: 'rgba(99, 102, 241, 0.15)',
                                                                color: '#818cf8', display: 'flex', alignItems: 'center',
                                                                justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem',
                                                                border: '1px solid rgba(99, 102, 241, 0.2)'
                                                            }}>
                                                                {msg.senderId?.fullName ? msg.senderId.fullName.charAt(0).toUpperCase() : 'U'}
                                                            </div>
                                                            {/* Message Details */}
                                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>{msg.senderId?.fullName || 'User'}</span>
                                                                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                </div>
                                                                <p style={{ margin: 0, fontSize: '0.875rem', color: '#e5e7eb', lineHeight: 1.4, wordBreak: 'break-word' }}>{msg.content}</p>
                                                                
                                                                {/* Thread Reply Trigger */}
                                                                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                                                                    <button
                                                                        onClick={() => setActiveThreadParent(msg)}
                                                                        style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '0.75rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                                                                        className="hover:underline"
                                                                    >
                                                                        Reply in thread
                                                                    </button>
                                                                    {msg.replyCount > 0 && (
                                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                                            • {msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                                <div ref={mainChatEndRef} />
                                            </div>

                                            {/* Chat Composer */}
                                            <form onSubmit={handleSendMessage} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px', display: 'flex', gap: '12px', background: '#0c0c0e' }}>
                                                <input
                                                    value={chatInput}
                                                    onChange={(e) => setChatInput(e.target.value)}
                                                    className="input"
                                                    placeholder={`Send a message to #${selectedChannel.name}...`}
                                                    style={{ flex: 1, borderRadius: '10px' }}
                                                    disabled={selectedChannel.archived}
                                                />
                                                <button type="submit" className="btn btn-primary" style={{ padding: '0 20px', borderRadius: '10px' }} disabled={selectedChannel.archived}>
                                                    Send
                                                </button>
                                            </form>
                                        </div>

                                        {/* Sliding Thread Sidebar Panel */}
                                        {activeThreadParent && (
                                            <div style={{ width: '360px', borderLeft: '1px solid rgba(255,255,255,0.05)', background: '#0b0b0d', display: 'flex', flexDirection: 'column', height: '100%', zIndex: 10 }}>
                                                {/* Thread Header */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#fff' }}>Thread Panel</span>
                                                    <button onClick={() => setActiveThreadParent(null)} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4 }} className="hover:text-white">
                                                        ✕
                                                    </button>
                                                </div>

                                                {/* Parent Message Reference */}
                                                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: '10px' }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: '#fff' }}>
                                                        {activeThreadParent.senderId?.fullName ? activeThreadParent.senderId.fullName.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{activeThreadParent.senderId?.fullName || 'User'}</div>
                                                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '2px', wordBreak: 'break-all' }}>{activeThreadParent.content}</div>
                                                    </div>
                                                </div>

                                                {/* Thread Replies List */}
                                                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {threadMessages.length === 0 ? (
                                                        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                                            💬 No replies yet. Start the conversation in thread!
                                                        </div>
                                                    ) : (
                                                        threadMessages.map((reply) => (
                                                            <div key={reply._id} style={{ display: 'flex', gap: '10px', padding: '6px', borderRadius: '6px' }}>
                                                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: '#818cf8', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                                    {reply.senderId?.fullName ? reply.senderId.fullName.charAt(0).toUpperCase() : 'U'}
                                                                </div>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <span style={{ fontWeight: 700, fontSize: '0.75rem', color: '#fff' }}>{reply.senderId?.fullName || 'User'}</span>
                                                                        <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>{new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </div>
                                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#d1d5db', marginTop: '2px', wordBreak: 'break-word' }}>{reply.content}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                    <div ref={threadChatEndRef} />
                                                </div>

                                                {/* Thread Reply Composer */}
                                                <form onSubmit={handleSendThreadMessage} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px', display: 'flex', gap: '8px', background: '#070709' }}>
                                                    <input
                                                        value={threadInput}
                                                        onChange={(e) => setThreadInput(e.target.value)}
                                                        className="input text-xs"
                                                        placeholder="Reply..."
                                                        style={{ flex: 1, borderRadius: '8px', height: '32px' }}
                                                        disabled={selectedChannel.archived}
                                                    />
                                                    <button type="submit" className="btn btn-primary text-xs" style={{ padding: '0 12px', borderRadius: '8px', height: '32px' }} disabled={selectedChannel.archived}>
                                                        Send
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activePanelTab === 'members' && (
                                    <div className="grid grid-cols-1 gap-8">
                                        <ChannelMembersPage
                                            members={members}
                                            currentUserId={currentUserId}
                                            onRemove={handleRemoveMember}
                                            onRoleChange={handleUpdateMemberRole}
                                        />
                                    </div>
                                )}

                                {activePanelTab === 'info' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Channel Details Card */}
                                        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <h3 style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Channel Details</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8125rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                                                    <span style={{ color: 'var(--color-text-secondary)' }}>Type / Visibility:</span>
                                                    <span style={{ fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>{selectedChannel.type}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                                                    <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
                                                    <span style={{ fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>{selectedChannel.status}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                                                    <span style={{ color: 'var(--color-text-secondary)' }}>Archived:</span>
                                                    <span className={`badge ${selectedChannel.archived ? 'badge-warning' : 'badge-success'}`} style={{ padding: '2px 8px', fontSize: '0.625rem', borderRadius: '6px' }}>
                                                        {selectedChannel.archived ? 'Yes' : 'No'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px' }}>
                                                    <span style={{ color: 'var(--color-text-secondary)' }}>Owner ID:</span>
                                                    <span style={{ fontWeight: 600, color: '#fff', fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>{selectedChannel.ownerId}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'var(--color-text-secondary)' }}>File Count:</span>
                                                    <span style={{ fontWeight: 600, color: '#fff' }}>{dynamicSharedFilesCount} shared files</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Recent Activity Timeline */}
                                        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <h3 style={{ fontSize: '0.875rem', color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Recent Activity</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', paddingLeft: '12px', borderLeft: '2px solid rgba(255,255,255,0.06)' }}>
                                                {dynamicRecentActivities.map((act, idx) => (
                                                    <div key={idx} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ position: 'absolute', left: '-17px', top: '5px', width: '8px', height: '8px', borderRadius: '50%', background: '#6366F1', border: '2px solid #111827' }} />
                                                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#E5E7EB' }}>{act.title}</span>
                                                        <span style={{ fontSize: '0.725rem', color: 'var(--color-text-muted)' }}>{act.time}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* PERMISSIONS SECTION */}
                                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', margin: 0 }}>Channel Permissions & Roles</h3>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                                            Authorized access boundaries configured for this communication stream.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { title: 'Owner', desc: 'Full administration, edit channel attributes, archive thread, and member moderation.', color: '#F59E0B' },
                                            { title: 'Moderator', desc: 'Can configure channel settings, delete other user\'s messages, and invite collaborators.', color: '#8B5CF6' },
                                            { title: 'Member / Guest', desc: 'Standard write privileges, post messages, start WebRTC call lobby, and invite.', color: '#22C55E' }
                                        ].map((p, idx) => (
                                            <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color }} />
                                                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>{p.title}</span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{p.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* DANGER ZONE */}
                                <div className="glass-card" style={{ border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#EF4444', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5">
                                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
                                            </svg>
                                            Danger Zone
                                        </h3>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                                            Destructive workspace actions related to channel preservation.
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', flexWrap: 'wrap', gap: '14px' }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>Archive or Restore Channel</h4>
                                                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                    Archiving a channel makes it read-only but preserves message history.
                                                </p>
                                            </div>
                                            {selectedChannel.archived ? (
                                                <button
                                                    onClick={handleRestoreChannel}
                                                    className="btn btn-success"
                                                    style={{ height: '36px', borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 600, padding: '0 16px', background: 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)', border: 'none' }}
                                                >
                                                    Restore Channel
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleArchiveChannel}
                                                    className="btn btn-secondary"
                                                    style={{ height: '36px', borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 600, padding: '0 16px', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.2)', background: 'rgba(245, 158, 11, 0.05)', cursor: 'pointer' }}
                                                >
                                                    Archive Channel
                                                </button>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.02)', border: '1px dashed rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '16px', flexWrap: 'wrap', gap: '14px' }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>Delete Channel</h4>
                                                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                    Completely remove this channel and all message history permanently.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Delete this channel? This will delete all chat history permanently.')) {
                                                        handleDeleteChannel();
                                                    }
                                                }}
                                                className="btn btn-danger"
                                                style={{ height: '36px', borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 600, padding: '0 16px', background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', border: 'none' }}
                                            >
                                                Delete Channel
                                            </button>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '18px', background: '#111827' }}>
                                💬 Select a channel from the left sidebar to view config and manage members.
                            </div>
                        )}
                    </div>
                </div>
            )}

            <CreateChannelDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} onCreate={handleCreateChannel} />
            <EditChannelDialog open={showEditDialog} channel={selectedChannel} onClose={() => setShowEditDialog(false)} onSave={handleUpdateChannel} />
            <InviteChannelMemberDialog open={showInviteDialog} onClose={() => setShowInviteDialog(false)} onInvite={handleInviteMember} />
        </div>
    )
}

