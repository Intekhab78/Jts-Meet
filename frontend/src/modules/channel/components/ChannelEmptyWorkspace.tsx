import React from 'react'
import { IconHash } from '../../../components/common/Icons'

interface ChannelEmptyWorkspaceProps {
    isChannelListCollapsed: boolean
    onToggleCollapse: () => void
    onCreateChannelClick: () => void
}

export const ChannelEmptyWorkspace: React.FC<ChannelEmptyWorkspaceProps> = ({
    isChannelListCollapsed,
    onToggleCollapse,
    onCreateChannelClick
}) => {
    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            {isChannelListCollapsed && (
                <div style={{
                    padding: '12px 18px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: 7,
                            background: 'rgba(99, 102, 241, 0.18)',
                            border: '1px solid rgba(99, 102, 241, 0.4)',
                            color: '#818cf8',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                        title="Show channels list"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="9" y1="3" x2="9" y2="21" />
                            <path d="m13 15 3-3-3-3" />
                        </svg>
                        <span>Show Channels</span>
                    </button>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                        Channels list collapsed
                    </span>
                </div>
            )}
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)', maxWidth: 440, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#818cf8'
                }}>
                    <IconHash size={26} />
                </div>
                <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: '0 0 6px 0' }}>
                        Channel Workspace
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                        {isChannelListCollapsed
                            ? 'Channels sidebar is collapsed. Click below to expand your team channels list.'
                            : 'Select a channel from the left sidebar or create a new one to start collaborating.'}
                    </p>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    {isChannelListCollapsed && (
                        <button
                            type="button"
                            onClick={onToggleCollapse}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 7,
                                padding: '8px 16px',
                                borderRadius: 8,
                                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                                border: 'none',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                            }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="9" y1="3" x2="9" y2="21" />
                                <path d="m13 15 3-3-3-3" />
                            </svg>
                            <span>Show Channels List</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onCreateChannelClick}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 16px',
                            borderRadius: 8,
                            background: isChannelListCollapsed ? 'rgba(255, 255, 255, 0.08)' : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                            border: isChannelListCollapsed ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            cursor: 'pointer'
                        }}
                    >
                        <span>+</span>
                        <span>Create New Channel</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
