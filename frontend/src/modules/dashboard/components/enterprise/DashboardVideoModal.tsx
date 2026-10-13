import React from 'react'
import {
    IconX,
    IconVideo,
    IconDownload
} from '../../../../components/common/Icons'

interface DashboardVideoModalProps {
    selectedRecordingModal: any
    onClose: () => void
    resolveRecordingUrl: (url?: string) => string
    storageMetrics: any
}

export const DashboardVideoModal: React.FC<DashboardVideoModalProps> = ({
    selectedRecordingModal,
    onClose,
    resolveRecordingUrl,
    storageMetrics
}) => {
    if (!selectedRecordingModal) return null

    return (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
            <div className="modal-container anim-scale-in" style={{ maxWidth: 780, width: '92%', padding: 22 }}>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{
                                background: 'rgba(239, 68, 68, 0.85)',
                                color: '#fff',
                                padding: '2px 7px',
                                borderRadius: 4,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                letterSpacing: '0.06em'
                            }}>● REC</span>
                            <span style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 600 }}>
                                {selectedRecordingModal.resolution || '1080p Full HD'}
                            </span>
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: '0 0 3px' }}>
                            {selectedRecordingModal.title || 'Conference Recording'}
                        </h3>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span>Host: {selectedRecordingModal.host?.fullName || 'Organizer'}</span>
                            <span>•</span>
                            <span>{selectedRecordingModal.createdAtFormatted || selectedRecordingModal.date || '—'}</span>
                            <span>•</span>
                            <span>{selectedRecordingModal.duration || '—'}</span>
                            {(selectedRecordingModal.fileSizeDisplay || selectedRecordingModal.fileSize) && (
                                <>
                                    <span>•</span>
                                    <span>{selectedRecordingModal.fileSizeDisplay || selectedRecordingModal.fileSize}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 7 }}
                    >
                        <IconX size={16} />
                    </button>
                </div>

                {/* Video Player */}
                <div style={{ width: '100%', height: 390, background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {(selectedRecordingModal.recordingUrl || selectedRecordingModal.url) ? (
                        <video
                            src={resolveRecordingUrl(selectedRecordingModal.recordingUrl || selectedRecordingModal.url)}
                            controls
                            autoPlay
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        >
                            Your browser does not support HTML5 video playback.
                        </video>
                    ) : (
                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                            <IconVideo size={40} />
                            <div style={{ marginTop: 12, fontSize: '0.85rem' }}>Recording URL not available yet</div>
                            <div style={{ fontSize: '0.72rem', marginTop: 4, color: 'rgba(255,255,255,0.25)' }}>
                                The recording may still be processing. Please try again shortly.
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        🔒 Encrypted Storage · {storageMetrics?.retentionPolicyDays ? `${storageMetrics.retentionPolicyDays}-Day Retention` : '30-Day Audit Retention'} Active
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {(selectedRecordingModal.recordingUrl || selectedRecordingModal.url) && (
                            <a
                                href={resolveRecordingUrl(selectedRecordingModal.recordingUrl || selectedRecordingModal.url)}
                                download={`${selectedRecordingModal.title || 'recording'}.mp4`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary text-xs"
                                style={{ padding: '6px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                                <IconDownload size={13} />
                                <span>Download MP4</span>
                            </a>
                        )}
                        <button
                            onClick={onClose}
                            className="btn btn-primary text-xs"
                            style={{ padding: '6px 16px' }}
                        >
                            Close Player
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
