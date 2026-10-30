import React from 'react';

export const NetworkSignalIndicator: React.FC<{ isPoor?: boolean }> = ({ isPoor = false }) => (
  <div
    title={isPoor ? 'Weak Connection' : 'Great 4G / Wi-Fi Signal'}
    style={{
      display: 'inline-flex',
      alignItems: 'flex-end',
      gap: 1.5,
      height: 10,
      marginLeft: 2,
    }}
  >
    <span style={{ width: 2.5, height: 4, borderRadius: 0.5, backgroundColor: isPoor ? '#ef4444' : '#22c55e' }} />
    <span style={{ width: 2.5, height: 7, borderRadius: 0.5, backgroundColor: isPoor ? 'rgba(239, 68, 68, 0.3)' : '#22c55e' }} />
    <span style={{ width: 2.5, height: 10, borderRadius: 0.5, backgroundColor: isPoor ? 'rgba(239, 68, 68, 0.2)' : '#22c55e' }} />
  </div>
);

export default NetworkSignalIndicator;
