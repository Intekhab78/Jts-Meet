import React from 'react'
import type { RecordingItem } from '../../adminConsole.types'
import { resolveRecordingUrl } from '../../adminConsole.types'
import {
    IconX,
    IconShieldCheck,
    IconDownload
} from '../../../../components/common/Icons'

interface AdminVideoPlayerModalProps {
    video: RecordingItem | null
    onClose: () => void
}

export function AdminVideoPlayerModal({ video, onClose }: AdminVideoPlayerModalProps) {
    if (!video) return null

    const resolvedUrl = resolveRecordingUrl(video.recordingUrl)

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
        }}>
            <div style={{
                width: '100%',
                maxWidth: 860,
                background: '#121420',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    padding: '16px 22px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                            {video.title}
                        </h3>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            ID: {video.meetingId} &bull; {video.duration}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 4
                        }}
                    >
                        <IconX size={16} color="#9ca3af" />
                    </button>
                </div>

                <div style={{
                    background: '#000',
                    width: '100%',
                    minHeight: 380,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <video
                        src={resolvedUrl}
                        controls
                        autoPlay
                        style={{ width: '100%', maxHeight: '65vh', outline: 'none' }}
                    />
                </div>

                <div style={{
                    padding: '14px 22px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#0d0e17'
                }}>
                    <span style={{
                        fontSize: '0.75rem',
                        color: '#86efac',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                    }}>
                        <IconShieldCheck size={14} color="#86efac" />
                        <span>Recorded on {new Date(video.createdAt).toLocaleDateString()} &bull; Enterprise 256-bit DTLS Encrypted Vault</span>
                    </span>
                    <a
                        href={resolvedUrl}
                        download={`${video.title}.mp4`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#fff',
                            padding: '6px 16px',
                            borderRadius: 8,
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        <IconDownload size={14} color="#fff" />
                        <span>Download MP4 File</span>
                    </a>
                </div>
            </div>
        </div>
    )
}
