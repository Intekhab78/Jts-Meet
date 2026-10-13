import React from 'react'
import { SupportedConnector } from '../../integrations.types'
import {
    IconX,
    IconRocket,
    IconFlag,
    IconVideo,
    IconUser
} from '../../../../components/common/Icons'

interface IntegrationsAddModalProps {
    showAddModal: boolean
    onClose: () => void
    modalType: SupportedConnector
    formName: string
    setFormName: (val: string) => void
    formUrl: string
    setFormUrl: (val: string) => void
    formSecret: string
    setFormSecret: (val: string) => void
    selectedEvents: string[]
    setSelectedEvents: React.Dispatch<React.SetStateAction<string[]>>
    handleCreate: (e: React.FormEvent) => Promise<void>
}

export const IntegrationsAddModal: React.FC<IntegrationsAddModalProps> = ({
    showAddModal,
    onClose,
    modalType,
    formName,
    setFormName,
    formUrl,
    setFormUrl,
    formSecret,
    setFormSecret,
    selectedEvents,
    setSelectedEvents,
    handleCreate
}) => {
    if (!showAddModal) return null

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 20,
                width: '100%',
                maxWidth: 540,
                color: '#fff',
                padding: 26,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                        Configure {
                            modalType === 'slack' ? 'Slack Incoming Webhook' :
                            modalType === 'teams' ? 'Microsoft Teams Webhook' :
                            modalType === 'discord' ? 'Discord Webhook' :
                            modalType === 'calendar' ? 'Google Calendar & Outlook Sync' :
                            modalType === 'googledrive' ? 'Google Drive Cloud Sync' :
                            modalType === 'email' ? 'Enterprise Email Alerts' :
                            modalType === 'zapier' ? 'Zapier / Make Automation' :
                            'Custom REST Webhook'
                        }
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        <IconX size={18} color="#94a3b8" />
                    </button>
                </div>

                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                            Endpoint Name:
                        </label>
                        <input
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="e.g. #engineering-alerts"
                            required
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px 14px',
                                borderRadius: 10,
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#fff',
                                fontSize: '0.88rem'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                            Webhook URL Endpoint:
                        </label>
                        <input
                            type="url"
                            value={formUrl}
                            onChange={(e) => setFormUrl(e.target.value)}
                            placeholder="https://..."
                            required
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px 14px',
                                borderRadius: 10,
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#fff',
                                fontSize: '0.88rem'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                            HMAC Secret Key (Optional for SHA256 Signature Verification):
                        </label>
                        <input
                            type="text"
                            value={formSecret}
                            onChange={(e) => setFormSecret(e.target.value)}
                            placeholder="Leave empty to auto-generate a secure 32-character key"
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px 14px',
                                borderRadius: 10,
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#fff',
                                fontSize: '0.88rem'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                            Trigger Events:
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                                { id: 'meeting.started', label: 'Meeting Started', Icon: IconRocket, color: '#818cf8' },
                                { id: 'meeting.ended', label: 'Meeting Ended', Icon: IconFlag, color: '#f87171' },
                                { id: 'recording.ready', label: 'Recording Ready', Icon: IconVideo, color: '#fbbf24' },
                                { id: 'participant.joined', label: 'Participant Joined', Icon: IconUser, color: '#34d399' }
                            ].map(item => {
                                const isChecked = selectedEvents.includes(item.id)
                                return (
                                    <label
                                        key={item.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            fontSize: '0.82rem',
                                            color: '#cbd5e1',
                                            cursor: 'pointer',
                                            padding: '8px 10px',
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            borderRadius: 8,
                                            border: '1px solid rgba(255, 255, 255, 0.06)'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedEvents([...selectedEvents, item.id])
                                                } else {
                                                    setSelectedEvents(selectedEvents.filter(x => x !== item.id))
                                                }
                                            }}
                                            style={{ accentColor: '#6366f1' }}
                                        />
                                        <item.Icon size={14} color={item.color} />
                                        <span>{item.label}</span>
                                    </label>
                                )
                            })}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 10,
                                color: '#cbd5e1',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                flex: 2,
                                padding: '12px',
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                border: 'none',
                                borderRadius: 10,
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
                            }}
                        >
                            Save & Activate Endpoint
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
