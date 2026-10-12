import React from 'react'

export interface PostMeetingCapsuleData {
    duration: string
    talkTime?: { [key: string]: number }
    notes: string
    title: string
}

export interface PostMeetingCapsuleModalProps {
    capsule: PostMeetingCapsuleData | null
    isOpen: boolean
    onClose: () => void
}

export function PostMeetingCapsuleModal({ capsule, isOpen, onClose }: PostMeetingCapsuleModalProps) {
    if (!isOpen || !capsule) return null

    const handleDownload = () => {
        const content = `# ${capsule.title}\nDuration: ${capsule.duration}\nDate: ${new Date().toLocaleString()}\n\n## Action Items & Notes\n${capsule.notes || 'None logged.'}\n`
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Meeting_Capsule_${Date.now()}.md`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 11000,
            background: 'rgba(10, 11, 16, 0.95)', backdropFilter: 'blur(16px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
            <div style={{
                background: '#13151c', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 20, width: '100%', maxWidth: 540, padding: 32,
                boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
                display: 'flex', flexDirection: 'column', gap: 20
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>📦</div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}>
                        Meeting Capsule
                    </h2>
                    <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                        Session completed • Duration: <span style={{ color: '#fff', fontWeight: 700 }}>{capsule.duration}</span>
                    </div>
                </div>

                {/* Meeting Highlights Summary Card */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12, padding: '16px 20px',
                    display: 'flex', flexDirection: 'column', gap: 10
                }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Session Notes & Action Items
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#cbd5e1', lineHeight: 1.5, maxHeight: 140, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                        {capsule.notes || 'No manual action items logged during this session.'}
                    </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <button
                        type="button"
                        onClick={handleDownload}
                        style={{
                            flex: 1, padding: '10px 16px', borderRadius: 10,
                            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer'
                        }}
                    >
                        💾 Download Capsule (.md)
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-primary"
                        style={{
                            flex: 1, padding: '10px 16px', borderRadius: 10,
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer'
                        }}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
