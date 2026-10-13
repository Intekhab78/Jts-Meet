import React from 'react'
import { IconMessage, IconX } from '../../../components/common/Icons'

export interface ChannelIncomingNotification {
    id: string
    senderName: string
    senderAvatar?: string
    channelName: string
    channelId: string
    content: string
    time: string
}

interface ChannelNotificationToastProps {
    notification: ChannelIncomingNotification | null
    onClick: () => void
    onDismiss: () => void
}

export const ChannelNotificationToast: React.FC<ChannelNotificationToastProps> = ({
    notification,
    onClick,
    onDismiss
}) => {
    if (!notification) return null

    return (
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
            onClick={onClick}
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
                        #{notification.channelName}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
                        {notification.time}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onDismiss()
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
                {notification.senderAvatar ? (
                    <img
                        src={notification.senderAvatar}
                        alt={notification.senderName}
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
                        {notification.senderName.charAt(0).toUpperCase()}
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
                        {notification.senderName}
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
                        {notification.content}
                    </div>
                </div>
            </div>
        </div>
    )
}
