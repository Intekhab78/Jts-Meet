import React from 'react'
import { IconMessage, IconVideo } from '../../../components/common/Icons'
import { UserAvatar } from '../../../components/common/UserAvatar'
import { UserPresenceBadge, PresenceStatus } from '../../../components/common/UserPresenceBadge'
import { ChatContact } from '../chat.types'
import { getResolvedPresence } from '../chat.helpers'

interface DirectChatAboutTabProps {
    activeContact: ChatContact
    presences: Record<string, { status: PresenceStatus; customStatus?: string }>
    onSwitchToChat: () => void
    onStartInstantCall: () => void
}

export function DirectChatAboutTab({
    activeContact,
    presences,
    onSwitchToChat,
    onStartInstantCall
}: DirectChatAboutTabProps) {
    const presence = getResolvedPresence(presences, activeContact._id, activeContact.status, activeContact.customStatus)

    return (
        <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
            <div style={{
                maxWidth: 520,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: 24
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                    <UserAvatar
                        src={activeContact.profileImage}
                        name={activeContact.fullName}
                        size={64}
                        fontSize="1.5rem"
                        presence={presence.status}
                        customPresenceStatus={presence.customStatus}
                    />
                    <div>
                        <h3 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                            {activeContact.fullName}
                        </h3>
                        <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                            {activeContact.email}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                            <UserPresenceBadge status={presence.status} size="xs" showLabel />
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <button
                        type="button"
                        onClick={onSwitchToChat}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: 8,
                            background: '#6264a7',
                            border: 'none',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.78125rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6
                        }}
                    >
                        <IconMessage size={14} />
                        <span>Send Message</span>
                    </button>
                    <button
                        type="button"
                        onClick={onStartInstantCall}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: 8,
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: 'none',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.78125rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6
                        }}
                    >
                        <IconVideo size={14} />
                        <span>Start Video Call</span>
                    </button>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 16 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                        Colleague Information
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 12px', fontSize: '0.8125rem' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Status Message:</span>
                        <span style={{ color: '#fff' }}>{presence.customStatus || 'Available'}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>Organization:</span>
                        <span style={{ color: '#fff' }}>JTS Enterprise Workspace</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>Communication:</span>
                        <span style={{ color: '#fff' }}>Direct Messages & Audio/Video Meeting</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
