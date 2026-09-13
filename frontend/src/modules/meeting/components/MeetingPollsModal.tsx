import React, { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { SocketEvents } from '../services/socket.service'

interface PollOption {
    id: string
    text: string
    votes: string[]
}

interface Poll {
    id: string
    meetingId: string
    creatorId: string
    question: string
    options: PollOption[]
    active: boolean
    createdAt: Date
}

interface MeetingPollsModalProps {
    isOpen: boolean
    onClose: () => void
    meetingId: string
    currentUserId: string
    isHostOrCoHost: boolean
    socket: Socket | null
}

export function MeetingPollsModal({
    isOpen,
    onClose,
    meetingId,
    currentUserId,
    isHostOrCoHost,
    socket
}: MeetingPollsModalProps) {
    const [polls, setPolls] = useState<Poll[]>([])
    const [newQuestion, setNewQuestion] = useState('')
    const [options, setOptions] = useState(['', ''])
    const [isCreating, setIsCreating] = useState(false)

    useEffect(() => {
        if (!socket || !isOpen) return

        const handlePollUpdate = (payload: { meetingId: string; polls: Poll[] }) => {
            if (payload?.meetingId === meetingId && Array.isArray(payload?.polls)) {
                setPolls(payload.polls)
            }
        }

        socket.on(SocketEvents.POLL_UPDATE, handlePollUpdate)

        // Request all current polls from server for late-joiner sync
        socket.emit('poll:get_all', { meetingId })

        return () => {
            socket.off(SocketEvents.POLL_UPDATE, handlePollUpdate)
        }
    }, [socket, isOpen, meetingId])

    const handleAddOption = () => {
        if (options.length < 5) {
            setOptions([...options, ''])
        }
    }

    const handleOptionChange = (idx: number, val: string) => {
        const next = [...options]
        next[idx] = val
        setOptions(next)
    }

    const handleCreatePoll = (e: React.FormEvent) => {
        e.preventDefault()
        const cleanOptions = options.map(o => o.trim()).filter(Boolean)
        if (!newQuestion.trim() || cleanOptions.length < 2) return

        socket?.emit(SocketEvents.POLL_CREATE, {
            meetingId,
            question: newQuestion.trim(),
            options: cleanOptions
        })

        setNewQuestion('')
        setOptions(['', ''])
        setIsCreating(false)
    }

    const handleVote = (pollId: string, optionId: string) => {
        socket?.emit(SocketEvents.POLL_VOTE, {
            meetingId,
            pollId,
            optionId
        })
    }

    const handleClosePoll = (pollId: string) => {
        socket?.emit(SocketEvents.POLL_CLOSE, {
            meetingId,
            pollId
        })
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay">
            <div className="modal-container anim-scale-in" style={{ maxWidth: 520 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.25rem' }}>📊</span>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: '#fff' }}>Meeting Polls</h3>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ border: 'none', background: 'transparent', color: 'var(--color-text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}>
                        ✕
                    </button>
                </div>

                {/* Create poll toggle for host */}
                {isHostOrCoHost && (
                    <div>
                        {!isCreating ? (
                            <button onClick={() => setIsCreating(true)} className="btn btn-primary" style={{ width: '100%', padding: '10px' }}>
                                + Create New Poll
                            </button>
                        ) : (
                            <form onSubmit={handleCreatePoll} style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>Ask a Question</div>
                                <input
                                    type="text"
                                    required
                                    value={newQuestion}
                                    onChange={(e) => setNewQuestion(e.target.value)}
                                    placeholder="e.g. Do you agree with the Q3 release date?"
                                    className="input py-2 px-3 text-sm"
                                />

                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Options</div>
                                {options.map((opt, i) => (
                                    <input
                                        key={i}
                                        type="text"
                                        required
                                        value={opt}
                                        onChange={(e) => handleOptionChange(i, e.target.value)}
                                        placeholder={`Option ${i + 1}`}
                                        className="input py-1.5 px-3 text-sm"
                                    />
                                ))}

                                {options.length < 5 && (
                                    <button type="button" onClick={handleAddOption} className="btn btn-secondary text-xs" style={{ alignSelf: 'flex-start' }}>
                                        + Add Option
                                    </button>
                                )}

                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                                    <button type="button" onClick={() => setIsCreating(false)} className="btn btn-secondary text-xs">
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary text-xs">
                                        Launch Poll
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {/* Polls List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {polls.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                            No active polls launched yet.
                        </div>
                    ) : (
                        polls.map((p) => {
                            const totalVotes = p.options.reduce((acc, opt) => acc + opt.votes.length, 0)

                            return (
                                <div key={p.id} style={{ padding: 18, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>{p.question}</h4>
                                        <span style={{
                                            fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                                            background: p.active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                            color: p.active ? '#4ade80' : '#f87171'
                                        }}>
                                            {p.active ? 'Active' : 'Closed'}
                                        </span>
                                    </div>

                                    {/* Options & vote bars */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {p.options.map((opt) => {
                                            const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0
                                            const hasVoted = opt.votes.includes(currentUserId)

                                            return (
                                                <button
                                                    key={opt.id}
                                                    disabled={!p.active}
                                                    onClick={() => handleVote(p.id, opt.id)}
                                                    style={{
                                                        position: 'relative', border: hasVoted ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                                        background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)',
                                                        padding: '10px 14px', textAlign: 'left', cursor: p.active ? 'pointer' : 'default',
                                                        overflow: 'hidden', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                                    }}
                                                >
                                                    {/* Progress fill */}
                                                    <div style={{
                                                        position: 'absolute', inset: 0, width: `${pct}%`,
                                                        background: hasVoted ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)',
                                                        transition: 'width 0.3s ease', zIndex: 0
                                                    }} />

                                                    <span style={{ position: 'relative', zIndex: 1, fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>
                                                        {hasVoted && '✓ '} {opt.text}
                                                    </span>

                                                    <span style={{ position: 'relative', zIndex: 1, fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                                                        {pct}% ({opt.votes.length})
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Footer */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', paddingTop: 4 }}>
                                        <span>Total Votes: {totalVotes}</span>
                                        {isHostOrCoHost && p.active && (
                                            <button onClick={() => handleClosePoll(p.id)} className="btn-ghost text-xs" style={{ border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer', padding: 0 }}>
                                                End Poll
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
