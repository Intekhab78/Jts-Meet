import React from 'react'
import { IconMic } from '../../../components/common/Icons'

interface ChannelHuddleDockProps {
    isHuddleActive: boolean
    isHuddleCollapsed: boolean
    channelName: string
    isHuddleMuted: boolean
    ambientAudioMode: 'off' | 'lofi' | 'rain'
    onToggleMute: () => void
    onToggleCollapse: (collapsed: boolean) => void
    onCycleAmbient: () => void
    onLeaveHuddle: () => void
}

export const ChannelHuddleDock: React.FC<ChannelHuddleDockProps> = ({
    isHuddleActive,
    isHuddleCollapsed,
    channelName,
    isHuddleMuted,
    ambientAudioMode,
    onToggleMute,
    onToggleCollapse,
    onCycleAmbient,
    onLeaveHuddle
}) => {
    if (!isHuddleActive) return null

    if (isHuddleCollapsed) {
        return (
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
                    onClick={onToggleMute}
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
                    onClick={() => onToggleCollapse(false)}
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
                    onClick={onLeaveHuddle}
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
        )
    }

    return (
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
                        #{channelName} Huddle
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#c084fc', background: 'rgba(168, 85, 247, 0.18)', padding: '1px 6px', borderRadius: 9999 }}>
                        Live Audio
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => onToggleCollapse(true)}
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
                    onClick={onToggleMute}
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
                    onClick={onCycleAmbient}
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
                    onClick={onLeaveHuddle}
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
}
