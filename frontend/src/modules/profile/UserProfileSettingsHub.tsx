import React, { useState, useEffect, useRef } from 'react'
import { API_BASE } from '../../config'
import { soundEffects } from '../../utils/soundEffects'

interface UserProfileSettingsHubProps {
    token: string
    userId?: string
    profileName: string
    setProfileName: (name: string) => void
    profileEmail: string
    profileImage?: string
    onProfileUpdated?: (updated: { fullName?: string; profileImage?: string }) => void
}

type SettingsTab = 'general' | 'audio_video' | 'notifications' | 'security' | 'region'

export function UserProfileSettingsHub({
    token,
    userId,
    profileName,
    setProfileName,
    profileEmail,
    profileImage: initialProfileImage,
    onProfileUpdated
}: UserProfileSettingsHubProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
        try {
            const saved = localStorage.getItem('jts_profile_tab')
            if (saved && ['general', 'audio_video', 'notifications', 'security', 'region'].includes(saved)) {
                return saved as SettingsTab
            }
        } catch (_) {}
        return 'general'
    })

    useEffect(() => {
        try {
            localStorage.setItem('jts_profile_tab', activeTab)
        } catch (_) {}
    }, [activeTab])

    // Profile & Avatar State
    const [fullName, setFullName] = useState(profileName)
    const [avatarUrl, setAvatarUrl] = useState<string>(initialProfileImage || '')
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
    const [userStatus, setUserStatus] = useState<string>(() => localStorage.getItem('jts_user_status') || 'available')
    const [statusMessage, setStatusMessage] = useState<string>(() => localStorage.getItem('jts_status_message') || '')
    const [profileSuccessMsg, setProfileSuccessMsg] = useState('')
    const [profileErrMsg, setProfileErrMsg] = useState('')
    const [isSavingProfile, setIsSavingProfile] = useState(false)

    // Hardware State
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
    const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>(() => localStorage.getItem('jts_default_mic') || '')
    const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>(() => localStorage.getItem('jts_default_cam') || '')
    const [isTestingMic, setIsTestingMic] = useState(false)
    const [micLevel, setMicLevel] = useState(0)
    const [isPlayingChime, setIsPlayingChime] = useState(false)
    const [mirrorCamera, setMirrorCamera] = useState<boolean>(() => localStorage.getItem('jts_pref_camera_mirror') !== 'false')
    const [videoQuality, setVideoQuality] = useState<string>(() => localStorage.getItem('jts_pref_video_quality') || '720p')
    const [pushToTalk, setPushToTalk] = useState<boolean>(() => localStorage.getItem('jts_pref_push_to_talk') === 'true')
    const [autoMuteMic, setAutoMuteMic] = useState<boolean>(() => localStorage.getItem('jts_pref_auto_mute') === 'true')
    const [autoMuteCam, setAutoMuteCam] = useState<boolean>(() => localStorage.getItem('jts_pref_auto_cam_off') === 'true')
    const [noiseSuppression, setNoiseSuppression] = useState<boolean>(() => localStorage.getItem('jts_pref_noise_suppr') !== 'false')

    // Notifications State
    const [emailMeetingInvite, setEmailMeetingInvite] = useState<boolean>(() => localStorage.getItem('jts_notif_email_meeting') !== 'false')
    const [emailTeamInvite, setEmailTeamInvite] = useState<boolean>(() => localStorage.getItem('jts_notif_email_team') !== 'false')
    const [emailWeeklySummary, setEmailWeeklySummary] = useState<boolean>(() => localStorage.getItem('jts_notif_email_summary') === 'true')
    const [soundCallRing, setSoundCallRing] = useState<boolean>(() => localStorage.getItem('jts_notif_sound_ring') !== 'false')
    const [soundChatMessage, setSoundChatMessage] = useState<boolean>(() => localStorage.getItem('jts_notif_sound_chat') !== 'false')
    const [dndDuringMeeting, setDndDuringMeeting] = useState<boolean>(() => localStorage.getItem('jts_notif_dnd_meeting') !== 'false')

    // Security & Password State
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('')
    const [passwordErrMsg, setPasswordErrMsg] = useState('')
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
    const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(() => localStorage.getItem('jts_pref_2fa') === 'true')

    // Region & Shortcuts State
    const [timezone, setTimezone] = useState<string>(() => localStorage.getItem('jts_pref_timezone') || 'Asia/Kolkata')
    const [timeFormat, setTimeFormat] = useState<string>(() => localStorage.getItem('jts_pref_time_format') || '12h')
    const [language, setLanguage] = useState<string>(() => localStorage.getItem('jts_pref_lang') || 'en')

    // Refs
    const avatarInputRef = useRef<HTMLInputElement>(null)
    const cameraPreviewRef = useRef<HTMLVideoElement>(null)
    const cameraStreamRef = useRef<MediaStream | null>(null)
    const micStreamRef = useRef<MediaStream | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)

    // Load available audio/video media devices
    useEffect(() => {
        const enumerateDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices()
                const mics = devices.filter(d => d.kind === 'audioinput')
                const cams = devices.filter(d => d.kind === 'videoinput')
                setAudioDevices(mics)
                setVideoDevices(cams)

                if (!selectedAudioDevice && mics.length > 0) {
                    setSelectedAudioDevice(mics[0].deviceId)
                }
                if (!selectedVideoDevice && cams.length > 0) {
                    setSelectedVideoDevice(cams[0].deviceId)
                }
            } catch (err) {
                console.error('Failed to enumerate media devices:', err)
            }
        }
        enumerateDevices()
    }, [])

    // Mic Level Testing
    useEffect(() => {
        let animFrameId: number
        if (isTestingMic) {
            navigator.mediaDevices.getUserMedia({
                audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true
            }).then(stream => {
                micStreamRef.current = stream
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
                const audioCtx = new AudioContextClass()
                audioContextRef.current = audioCtx
                const analyser = audioCtx.createAnalyser()
                analyser.fftSize = 256
                const source = audioCtx.createMediaStreamSource(stream)
                source.connect(analyser)

                const dataArray = new Uint8Array(analyser.frequencyBinCount)
                const updateMeter = () => {
                    analyser.getByteFrequencyData(dataArray)
                    let sum = 0
                    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
                    const avg = sum / dataArray.length
                    setMicLevel(Math.min(100, Math.round((avg / 128) * 100)))
                    animFrameId = requestAnimationFrame(updateMeter)
                }
                updateMeter()
            }).catch(err => {
                console.error('Mic test error:', err)
                setIsTestingMic(false)
            })
        } else {
            setMicLevel(0)
            if (micStreamRef.current) {
                micStreamRef.current.getTracks().forEach(t => t.stop())
                micStreamRef.current = null
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close()
            }
        }

        return () => {
            if (animFrameId) cancelAnimationFrame(animFrameId)
            if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop())
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') audioContextRef.current.close()
        }
    }, [isTestingMic, selectedAudioDevice])

    // Live Camera Preview on Audio/Video tab
    useEffect(() => {
        if (activeTab === 'audio_video') {
            navigator.mediaDevices.getUserMedia({
                video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice }, width: 640, height: 360 } : true
            }).then(stream => {
                cameraStreamRef.current = stream
                if (cameraPreviewRef.current) {
                    cameraPreviewRef.current.srcObject = stream
                }
            }).catch(err => {
                console.error('Camera preview error:', err)
            })
        } else {
            if (cameraStreamRef.current) {
                cameraStreamRef.current.getTracks().forEach(t => t.stop())
                cameraStreamRef.current = null
            }
        }

        return () => {
            if (cameraStreamRef.current) {
                cameraStreamRef.current.getTracks().forEach(t => t.stop())
                cameraStreamRef.current = null
            }
        }
    }, [activeTab, selectedVideoDevice])

    // Play speaker test chime
    const handleTestSpeaker = () => {
        setIsPlayingChime(true)
        soundEffects.playJoinChime()
        setTimeout(() => setIsPlayingChime(false), 800)
    }

    // Avatar Upload Handler
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploadingAvatar(true)
        setProfileErrMsg('')
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('contextType', 'profile')

            const res = await fetch(`${API_BASE}/api/file/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })
            const data = await res.json()
            if (data.success && (data.data.secureUrl || data.data._id)) {
                const newAvatar = data.data.secureUrl || `${API_BASE}/api/file/${data.data._id}/download`
                setAvatarUrl(newAvatar)

                // Update server profile immediately
                await fetch(`${API_BASE}/api/auth/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ profileImage: newAvatar })
                })

                if (onProfileUpdated) onProfileUpdated({ profileImage: newAvatar })
                setProfileSuccessMsg('Profile photo updated successfully!')
                setTimeout(() => setProfileSuccessMsg(''), 4000)
            } else {
                throw new Error(data.message || 'Avatar upload failed')
            }
        } catch (err: any) {
            setProfileErrMsg(err.message || 'Failed to upload photo')
        } finally {
            setIsUploadingAvatar(false)
            if (avatarInputRef.current) avatarInputRef.current.value = ''
        }
    }

    // Save Profile & Status
    const handleSaveGeneralProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSavingProfile(true)
        setProfileErrMsg('')
        setProfileSuccessMsg('')

        try {
            const res = await fetch(`${API_BASE}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    fullName: fullName.trim(),
                    profileImage: avatarUrl
                })
            })
            const data = await res.json()
            if (data.success) {
                setProfileName(fullName.trim())
                localStorage.setItem('jts_user_status', userStatus)
                localStorage.setItem('jts_status_message', statusMessage)
                if (onProfileUpdated) onProfileUpdated({ fullName: fullName.trim(), profileImage: avatarUrl })
                setProfileSuccessMsg('Profile and status preferences saved successfully!')
                setTimeout(() => setProfileSuccessMsg(''), 4000)
            } else {
                throw new Error(data.message || 'Failed to update profile')
            }
        } catch (err: any) {
            setProfileErrMsg(err.message || 'Failed to save changes')
        } finally {
            setIsSavingProfile(false)
        }
    }

    // Change Password Handler
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setPasswordErrMsg('')
        setPasswordSuccessMsg('')

        if (newPassword.length < 8) {
            setPasswordErrMsg('New password must be at least 8 characters long')
            return
        }
        if (newPassword !== confirmPassword) {
            setPasswordErrMsg('New password and confirm password do not match')
            return
        }

        setIsUpdatingPassword(true)
        try {
            const res = await fetch(`${API_BASE}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ oldPassword, newPassword })
            })
            const data = await res.json()
            if (data.success) {
                setPasswordSuccessMsg('Password changed successfully!')
                setOldPassword('')
                setNewPassword('')
                setConfirmPassword('')
                setTimeout(() => setPasswordSuccessMsg(''), 4000)
            } else {
                throw new Error(data.message || 'Failed to change password')
            }
        } catch (err: any) {
            setPasswordErrMsg(err.message || 'Incorrect old password or server error')
        } finally {
            setIsUpdatingPassword(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
            {/* Header Title */}
            <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 4px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>⚙️</span> Settings & Preferences
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    Manage your account identity, audio/video devices, enterprise security, and workspace preferences.
                </p>
            </div>

            {/* Microsoft Teams Style Segmented Tab Strip */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: 2,
                    overflowX: 'auto'
                }}
            >
                {[
                    { id: 'general', label: 'General & Profile', icon: '👤' },
                    { id: 'audio_video', label: 'Audio & Video', icon: '📹' },
                    { id: 'notifications', label: 'Notifications', icon: '🔔' },
                    { id: 'security', label: 'Security & Password', icon: '🔐' },
                    { id: 'region', label: 'Region & Shortcuts', icon: '🌍' }
                ].map(t => {
                    const isActive = activeTab === t.id
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setActiveTab(t.id as any)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 16px',
                                border: 'none',
                                background: 'transparent',
                                borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                                color: isActive ? '#fff' : 'var(--color-text-secondary)',
                                fontWeight: isActive ? 700 : 500,
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <span>{t.icon}</span>
                            <span>{t.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Feedback Banners */}
            {profileSuccessMsg && (
                <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', padding: '12px 18px', borderRadius: '12px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>✓</span> {profileSuccessMsg}
                </div>
            )}
            {profileErrMsg && (
                <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '12px 18px', borderRadius: '12px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>⚠</span> {profileErrMsg}
                </div>
            )}

            {/* TAB 1: GENERAL & PROFILE */}
            {activeTab === 'general' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
                    {/* Identity & Avatar Card */}
                    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>👤</span> Personal Identity
                        </h3>

                        {/* Avatar Image + Upload button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                            <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={fullName}
                                        style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(99, 102, 241, 0.4)', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}
                                    />
                                ) : (
                                    <div style={{
                                        width: 72, height: 72, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                        color: '#fff', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: '1.8rem', fontWeight: 800,
                                        boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)'
                                    }}>
                                        {(fullName || profileName || 'U').slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <input
                                    type="file"
                                    ref={avatarInputRef}
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => avatarInputRef.current?.click()}
                                    disabled={isUploadingAvatar}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: 600, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                >
                                    <span>📸</span>
                                    <span>{isUploadingAvatar ? 'Uploading...' : 'Change Photo'}</span>
                                </button>
                                {avatarUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setAvatarUrl('')}
                                        style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '0.7rem', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                                    >
                                        Remove Photo
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Name & Email Form */}
                        <form onSubmit={handleSaveGeneralProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Full Display Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    className="input"
                                    style={{ padding: '9px 12px', fontSize: '0.8125rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Email Address</label>
                                    <span style={{ fontSize: '0.6875rem', color: '#4ade80', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                                        🔒 Verified
                                    </span>
                                </div>
                                <input
                                    type="email"
                                    value={profileEmail}
                                    disabled
                                    className="input"
                                    style={{ padding: '9px 12px', fontSize: '0.8125rem', opacity: 0.7, cursor: 'not-allowed' }}
                                />
                            </div>

                            {userId && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Account ID</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="text"
                                            value={userId}
                                            readOnly
                                            className="input"
                                            style={{ padding: '8px 12px', fontSize: '0.75rem', fontFamily: 'monospace', opacity: 0.8 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(userId)
                                                alert('Copied ID to clipboard!')
                                            }}
                                            className="btn btn-secondary"
                                            style={{ padding: '8px 12px', fontSize: '0.75rem' }}
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSavingProfile}
                                className="btn btn-primary"
                                style={{ marginTop: 6, padding: '10px 16px', fontSize: '0.8125rem', fontWeight: 700, borderRadius: 8 }}
                            >
                                {isSavingProfile ? 'Saving...' : '💾 Save Profile'}
                            </button>
                        </form>
                    </div>

                    {/* Presence Status Card */}
                    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>🟢</span> Availability & Status Note
                        </h3>

                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                            Let your team members know your current availability across channels and direct calls.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { id: 'available', label: 'Available', desc: 'Ready for calls and channel chats', color: '#22c55e' },
                                { id: 'busy', label: 'Busy / In a Meeting', desc: 'Currently in a conference session', color: '#ef4444' },
                                { id: 'away', label: 'Away / Stepped Out', desc: 'Will respond shortly', color: '#f59e0b' },
                                { id: 'dnd', label: 'Do Not Disturb', desc: 'Mute popups and notifications', color: '#e11d48' }
                            ].map(s => {
                                const isSelected = userStatus === s.id
                                return (
                                    <div
                                        key={s.id}
                                        onClick={() => {
                                            setUserStatus(s.id)
                                            localStorage.setItem('jts_user_status', s.id)
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 14px',
                                            borderRadius: 10,
                                            border: isSelected ? `1px solid ${s.color}` : '1px solid rgba(255,255,255,0.06)',
                                            background: isSelected ? 'rgba(255,255,255,0.04)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                                            <div>
                                                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>{s.label}</div>
                                                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>{s.desc}</div>
                                            </div>
                                        </div>
                                        {isSelected && <span style={{ color: s.color, fontWeight: 800 }}>✓</span>}
                                    </div>
                                )
                            })}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Custom Status Message</label>
                            <input
                                type="text"
                                placeholder="e.g. In client presentation until 4 PM"
                                value={statusMessage}
                                onChange={(e) => {
                                    setStatusMessage(e.target.value)
                                    localStorage.setItem('jts_status_message', e.target.value)
                                }}
                                className="input"
                                style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: AUDIO & VIDEO */}
            {activeTab === 'audio_video' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
                    {/* Audio Hardware Card */}
                    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>🎙️</span> Microphone & Speakers
                        </h3>

                        {/* Microphone device */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Input Microphone</label>
                            <select
                                value={selectedAudioDevice}
                                onChange={(e) => {
                                    setSelectedAudioDevice(e.target.value)
                                    localStorage.setItem('jts_default_mic', e.target.value)
                                }}
                                className="input"
                                style={{ padding: '8px 12px', fontSize: '0.8125rem', background: '#18181b', color: '#fff', cursor: 'pointer' }}
                            >
                                {audioDevices.length > 0 ? (
                                    audioDevices.map(d => (
                                        <option key={d.deviceId} value={d.deviceId}>
                                            {d.label || `Microphone (${d.deviceId.slice(0, 8)}...)`}
                                        </option>
                                    ))
                                ) : (
                                    <option value="">Default System Microphone</option>
                                )}
                            </select>

                            {/* Mic live meter */}
                            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Mic Volume Level:</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsTestingMic(!isTestingMic)}
                                        className="btn btn-secondary"
                                        style={{ padding: '3px 10px', fontSize: '0.7rem', borderRadius: '6px' }}
                                    >
                                        {isTestingMic ? 'Stop Test' : 'Test Mic'}
                                    </button>
                                </div>
                                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${micLevel}%`, height: '100%', background: micLevel > 75 ? '#ef4444' : micLevel > 35 ? '#22c55e' : '#6366f1', transition: 'width 60ms linear' }} />
                                </div>
                            </div>
                        </div>

                        {/* Speaker output test */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#fff' }}>Test Output Speaker</div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Play a pleasant chime through your speakers</div>
                            </div>
                            <button
                                type="button"
                                onClick={handleTestSpeaker}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 8 }}
                            >
                                {isPlayingChime ? '🔊 Playing...' : '🔊 Test Speaker'}
                            </button>
                        </div>

                        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

                        {/* Push to talk & Noise Cancellation */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#e4e4e7' }}>
                                <input
                                    type="checkbox"
                                    checked={pushToTalk}
                                    onChange={(e) => {
                                        setPushToTalk(e.target.checked)
                                        localStorage.setItem('jts_pref_push_to_talk', e.target.checked.toString())
                                    }}
                                    style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
                                />
                                <div>
                                    <span style={{ fontWeight: 600 }}>Enable Push-to-Talk</span>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Hold Spacebar while muted to speak temporarily</div>
                                </div>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#e4e4e7' }}>
                                <input
                                    type="checkbox"
                                    checked={noiseSuppression}
                                    onChange={(e) => {
                                        setNoiseSuppression(e.target.checked)
                                        localStorage.setItem('jts_pref_noise_suppr', e.target.checked.toString())
                                    }}
                                    style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
                                />
                                <div>
                                    <span style={{ fontWeight: 600 }}>AI Background Noise Suppression</span>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Filter AC hum, typing clicks, and background chatter</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Camera & Video Card */}
                    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>📹</span> Camera & Resolution
                        </h3>

                        {/* Camera device */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Default Video Camera</label>
                            <select
                                value={selectedVideoDevice}
                                onChange={(e) => {
                                    setSelectedVideoDevice(e.target.value)
                                    localStorage.setItem('jts_default_cam', e.target.value)
                                }}
                                className="input"
                                style={{ padding: '8px 12px', fontSize: '0.8125rem', background: '#18181b', color: '#fff', cursor: 'pointer' }}
                            >
                                {videoDevices.length > 0 ? (
                                    videoDevices.map(d => (
                                        <option key={d.deviceId} value={d.deviceId}>
                                            {d.label || `Camera (${d.deviceId.slice(0, 8)}...)`}
                                        </option>
                                    ))
                                ) : (
                                    <option value="">Default System Camera</option>
                                )}
                            </select>
                        </div>

                        {/* Live Camera Preview with Mirror flip */}
                        <div
                            style={{
                                width: '100%',
                                height: 180,
                                background: '#09090b',
                                borderRadius: 10,
                                overflow: 'hidden',
                                position: 'relative',
                                border: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <video
                                ref={cameraPreviewRef}
                                autoPlay
                                playsInline
                                muted
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    transform: mirrorCamera ? 'scaleX(-1)' : 'none'
                                }}
                            />
                            <div style={{ position: 'absolute', bottom: 6, left: 8, background: 'rgba(0,0,0,0.65)', padding: '2px 8px', borderRadius: 4, fontSize: '0.6875rem', color: '#fff' }}>
                                Live Preview {mirrorCamera ? '(Mirrored)' : ''}
                            </div>
                        </div>

                        {/* Mirror Video Toggle */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#e4e4e7' }}>
                            <input
                                type="checkbox"
                                checked={mirrorCamera}
                                onChange={(e) => {
                                    setMirrorCamera(e.target.checked)
                                    localStorage.setItem('jts_pref_camera_mirror', e.target.checked.toString())
                                }}
                                style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
                            />
                            <span>Mirror my video preview horizontally</span>
                        </label>

                        {/* Video Quality */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Outgoing Video Resolution</label>
                            <select
                                value={videoQuality}
                                onChange={(e) => {
                                    setVideoQuality(e.target.value)
                                    localStorage.setItem('jts_pref_video_quality', e.target.value)
                                }}
                                className="input"
                                style={{ padding: '8px 12px', fontSize: '0.8125rem', background: '#18181b', color: '#fff', cursor: 'pointer' }}
                            >
                                <option value="1080p">1080p Full HD (Crystal Clear • High Bandwidth)</option>
                                <option value="720p">720p HD (Balanced • Recommended)</option>
                                <option value="360p">360p Data Saver (Low Internet / Mobile)</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
                    {/* Email Notifications */}
                    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>📧</span> Gmail SMTP Email Alerts
                        </h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                            Delivered directly to <strong>{profileEmail}</strong> via configured Gmail SMTP.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#e4e4e7' }}>
                                <input
                                    type="checkbox"
                                    checked={emailMeetingInvite}
                                    onChange={(e) => {
                                        setEmailMeetingInvite(e.target.checked)
                                        localStorage.setItem('jts_notif_email_meeting', e.target.checked.toString())
                                    }}
                                    style={{ width: 16, height: 16, accentColor: '#6366f1', marginTop: 2, cursor: 'pointer' }}
                                />
                                <div>
                                    <span style={{ fontWeight: 600 }}>Meeting & Conference Invitations</span>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Send email with direct join link when invited to a meeting</div>
                                </div>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#e4e4e7' }}>
                                <input
                                    type="checkbox"
                                    checked={emailTeamInvite}
                                    onChange={(e) => {
                                        setEmailTeamInvite(e.target.checked)
                                        localStorage.setItem('jts_notif_email_team', e.target.checked.toString())
                                    }}
                                    style={{ width: 16, height: 16, accentColor: '#6366f1', marginTop: 2, cursor: 'pointer' }}
                                />
                                <div>
                                    <span style={{ fontWeight: 600 }}>Team & Organization Onboarding</span>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Receive email when added to a new team or workspace</div>
                                </div>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#e4e4e7' }}>
                                <input
                                    type="checkbox"
                                    checked={emailWeeklySummary}
                                    onChange={(e) => {
                                        setEmailWeeklySummary(e.target.checked)
                                        localStorage.setItem('jts_notif_email_summary', e.target.checked.toString())
                                    }}
                                    style={{ width: 16, height: 16, accentColor: '#6366f1', marginTop: 2, cursor: 'pointer' }}
                                />
                                <div>
                                    <span style={{ fontWeight: 600 }}>Weekly Conference Summary</span>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Weekly breakdown of completed calls and team hours</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* In-App Sounds & DND */}
                    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>🔔</span> In-App Sounds & Ringing
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#e4e4e7' }}>
                                <input
                                    type="checkbox"
                                    checked={soundCallRing}
                                    onChange={(e) => {
                                        setSoundCallRing(e.target.checked)
                                        localStorage.setItem('jts_notif_sound_ring', e.target.checked.toString())
                                    }}
                                    style={{ width: 16, height: 16, accentColor: '#6366f1', marginTop: 2, cursor: 'pointer' }}
                                />
                                <div>
                                    <span style={{ fontWeight: 600 }}>Incoming 1-on-1 Call Ringing</span>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Play ringing audio chime when a colleague dials you</div>
                                </div>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#e4e4e7' }}>
                                <input
                                    type="checkbox"
                                    checked={soundChatMessage}
                                    onChange={(e) => {
                                        setSoundChatMessage(e.target.checked)
                                        localStorage.setItem('jts_notif_sound_chat', e.target.checked.toString())
                                    }}
                                    style={{ width: 16, height: 16, accentColor: '#6366f1', marginTop: 2, cursor: 'pointer' }}
                                />
                                <div>
                                    <span style={{ fontWeight: 600 }}>Channel Message Tone</span>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Play subtle sound when a new message arrives in your channel</div>
                                </div>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: '0.8125rem', color: '#e4e4e7' }}>
                                <input
                                    type="checkbox"
                                    checked={dndDuringMeeting}
                                    onChange={(e) => {
                                        setDndDuringMeeting(e.target.checked)
                                        localStorage.setItem('jts_notif_dnd_meeting', e.target.checked.toString())
                                    }}
                                    style={{ width: 16, height: 16, accentColor: '#6366f1', marginTop: 2, cursor: 'pointer' }}
                                />
                                <div>
                                    <span style={{ fontWeight: 600 }}>Mute Alerts During Active Meetings</span>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Suppress non-urgent sound chimes while speaking or presenting</div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: SECURITY & PASSWORD */}
            {activeTab === 'security' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
                    {/* Change Password Card */}
                    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>🔑</span> Change Account Password
                        </h3>

                        {passwordSuccessMsg && (
                            <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8125rem' }}>
                                ✓ {passwordSuccessMsg}
                            </div>
                        )}
                        {passwordErrMsg && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8125rem' }}>
                                ⚠ {passwordErrMsg}
                            </div>
                        )}

                        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Current Password</label>
                                <input
                                    type="password"
                                    required
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    className="input"
                                    style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>New Password (min 8 chars)</label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Create strong new password"
                                    className="input"
                                    style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                                />
                                {newPassword && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                                            <div style={{ width: newPassword.length > 10 ? '100%' : newPassword.length >= 8 ? '65%' : '30%', height: '100%', background: newPassword.length > 10 ? '#22c55e' : newPassword.length >= 8 ? '#f59e0b' : '#ef4444', borderRadius: 2 }} />
                                        </div>
                                        <span style={{ fontSize: '0.6875rem', color: newPassword.length > 10 ? '#22c55e' : newPassword.length >= 8 ? '#f59e0b' : '#ef4444' }}>
                                            {newPassword.length > 10 ? 'Strong' : newPassword.length >= 8 ? 'Good' : 'Too short'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-type new password"
                                    className="input"
                                    style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isUpdatingPassword}
                                className="btn btn-primary"
                                style={{ marginTop: 6, padding: '9px 16px', fontSize: '0.8125rem', fontWeight: 700, borderRadius: 8 }}
                            >
                                {isUpdatingPassword ? 'Updating...' : '🔒 Update Password'}
                            </button>
                        </form>
                    </div>

                    {/* 2FA & Active Sessions Card */}
                    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>🛡️</span> Security & Authentication
                        </h3>

                        {/* 2FA Toggle */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff' }}>Two-Factor Email OTP (2FA)</div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Require 6-digit verification code sent to {profileEmail} on login</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={twoFactorEnabled}
                                onChange={(e) => {
                                    setTwoFactorEnabled(e.target.checked)
                                    localStorage.setItem('jts_pref_2fa', e.target.checked.toString())
                                }}
                                style={{ width: 18, height: 18, accentColor: '#6366f1', cursor: 'pointer' }}
                            />
                        </div>

                        {/* Active Sessions */}
                        <div>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#fff', marginBottom: 6 }}>Active Login Session</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: '1.2rem' }}>💻</span>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>Current Browser Session</div>
                                        <div style={{ fontSize: '0.6875rem', color: '#4ade80' }}>🟢 Active Now • Windows Chrome</div>
                                    </div>
                                </div>
                                <span style={{ fontSize: '0.6875rem', background: 'rgba(34,197,94,0.2)', color: '#4ade80', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                    This Device
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: REGION & SHORTCUTS */}
            {activeTab === 'region' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
                    {/* Timezone & Regional Defaults */}
                    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>🌐</span> Timezone & Localization
                        </h3>

                        {/* Primary Timezone */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Primary Timezone</label>
                            <select
                                value={timezone}
                                onChange={(e) => {
                                    setTimezone(e.target.value)
                                    localStorage.setItem('jts_pref_timezone', e.target.value)
                                }}
                                className="input"
                                style={{ padding: '8px 12px', fontSize: '0.8125rem', background: '#18181b', color: '#fff', cursor: 'pointer' }}
                            >
                                <option value="Asia/Kolkata">(GMT+05:30) Asia/Kolkata — India Standard Time (IST)</option>
                                <option value="Asia/Dubai">(GMT+04:00) Asia/Dubai — Gulf Standard Time (GST)</option>
                                <option value="Asia/Riyadh">(GMT+03:00) Asia/Riyadh — Arabia Standard Time</option>
                                <option value="Europe/London">(GMT+00:00) Europe/London — Greenwich Mean Time</option>
                                <option value="America/New_York">(GMT-05:00) America/New_York — Eastern Time</option>
                                <option value="America/Los_Angeles">(GMT-08:00) America/Los_Angeles — Pacific Time</option>
                                <option value="Asia/Singapore">(GMT+08:00) Asia/Singapore — Singapore Time</option>
                            </select>
                        </div>

                        {/* Clock Format */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Time Format</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {[
                                    { id: '12h', label: '12-Hour (AM/PM)', example: '02:30 PM' },
                                    { id: '24h', label: '24-Hour (Military)', example: '14:30' }
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => {
                                            setTimeFormat(f.id)
                                            localStorage.setItem('jts_pref_time_format', f.id)
                                        }}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: 8,
                                            border: timeFormat === f.id ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                                            background: timeFormat === f.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{f.label}</div>
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>e.g. {f.example}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* App Language */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Display Language</label>
                            <select
                                value={language}
                                onChange={(e) => {
                                    setLanguage(e.target.value)
                                    localStorage.setItem('jts_pref_lang', e.target.value)
                                }}
                                className="input"
                                style={{ padding: '8px 12px', fontSize: '0.8125rem', background: '#18181b', color: '#fff', cursor: 'pointer' }}
                            >
                                <option value="en">English (United States)</option>
                                <option value="en-gb">English (United Kingdom)</option>
                                <option value="hi">Hindi (हिन्दी)</option>
                                <option value="ar">Arabic (العربية)</option>
                            </select>
                        </div>
                    </div>

                    {/* Keyboard Shortcuts Cheat Sheet */}
                    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>⌨️</span> Keyboard Shortcuts
                        </h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                            Power user hotkeys for rapid in-meeting multitasking.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { key: 'Spacebar', action: 'Push to talk (unmute temporarily)' },
                                { key: 'Ctrl + D', action: 'Toggle Microphone On / Off' },
                                { key: 'Ctrl + E', action: 'Toggle Camera On / Off' },
                                { key: 'Ctrl + Shift + S', action: 'Start / Stop Screen Sharing' },
                                { key: 'Ctrl + Shift + M', action: 'Raise / Lower Hand' },
                                { key: 'Esc', action: 'Close full-screen or dialogs' }
                            ].map(k => (
                                <div key={k.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
                                    <span style={{ fontSize: '0.75rem', color: '#e4e4e7' }}>{k.action}</span>
                                    <kbd style={{ background: '#27272a', border: '1px solid rgba(255,255,255,0.15)', color: '#a1a1aa', borderRadius: 4, padding: '2px 6px', fontSize: '0.6875rem', fontFamily: 'monospace' }}>
                                        {k.key}
                                    </kbd>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
