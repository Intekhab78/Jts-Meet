import React, { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

interface JoinMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (meetingId: string, displayName: string, audioOff: boolean, videoOff: boolean) => void;
  defaultName?: string;
}

export const JoinMeetingModal: React.FC<JoinMeetingModalProps> = ({
  isOpen,
  onClose,
  onJoin,
  defaultName = '',
}) => {
  const [meetingId, setMeetingId] = useState('');
  const [name, setName] = useState(() => {
    return defaultName || localStorage.getItem('jts_display_name') || localStorage.getItem('jts_user_name') || '';
  });
  const [audioOff, setAudioOff] = useState(() => localStorage.getItem('jts_pref_mute_join') === 'true');
  const [videoOff, setVideoOff] = useState(() => localStorage.getItem('jts_pref_video_off_join') === 'true');

  useEffect(() => {
    if (!isOpen) return;
    let handle: any = null;
    try {
      CapacitorApp.addListener('backButton', () => {
        onClose();
      }).then((h) => {
        handle = h;
      });
    } catch (_) {}
    return () => {
      handle?.remove?.();
    };
  }, [isOpen, onClose]);

  // Sync if defaultName or stored name becomes available
  useEffect(() => {
    if (defaultName) {
      setName(defaultName);
    } else {
      const stored = localStorage.getItem('jts_display_name') || localStorage.getItem('jts_user_name') || '';
      if (stored) setName(stored);
    }
    if (isOpen) {
      setAudioOff(localStorage.getItem('jts_pref_mute_join') === 'true');
      setVideoOff(localStorage.getItem('jts_pref_video_off_join') === 'true');
    }
  }, [defaultName, isOpen]);

  if (!isOpen) return null;

  const cleanMeetingId = (input: string) => {
    let clean = input.trim();
    if (clean.includes('?id=')) {
      clean = clean.split('?id=')[1].split('&')[0];
    } else if (clean.includes('/meet/')) {
      clean = clean.split('/meet/')[1].split('?')[0].split('#')[0];
    } else if (clean.includes('/')) {
      clean = clean.substring(clean.lastIndexOf('/') + 1).split('?')[0].split('#')[0];
    }
    return clean.replace(/[^a-zA-Z0-9_-]/g, '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = cleanMeetingId(meetingId);
    if (!cleanId) return;
    const finalName = name.trim() || defaultName || localStorage.getItem('jts_display_name') || 'Participant';
    localStorage.setItem('jts_display_name', finalName);
    onJoin(cleanId, finalName, audioOff, videoOff);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        className="anim-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderTop: '1px solid #e2e8f0',
          padding: '16px 18px calc(var(--safe-bottom) + 16px) 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1', margin: '0 auto' }} />

        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              Join a Meeting
            </span>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
              Enter the meeting ID or link provided by the host
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, color: '#64748b', fontSize: '1rem' }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Meeting ID */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>
              Meeting ID or Link
            </label>
            <input
              type="text"
              placeholder="e.g. 123-456-789 or meet-xyz"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              required
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                padding: '10px 12px',
                color: '#0f172a',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Display Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>
              Your Name
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) {
                  localStorage.setItem('jts_display_name', e.target.value.trim());
                }
              }}
              required
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                padding: '10px 12px',
                color: '#0f172a',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Join Options */}
          <div style={{ background: '#f8fafc', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 500 }}>Don't connect to audio</span>
              <input type="checkbox" checked={audioOff} onChange={(e) => setAudioOff(e.target.checked)} style={{ width: 17, height: 17, accentColor: '#2563eb' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px' }}>
              <span style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 500 }}>Turn off my video</span>
              <input type="checkbox" checked={videoOff} onChange={(e) => setVideoOff(e.target.checked)} style={{ width: 17, height: 17, accentColor: '#2563eb' }} />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!meetingId.trim()}
            style={{
              padding: '12px',
              borderRadius: 12,
              background: meetingId.trim() ? '#2563eb' : '#e2e8f0',
              color: meetingId.trim() ? '#ffffff' : '#94a3b8',
              fontSize: '0.88rem',
              fontWeight: 800,
              marginTop: 4,
              boxShadow: meetingId.trim() ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
            }}
          >
            Join Meeting
          </button>
        </form>
      </div>
    </div>
  );
};
export default JoinMeetingModal;
