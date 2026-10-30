import React from 'react';
import { ChatMessage } from '../types';

export interface ChatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  chatMessages: ChatMessage[];
  msgInput: string;
  setMsgInput: (val: string) => void;
  onSendChat: (e: React.FormEvent) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatSheet: React.FC<ChatSheetProps> = ({
  isOpen,
  onClose,
  chatMessages,
  msgInput,
  setMsgInput,
  onSendChat,
  chatEndRef,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        className="anim-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          height: '75%',
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            In-Call Chat
          </span>
          <button
            onClick={onClose}
            style={{ padding: 6, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {chatMessages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
              No messages yet. Say hello!
            </div>
          ) : (
            chatMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
                  <span style={{ fontWeight: 700 }}>{msg.sender}</span>
                  <span>{msg.time}</span>
                </div>
                <div style={{ padding: '8px 12px', borderRadius: 10, backgroundColor: '#f1f5f9', color: '#0f172a', fontSize: '0.82rem' }}>
                  {msg.text}
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={onSendChat} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Send a message..."
            value={msgInput}
            onChange={(e) => setMsgInput(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 10,
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              outline: 'none',
              fontSize: '0.85rem',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0 14px',
              borderRadius: 10,
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.82rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatSheet;
