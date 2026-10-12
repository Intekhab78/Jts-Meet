import React from 'react'
import { IconX } from '../../../components/common/Icons'

export interface TalkTimeAnalyticsModalProps {
    isOpen: boolean
    onClose: () => void
    talkTimeMap: Record<string, number>
    myDisplayName: string
    getUserDisplayName: (userId: string) => string
}

export function TalkTimeAnalyticsModal({
    isOpen,
    onClose,
    talkTimeMap,
    myDisplayName,
    getUserDisplayName
}: TalkTimeAnalyticsModalProps) {
    if (!isOpen) return null

    const totalSeconds = Object.values(talkTimeMap).reduce((a, b) => a + b, 0) || 1
    const entries = Object.entries(talkTimeMap)

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
            <div style={{
                background: '#13151c', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16, width: '100%', maxWidth: 500, padding: 24,
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.2rem' }}>📊</span>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>Meeting Analytics</span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                        <IconX size={16} />
                    </button>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 16 }}>
                    Live breakdown of participant talk-time distribution and collaborative engagement:
                </div>

                {/* Talk Time Leaderboard */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {entries.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                            No speaking activity recorded yet. Start talking to see live talk-time stats!
                        </div>
                    ) : (
                        entries.map(([speaker, secs]) => {
                            const pct = Math.round((secs / totalSeconds) * 100)
                            const name = speaker === 'me' ? `${myDisplayName} (You)` : getUserDisplayName(speaker)
                            return (
                                <div key={speaker} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                        <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{name}</span>
                                        <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{secs}s ({pct}%)</span>
                                    </div>
                                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${pct}%`,
                                            height: '100%',
                                            background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                                            borderRadius: 3,
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        className="btn btn-primary"
                        style={{ padding: '6px 16px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600 }}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
