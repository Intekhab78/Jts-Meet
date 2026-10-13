import React, { useState, useMemo } from 'react'
import { IconMessage, IconSearch, IconX } from '../../../components/common/Icons'
import { UserAvatar } from '../../../components/common/UserAvatar'
import { ChatContact } from '../chat.types'
import { getResolvedPresence } from '../chat.helpers'
import { PresenceStatus } from '../../../components/common/UserPresenceBadge'

interface NewChatModalProps {
    isOpen: boolean
    onClose: () => void
    contacts: ChatContact[]
    presences: Record<string, { status: PresenceStatus; customStatus?: string }>
    onSelectContact: (contact: ChatContact) => void
}

export function NewChatModal({
    isOpen,
    onClose,
    contacts,
    presences,
    onSelectContact
}: NewChatModalProps) {
    const [search, setSearch] = useState('')

    const filteredContacts = useMemo(() => {
        if (!search.trim()) return contacts
        const q = search.toLowerCase()
        return contacts.filter(c => c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    }, [contacts, search])

    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
        }}>
            <div style={{
                width: '100%',
                maxWidth: 460,
                background: '#161922',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 14,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)'
            }}>
                {/* Modal Header */}
                <div style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            background: '#6264a7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff'
                        }}>
                            <IconMessage size={14} />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#fff' }}>New Chat</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                    >
                        <IconX size={16} />
                    </button>
                </div>

                {/* Search Input */}
                <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ position: 'relative' }}>
                        <IconSearch size={14} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 11 }} />
                        <input
                            type="text"
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Type a colleague's name or email..."
                            style={{
                                width: '100%',
                                paddingLeft: 34,
                                paddingRight: 12,
                                height: 36,
                                borderRadius: 8,
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                fontSize: '0.8125rem',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                </div>

                {/* Colleagues List */}
                <div style={{ maxHeight: 320, overflowY: 'auto', padding: '8px 12px' }}>
                    {filteredContacts.length === 0 ? (
                        <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                            No colleagues found matching "{search}"
                        </div>
                    ) : (
                        filteredContacts.map((c, idx) => {
                            const presence = getResolvedPresence(presences, c._id, c.status, c.customStatus)
                            return (
                                <div
                                    key={`modal_user_${c._id}_${idx}`}
                                    onClick={() => onSelectContact(c)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '10px 12px',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        marginBottom: 2,
                                        transition: 'background 0.15s ease'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(98, 100, 167, 0.2)' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                                >
                                    <UserAvatar
                                        src={c.profileImage}
                                        name={c.fullName}
                                        size={36}
                                        presence={presence.status}
                                        customPresenceStatus={presence.customStatus}
                                    />

                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>
                                            {c.fullName}
                                        </div>
                                        <div style={{ fontSize: '0.71875rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {presence.customStatus || c.email}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: 'none',
                                            color: '#c7c9ff',
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                            padding: '4px 10px',
                                            borderRadius: 6,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Chat
                                    </button>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
