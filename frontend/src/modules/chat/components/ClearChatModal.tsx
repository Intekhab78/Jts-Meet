import React from 'react'
import { IconTrash } from '../../../components/common/Icons'

interface ClearChatModalProps {
    isOpen: boolean
    onClose: () => void
    contactName: string
    isClearingChat: boolean
    onClearChat: () => void
}

export function ClearChatModal({
    isOpen,
    onClose,
    contactName,
    isClearingChat,
    onClearChat
}: ClearChatModalProps) {
    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.15s ease'
        }}>
            <div style={{
                background: '#1a1d2d',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 12,
                width: 420,
                maxWidth: '90vw',
                padding: '22px 24px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ef4444'
                    }}>
                        <IconTrash size={18} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                        Clear Chat History?
                    </h3>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                    Are you sure you want to clear your chat with <strong style={{ color: '#fff' }}>{contactName}</strong>?
                    <br /><br />
                    <span style={{ color: '#cbd5e1' }}>
                        📌 <strong>Note:</strong> Messages will be cleared from <strong>your</strong> view only. The other member will still have the entire chat history intact.
                    </span>
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button
                        type="button"
                        disabled={isClearingChat}
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 6,
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#cbd5e1',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={isClearingChat}
                        onClick={onClearChat}
                        style={{
                            padding: '8px 18px',
                            borderRadius: 6,
                            background: '#dc2626',
                            border: 'none',
                            color: '#fff',
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            cursor: isClearingChat ? 'not-allowed' : 'pointer',
                            opacity: isClearingChat ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <IconTrash size={14} />
                        <span>{isClearingChat ? 'Clearing...' : 'Clear for Me'}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
