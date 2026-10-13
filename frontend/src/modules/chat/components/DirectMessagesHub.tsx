import React, { useState, useEffect, useRef, useMemo } from 'react'
import { API_BASE, normalizeMediaUrl } from '../../../config'
import { AsyncClipRecorderModal } from './AsyncClipRecorderModal'
import { DocumentPreviewModal, type PreviewDocument } from '../../../components/common/DocumentPreviewModal'
import { htmlToMarkdown } from '../../../utils/formatMessage'

// Unified Chat Types & Helpers
import {
    ChatContact,
    ChatMessage,
    RecentChat,
    DirectMessagesHubProps,
    SharedFileItem,
    HeaderTab,
    SidebarTab
} from '../chat.types'

// Custom Hooks
import { useDirectChatSocket } from '../hooks/useDirectChatSocket'
import { useDirectChatEditor } from '../hooks/useDirectChatEditor'
import { useDirectChatOps } from '../hooks/useDirectChatOps'

// Subcomponents
import { DirectChatSidebar } from './DirectChatSidebar'
import { DirectChatHeader } from './DirectChatHeader'
import { DirectChatMessageFeed } from './DirectChatMessageFeed'
import { DirectChatMessageComposer } from './DirectChatMessageComposer'
import { DirectChatThreadDrawer } from './DirectChatThreadDrawer'
import { DirectChatFilesTab } from './DirectChatFilesTab'
import { DirectChatAboutTab } from './DirectChatAboutTab'
import { DirectChatEmptyState } from './DirectChatEmptyState'
import { NewChatModal } from './NewChatModal'
import { ClearChatModal } from './ClearChatModal'

// Re-export types for backward compatibility
export type { ChatContact, ChatMessage, RecentChat, DirectMessagesHubProps }

export function DirectMessagesHub({
    token,
    currentUserId,
    currentUserName = 'You',
    userPlan = 'free',
    onStartCall,
    onStartMeeting
}: DirectMessagesHubProps) {
    const [recentChats, setRecentChats] = useState<RecentChat[]>([])
    const [contacts, setContacts] = useState<ChatContact[]>([])
    const [activeContact, setActiveContact] = useState<ChatContact | null>(null)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loadingChats, setLoadingChats] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>('recent')

    // Teams Top Header Tab: 'chat' | 'files' | 'about'
    const [headerTab, setHeaderTab] = useState<HeaderTab>('chat')
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)

    // New Chat Modal state
    const [showNewChatModal, setShowNewChatModal] = useState(false)

    // In-chat Search
    const [showChatSearch, setShowChatSearch] = useState(false)
    const [chatSearchQuery, setChatSearchQuery] = useState('')

    // Document / File Preview Modal
    const [previewFile, setPreviewFile] = useState<PreviewDocument | null>(null)

    // Pinned chats
    const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('jts_pinned_chats')
            return saved ? JSON.parse(saved) : []
        } catch {
            return []
        }
    })

    // Left Chat Sidebar Collapse Toggle
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem('jts_dm_sidebar_collapsed') === 'true'
        } catch (_) {
            return false
        }
    })

    const toggleSidebarCollapse = () => {
        setIsSidebarCollapsed(prev => {
            const next = !prev
            try {
                localStorage.setItem('jts_dm_sidebar_collapsed', String(next))
            } catch (_) {}
            return next
        })
    }

    // Zoom Clips & Thread State
    const [showClipModal, setShowClipModal] = useState(false)
    const [activeThreadParent, setActiveThreadParent] = useState<ChatMessage | null>(null)
    const [threadReplies, setThreadReplies] = useState<ChatMessage[]>([])
    const [threadInput, setThreadInput] = useState('')
    const [loadingThread, setLoadingThread] = useState(false)
    const [showClearChatModal, setShowClearChatModal] = useState(false)

    // DOM Refs
    const fileInputRef = useRef<HTMLInputElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const chatFeedRef = useRef<HTMLDivElement>(null)
    const threadEndRef = useRef<HTMLDivElement>(null)
    const contactsRef = useRef<ChatContact[]>(contacts)
    contactsRef.current = contacts

    // Save pinned chats to localStorage
    const togglePinChat = (contactId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setPinnedIds(prev => {
            const next = prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
            try {
                localStorage.setItem('jts_pinned_chats', JSON.stringify(next))
            } catch {}
            return next
        })
    }

    // Load recent chats
    const loadRecentChats = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/chat/recent`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const json = await res.json()
                const chatsList = Array.isArray(json.data?.chats)
                    ? json.data.chats
                    : Array.isArray(json.data)
                        ? json.data
                        : Array.isArray(json)
                            ? json
                            : []
                const uniqueMap = new Map<string, RecentChat>()
                for (const item of chatsList) {
                    if (!item) continue
                    const id = String(item.conversationWith || item.user?._id || '')
                    if (id && !uniqueMap.has(id)) {
                        uniqueMap.set(id, { ...item, conversationWith: id })
                    }
                }
                setRecentChats(Array.from(uniqueMap.values()))
            }
        } catch (err) {
            console.warn('[DM Hub] Failed to load recent chats:', err)
        } finally {
            setLoadingChats(false)
        }
    }

    // Load contacts list
    const loadContacts = async (query = '') => {
        try {
            const res = await fetch(`${API_BASE}/api/chat/contacts?search=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const json = await res.json()
                const data = json.data?.contacts || json.data || json
                if (Array.isArray(data)) {
                    const uniqueMap = new Map<string, ChatContact>()
                    for (const c of data) {
                        if (c && c._id && !uniqueMap.has(String(c._id))) {
                            uniqueMap.set(String(c._id), { ...c, _id: String(c._id) })
                        }
                    }
                    setContacts(Array.from(uniqueMap.values()))
                }
            }
        } catch (err) {
            console.warn('[DM Hub] Failed to load contacts:', err)
        }
    }

    const loadConversation = (contactId?: string) => {
        const targetId = contactId || activeContact?._id
        if (!targetId) return

        fetch(`${API_BASE}/api/chat/conversation?userId=${targetId}&limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(json => {
                const data = json.data?.messages || json.data || json
                if (Array.isArray(data)) {
                    const rev = [...data].reverse()
                    const uniqueMap = new Map<string, ChatMessage>()
                    for (const m of rev) {
                        if (m && m._id && !uniqueMap.has(m._id)) {
                            uniqueMap.set(m._id, m)
                        }
                    }
                    setMessages(Array.from(uniqueMap.values()))
                }
            })
            .catch(() => {})
    }

    // Real-time socket events hook
    const {
        socketRef,
        presences,
        typingUsers,
        emitTypingStart,
        emitTypingStop
    } = useDirectChatSocket({
        token,
        currentUserId,
        activeContact,
        setActiveContact,
        contactsRef,
        setMessages,
        setRecentChats,
        setThreadReplies,
        setActiveThreadParent,
        loadRecentChats
    })

    // Chat operations hook
    const ops = useDirectChatOps({
        token,
        currentUserId,
        activeContact,
        messages,
        setMessages,
        setRecentChats,
        loadRecentChats,
        loadConversation,
        socketRef,
        activeThreadParent,
        setThreadReplies,
        setActiveThreadParent,
        threadInput,
        setThreadInput,
        onStartCall,
        onStartMeeting
    })

    // Rich text editor hook
    const editor = useDirectChatEditor({
        onSendMessage: () => onSendMessageTrigger(),
        onTypingStart: emitTypingStart,
        onTypingStop: emitTypingStop
    })

    const onSendMessageTrigger = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!activeContact || ops.sendingMessage) return

        let rawContent = ''
        if (editor.composerEditorRef.current) {
            rawContent = htmlToMarkdown(editor.composerEditorRef.current.innerHTML)
        }

        if (!rawContent.trim()) return

        if (editor.isUrgentMessage) {
            rawContent = `[IMPORTANT] ${rawContent}`
        }

        editor.resetEditor()
        emitTypingStop()
        await ops.handleSendMessage(rawContent)
    }

    useEffect(() => {
        loadRecentChats()
        loadContacts()
    }, [token])

    // Filter contacts based on search query
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                loadContacts(searchQuery.trim())
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Load conversation when active contact changes
    useEffect(() => {
        if (!activeContact) {
            setMessages([])
            setHeaderTab('chat')
            return
        }

        let isMounted = true
        setLoadingMessages(true)

        fetch(`${API_BASE}/api/chat/conversation?userId=${activeContact._id}&limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(json => {
                if (!isMounted) return
                const data = json.data?.messages || json.data || json
                if (Array.isArray(data)) {
                    const rev = [...data].reverse()
                    const uniqueMap = new Map<string, ChatMessage>()
                    for (const m of rev) {
                        if (m && m._id && !uniqueMap.has(m._id)) {
                            uniqueMap.set(m._id, m)
                        }
                    }
                    const uniqueMsgs = Array.from(uniqueMap.values())
                    setMessages(uniqueMsgs)
                    if (uniqueMsgs.length > 0) {
                        const lastMsg = uniqueMsgs[uniqueMsgs.length - 1]
                        setRecentChats(prev => {
                            const targetId = String(activeContact._id)
                            const exists = prev.some(c => String(c.conversationWith) === targetId)
                            if (exists) return prev
                            return [{
                                conversationWith: targetId,
                                latestMessage: lastMsg,
                                user: activeContact
                            }, ...prev]
                        })
                    }
                }
                // Mark messages as seen
                fetch(`${API_BASE}/api/chat/seen`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ senderId: activeContact._id })
                }).catch(() => {})
            })
            .catch(err => {
                console.warn('[DM Hub] Failed to fetch conversation:', err)
            })
            .finally(() => {
                if (isMounted) setLoadingMessages(false)
            })

        return () => {
            isMounted = false
        }
    }, [activeContact, token])

    // Scroll chat to bottom
    useEffect(() => {
        if (messagesEndRef.current && headerTab === 'chat') {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, headerTab])

    // Scroll thread to bottom
    useEffect(() => {
        if (threadEndRef.current) {
            threadEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [threadReplies])

    // Load thread replies when activeThreadParent changes
    useEffect(() => {
        if (!activeThreadParent) {
            setThreadReplies([])
            return
        }

        let isMounted = true
        setLoadingThread(true)

        fetch(`${API_BASE}/api/chat/thread/${activeThreadParent._id}?limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(json => {
                if (!isMounted) return
                const data = json.data?.messages || json.data || json
                if (Array.isArray(data)) {
                    setThreadReplies(data)
                }
            })
            .catch(err => {
                console.error('[DM Hub] Failed to load thread replies:', err)
            })
            .finally(() => {
                if (isMounted) setLoadingThread(false)
            })

        return () => {
            isMounted = false
        }
    }, [activeThreadParent?._id, token])

    // Parse files from messages for the "Files" tab
    const sharedFiles = useMemo(() => {
        const list: SharedFileItem[] = []
        const fileRegex = /\[File:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\]/g
        messages.forEach(msg => {
            let match
            while ((match = fileRegex.exec(msg.message)) !== null) {
                const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender
                const isMe = senderId === currentUserId
                list.push({
                    id: msg._id + '_' + match[1],
                    name: match[1],
                    url: normalizeMediaUrl(match[2]),
                    size: match[3],
                    senderName: isMe ? 'You' : (activeContact?.fullName || 'Colleague'),
                    isMe,
                    date: msg.createdAt
                })
            }
        })
        return list
    }, [messages, currentUserId, activeContact])

    // Filter messages for inline search
    const filteredMessages = useMemo(() => {
        if (!chatSearchQuery.trim()) return messages
        const q = chatSearchQuery.toLowerCase()
        return messages.filter(m => m.message.toLowerCase().includes(q))
    }, [messages, chatSearchQuery])

    // Partition recent chats into pinned vs unpinned
    const pinnedChats = recentChats.filter(c => pinnedIds.includes(c.conversationWith))
    const regularChats = recentChats.filter(c => !pinnedIds.includes(c.conversationWith))

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%', background: '#0a0b10', overflow: 'hidden', fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)' }}>
            {/* LEFT SIDEBAR: MS Teams Style */}
            <DirectChatSidebar
                isSidebarCollapsed={isSidebarCollapsed}
                toggleSidebarCollapse={toggleSidebarCollapse}
                sidebarTab={sidebarTab}
                setSidebarTab={setSidebarTab}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                recentChats={recentChats}
                pinnedChats={pinnedChats}
                regularChats={regularChats}
                contacts={contacts}
                activeContact={activeContact}
                currentUserId={currentUserId}
                presences={presences}
                pinnedIds={pinnedIds}
                onSelectContact={c => {
                    setActiveContact(c)
                    setSidebarTab('recent')
                }}
                onTogglePinChat={togglePinChat}
                onOpenNewChat={() => setShowNewChatModal(true)}
            />

            {/* MAIN STAGE: MS TEAMS CONVERSATION / FILES / ABOUT */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a0b10', minWidth: 0 }}>
                {activeContact ? (
                    <>
                        {/* MS TEAMS TOP HEADER */}
                        <DirectChatHeader
                            activeContact={activeContact}
                            isSidebarCollapsed={isSidebarCollapsed}
                            onToggleSidebarCollapse={toggleSidebarCollapse}
                            presences={presences}
                            headerTab={headerTab}
                            setHeaderTab={setHeaderTab}
                            sharedFilesCount={sharedFiles.length}
                            showChatSearch={showChatSearch}
                            setShowChatSearch={setShowChatSearch}
                            chatSearchQuery={chatSearchQuery}
                            setChatSearchQuery={setChatSearchQuery}
                            matchedMessagesCount={filteredMessages.length}
                            onStartVoiceCall={ops.handleStartVoiceCall}
                            onStartInstantCall={ops.handleStartInstantCall}
                            onStartScreenShareCall={ops.handleStartScreenShareCall}
                            onOpenNewChat={() => setShowNewChatModal(true)}
                            onOpenClearChat={() => setShowClearChatModal(true)}
                        />

                        {/* TAB VIEW 1: CHAT FEED + COMPOSER */}
                        {headerTab === 'chat' && (
                            <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                                    <DirectChatMessageFeed
                                        messages={filteredMessages}
                                        loadingMessages={loadingMessages}
                                        currentUserId={currentUserId}
                                        activeContact={activeContact}
                                        typingUsers={typingUsers}
                                        hoveredMessageId={hoveredMessageId}
                                        setHoveredMessageId={setHoveredMessageId}
                                        chatFeedRef={chatFeedRef}
                                        messagesEndRef={messagesEndRef}
                                        onToggleReaction={ops.handleToggleReaction}
                                        onReplyInThread={setActiveThreadParent}
                                        onDeleteMessage={ops.handleDeleteMessage}
                                        onUndoDeleteMessage={ops.handleUndoDeleteMessage}
                                        onPreviewFile={setPreviewFile}
                                    />

                                    <DirectChatMessageComposer
                                        activeContact={activeContact}
                                        composerEditorRef={editor.composerEditorRef}
                                        isFormatBarOpen={editor.isFormatBarOpen}
                                        setIsFormatBarOpen={editor.setIsFormatBarOpen}
                                        activeFormats={editor.activeFormats}
                                        toggleBold={editor.toggleBold}
                                        toggleItalic={editor.toggleItalic}
                                        toggleInlineCode={editor.toggleInlineCode}
                                        toggleList={editor.toggleList}
                                        toggleQuote={editor.toggleQuote}
                                        isUrgentMessage={editor.isUrgentMessage}
                                        setIsUrgentMessage={editor.setIsUrgentMessage}
                                        isEditorEmpty={editor.isEditorEmpty}
                                        showEmojiPicker={editor.showEmojiPicker}
                                        setShowEmojiPicker={editor.setShowEmojiPicker}
                                        handleInsertEmoji={editor.handleInsertEmoji}
                                        onTriggerFileUpload={() => fileInputRef.current?.click()}
                                        isUploadingFile={ops.isUploadingFile}
                                        onOpenClipModal={() => setShowClipModal(true)}
                                        sendingMessage={ops.sendingMessage}
                                        handleSendMessage={onSendMessageTrigger}
                                        handleEditorInput={editor.handleEditorInput}
                                        handleEditorKeyDown={editor.handleEditorKeyDown}
                                        updateActiveFormats={editor.updateActiveFormats}
                                    />
                                </div>

                                {/* DEDICATED THREAD SLIDE-IN PANEL */}
                                {activeThreadParent && (
                                    <DirectChatThreadDrawer
                                        activeThreadParent={activeThreadParent}
                                        threadReplies={threadReplies}
                                        threadInput={threadInput}
                                        loadingThread={loadingThread}
                                        sendingThreadReply={ops.sendingThreadReply}
                                        currentUserId={currentUserId}
                                        threadEndRef={threadEndRef}
                                        onClose={() => setActiveThreadParent(null)}
                                        onChangeThreadInput={setThreadInput}
                                        onSendThreadReply={ops.handleSendThreadReply}
                                        onDeleteMessage={ops.handleDeleteMessage}
                                        onUndoDeleteMessage={ops.handleUndoDeleteMessage}
                                    />
                                )}
                            </div>
                        )}

                        {/* TAB VIEW 2: SHARED FILES REPOSITORY */}
                        {headerTab === 'files' && (
                            <DirectChatFilesTab
                                sharedFiles={sharedFiles}
                                isUploadingFile={ops.isUploadingFile}
                                onTriggerFileUpload={() => fileInputRef.current?.click()}
                                onPreviewFile={setPreviewFile}
                            />
                        )}

                        {/* TAB VIEW 3: ABOUT / PROFILE CARD */}
                        {headerTab === 'about' && (
                            <DirectChatAboutTab
                                activeContact={activeContact}
                                presences={presences}
                                onSwitchToChat={() => setHeaderTab('chat')}
                                onStartInstantCall={ops.handleStartInstantCall}
                            />
                        )}
                    </>
                ) : (
                    <DirectChatEmptyState
                        isSidebarCollapsed={isSidebarCollapsed}
                        onToggleSidebarCollapse={toggleSidebarCollapse}
                        onStartNewChat={() => setShowNewChatModal(true)}
                    />
                )}
            </div>

            {/* POPUP MODAL: NEW CHAT / USER PICKER */}
            <NewChatModal
                isOpen={showNewChatModal}
                onClose={() => setShowNewChatModal(false)}
                contacts={contacts}
                presences={presences}
                onSelectContact={c => {
                    setActiveContact(c)
                    setShowNewChatModal(false)
                    setSidebarTab('recent')
                    setTimeout(() => editor.composerEditorRef.current?.focus(), 100)
                }}
            />

            {/* Global hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) ops.handleFileUpload(f)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                style={{ display: 'none' }}
            />

            {/* Zoom Clips Async Video Recorder Modal */}
            <AsyncClipRecorderModal
                isOpen={showClipModal}
                onClose={() => setShowClipModal(false)}
                token={token}
                userPlan={userPlan}
                recipientId={activeContact?._id}
                onClipUploaded={ops.handleClipUploaded}
            />

            {/* Document / File Preview Modal */}
            <DocumentPreviewModal
                isOpen={Boolean(previewFile)}
                onClose={() => setPreviewFile(null)}
                file={previewFile}
            />

            {/* Clear Chat Confirmation Modal */}
            {activeContact && (
                <ClearChatModal
                    isOpen={showClearChatModal}
                    onClose={() => setShowClearChatModal(false)}
                    contactName={activeContact.fullName}
                    isClearingChat={ops.isClearingChat}
                    onClearChat={async () => {
                        await ops.handleClearChat()
                        setShowClearChatModal(false)
                    }}
                />
            )}
        </div>
    )
}
