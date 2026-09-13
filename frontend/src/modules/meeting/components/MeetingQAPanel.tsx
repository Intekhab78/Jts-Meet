import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Socket } from 'socket.io-client'

export interface QAQuestion {
    id: string
    meetingId: string
    questionText: string
    authorId: string
    authorName: string
    isAnonymous?: boolean
    upvotes: string[]
    isAnswered: boolean
    isPinned?: boolean
    isLiveAnswering?: boolean
    answerText?: string
    answeredBy?: string
    answeredAt?: number
    createdAt: number
}

interface MeetingQAPanelProps {
    meetingId: string
    socket: Socket | null
    currentUserId: string
    currentUserName: string
    isHost: boolean
    onClose: () => void
}

export const MeetingQAPanel: React.FC<MeetingQAPanelProps> = ({
    meetingId,
    socket,
    currentUserId,
    currentUserName,
    isHost,
    onClose
}) => {
    const [questions, setQuestions] = useState<QAQuestion[]>([])
    const [newQuestionText, setNewQuestionText] = useState('')
    const [isAnonymous, setIsAnonymous] = useState(false)
    const [sortBy, setSortBy] = useState<'top' | 'recent'>('top')
    const [filter, setFilter] = useState<'all' | 'unanswered' | 'answered' | 'mine'>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [showSearch, setShowSearch] = useState(false)
    const [replyingToId, setReplyingToId] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const [showExportSuccess, setShowExportSuccess] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Socket Event Listeners
    useEffect(() => {
        if (!socket || !meetingId) return

        socket.emit('qa:get_all', { meetingId })

        const handleList = (list: QAQuestion[]) => {
            setQuestions(list || [])
        }

        const handleNewQuestion = (q: QAQuestion) => {
            setQuestions(prev => {
                if (prev.some(item => item.id === q.id)) return prev
                return [q, ...prev]
            })
        }

        const handleQuestionUpdated = (updated: QAQuestion) => {
            setQuestions(prev =>
                prev.map(q => (q.id === updated.id ? updated : q))
            )
        }

        const handleQuestionDeleted = ({ questionId }: { questionId: string }) => {
            setQuestions(prev => prev.filter(q => q.id !== questionId))
        }

        socket.on('qa:list', handleList)
        socket.on('qa:new_question', handleNewQuestion)
        socket.on('qa:question_updated', handleQuestionUpdated)
        socket.on('qa:question_deleted', handleQuestionDeleted)

        return () => {
            socket.off('qa:list', handleList)
            socket.off('qa:new_question', handleNewQuestion)
            socket.off('qa:question_updated', handleQuestionUpdated)
            socket.off('qa:question_deleted', handleQuestionDeleted)
        }
    }, [socket, meetingId])

    // Actions
    const handleAskQuestion = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!newQuestionText.trim() || !socket) return

        socket.emit('qa:ask', {
            meetingId,
            questionText: newQuestionText.trim(),
            authorName: currentUserName,
            isAnonymous
        })
        setNewQuestionText('')
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleAskQuestion()
        }
    }

    const handleUpvote = (questionId: string) => {
        if (!socket) return
        socket.emit('qa:upvote', { meetingId, questionId })
    }

    const handleToggleAnswered = (questionId: string, currentStatus: boolean) => {
        if (!socket || !isHost) return
        socket.emit('qa:mark_answered', {
            meetingId,
            questionId,
            isAnswered: !currentStatus
        })
    }

    const handleTogglePin = (questionId: string, currentPinned: boolean = false) => {
        if (!socket || !isHost) return
        socket.emit('qa:pin', {
            meetingId,
            questionId,
            isPinned: !currentPinned
        })
    }

    const handleToggleLiveAnswering = (questionId: string, currentLive: boolean = false) => {
        if (!socket || !isHost) return
        socket.emit('qa:live_answer', {
            meetingId,
            questionId,
            isLiveAnswering: !currentLive
        })
    }

    const handleSendReply = (questionId: string) => {
        if (!socket || !replyText.trim()) return
        socket.emit('qa:answer', {
            meetingId,
            questionId,
            answerText: replyText.trim(),
            answeredBy: currentUserName
        })
        setReplyText('')
        setReplyingToId(null)
    }

    const handleDelete = (questionId: string) => {
        if (!socket) return
        socket.emit('qa:delete', { meetingId, questionId })
    }

    const handleClearAll = () => {
        if (!socket || !isHost) return
        if (window.confirm('Are you sure you want to clear all questions in this session?')) {
            socket.emit('qa:clear_all', { meetingId })
        }
    }

    // Export Q&A to CSV
    const handleExportCSV = () => {
        if (questions.length === 0) return
        const header = ['ID', 'Author', 'Question', 'Upvotes', 'Status', 'Answer Text', 'Answered By', 'Created At']
        const rows = questions.map(q => [
            `"${q.id}"`,
            `"${q.isAnonymous ? 'Anonymous' : (q.authorName || 'Anonymous')}"`,
            `"${q.questionText.replace(/"/g, '""')}"`,
            q.upvotes.length,
            q.isAnswered ? 'Answered' : 'Unanswered',
            `"${(q.answerText || '').replace(/"/g, '""')}"`,
            `"${q.answeredBy || ''}"`,
            `"${new Date(q.createdAt).toLocaleString()}"`
        ])

        const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map(e => e.join(','))].join('\n')
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', `QnA_Session_${meetingId || 'room'}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        setShowExportSuccess(true)
        setTimeout(() => setShowExportSuccess(false), 2500)
    }

    // Relative Time Formatter
    const formatTimeAgo = (timestamp: number) => {
        const diff = Math.floor((Date.now() - timestamp) / 1000)
        if (diff < 30) return 'just now'
        if (diff < 60) return `${diff}s ago`
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        return `${Math.floor(diff / 3600)}h ago`
    }

    // Filter & Sort Logic
    const filteredAndSortedQuestions = useMemo(() => {
        let list = [...questions]

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            list = list.filter(q => 
                q.questionText.toLowerCase().includes(query) || 
                (!q.isAnonymous && q.authorName.toLowerCase().includes(query)) ||
                (q.answerText && q.answerText.toLowerCase().includes(query))
            )
        }

        if (filter === 'unanswered') {
            list = list.filter(q => !q.isAnswered)
        } else if (filter === 'answered') {
            list = list.filter(q => q.isAnswered)
        } else if (filter === 'mine') {
            list = list.filter(q => q.authorId === currentUserId)
        }

        list.sort((a, b) => {
            // Pinned questions always stay on top
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1

            // Currently live answering second
            if (a.isLiveAnswering && !b.isLiveAnswering) return -1
            if (!a.isLiveAnswering && b.isLiveAnswering) return 1

            if (sortBy === 'top') {
                return (b.upvotes?.length || 0) - (a.upvotes?.length || 0) || b.createdAt - a.createdAt
            }
            return b.createdAt - a.createdAt
        })

        return list
    }, [questions, sortBy, filter, searchQuery, currentUserId])

    const totalQuestions = questions.length
    const answeredCount = questions.filter(q => q.isAnswered).length
    const liveAnsweringQuestion = questions.find(q => q.isLiveAnswering)

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            background: '#0d1117',
            color: '#f8fafc',
            fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* ── Compact & Clean Header (52px) ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                height: 52,
                minHeight: 52,
                maxHeight: 52,
                background: 'rgba(22, 27, 34, 0.95)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                boxSizing: 'border-box'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)'
                    }}>
                        ❓
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
                            Q&amp;A
                        </span>
                        <span style={{
                            fontSize: '0.6875rem',
                            padding: '2px 8px',
                            borderRadius: 12,
                            background: 'rgba(99, 102, 241, 0.18)',
                            color: '#a5b4fc',
                            fontWeight: 700,
                            border: '1px solid rgba(99, 102, 241, 0.3)'
                        }}>
                            {totalQuestions}
                        </span>
                        {answeredCount > 0 && (
                            <span style={{
                                fontSize: '0.6875rem',
                                padding: '2px 7px',
                                borderRadius: 12,
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                fontWeight: 700,
                                border: '1px solid rgba(16, 185, 129, 0.25)'
                            }}>
                                ✓ {answeredCount}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                        type="button"
                        onClick={() => setShowSearch(prev => !prev)}
                        title="Search questions"
                        style={{
                            background: showSearch ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid ' + (showSearch ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.1)'),
                            color: showSearch ? '#818cf8' : '#94a3b8',
                            borderRadius: 7,
                            width: 28,
                            height: 28,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8125rem',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        🔍
                    </button>

                    {questions.length > 0 && (
                        <button
                            type="button"
                            onClick={handleExportCSV}
                            title="Export Q&A Report (.csv)"
                            style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#cbd5e1',
                                borderRadius: 7,
                                width: 28,
                                height: 28,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8125rem',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            📥
                        </button>
                    )}

                    {isHost && questions.length > 0 && (
                        <button
                            type="button"
                            onClick={handleClearAll}
                            title="Clear All Questions (Host Only)"
                            style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: '#f87171',
                                borderRadius: 7,
                                width: 28,
                                height: 28,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8125rem',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            🧹
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        title="Close Panel"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '1.1rem',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* ── Search Bar (Collapsible / Toggleable) ── */}
            {showSearch && (
                <div style={{
                    padding: '8px 14px',
                    background: '#161b22',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(0, 0, 0, 0.4)',
                        borderRadius: 8,
                        padding: '6px 10px',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        gap: 8
                    }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>🔍</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Filter questions..."
                            autoFocus
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#ffffff',
                                fontSize: '0.8125rem',
                                fontFamily: 'inherit'
                            }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Streamlined Filter & Sort Toolbar ── */}
            <div style={{
                padding: '8px 14px',
                background: '#161b22',
                borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'nowrap',
                overflowX: 'auto'
            }}>
                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {(['all', 'unanswered', 'answered', 'mine'] as const).map(f => {
                        const labels = { all: 'All', unanswered: 'Unanswered', answered: 'Answered', mine: 'Mine' }
                        const isActive = filter === f
                        return (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setFilter(f)}
                                style={{
                                    padding: '4px 9px',
                                    borderRadius: 6,
                                    fontSize: '0.6875rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    border: isActive ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                                    background: isActive ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                                    color: isActive ? '#ffffff' : '#94a3b8'
                                }}
                            >
                                {labels[f]}
                            </button>
                        )
                    })}
                </div>

                {/* Sort Toggle (Top / Recent) */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(0, 0, 0, 0.35)',
                    padding: 2,
                    borderRadius: 6,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    flexShrink: 0
                }}>
                    <button
                        type="button"
                        onClick={() => setSortBy('top')}
                        title="Sort by most upvotes"
                        style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            border: 'none',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: sortBy === 'top' ? '#6366f1' : 'transparent',
                            color: sortBy === 'top' ? '#ffffff' : '#94a3b8',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        🔥 Top
                    </button>
                    <button
                        type="button"
                        onClick={() => setSortBy('recent')}
                        title="Sort by latest"
                        style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            border: 'none',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: sortBy === 'recent' ? '#6366f1' : 'transparent',
                            color: sortBy === 'recent' ? '#ffffff' : '#94a3b8',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        ⏱️ Recent
                    </button>
                </div>
            </div>

            {/* ── Live On-Air Banner (When Host is answering live) ── */}
            {liveAnsweringQuestion && (
                <div style={{
                    padding: '8px 14px',
                    background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
                    borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 6px',
                            borderRadius: 10,
                            background: '#ef4444',
                            color: '#fff',
                            fontSize: '0.5625rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            flexShrink: 0
                        }}>
                            ● LIVE ANSWERING
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            "{liveAnsweringQuestion.questionText}"
                        </span>
                    </div>
                    {isHost && (
                        <button
                            type="button"
                            onClick={() => handleToggleLiveAnswering(liveAnsweringQuestion.id, true)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                border: 'none',
                                color: '#fff',
                                padding: '3px 8px',
                                borderRadius: 5,
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                flexShrink: 0
                            }}
                        >
                            Done ✓
                        </button>
                    )}
                </div>
            )}

            {/* ── Questions Scrollable Feed ── */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
            }}>
                {filteredAndSortedQuestions.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: '#94a3b8'
                    }}>
                        <div style={{
                            width: 52,
                            height: 52,
                            borderRadius: '50%',
                            background: 'rgba(99, 102, 241, 0.12)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            marginBottom: 12
                        }}>
                            💬
                        </div>
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px 0' }}>
                            {searchQuery ? 'No matching questions' : filter !== 'all' ? `No ${filter} questions` : 'No questions yet'}
                        </h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: 260, margin: 0, lineHeight: 1.5 }}>
                            {searchQuery 
                                ? 'Try searching for different keywords or clear your search.'
                                : 'Be the first to ask a question for the presenter or audience!'}
                        </p>
                    </div>
                ) : (
                    filteredAndSortedQuestions.map(q => {
                        const isUpvotedByMe = q.upvotes?.includes(currentUserId)
                        const upvoteCount = q.upvotes?.length || 0
                        const isReplying = replyingToId === q.id
                        const isMyQuestion = q.authorId === currentUserId

                        return (
                            <div
                                key={q.id}
                                style={{
                                    background: q.isPinned 
                                        ? 'rgba(99, 102, 241, 0.08)' 
                                        : q.isAnswered 
                                            ? 'rgba(16, 185, 129, 0.04)' 
                                            : 'rgba(255, 255, 255, 0.035)',
                                    border: q.isPinned
                                        ? '1px solid rgba(99, 102, 241, 0.35)'
                                        : q.isAnswered
                                            ? '1px solid rgba(16, 185, 129, 0.2)'
                                            : '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: 10,
                                    padding: '12px 14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {/* Badges Header */}
                                {(q.isPinned || q.isLiveAnswering || q.isAnswered) && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        {q.isPinned && (
                                            <span style={{
                                                fontSize: '0.625rem',
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                background: 'rgba(99, 102, 241, 0.2)',
                                                color: '#a5b4fc',
                                                fontWeight: 700,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 3
                                            }}>
                                                📌 Pinned
                                            </span>
                                        )}
                                        {q.isLiveAnswering && (
                                            <span style={{
                                                fontSize: '0.625rem',
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                background: 'rgba(239, 68, 68, 0.2)',
                                                color: '#f87171',
                                                fontWeight: 700,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 3
                                            }}>
                                                🎙️ Answering Live
                                            </span>
                                        )}
                                        {q.isAnswered && (
                                            <span style={{
                                                fontSize: '0.625rem',
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                background: 'rgba(16, 185, 129, 0.15)',
                                                color: '#34d399',
                                                fontWeight: 700,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 3
                                            }}>
                                                ✓ Answered
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Card Body: Left content + Right Upvote */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {/* Author info */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <div style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: '50%',
                                                background: q.isAnonymous ? '#475569' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                color: '#fff',
                                                fontSize: '0.625rem',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                {q.isAnonymous ? '🎭' : (q.authorName ? q.authorName[0].toUpperCase() : 'U')}
                                            </div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {q.isAnonymous ? 'Anonymous' : q.authorName}
                                                {isMyQuestion && <span style={{ color: '#818cf8', fontWeight: 700, marginLeft: 4 }}>(You)</span>}
                                            </span>
                                            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>•</span>
                                            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                                {formatTimeAgo(q.createdAt)}
                                            </span>
                                        </div>

                                        {/* Question text */}
                                        <div style={{
                                            fontSize: '0.875rem',
                                            lineHeight: 1.45,
                                            color: '#ffffff',
                                            wordBreak: 'break-word',
                                            fontWeight: 500
                                        }}>
                                            {q.questionText}
                                        </div>
                                    </div>

                                    {/* Upvote Pill Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleUpvote(q.id)}
                                        title={isUpvotedByMe ? 'Remove upvote' : 'Upvote question'}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '6px 10px',
                                            borderRadius: 8,
                                            border: isUpvotedByMe ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.12)',
                                            background: isUpvotedByMe ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                            color: isUpvotedByMe ? '#a5b4fc' : '#cbd5e1',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            minWidth: 40,
                                            flexShrink: 0
                                        }}
                                    >
                                        <span style={{ fontSize: '0.75rem', lineHeight: 1, fontWeight: 800 }}>▲</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: 2 }}>{upvoteCount}</span>
                                    </button>
                                </div>

                                {/* Answered message block (If answered in text) */}
                                {q.answerText && (
                                    <div style={{
                                        marginTop: 4,
                                        padding: '8px 10px',
                                        background: 'rgba(16, 185, 129, 0.08)',
                                        borderLeft: '3px solid #10b981',
                                        borderRadius: '0 8px 8px 0',
                                        fontSize: '0.78125rem',
                                        color: '#e2e8f0',
                                        lineHeight: 1.4
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, fontSize: '0.6875rem', color: '#34d399', fontWeight: 700 }}>
                                            <span>💬 Answered by {q.answeredBy || 'Host'}</span>
                                            {q.answeredAt && <span style={{ color: '#64748b' }}>• {formatTimeAgo(q.answeredAt)}</span>}
                                        </div>
                                        <div style={{ color: '#ffffff' }}>{q.answerText}</div>
                                    </div>
                                )}

                                {/* Action Toolbar (Host & Owner controls) */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 6, marginTop: 2 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {isHost && (
                                            <>
                                                {/* Pin Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleTogglePin(q.id, q.isPinned)}
                                                    title={q.isPinned ? 'Unpin' : 'Pin to top'}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: q.isPinned ? '#818cf8' : '#64748b',
                                                        fontSize: '0.6875rem',
                                                        fontWeight: 600,
                                                        padding: '3px 6px',
                                                        borderRadius: 4,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    📌 {q.isPinned ? 'Unpin' : 'Pin'}
                                                </button>

                                                {/* Answer Live Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleLiveAnswering(q.id, q.isLiveAnswering)}
                                                    title={q.isLiveAnswering ? 'Stop live answering' : 'Answer live verbally'}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: q.isLiveAnswering ? '#f87171' : '#64748b',
                                                        fontSize: '0.6875rem',
                                                        fontWeight: 600,
                                                        padding: '3px 6px',
                                                        borderRadius: 4,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    🎙️ {q.isLiveAnswering ? 'Stop Live' : 'Live'}
                                                </button>

                                                {/* Reply in Text */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (replyingToId === q.id) {
                                                            setReplyingToId(null)
                                                            setReplyText('')
                                                        } else {
                                                            setReplyingToId(q.id)
                                                            setReplyText(q.answerText || '')
                                                        }
                                                    }}
                                                    title="Reply with text"
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#64748b',
                                                        fontSize: '0.6875rem',
                                                        fontWeight: 600,
                                                        padding: '3px 6px',
                                                        borderRadius: 4,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    💬 Reply
                                                </button>

                                                {/* Mark Resolved Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleAnswered(q.id, q.isAnswered)}
                                                    title={q.isAnswered ? 'Mark as unanswered' : 'Mark as answered'}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: q.isAnswered ? '#34d399' : '#64748b',
                                                        fontSize: '0.6875rem',
                                                        fontWeight: 600,
                                                        padding: '3px 6px',
                                                        borderRadius: 4,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {q.isAnswered ? '✓ Resolved' : 'Mark Done'}
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* Delete Button (Host or Author) */}
                                    {(isHost || isMyQuestion) && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(q.id)}
                                            title="Delete question"
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#64748b',
                                                fontSize: '0.75rem',
                                                padding: '2px 4px',
                                                borderRadius: 4,
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>

                                {/* Host Inline Reply Composer */}
                                {isReplying && (
                                    <div style={{
                                        marginTop: 4,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6,
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        padding: 8,
                                        borderRadius: 8,
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}>
                                        <textarea
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            placeholder="Write verified answer..."
                                            rows={2}
                                            autoFocus
                                            style={{
                                                width: '100%',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                borderRadius: 6,
                                                padding: '6px 8px',
                                                color: '#ffffff',
                                                fontSize: '0.75rem',
                                                fontFamily: 'inherit',
                                                resize: 'none',
                                                outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReplyingToId(null)
                                                    setReplyText('')
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#94a3b8',
                                                    padding: '3px 8px',
                                                    borderRadius: 4,
                                                    fontSize: '0.6875rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSendReply(q.id)}
                                                disabled={!replyText.trim()}
                                                style={{
                                                    background: '#10b981',
                                                    border: 'none',
                                                    color: '#fff',
                                                    padding: '3px 10px',
                                                    borderRadius: 4,
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 700,
                                                    cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                                                    opacity: replyText.trim() ? 1 : 0.5
                                                }}
                                            >
                                                Post Answer
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {/* ── High-Contrast, Spacious Question Composer at Bottom ── */}
            <div style={{
                padding: '12px 14px',
                background: '#161b22',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                boxSizing: 'border-box'
            }}>
                <form onSubmit={handleAskQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Textarea Input Container */}
                    <div style={{
                        position: 'relative',
                        background: 'rgba(0, 0, 0, 0.45)',
                        border: '1.5px solid rgba(255, 255, 255, 0.18)',
                        borderRadius: 10,
                        padding: '8px 10px',
                        transition: 'border-color 0.2s ease',
                        boxSizing: 'border-box'
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)'}
                    >
                        <textarea
                            ref={textareaRef}
                            value={newQuestionText}
                            onChange={e => setNewQuestionText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a question for the session... (Press Enter to ask)"
                            maxLength={300}
                            rows={2}
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#ffffff',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                fontFamily: 'inherit',
                                resize: 'none',
                                display: 'block',
                                boxSizing: 'border-box',
                                lineHeight: 1.4
                            }}
                        />
                    </div>

                    {/* Bottom Controls Row: Anonymous Checkbox + Char count + Prominent Ask Button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: '0.75rem',
                            color: isAnonymous ? '#a5b4fc' : '#94a3b8',
                            cursor: 'pointer',
                            userSelect: 'none'
                        }}>
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={e => setIsAnonymous(e.target.checked)}
                                style={{ accentColor: '#6366f1', cursor: 'pointer', width: 14, height: 14 }}
                            />
                            <span>Ask anonymously 🎭</span>
                        </label>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '0.6875rem', color: newQuestionText.length > 250 ? '#f59e0b' : '#64748b' }}>
                                {newQuestionText.length}/300
                            </span>

                            <button
                                type="submit"
                                disabled={!newQuestionText.trim()}
                                style={{
                                    background: newQuestionText.trim() 
                                        ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' 
                                        : 'rgba(255, 255, 255, 0.08)',
                                    color: newQuestionText.trim() ? '#ffffff' : '#64748b',
                                    border: 'none',
                                    borderRadius: 8,
                                    padding: '7px 16px',
                                    fontSize: '0.8125rem',
                                    fontWeight: 700,
                                    cursor: newQuestionText.trim() ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.15s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    boxShadow: newQuestionText.trim() ? '0 2px 10px rgba(99, 102, 241, 0.4)' : 'none'
                                }}
                            >
                                <span>Ask</span>
                                <span>➔</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* ── Toast Notification for CSV Export ── */}
            {showExportSuccess && (
                <div style={{
                    position: 'absolute',
                    bottom: 80,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#10b981',
                    color: '#fff',
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    zIndex: 100
                }}>
                    <span>✓</span> Q&amp;A CSV Downloaded!
                </div>
            )}
        </div>
    )
}
