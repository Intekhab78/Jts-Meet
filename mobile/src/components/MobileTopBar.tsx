import React from 'react';

interface MobileTopBarProps {
  user: any;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  user,
  onOpenAuth,
  onOpenProfile,
}) => {
  return (
    <header
      className="glass-header"
      style={{
        paddingTop: 'calc(var(--safe-top) + 8px)',
        paddingBottom: 10,
        paddingLeft: 16,
        paddingRight: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        zIndex: 50,
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
          }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2.4}>
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>
        <div>
          <span
            style={{
              fontSize: '1rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#0f172a',
            }}
          >
            JTS Meet
          </span>
        </div>
      </div>

      {/* Right Controls: Network status & Avatar/Login */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Network indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            borderRadius: 16,
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#10b981',
            }}
          />
          <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>Live</span>
        </div>

        {/* User profile / Login */}
        {user ? (
          <button
            onClick={onOpenProfile}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(59, 130, 246, 0.25)',
              overflow: 'hidden',
              padding: 0,
              border: '2px solid #ffffff',
            }}
          >
            {user.profileImage || user.avatar ? (
              <img
                src={user.profileImage || user.avatar}
                alt="Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              user.name ? user.name.charAt(0).toUpperCase() : 'U'
            )}
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            style={{
              padding: '5px 12px',
              borderRadius: 8,
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)',
            }}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
export default MobileTopBar;
