import React, { useState, useEffect } from 'react';
import { resolveAvatarUrl } from '../../config';

interface MobileAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  borderRadius?: string | number;
  border?: string;
  className?: string;
  style?: React.CSSProperties;
  backgroundColor?: string;
  iconColor?: string;
  showInitial?: boolean; // If true and name is provided, can show initial, otherwise shows human logo
}

// Preset harmonious gradients for default avatar backgrounds
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', // Indigo
  'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', // Sky Blue
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', // Purple
  'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Emerald
  'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', // Rose
  'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Amber
  'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', // Teal
];

function getGradientForName(name?: string | null): string {
  if (!name) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

export const MobileAvatar: React.FC<MobileAvatarProps> = ({
  src,
  name,
  size = 40,
  borderRadius = '50%',
  border,
  className,
  style,
  backgroundColor,
  iconColor = '#ffffff',
  showInitial = false,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const resolvedUrl = src ? resolveAvatarUrl(src) : '';
  const bg = backgroundColor || getGradientForName(name);
  const iconSize = Math.max(16, Math.round(size * 0.56));

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius,
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        border: border || 'none',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        ...style,
      }}
    >
      {/* 1. Default Human User Silhouette Icon (or Initial) as baseline */}
      {showInitial && name && name.trim() ? (
        <span
          style={{
            color: iconColor,
            fontWeight: 700,
            fontSize: Math.max(12, Math.round(size * 0.42)),
            userSelect: 'none',
            textTransform: 'uppercase',
          }}
        >
          {name.trim().charAt(0).toUpperCase()}
        </span>
      ) : (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={iconColor}
          style={{ display: 'block', opacity: 0.95 }}
        >
          {/* Globally recognizable crisp human avatar silhouette */}
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      )}

      {/* 2. Photo Image overlay if provided & not failed */}
      {resolvedUrl && !imgFailed && (
        <img
          src={resolvedUrl}
          alt={name || 'User Profile'}
          onError={() => setImgFailed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            borderRadius,
            objectFit: 'cover',
            display: 'block',
          }}
        />
      )}
    </div>
  );
};

export default MobileAvatar;
