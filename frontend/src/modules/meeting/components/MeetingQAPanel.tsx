import React, { useState, useEffect, useMemo } from 'react'
import { Socket } from 'socket.io-client'

export interface QAQuestion {
    id: string
    meetingId: string
    questionText: string
    authorId: string
    authorName: string
    upvotes: string[]
    isAnswered: boolean
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
    const [sortBy, setSortBy] = useState<'top' | 'recent'>('top')
    const [filter, setFilter] = useState<'all' | 'unanswered'>('all')

    useEffect(() => {
        if (!socket || !meetingId) return

        // Request question list
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

    const handleAskQuestion = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newQuestionText.trim() || !socket) return

        socket.emit('qa:ask', {
            meetingId,
            questionText: newQuestionText.trim(),
            authorName: currentUserName
        })
        setNewQuestionText('')
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

    const handleDelete = (questionId: string) => {
        if (!socket) return
        socket.emit('qa:delete', { meetingId, questionId })
    }

    const filteredAndSortedQuestions = useMemo(() => {
        let list = [...questions]
        if (filter === 'unanswered') {
            list = list.filter(q => !q.isAnswered)
        }

        if (sortBy === 'top') {
            list.sort((a, b) => b.upvotes.length - a.upvotes.length || b.createdAt - a.createdAt)
        } else {
            list.sort((a, b) => b.createdAt - a.createdAt)
        }
        return list
    }, [questions, sortBy, filter])

    return (
        <div className="flex flex-col h-full bg-[#1e2330] border-l border-white/10 text-white w-full max-w-sm sm:max-w-md shadow-2xl z-30">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-[#171b26]">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 font-bold">
                        ❓
                    </div>
                    <div>
                        <h2 className="font-semibold text-sm text-white flex items-center gap-1.5">
                            Q&amp;A
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
                                {questions.length}
                            </span>
                        </h2>
                        <p className="text-[11px] text-gray-400">Ask &amp; upvote questions in real time</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                    ✕
                </button>
            </div>

            {/* Filter & Sort Controls */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#171b26]/50 text-xs">
                <div className="flex items-center gap-1 bg-black/30 p-0.5 rounded-lg border border-white/5">
                    <button
                        type="button"
                        onClick={() => setSortBy('top')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                            sortBy === 'top'
                                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                                : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        <span>🔥</span>
                        <span>Top</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSortBy('recent')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                            sortBy === 'recent'
                                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                                : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        <span>🕒</span>
                        <span>Recent</span>
                    </button>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setFilter(f => (f === 'all' ? 'unanswered' : 'all'))}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                            filter === 'unanswered'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-medium'
                                : 'text-gray-400 border-white/10 hover:text-white'
                        }`}
                    >
                        {filter === 'unanswered' ? 'Unanswered only' : 'All questions'}
                    </button>
                </div>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
                {filteredAndSortedQuestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4 text-gray-400">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 text-xl">
                            💬
                        </div>
                        <p className="text-sm font-medium text-gray-300">No questions yet</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                            Be the first to ask a question for the presenter or audience!
                        </p>
                    </div>
                ) : (
                    filteredAndSortedQuestions.map(q => {
                        const hasUpvoted = q.upvotes.includes(currentUserId)
                        return (
                            <div
                                key={q.id}
                                className={`p-3.5 rounded-xl border transition-all ${
                                    q.isAnswered
                                        ? 'bg-emerald-500/5 border-emerald-500/20'
                                        : 'bg-[#262c3d]/70 hover:bg-[#262c3d] border-white/10'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2.5">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            <span className="text-xs font-semibold text-gray-200 truncate">
                                                {q.authorName}
                                            </span>
                                            {q.isAnswered && (
                                                <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                    <span>✅</span>
                                                    <span>Answered</span>
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-gray-100 whitespace-pre-wrap leading-relaxed">
                                            {q.questionText}
                                        </p>
                                    </div>

                                    {/* Upvote Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleUpvote(q.id)}
                                        className={`flex flex-col items-center justify-center min-w-[36px] px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                            hasUpvoted
                                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30'
                                                : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
                                        }`}
                                        title={hasUpvoted ? 'Remove upvote' : 'Upvote question'}
                                    >
                                        <span className={`text-sm mb-0.5 ${hasUpvoted ? 'scale-110' : ''}`}>👍</span>
                                        <span>{q.upvotes.length}</span>
                                    </button>
                                </div>

                                {/* Host Actions */}
                                {(isHost || q.authorId === currentUserId) && (
                                    <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-white/5">
                                        {isHost && (
                                            <button
                                                type="button"
                                                onClick={() => handleToggleAnswered(q.id, q.isAnswered)}
                                                className={`text-[11px] font-medium px-2 py-1 rounded-md transition-all ${
                                                    q.isAnswered
                                                        ? 'text-gray-400 hover:text-gray-200'
                                                        : 'text-emerald-400 hover:bg-emerald-500/10'
                                                }`}
                                            >
                                                {q.isAnswered ? 'Mark Unanswered' : 'Mark as Answered'}
                                            </button>
                                        )}

                                        {(isHost || q.authorId === currentUserId) && (
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(q.id)}
                                                className="text-gray-400 hover:text-red-400 p-1 rounded transition-all text-xs"
                                                title="Delete question"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleAskQuestion} className="p-3 border-t border-white/10 bg-[#171b26]">
                <div className="flex items-center gap-2 bg-[#262c3d] rounded-xl px-3 py-1.5 border border-white/10 focus-within:border-indigo-500/60 transition-all">
                    <input
                        type="text"
                        value={newQuestionText}
                        onChange={e => setNewQuestionText(e.target.value)}
                        placeholder="Ask a question..."
                        maxLength={300}
                        className="flex-1 bg-transparent text-xs text-white placeholder-gray-400 outline-none py-1.5"
                    />
                    <button
                        type="submit"
                        disabled={!newQuestionText.trim()}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500 transition-all text-xs font-semibold"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    )
}
