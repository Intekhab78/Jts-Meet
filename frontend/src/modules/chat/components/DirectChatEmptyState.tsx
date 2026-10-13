import React from 'react'
import { IconMessage, IconPlus } from '../../../components/common/Icons'

interface DirectChatEmptyStateProps {
    isSidebarCollapsed: boolean
    onToggleSidebarCollapse: () => void
    onStartNewChat: () => void
}

export function DirectChatEmptyState({
    isSidebarCollapsed,
    onToggleSidebarCollapse,
    onStartNewChat
}: DirectChatEmptyStateProps) {
    return (
        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', maxWidth: 400, padding: 24 }}>
            <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(98, 100, 167, 0.15)',
                border: '1px solid rgba(98, 100, 167, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: '#a6a8f8'
            }}>
                <IconMessage size={30} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}>
                JTS Meet Chat
            </h3>
            <p style={{ fontSize: '0.8125rem', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                Select an existing chat from the left or click below to start a new chat with any team member.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {isSidebarCollapsed && (
                    <button
                        type="button"
                        onClick={onToggleSidebarCollapse}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 16px',
                            borderRadius: 8,
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#c7c9ff',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            cursor: 'pointer'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="9" y1="3" x2="9" y2="21" />
                            <path d="m13 15 3-3-3-3" />
                        </svg>
                        <span>Show Chat List</span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={onStartNewChat}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 18px',
                        borderRadius: 8,
                        background: '#6264a7',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(98, 100, 167, 0.4)'
                    }}
                >
                    <IconPlus size={14} />
                    <span>Start New Chat</span>
                </button>
            </div>
        </div>
    )
}
