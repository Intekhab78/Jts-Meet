import React from 'react';
import { API_BASE } from '../../config';

// Normalize any attachment URL to HTTPS/API_BASE
export function normalizeFileUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  let cleaned = url.trim();
  if (cleaned.startsWith('data:') || cleaned.startsWith('blob:')) return cleaned;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(cleaned)) {
    cleaned = cleaned.replace(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, API_BASE);
  } else if (cleaned.startsWith('http://meet.jtsonline.shop')) {
    cleaned = cleaned.replace('http://meet.jtsonline.shop', 'https://meetapi.jtsmiddleeast.com');
  } else if (cleaned.startsWith('https://meet.jtsonline.shop')) {
    cleaned = cleaned.replace('https://meet.jtsonline.shop', 'https://meetapi.jtsmiddleeast.com');
  } else if (cleaned.startsWith('/uploads/') || cleaned.startsWith('/api/')) {
    cleaned = `${API_BASE}${cleaned}`;
  }
  return cleaned;
}

// Parse [File: fileName | fileUrl | fileSize] format from text
export function parseFileAttachment(text?: string | null): { fileName: string; fileUrl: string; fileSize?: string } | null {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/\[File:\s*([^\|]+?)\s*\|\s*([^\|]+?)\s*(?:\|\s*([^\]]+?))?\s*\]/i);
  if (match) {
    const rawName = (match[1] || '').trim();
    const rawUrl = (match[2] || '').trim();
    const rawSize = (match[3] || '').trim();
    return {
      fileName: rawName,
      fileUrl: normalizeFileUrl(rawUrl),
      fileSize: rawSize || undefined,
    };
  }
  return null;
}

// Parse file extension (e.g. ZIP, PDF, JPG)
export function getFileExtension(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'FILE';
  const parts = name.split('.');
  return parts.length > 1 ? (parts.pop() || 'FILE').toUpperCase() : 'FILE';
}

// Check if a file or URL represents an image
export function isImageAttachment(url?: string | null, name?: string | null): boolean {
  const check = (str?: string | null) =>
    typeof str === 'string' &&
    (/\.(jpeg|jpg|gif|png|webp|svg|bmp)(\?|$)/i.test(str) || str.startsWith('data:image/'));
  return check(url) || check(name);
}

// Format call duration into mm:ss or hh:mm:ss
export function formatCallDuration(totalSeconds?: number | null): string {
  const secs = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Render clickable hyperlinks in chat text (URLs become <a> tags)
export function renderClickableText(text: string, isMe: boolean): React.ReactNode {
  if (!text || typeof text !== 'string') return null;
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/gi;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            window.open(part, '_blank');
          }}
          style={{
            color: isMe ? '#ffffff' : '#2563eb',
            textDecoration: 'underline',
            wordBreak: 'break-all',
            fontWeight: 500,
          }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

