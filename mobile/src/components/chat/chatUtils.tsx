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

// Parse [File: fileName | fileUrl | fileSize] format from text OR direct image/file URLs/names
export function parseFileAttachment(text?: string | null): { fileName: string; fileUrl: string; fileSize?: string } | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  
  // 1. Bracket format: [File: fileName | fileUrl | fileSize]
  const match = trimmed.match(/\[File:\s*([^\|]+?)\s*\|\s*([^\|]+?)\s*(?:\|\s*([^\]]+?))?\s*\]/i);
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

  // 2. Direct uploads path (e.g. https://meetapi.jtsmiddleeast.com/uploads/... or /uploads/...)
  if (trimmed.includes('/uploads/')) {
    const fileUrl = normalizeFileUrl(trimmed);
    const fileName = fileUrl.split('/').pop()?.split('?')[0] || 'Attachment';
    return {
      fileName,
      fileUrl,
    };
  }

  // 3. Standalone image filename or path (e.g. Screenshot_2026-11-06-...jpg or IMG_...png)
  if (/\.(jpeg|jpg|png|gif|webp|svg|bmp|pdf|zip|rar|7z|tar|gz|docx?|xlsx?|pptx?)$/i.test(trimmed)) {
    // If it starts with http, it is a full URL; otherwise treat as filename uploaded to /uploads/
    const fileUrl = trimmed.startsWith('http')
      ? normalizeFileUrl(trimmed)
      : `${API_BASE}/uploads/${trimmed}`;
    const fileName = trimmed.split('/').pop()?.split('?')[0] || trimmed;
    return {
      fileName,
      fileUrl,
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

// In-app silent file downloader (uses Android native DownloadManager via MobileAppBridge if available, otherwise invisible iframe)
export function downloadFileInApp(url: string, fileName?: string): void {
  if (!url) return;
  const bridge = (window as any).MobileAppBridge;
  if (bridge && typeof bridge.downloadFileSilently === 'function') {
    bridge.downloadFileSilently(url, fileName || '');
    return;
  }

  // Fallback for WebView/Web without bridge: use fetch + blob download link
  fetch(url)
    .then((res) => res.blob())
    .then((blob) => {
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = fileName || url.split('/').pop()?.split('?')[0] || 'downloaded_file';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }, 300);
      try {
        if (bridge?.showToast) bridge.showToast('Download complete');
      } catch (_) {}
    })
    .catch(() => {
      // Direct anchor click fallback without target="_blank"
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName || url.split('/').pop()?.split('?')[0] || 'downloaded_file';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 300);
    });
}
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

