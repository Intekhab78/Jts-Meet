import React, { useState, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

interface NewMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (videoOn: boolean, usePmi: boolean, meetingCode?: string) => void;
  pmi?: string;
}

export const NewMeetingModal: React.FC<NewMeetingModalProps> = ({
  isOpen,
  onClose,
  onStart,
  pmi = '789-456-123',
}) => {
  const [tab, setTab] = useState<'instant' | 'share'>('instant');
  const [videoOn, setVideoOn] = useState(() => localStorage.getItem('jts_pref_video_off_join') !== 'true');
  const [usePmi, setUsePmi] = useState(false);
  const [createdCode, setCreatedCode] = useState<string>('');
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    if (isOpen) {
      setVideoOn(localStorage.getItem('jts_pref_video_off_join') !== 'true');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateLink = () => {
    const code = `meet-${Math.random().toString(36).substring(2, 8)}`;
    setCreatedCode(code);
    setTab('share');
  };

  const getMeetingUrl = () => {
    const code = createdCode || (usePmi ? pmi : 'quick-meet');
    return `https://meet.jtsmiddleeast.com/meet/${code}`;
  };

  const handleCopyLink = () => {
    const url = getMeetingUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleNativeShare = async () => {
    const url = getMeetingUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join JTS Meet',
          text: `Join my meeting on JTS Meet:\n${url}`,
          url: url,
        });
      } catch (e) {
        // user cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const url = getMeetingUrl();
    const text = encodeURIComponent(`Join my meeting on JTS Meet:\n${url}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
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
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Pull handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#cbd5e1', margin: '0 auto' }} />

        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              {tab === 'instant' ? 'Start a Meeting' : 'Meeting Link & Invite'}
            </span>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
              {tab === 'instant' ? 'Host an instant video meeting & invite others' : 'Share link with colleagues before starting'}
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, color: '#64748b', fontSize: '1rem' }}>
            ✕
          </button>
        </div>

        {tab === 'instant' ? (
          <>
            {/* Options container */}
            <div style={{ background: '#f8fafc', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 600 }}>Start with Video On</span>
                <input
                  type="checkbox"
                  checked={videoOn}
                  onChange={(e) => setVideoOn(e.target.checked)}
                  style={{ width: 17, height: 17, accentColor: '#2563eb' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 600 }}>Use Personal Meeting ID</span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{pmi}</span>
                </div>
                <input
                  type="checkbox"
                  checked={usePmi}
                  onChange={(e) => setUsePmi(e.target.checked)}
                  style={{ width: 17, height: 17, accentColor: '#2563eb' }}
                />
              </div>
            </div>

            {/* Main Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <button
                onClick={() => onStart(videoOn, usePmi)}
                style={{
                  padding: '12px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  boxShadow: '0 4px 14px rgba(249, 115, 22, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2.4}>
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                Start Instant Meeting
              </button>

              <button
                onClick={handleGenerateLink}
                style={{
                  padding: '11px',
                  borderRadius: 12,
                  background: '#f1f5f9',
                  color: '#2563eb',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: '1px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Get a Meeting Link to Share First
              </button>
            </div>
          </>
        ) : (
          /* Share Link First View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Your Meeting Link
              </span>
              <div
                style={{
                  marginTop: 6,
                  padding: '8px 10px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  wordBreak: 'break-all',
                }}
              >
                {getMeetingUrl()}
              </div>
            </div>

            {/* Sharing actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {/* 1-Tap Copy */}
              <button
                onClick={handleCopyLink}
                style={{
                  padding: '10px',
                  borderRadius: 10,
                  background: copied ? '#ecfdf5' : '#f1f5f9',
                  border: `1px solid ${copied ? '#a7f3d0' : '#cbd5e1'}`,
                  color: copied ? '#059669' : '#0f172a',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {copied ? (
                  <>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.5}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Link Copied!
                  </>
                ) : (
                  <>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy Link
                  </>
                )}
              </button>

              {/* Share via Apps */}
              <button
                onClick={handleNativeShare}
                style={{
                  padding: '10px',
                  borderRadius: 10,
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#2563eb',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share Link
              </button>
            </div>

            {/* WhatsApp Share */}
            <button
              onClick={handleWhatsAppShare}
              style={{
                padding: '11px',
                borderRadius: 10,
                background: '#25D366',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 2px 8px rgba(37, 211, 102, 0.25)',
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
              </svg>
              Share via WhatsApp
            </button>

            {/* Join button */}
            <button
              onClick={() => onStart(videoOn, false, createdCode)}
              style={{
                marginTop: 2,
                padding: '12px',
                borderRadius: 12,
                background: '#2563eb',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 800,
              }}
            >
              Join Meeting Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default NewMeetingModal;
