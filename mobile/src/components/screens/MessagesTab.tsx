import React, { useState } from 'react';

export const MessagesTab: React.FC = () => {
  const [search, setSearch] = useState('');

  const chatChannels = [
    { id: 'general', name: 'General Discussions', lastMsg: 'See you all in the all-hands meeting!', time: '12:45 PM', unread: 2 },
    { id: 'dev-team', name: 'Engineering Team', lastMsg: 'Mobile WebRTC layout is working perfectly.', time: '11:15 AM', unread: 0 },
    { id: 'design', name: 'Design & UX', lastMsg: 'New mobile icons updated.', time: 'Yesterday', unread: 0 },
  ];

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        backgroundColor: '#ffffff',
      }}
    >
      {/* Search Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: 10,
          padding: '0 10px',
          height: 38,
        }}
      >
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search chats and contacts"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#0f172a',
            fontSize: '0.82rem',
          }}
        />
      </div>

      {/* Chat list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {chatChannels.map((chat) => (
          <div
            key={chat.id}
            className="card-pressable"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 12,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              #
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0f172a' }}>
                  {chat.name}
                </span>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  {chat.time}
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {chat.lastMsg}
              </span>
            </div>
            {chat.unread > 0 && (
              <span
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {chat.unread}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
export default MessagesTab;
