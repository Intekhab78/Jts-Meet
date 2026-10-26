interface MessagesTabProps {
  onStartMeeting?: (code: string) => void;
}

export const MessagesTab: React.FC<MessagesTabProps> = ({ onStartMeeting }) => {
  const [search, setSearch] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  const chatChannels = [
    { id: 'general', name: 'General Discussions', lastMsg: 'See you all in the all-hands meeting!', time: '12:45 PM', unread: 2, members: 18 },
    { id: 'dev-team', name: 'Engineering Team', lastMsg: 'Mobile WebRTC layout is working perfectly.', time: '11:15 AM', unread: 0, members: 8 },
    { id: 'design', name: 'Design & UX', lastMsg: 'New mobile icons and virtual backgrounds updated.', time: 'Yesterday', unread: 0, members: 5 },
    { id: 'product', name: 'Product Roadmap', lastMsg: 'Sprint 24 review meeting notes published.', time: '2 days ago', unread: 0, members: 12 },
  ];

  const filteredChannels = chatChannels.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMsg.toLowerCase().includes(search.toLowerCase())
  );

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
          placeholder="Search channels & team messages"
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
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Chat list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredChannels.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
            No channels found matching "{search}"
          </div>
        ) : (
          filteredChannels.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setSelectedChannel(selectedChannel === chat.id ? null : chat.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '12px 14px',
                borderRadius: 14,
                background: selectedChannel === chat.id ? '#eff6ff' : '#ffffff',
                border: selectedChannel === chat.id ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  #
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {chat.unread}
                  </span>
                )}
              </div>

              {/* Action buttons when expanded */}
              {selectedChannel === chat.id && (
                <div style={{ display: 'flex', gap: 8, marginTop: 4, paddingTop: 8, borderTop: '1px solid #bfdbfe' }}>
                  {onStartMeeting && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartMeeting(chat.id);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                      }}
                    >
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                      Start Channel Video Call
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = `https://meet.jtsmiddleeast.com/meet/${chat.id}`;
                      navigator.clipboard?.writeText(url);
                      alert(`Meeting Link for #${chat.name} copied to clipboard!`);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                    }}
                  >
                    Copy Link
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default MessagesTab;
