import React from 'react'

const ROLE_PERMISSIONS = [
    {
        title: 'Channel Owner',
        desc: 'Full administration, edit channel properties, archive, purge messages, and member moderation.',
        color: '#F59E0B'
    },
    {
        title: 'Moderator',
        desc: 'Can manage channel settings, invite teammates, pin messages, and manage files.',
        color: '#8B5CF6'
    },
    {
        title: 'Member / Collaborator',
        desc: 'Full chat stream participation, live meeting join, file uploads, and reactions.',
        color: '#22C55E'
    }
]

export function ChannelPermissionsTab() {
    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                {ROLE_PERMISSIONS.map((p, idx) => (
                    <div
                        key={idx}
                        style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: 10,
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color }} />
                            <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#fff' }}>{p.title}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.725rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                            {p.desc}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}
