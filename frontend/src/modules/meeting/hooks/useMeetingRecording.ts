import { useState, useRef, useCallback, useEffect } from 'react'
import { API_BASE } from '../../../config'
import type { LiveStreamConfig } from '../components/LiveStreamModal'

export interface UseMeetingRecordingProps {
    meetingId: string
    meetingInput: string
    token: string
    initialToken?: string
    localStream: MediaStream | null
    activeLocalStream: MediaStream | null
    cameraStream?: MediaStream | null
    remoteStreams?: Record<string, MediaStream>
    screenSharingUserId?: string | null
    screenSharingUserIds?: string[]
    meetingInfo: any
    socket: any
    addToast: (msg: string, type?: any) => void
}

export function useMeetingRecording({
    meetingId,
    meetingInput,
    token,
    initialToken,
    localStream,
    activeLocalStream,
    cameraStream,
    remoteStreams,
    screenSharingUserId,
    screenSharingUserIds,
    meetingInfo,
    socket,
    addToast
}: UseMeetingRecordingProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [isCloudRecording, setIsCloudRecording] = useState(false)
    const [isLiveStreaming, setIsLiveStreaming] = useState(false)
    const [liveStreamConfig, setLiveStreamConfig] = useState<LiveStreamConfig | null>(null)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordedChunksRef = useRef<Blob[]>([])
    const recordingStreamRef = useRef<MediaStream | null>(null)
    const liveStreamRecorderRef = useRef<MediaRecorder | null>(null)
    const cloudRecordRecorderRef = useRef<MediaRecorder | null>(null)

    // Server-Side Cloud Recording Toggle
    const toggleCloudRecording = useCallback(async () => {
        const activeId = meetingId || meetingInput.trim()
        if (!activeId) return
        try {
            const activeToken = localStorage.getItem('jts_token') || localStorage.getItem('token') || token
            if (!isCloudRecording) {
                const res = await fetch(`${API_BASE}/api/meeting/${activeId}/cloud-record/start`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {})
                    }
                })
                const json = await res.json()
                if (json.success) {
                    setIsCloudRecording(true)
                    addToast('Server-Side Cloud Recording started successfully.', 'success')
                } else {
                    addToast(json.message || 'Failed to start cloud recording', 'warning')
                }
            } else {
                const res = await fetch(`${API_BASE}/api/meeting/${activeId}/cloud-record/stop`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {})
                    }
                })
                const json = await res.json()
                if (json.success) {
                    setIsCloudRecording(false)
                    addToast('Server-Side Cloud Recording stopped and finalized.', 'success')
                } else {
                    addToast(json.message || 'Failed to stop cloud recording', 'warning')
                }
            }
        } catch (err: any) {
            addToast(`Cloud recording error: ${err.message}`, 'warning')
        }
    }, [meetingId, meetingInput, isCloudRecording, token, addToast])

    // Client-Side Screen & Audio Local / Cloud Recording
    const startRecording = async () => {
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: true
            })

            let combinedStream = displayStream
            if (localStream && localStream.getAudioTracks().length > 0) {
                try {
                    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
                    const destination = audioCtx.createMediaStreamDestination()
                    let hasAudioSources = false

                    if (displayStream.getAudioTracks().length > 0) {
                        const tabAudioSource = audioCtx.createMediaStreamSource(new MediaStream([displayStream.getAudioTracks()[0]]))
                        tabAudioSource.connect(destination)
                        hasAudioSources = true
                    }

                    const micAudioSource = audioCtx.createMediaStreamSource(new MediaStream([localStream.getAudioTracks()[0]]))
                    micAudioSource.connect(destination)
                    hasAudioSources = true

                    if (hasAudioSources) {
                        const tracks = [
                            ...displayStream.getVideoTracks(),
                            ...destination.stream.getAudioTracks()
                        ]
                        combinedStream = new MediaStream(tracks)
                    }
                } catch (audioErr) {
                    console.warn('Failed to mix audio tracks, falling back to display audio:', audioErr)
                }
            }

            let options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp9,opus' }
            if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
                options = { mimeType: 'video/webm;codecs=vp8,opus' }
                if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
                    options = { mimeType: 'video/webm' }
                }
            }

            const recorder = new MediaRecorder(combinedStream, options)
            recordedChunksRef.current = []

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    recordedChunksRef.current.push(e.data)
                }
            }

            recorder.onstop = async () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `JTS-Meet-Recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)

                displayStream.getTracks().forEach(t => t.stop())
                setIsRecording(false)
                addToast('Local recording saved! Uploading to JTS Cloud Hub...', 'info')

                // Cloud Storage Upload to backend
                try {
                    const roomFromHash = new URLSearchParams(window.location.hash.split('?')[1] || '').get('room')
                    const activeId = meetingId || meetingInput || roomFromHash || 'meeting'
                    const activeToken = token || initialToken || localStorage.getItem('jts_token') || localStorage.getItem('token') || ''
                    const durationSec = Math.max(1, Math.round(recordedChunksRef.current.length))

                    if (activeId && activeToken) {
                        const formData = new FormData()
                        formData.append('recording', blob, `rec-${activeId}-${Date.now()}.webm`)
                        formData.append('duration', String(durationSec))
                        formData.append('title', meetingInfo?.title || `Conference ${activeId}`)

                        const uploadRes = await fetch(`${API_BASE}/api/meeting/${encodeURIComponent(activeId)}/recording`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${activeToken}`
                            },
                            body: formData
                        })
                        if (uploadRes.ok) {
                            addToast('Recording saved to Cloud Storage! Available for instant playback in History & Dashboard.', 'success')
                        } else {
                            const errJson = await uploadRes.json().catch(() => null)
                            console.error('[Recording] Upload response not OK:', uploadRes.status, errJson)
                        }
                    }
                } catch (err) {
                    console.error('[Recording] Cloud upload error:', err)
                }
            }

            displayStream.getVideoTracks()[0].onended = () => {
                if (recorder && recorder.state !== 'inactive') {
                    recorder.stop()
                }
            }

            recorder.start(1000)
            mediaRecorderRef.current = recorder
            recordingStreamRef.current = displayStream
            setIsRecording(true)
            addToast('Recording started! Select the meeting tab with "Share tab audio" for best results.', 'success')

            socket?.emit('meeting:record-toggle', { meetingId: meetingId || meetingInput, isRecording: true })

        } catch (err: any) {
            if (err.name !== 'NotAllowedError') {
                console.error('Failed to start recording:', err)
                addToast('Could not start screen capture for recording.', 'warning')
            }
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
            socket?.emit('meeting:record-toggle', { meetingId: meetingId || meetingInput, isRecording: false })
        }
    }

    // Canvas & Video element refs for live streaming studio
    const liveStreamCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const liveStreamVideoElemRef = useRef<HTMLVideoElement | null>(null)
    const liveStreamCamVideoElemRef = useRef<HTMLVideoElement | null>(null)
    const liveStreamRemoteVideosRef = useRef<Map<string, { video: HTMLVideoElement; trackId: string }>>(new Map())
    const liveStreamIntervalRef = useRef<any>(null)
    const liveStreamWorkerRef = useRef<Worker | null>(null)
    const liveStreamActiveTrackIdRef = useRef<string | null>(null)
    const liveStreamCamActiveTrackIdRef = useRef<string | null>(null)
    const liveStreamCombinedStreamRef = useRef<MediaStream | null>(null)
    const renderLiveCanvasFrameRef = useRef<(() => void) | null>(null)

    // Broadcast Studio Controls: Standby ("Be Right Back"), Layout, and News Ticker
    const [isLiveStreamStandby, setIsLiveStreamStandby] = useState(false)
    const liveStreamStandbyRef = useRef(false)
    const [liveStreamLayoutMode, setLiveStreamLayoutMode] = useState<'auto' | 'spotlight' | 'grid' | 'pip'>('auto')
    const liveStreamLayoutModeRef = useRef<'auto' | 'spotlight' | 'grid' | 'pip'>('auto')
    const [liveStreamTickerText, setLiveStreamTickerText] = useState('🔴 Live Conference Broadcast • Q&A Session Active')
    const liveStreamTickerTextRef = useRef('🔴 Live Conference Broadcast • Q&A Session Active')
    const [showLiveStreamTicker, setShowLiveStreamTicker] = useState(false)
    const showLiveStreamTickerRef = useRef(false)

    // Master Web Audio API Multi-Source Mixer refs with Broadcast Dynamics Compressor
    const liveStreamAudioCtxRef = useRef<AudioContext | null>(null)
    const liveStreamAudioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
    const liveStreamCompressorRef = useRef<DynamicsCompressorNode | null>(null)
    const liveStreamAudioSourcesRef = useRef<Map<string, { node: MediaStreamAudioSourceNode; trackId: string }>>(new Map())

    // Dynamically pick the active broadcast stream: screen share vs camera
    const getActiveLiveStream = useCallback(() => {
        // 1. If local screen sharing is active:
        const hasLocalScreen = localStream?.getVideoTracks().some(t =>
            t.readyState === 'live' && !(t as any).isDummy &&
            (t.contentHint === 'detail' || t.label.toLowerCase().includes('screen') || t.label.toLowerCase().includes('tab') || t.label.toLowerCase().includes('window'))
        )
        const isLocalSharing = screenSharingUserId === 'me' || (screenSharingUserIds && screenSharingUserIds.includes('me')) || !!hasLocalScreen

        if (isLocalSharing) {
            const screenCandidate = localStream || activeLocalStream
            const track = screenCandidate?.getVideoTracks().find(t => t.readyState === 'live' && !(t as any).isDummy)
            if (screenCandidate && track) {
                return screenCandidate
            }
        }

        // 2. Check if any remote participant is sharing screen:
        if (screenSharingUserId && remoteStreams && remoteStreams[screenSharingUserId]) {
            const remoteScreen = remoteStreams[screenSharingUserId]
            const track = remoteScreen?.getVideoTracks().find(t => t.readyState === 'live' && !(t as any).isDummy)
            if (remoteScreen && track) {
                return remoteScreen
            }
        }
        if (screenSharingUserIds && remoteStreams) {
            for (const sId of screenSharingUserIds) {
                if (sId !== 'me' && remoteStreams[sId]) {
                    const rStream = remoteStreams[sId]
                    const track = rStream.getVideoTracks().find(t => t.readyState === 'live' && !(t as any).isDummy)
                    if (track) return rStream
                }
            }
        }

        // 3. Fallback to Camera streams: check cameraStream, then localStream, then activeLocalStream
        const candidates = [cameraStream, localStream, activeLocalStream].filter(Boolean) as MediaStream[]
        for (const cand of candidates) {
            const track = cand.getVideoTracks().find(t => t.readyState === 'live' && !(t as any).isDummy && t.enabled !== false)
            if (track) {
                return cand
            }
        }

        // 4. Remote participant camera fallback if host camera is inactive
        if (remoteStreams) {
            for (const [, rStream] of Object.entries(remoteStreams)) {
                if (rStream) {
                    const track = rStream.getVideoTracks().find(t => t.readyState === 'live' && !(t as any).isDummy && t.enabled !== false)
                    if (track) {
                        return rStream
                    }
                }
            }
        }

        return null
    }, [screenSharingUserId, screenSharingUserIds, remoteStreams, cameraStream, localStream, activeLocalStream])

    // Get secondary camera stream for Picture-in-Picture (PiP) when screenshare is active
    const getCameraOnlyStream = useCallback(() => {
        const candidates = [cameraStream, localStream, activeLocalStream].filter(Boolean) as MediaStream[]
        for (const cand of candidates) {
            const track = cand.getVideoTracks().find(t => t.readyState === 'live' && !(t as any).isDummy && t.contentHint !== 'detail' && t.enabled !== false)
            if (track) {
                return cand
            }
        }
        if (remoteStreams) {
            for (const [, rStream] of Object.entries(remoteStreams)) {
                if (rStream) {
                    const track = rStream.getVideoTracks().find(t => t.readyState === 'live' && !(t as any).isDummy && t.contentHint !== 'detail' && t.enabled !== false)
                    if (track) return rStream
                }
            }
        }
        return null
    }, [cameraStream, localStream, activeLocalStream, remoteStreams])

    // Draw frame onto broadcast studio canvas with dynamic switching, multi-participant split-screen & standby graphics
    const renderLiveCanvasFrame = useCallback(() => {
        const canvas = liveStreamCanvasRef.current
        const video = liveStreamVideoElemRef.current
        const camVideo = liveStreamCamVideoElemRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
        if (!ctx) return

        const width = canvas.width
        const height = canvas.height

        // ── 0. Standby Mode Slate ("Be Right Back" Broadcast Card) ──
        if (liveStreamStandbyRef.current) {
            const gradient = ctx.createLinearGradient(0, 0, width, height)
            gradient.addColorStop(0, '#020617')
            gradient.addColorStop(0.5, '#0b0f19')
            gradient.addColorStop(1, '#020617')
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, width, height)

            const radialGlow = ctx.createRadialGradient(width / 2, height / 2 - 20, 20, width / 2, height / 2 - 20, 320)
            radialGlow.addColorStop(0, 'rgba(245, 158, 11, 0.22)')
            radialGlow.addColorStop(0.6, 'rgba(99, 102, 241, 0.08)')
            radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
            ctx.fillStyle = radialGlow
            ctx.beginPath()
            ctx.arc(width / 2, height / 2 - 20, 320, 0, Math.PI * 2)
            ctx.fill()

            const boxW = 540
            const boxH = 220
            const boxX = (width - boxW) / 2
            const boxY = (height - boxH) / 2 - 20

            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)'
            ctx.beginPath()
            if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 20)
            else ctx.rect(boxX, boxY, boxW, boxH)
            ctx.fill()
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)'
            ctx.lineWidth = 1.8
            ctx.stroke()

            ctx.fillStyle = '#f59e0b'
            ctx.font = '700 14px system-ui, -apple-system, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('⏸️ BROADCAST STANDBY • STREAM ACTIVE', width / 2, boxY + 46)

            ctx.fillStyle = '#ffffff'
            ctx.font = '800 28px system-ui, -apple-system, sans-serif'
            ctx.fillText('We will be right back!', width / 2, boxY + 98)

            ctx.fillStyle = '#94a3b8'
            ctx.font = '500 15px system-ui, -apple-system, sans-serif'
            const title = meetingInfo?.title || 'Live Conference Broadcast'
            ctx.fillText(`"${title}" is temporarily paused. Please stay tuned.`, width / 2, boxY + 144)

            ctx.textAlign = 'left'
            return
        }

        const activeStream = getActiveLiveStream()
        const currentVideoTrack = activeStream?.getVideoTracks().find(t => t.readyState === 'live' && !(t as any).isDummy && t.enabled !== false) || activeStream?.getVideoTracks()[0] || null

        // Sync hidden main video element with active track
        if (video) {
            if (currentVideoTrack && activeStream) {
                if (!video.srcObject || liveStreamActiveTrackIdRef.current !== currentVideoTrack.id) {
                    liveStreamActiveTrackIdRef.current = currentVideoTrack.id
                    video.srcObject = activeStream
                    video.play().catch(() => {})
                }
            } else if (!currentVideoTrack && video.srcObject) {
                liveStreamActiveTrackIdRef.current = null
                video.srcObject = null
            }
            if (video.srcObject && video.paused) {
                video.play().catch(() => {})
            }
        }

        // Sync hidden PiP camera element when screenshare is active
        const hasLocalScreen = localStream?.getVideoTracks().some(t =>
            t.readyState === 'live' && !(t as any).isDummy &&
            (t.contentHint === 'detail' || t.label.toLowerCase().includes('screen') || t.label.toLowerCase().includes('tab') || t.label.toLowerCase().includes('window'))
        )
        const isLocalSharing = screenSharingUserId === 'me' || (screenSharingUserIds && screenSharingUserIds.includes('me')) || !!hasLocalScreen
        const isRemoteSharing = (!!screenSharingUserId && screenSharingUserId !== 'me') || (screenSharingUserIds && screenSharingUserIds.some(id => id !== 'me'))
        const isSharing = isLocalSharing || isRemoteSharing

        const camStream = isSharing ? getCameraOnlyStream() : null
        const camTrack = camStream?.getVideoTracks().find(t => t.readyState === 'live' && !(t as any).isDummy && t.enabled !== false) || null

        if (camVideo) {
            if (camTrack && camStream) {
                if (!camVideo.srcObject || liveStreamCamActiveTrackIdRef.current !== camTrack.id) {
                    liveStreamCamActiveTrackIdRef.current = camTrack.id
                    camVideo.srcObject = camStream
                    camVideo.play().catch(() => {})
                }
            } else if (!camTrack && camVideo.srcObject) {
                liveStreamCamActiveTrackIdRef.current = null
                camVideo.srcObject = null
            }
            if (camVideo.srcObject && camVideo.paused) {
                camVideo.play().catch(() => {})
            }
        }

        // Sync hidden remote participant video elements for multi-person studio broadcasts
        const activeRemoteVideos: { id: string; video: HTMLVideoElement }[] = []
        if (!isSharing && remoteStreams) {
            for (const [rId, rStream] of Object.entries(remoteStreams)) {
                const rTrack = rStream?.getVideoTracks().find(t => t.readyState === 'live' && !(t as any).isDummy)
                if (rTrack && rTrack.enabled) {
                    let entry = liveStreamRemoteVideosRef.current.get(rId)
                    if (!entry) {
                        const elem = document.createElement('video')
                        elem.muted = true
                        elem.playsInline = true
                        elem.autoplay = true
                        elem.setAttribute('playsinline', 'true')
                        elem.setAttribute('webkit-playsinline', 'true')
                        elem.style.position = 'fixed'
                        elem.style.bottom = '4px'
                        elem.style.left = '4px'
                        elem.style.width = '160px'
                        elem.style.height = '90px'
                        elem.style.opacity = '0.01'
                        elem.style.pointerEvents = 'none'
                        elem.style.zIndex = '99999'
                        document.body.appendChild(elem)
                        elem.srcObject = rStream
                        elem.play().catch(() => {})
                        entry = { video: elem, trackId: rTrack.id }
                        liveStreamRemoteVideosRef.current.set(rId, entry)
                    } else if (entry.trackId !== rTrack.id) {
                        entry.trackId = rTrack.id
                        entry.video.srcObject = rStream
                        entry.video.play().catch(() => {})
                    }
                    if (entry.video.paused && entry.video.srcObject) {
                        entry.video.play().catch(() => {})
                    }
                    if ((entry.video.readyState >= 1 || entry.video.videoWidth > 0) && entry.video.videoWidth > 0) {
                        activeRemoteVideos.push({ id: rId, video: entry.video })
                    }
                }
            }
        }

        // Determine primary video drawSource:
        // When sharing screen, ALWAYS prioritize the actual screen sharing video element
        let drawSource: HTMLVideoElement | null = null
        if (isSharing) {
            const domVideos = Array.from(document.querySelectorAll('video'))
            const screenTileVideo = domVideos.find(v =>
                v.getAttribute('data-screen-share') === 'true' &&
                (v.readyState >= 1 || v.videoWidth > 0) &&
                v.videoWidth > 0 &&
                !v.paused
            ) || domVideos.find(v =>
                v.style.objectFit === 'contain' &&
                v !== video &&
                v !== camVideo &&
                (v.readyState >= 1 || v.videoWidth > 0) &&
                v.videoWidth > 0 &&
                !v.paused
            )

            if (screenTileVideo) {
                drawSource = screenTileVideo
            } else if (video && (video.readyState >= 1 || video.videoWidth > 0) && video.videoWidth > 0) {
                drawSource = video
            } else if (domVideos.length > 0) {
                drawSource = domVideos.find(v => v !== video && v !== camVideo && (v.readyState >= 1 || v.videoWidth > 0) && v.videoWidth > 0 && !v.paused) || null
            }
        } else {
            if (video && (video.readyState >= 1 || video.videoWidth > 0) && video.videoWidth > 0) {
                drawSource = video
            } else {
                const domVideos = Array.from(document.querySelectorAll('video'))
                const activeTileVideo = domVideos.find(v =>
                    v !== video &&
                    v !== camVideo &&
                    (v.readyState >= 1 || v.videoWidth > 0) &&
                    v.videoWidth > 0 &&
                    !v.paused &&
                    v.style.display !== 'none'
                )
                if (activeTileVideo) {
                    drawSource = activeTileVideo
                }
            }
        }

        const isTrackActive = currentVideoTrack ? (currentVideoTrack.readyState === 'live' && currentVideoTrack.enabled !== false && !(currentVideoTrack as any).isDummy) : false
        const isMainVideoReady = (!!drawSource && drawSource.videoWidth > 0 && (drawSource.readyState >= 1 || drawSource.videoWidth > 0)) || (isTrackActive && !!drawSource && drawSource.videoWidth > 0)

        if (isSharing && isMainVideoReady && drawSource) {
            // ── Mode A: Presentation Screenshare with Picture-in-Picture Inset ──
            ctx.fillStyle = '#0b0f19'
            ctx.fillRect(0, 0, width, height)

            const vWidth = drawSource.videoWidth
            const vHeight = drawSource.videoHeight
            const scale = Math.min(width / vWidth, height / vHeight)
            const drawW = vWidth * scale
            const drawH = vHeight * scale
            const drawX = (width - drawW) / 2
            const drawY = (height - drawH) / 2

            ctx.drawImage(drawSource, drawX, drawY, drawW, drawH)

            // Presentation indicator pill (Top Left)
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'
            ctx.beginPath()
            if (ctx.roundRect) {
                ctx.roundRect(24, 24, 180, 36, 18)
            } else {
                ctx.rect(24, 24, 180, 36)
            }
            ctx.fill()
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)'
            ctx.lineWidth = 1.5
            ctx.stroke()

            ctx.fillStyle = '#38bdf8'
            ctx.beginPath()
            ctx.arc(42, 42, 5, 0, Math.PI * 2)
            ctx.fill()

            ctx.fillStyle = '#ffffff'
            ctx.font = '600 13px system-ui, -apple-system, sans-serif'
            ctx.fillText('SCREEN SHARING', 56, 46)

            // Picture-in-Picture (PiP) Presenter Camera Inset (Bottom Right)
            let camSource: HTMLVideoElement | null = null
            if (camVideo && (camVideo.readyState >= 1 || camVideo.videoWidth > 0) && camVideo.videoWidth > 0) {
                camSource = camVideo
            } else {
                const domVideos = Array.from(document.querySelectorAll('video'))
                const activeCam = domVideos.find(v =>
                    v !== video &&
                    v !== camVideo &&
                    v !== drawSource &&
                    v.getAttribute('data-screen-share') !== 'true' &&
                    v.style.objectFit !== 'contain' &&
                    (v.readyState >= 1 || v.videoWidth > 0) &&
                    v.videoWidth > 0 &&
                    !v.paused &&
                    v.style.display !== 'none'
                )
                if (activeCam) {
                    camSource = activeCam
                }
            }

            if (camSource && (camSource.readyState >= 1 || camSource.videoWidth > 0) && camSource.videoWidth > 0) {
                const pipW = Math.round(width * 0.22)
                const pipH = Math.round(pipW * (9 / 16))
                const pipX = width - pipW - 28
                const pipY = height - pipH - 28

                ctx.save()
                ctx.shadowColor = 'rgba(0, 0, 0, 0.65)'
                ctx.shadowBlur = 18
                ctx.beginPath()
                if (ctx.roundRect) {
                    ctx.roundRect(pipX, pipY, pipW, pipH, 12)
                } else {
                    ctx.rect(pipX, pipY, pipW, pipH)
                }
                ctx.clip()
                ctx.drawImage(camSource, pipX, pipY, pipW, pipH)
                ctx.restore()

                ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)'
                ctx.lineWidth = 2
                ctx.beginPath()
                if (ctx.roundRect) {
                    ctx.roundRect(pipX, pipY, pipW, pipH, 12)
                } else {
                    ctx.rect(pipX, pipY, pipW, pipH)
                }
                ctx.stroke()
            }
        } else if (!isSharing && isMainVideoReady && drawSource && activeRemoteVideos.length === 1) {
            // ── Mode B: Studio Interview Split-Screen (Host + Guest side-by-side) ──
            ctx.fillStyle = '#070b14'
            ctx.fillRect(0, 0, width, height)

            const margin = 28
            const gap = 20
            const boxW = Math.round((width - (margin * 2) - gap) / 2)
            const boxH = Math.round(boxW * (9 / 16))
            const boxY = Math.round((height - boxH) / 2)
            const boxX1 = margin
            const boxX2 = margin + boxW + gap

            // Draw Tile 1 (Host)
            ctx.save()
            ctx.beginPath()
            if (ctx.roundRect) ctx.roundRect(boxX1, boxY, boxW, boxH, 14)
            else ctx.rect(boxX1, boxY, boxW, boxH)
            ctx.clip()
            ctx.drawImage(drawSource, boxX1, boxY, boxW, boxH)
            ctx.restore()

            ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)'
            ctx.lineWidth = 2
            ctx.beginPath()
            if (ctx.roundRect) ctx.roundRect(boxX1, boxY, boxW, boxH, 14)
            else ctx.rect(boxX1, boxY, boxW, boxH)
            ctx.stroke()

            // Tile 1 Lower-Third Label
            ctx.fillStyle = 'rgba(15, 23, 42, 0.82)'
            ctx.beginPath()
            if (ctx.roundRect) ctx.roundRect(boxX1 + 14, boxY + boxH - 36, 140, 26, 6)
            else ctx.rect(boxX1 + 14, boxY + boxH - 36, 140, 26)
            ctx.fill()
            ctx.fillStyle = '#ffffff'
            ctx.font = '600 11px system-ui, sans-serif'
            ctx.fillText('🎙️ Host / Speaker', boxX1 + 22, boxY + boxH - 19)

            // Draw Tile 2 (Remote Guest)
            const guestElem = activeRemoteVideos[0].video
            ctx.save()
            ctx.beginPath()
            if (ctx.roundRect) ctx.roundRect(boxX2, boxY, boxW, boxH, 14)
            else ctx.rect(boxX2, boxY, boxW, boxH)
            ctx.clip()
            ctx.drawImage(guestElem, boxX2, boxY, boxW, boxH)
            ctx.restore()

            ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)'
            ctx.lineWidth = 2
            ctx.beginPath()
            if (ctx.roundRect) ctx.roundRect(boxX2, boxY, boxW, boxH, 14)
            else ctx.rect(boxX2, boxY, boxW, boxH)
            ctx.stroke()

            // Tile 2 Lower-Third Label
            ctx.fillStyle = 'rgba(15, 23, 42, 0.82)'
            ctx.beginPath()
            if (ctx.roundRect) ctx.roundRect(boxX2 + 14, boxY + boxH - 36, 140, 26, 6)
            else ctx.rect(boxX2 + 14, boxY + boxH - 36, 140, 26)
            ctx.fill()
            ctx.fillStyle = '#ffffff'
            ctx.font = '600 11px system-ui, sans-serif'
            ctx.fillText('👤 Guest Speaker', boxX2 + 22, boxY + boxH - 19)

        } else if (isMainVideoReady && drawSource) {
            // ── Mode C: Solo Centered Camera Broadcast ──
            ctx.fillStyle = '#0b0f19'
            ctx.fillRect(0, 0, width, height)

            const vWidth = drawSource.videoWidth
            const vHeight = drawSource.videoHeight
            const scale = Math.min(width / vWidth, height / vHeight)
            const drawW = vWidth * scale
            const drawH = vHeight * scale
            const drawX = (width - drawW) / 2
            const drawY = (height - drawH) / 2

            ctx.drawImage(drawSource, drawX, drawY, drawW, drawH)
        } else {
            // ── Mode D: Elegant Studio Standby Broadcast Graphic ──
            const gradient = ctx.createLinearGradient(0, 0, width, height)
            gradient.addColorStop(0, '#0a0f1d')
            gradient.addColorStop(0.5, '#0f172a')
            gradient.addColorStop(1, '#020617')
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, width, height)

            const radialGlow = ctx.createRadialGradient(width / 2, height / 2 - 30, 20, width / 2, height / 2 - 30, 260)
            radialGlow.addColorStop(0, 'rgba(59, 130, 246, 0.20)')
            radialGlow.addColorStop(0.6, 'rgba(99, 102, 241, 0.06)')
            radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
            ctx.fillStyle = radialGlow
            ctx.beginPath()
            ctx.arc(width / 2, height / 2 - 30, 260, 0, Math.PI * 2)
            ctx.fill()

            // Centered Microphone / Host Broadcast Badge
            const avatarY = height / 2 - 80
            ctx.fillStyle = 'rgba(30, 41, 59, 0.85)'
            ctx.beginPath()
            ctx.arc(width / 2, avatarY, 44, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)'
            ctx.lineWidth = 2
            ctx.stroke()

            ctx.font = '32px system-ui, -apple-system, sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('🎙️', width / 2, avatarY)

            // Meeting Title
            ctx.textBaseline = 'alphabetic'
            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 28px system-ui, -apple-system, sans-serif'
            const title = meetingInfo?.title || 'Instant Meeting'
            ctx.fillText(title, width / 2, height / 2 + 10)

            // Status Badge Pill
            const pillW = 280
            const pillH = 34
            const pillX = width / 2 - pillW / 2
            const pillY = height / 2 + 28
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
            ctx.beginPath()
            if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 17)
            else ctx.rect(pillX, pillY, pillW, pillH)
            ctx.fill()
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'
            ctx.lineWidth = 1.2
            ctx.stroke()

            // Green Live Audio Indicator Dot inside pill
            ctx.fillStyle = '#22c55e'
            ctx.beginPath()
            ctx.arc(pillX + 24, pillY + 17, 4.5, 0, Math.PI * 2)
            ctx.fill()

            ctx.fillStyle = '#e2e8f0'
            ctx.font = '600 13px system-ui, -apple-system, sans-serif'
            ctx.fillText('Live Audio Active • Camera Inactive', pillX + pillW / 2 + 8, pillY + 22)

            // Helpful instruction
            ctx.fillStyle = '#94a3b8'
            ctx.font = '400 14px system-ui, -apple-system, sans-serif'
            ctx.fillText('Turn ON camera or screen share in JTS Meet to show video', width / 2, height / 2 + 88)
            ctx.textAlign = 'left'
        }

        // ── Persistent Broadcast Overlays ──
        // Top-Right Live Broadcast Studio Watermark Badge
        const badgeW = 155
        const badgeH = 34
        const badgeX = width - badgeW - 24
        const badgeY = 24

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
        ctx.beginPath()
        if (ctx.roundRect) {
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8)
        } else {
            ctx.rect(badgeX, badgeY, badgeW, badgeH)
        }
        ctx.fill()
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'
        ctx.lineWidth = 1.2
        ctx.stroke()

        // Pulsing Red Live Dot
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(badgeX + 18, badgeY + 17, 5, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#ffffff'
        ctx.font = '700 12px system-ui, -apple-system, sans-serif'
        ctx.fillText('LIVE • JTS MEET', badgeX + 32, badgeY + 21)

        // Bottom-Left Meeting Title Lower-Third Badge
        const meetingTitle = meetingInfo?.title || 'Live Conference'
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'
        ctx.beginPath()
        if (ctx.roundRect) {
            ctx.roundRect(24, height - 54, 260, 32, 16)
        } else {
            ctx.rect(24, height - 54, 260, 32)
        }
        ctx.fill()
        ctx.fillStyle = '#e2e8f0'
        ctx.font = '600 12px system-ui, -apple-system, sans-serif'
        ctx.fillText(`🎙️ ${meetingTitle.slice(0, 28)}`, 38, height - 34)

        // ── 4. Broadcast Lower-Third Live Ticker Bar (if enabled) ──
        if (showLiveStreamTickerRef.current && liveStreamTickerTextRef.current) {
            const barH = 38
            const barY = height - barH
            ctx.fillStyle = 'rgba(11, 15, 25, 0.95)'
            ctx.fillRect(0, barY, width, barH)
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.moveTo(0, barY)
            ctx.lineTo(width, barY)
            ctx.stroke()

            // Left Red LIVE Tag
            const tagW = 90
            ctx.fillStyle = '#ef4444'
            ctx.fillRect(0, barY, tagW, barH)
            ctx.fillStyle = '#ffffff'
            ctx.font = '800 11px system-ui, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('LIVE UPDATE', tagW / 2, barY + 24)

            // Ticker Text
            ctx.textAlign = 'left'
            ctx.fillStyle = '#f8fafc'
            ctx.font = '600 14px system-ui, -apple-system, sans-serif'
            ctx.fillText(liveStreamTickerTextRef.current, tagW + 20, barY + 24)
        }
    }, [getActiveLiveStream, getCameraOnlyStream, meetingInfo, screenSharingUserId, screenSharingUserIds, remoteStreams, localStream])

    // Keep live broadcast canvas renderer ref synced across every render & stream update
    useEffect(() => {
        renderLiveCanvasFrameRef.current = renderLiveCanvasFrame
    })

    // Master Audio Mixer with Studio Dynamics Compressor: Host Mic + All Remote Participants
    const syncLiveStreamAudio = useCallback(() => {
        const audioCtx = liveStreamAudioCtxRef.current
        const dest = liveStreamAudioDestRef.current
        if (!audioCtx || !dest || audioCtx.state === 'closed') return

        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {})
        }

        const activeSources = liveStreamAudioSourcesRef.current

        // If Standby Mode is active, mute audio output to YouTube stream
        if (liveStreamStandbyRef.current) {
            for (const entry of activeSources.values()) {
                try { entry.node.disconnect() } catch (_) {}
            }
            activeSources.clear()
            return
        }

        // Master Dynamics Compressor prevents voice clipping and volume surges
        let compressor = liveStreamCompressorRef.current
        if (!compressor || (compressor as any).context !== audioCtx) {
            try {
                if (compressor) compressor.disconnect()
            } catch (_) {}
            compressor = audioCtx.createDynamicsCompressor()
            compressor.threshold.setValueAtTime(-20, audioCtx.currentTime)
            compressor.knee.setValueAtTime(20, audioCtx.currentTime)
            compressor.ratio.setValueAtTime(6, audioCtx.currentTime)
            compressor.attack.setValueAtTime(0.003, audioCtx.currentTime)
            compressor.release.setValueAtTime(0.25, audioCtx.currentTime)
            compressor.connect(dest)
            liveStreamCompressorRef.current = compressor
        }

        const neededStreams: { id: string; stream: MediaStream }[] = []

        // 1. Host local mic or tab audio
        const hostStream = localStream || activeLocalStream || cameraStream
        if (hostStream && hostStream.getAudioTracks().length > 0) {
            neededStreams.push({ id: '__host__', stream: hostStream })
        }

        // 2. All remote participants' audio
        if (remoteStreams) {
            for (const [userId, stream] of Object.entries(remoteStreams)) {
                if (stream && stream.getAudioTracks().length > 0) {
                    neededStreams.push({ id: `remote_${userId}`, stream })
                }
            }
        }

        const currentIds = new Set(neededStreams.map(s => s.id))

        // Disconnect obsolete audio sources
        for (const [sourceId, entry] of activeSources.entries()) {
            if (!currentIds.has(sourceId)) {
                try {
                    entry.node.disconnect()
                } catch (_) {}
                activeSources.delete(sourceId)
            }
        }

        // Connect new or updated audio sources to the compressor
        for (const { id, stream } of neededStreams) {
            const track = stream.getAudioTracks()[0]
            if (!track) continue

            const existing = activeSources.get(id)
            if (existing) {
                if (existing.trackId !== track.id || (existing.node as any).context !== audioCtx) {
                    try {
                        existing.node.disconnect()
                    } catch (_) {}
                    try {
                        const node = audioCtx.createMediaStreamSource(stream)
                        node.connect(compressor)
                        activeSources.set(id, { node, trackId: track.id })
                    } catch (err) {
                        console.warn('[LiveStream] Audio reconnect failed:', err)
                    }
                }
            } else {
                try {
                    const node = audioCtx.createMediaStreamSource(stream)
                    node.connect(compressor)
                    activeSources.set(id, { node, trackId: track.id })
                } catch (err) {
                    console.warn('[LiveStream] Audio connect failed:', err)
                }
            }
        }
    }, [localStream, activeLocalStream, cameraStream, remoteStreams])

    // Synchronize audio mixer continuously during live stream
    useEffect(() => {
        if (isLiveStreaming) {
            syncLiveStreamAudio()
        }
    }, [isLiveStreaming, syncLiveStreamAudio, localStream, remoteStreams])

    // Respond to server reconnection request to emit fresh EBML header & keyframe
    useEffect(() => {
        if (!socket) return

        const handleRequestKeyframe = () => {
            console.log('[LiveStream] Server requested fresh stream keyframe & EBML header')
            if (liveStreamRecorderRef.current && liveStreamRecorderRef.current.state === 'recording') {
                try {
                    const videoTrack = liveStreamCombinedStreamRef.current?.getVideoTracks()[0]
                    if (videoTrack && (videoTrack as any).requestFrame) {
                        (videoTrack as any).requestFrame()
                    }
                    liveStreamRecorderRef.current.requestData()
                } catch (_) {}
            }
        }

        socket.on('meeting:livestream-request-keyframe', handleRequestKeyframe)
        return () => {
            socket.off('meeting:livestream-request-keyframe', handleRequestKeyframe)
        }
    }, [socket, isLiveStreaming])

    // Cleanup resources on unmount
    useEffect(() => {
        return () => {
            if (liveStreamIntervalRef.current) {
                clearInterval(liveStreamIntervalRef.current)
                liveStreamIntervalRef.current = null
            }
            if (liveStreamWorkerRef.current) {
                try {
                    liveStreamWorkerRef.current.postMessage('stop')
                    liveStreamWorkerRef.current.terminate()
                } catch (_) {}
                liveStreamWorkerRef.current = null
            }
            if (liveStreamRecorderRef.current && liveStreamRecorderRef.current.state !== 'inactive') {
                try {
                    liveStreamRecorderRef.current.stop()
                } catch (_) {}
                liveStreamRecorderRef.current = null
            }
            if (liveStreamVideoElemRef.current) {
                liveStreamVideoElemRef.current.srcObject = null
                liveStreamVideoElemRef.current.remove()
                liveStreamVideoElemRef.current = null
            }
            if (liveStreamCamVideoElemRef.current) {
                liveStreamCamVideoElemRef.current.srcObject = null
                liveStreamCamVideoElemRef.current.remove()
                liveStreamCamVideoElemRef.current = null
            }
            for (const entry of liveStreamRemoteVideosRef.current.values()) {
                try {
                    entry.video.srcObject = null
                    entry.video.remove()
                } catch (_) {}
            }
            liveStreamRemoteVideosRef.current.clear()
            if (liveStreamCombinedStreamRef.current) {
                liveStreamCombinedStreamRef.current.getTracks().forEach(t => t.stop())
                liveStreamCombinedStreamRef.current = null
            }
            if (liveStreamAudioCtxRef.current && liveStreamAudioCtxRef.current.state !== 'closed') {
                try {
                    liveStreamAudioCtxRef.current.close()
                } catch (_) {}
                liveStreamAudioCtxRef.current = null
            }
            liveStreamCompressorRef.current = null
        }
    }, [])

    // Auto-resume live stream studio if host reloaded or refreshed the page
    useEffect(() => {
        const activeMeetingId = meetingId || meetingInput
        if (!activeMeetingId || isLiveStreaming) return

        try {
            const saved = sessionStorage.getItem(`jts_live_${activeMeetingId}`)
            if (saved) {
                const parsedConfig = JSON.parse(saved)
                if (parsedConfig && parsedConfig.streamKey) {
                    const hasMedia = !!(localStream || activeLocalStream || cameraStream)
                    if (hasMedia) {
                        console.log('[LiveStream] Resuming live broadcast session after page reload...')
                        handleStartLiveStream(parsedConfig)
                    }
                }
            }
        } catch (_) {}
    }, [meetingId, meetingInput, isLiveStreaming, localStream, activeLocalStream, cameraStream])

    // RTMP Live Stream Studio
    const handleStartLiveStream = async (config: LiveStreamConfig) => {
        setLiveStreamConfig(config)
        setIsLiveStreaming(true)
        const activeMeetingId = meetingId || meetingInput

        try {
            sessionStorage.setItem(`jts_live_${activeMeetingId}`, JSON.stringify(config))
        } catch (_) {}

        socket?.emit('meeting:livestream-toggle', {
            meetingId: activeMeetingId,
            isStreaming: true,
            platform: config.platform,
            broadcastTitle: config.broadcastTitle,
            streamUrl: config.serverUrl,
            streamKey: config.streamKey,
            resolution: config.resolution,
            bitrate: config.bitrate
        })

        try {
            // 1. Audio Pipeline: Master Web Audio API Mixer
            if (liveStreamCompressorRef.current) {
                try { liveStreamCompressorRef.current.disconnect() } catch (_) {}
                liveStreamCompressorRef.current = null
            }
            if (liveStreamAudioCtxRef.current && liveStreamAudioCtxRef.current.state !== 'closed') {
                try { liveStreamAudioCtxRef.current.close() } catch (_) {}
            }
            liveStreamAudioSourcesRef.current.clear()

            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {})
            }
            const dest = audioCtx.createMediaStreamDestination()

            // Continuous silent oscillator clock keeps audio timestamps flowing smoothly
            const osc = audioCtx.createConstantSource()
            osc.connect(dest)
            osc.start()

            liveStreamAudioCtxRef.current = audioCtx
            liveStreamAudioDestRef.current = dest
            liveStreamAudioSourcesRef.current = new Map()

            syncLiveStreamAudio()

            // 2. Video Pipeline: Dedicated Hardware-Decoded DOM Video Element + Studio Canvas
            const width = config.resolution === '1080p' ? 1920 : 1280
            const height = config.resolution === '1080p' ? 1080 : 720

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const initCtx = canvas.getContext('2d', { alpha: false, desynchronized: true })
            if (initCtx) {
                initCtx.fillStyle = '#0b0f19'
                initCtx.fillRect(0, 0, width, height)
            }
            liveStreamCanvasRef.current = canvas

            // CRITICAL: Append video elements to DOM (rendered in viewport) with real size and 0.01 opacity so Chromium keeps hardware decoding active even when tab is backgrounded
            if (liveStreamVideoElemRef.current) {
                liveStreamVideoElemRef.current.remove()
            }
            const videoElem = document.createElement('video')
            videoElem.muted = true
            videoElem.playsInline = true
            videoElem.autoplay = true
            videoElem.setAttribute('playsinline', 'true')
            videoElem.setAttribute('webkit-playsinline', 'true')
            videoElem.style.position = 'fixed'
            videoElem.style.bottom = '4px'
            videoElem.style.right = '4px'
            videoElem.style.width = '160px'
            videoElem.style.height = '90px'
            videoElem.style.opacity = '0.01'
            videoElem.style.pointerEvents = 'none'
            videoElem.style.zIndex = '99999'
            document.body.appendChild(videoElem)
            liveStreamVideoElemRef.current = videoElem

            if (liveStreamCamVideoElemRef.current) {
                liveStreamCamVideoElemRef.current.remove()
            }
            const camVideoElem = document.createElement('video')
            camVideoElem.muted = true
            camVideoElem.playsInline = true
            camVideoElem.autoplay = true
            camVideoElem.setAttribute('playsinline', 'true')
            camVideoElem.setAttribute('webkit-playsinline', 'true')
            camVideoElem.style.position = 'fixed'
            camVideoElem.style.bottom = '4px'
            camVideoElem.style.right = '170px'
            camVideoElem.style.width = '160px'
            camVideoElem.style.height = '90px'
            camVideoElem.style.opacity = '0.01'
            camVideoElem.style.pointerEvents = 'none'
            camVideoElem.style.zIndex = '99999'
            document.body.appendChild(camVideoElem)
            liveStreamCamVideoElemRef.current = camVideoElem

            // Pre-warm the video elements with active tracks BEFORE starting recorder
            const activeStream = getActiveLiveStream()
            const initialTrack = activeStream?.getVideoTracks().find(t => t.readyState === 'live' && !(t as any).isDummy) || activeStream?.getVideoTracks()[0]
            if (activeStream && initialTrack) {
                liveStreamActiveTrackIdRef.current = initialTrack.id
                videoElem.srcObject = activeStream
                try {
                    await videoElem.play()
                } catch (_) {}

                // Quick wait to ensure video element has decoded first frame
                if (videoElem.readyState < 2) {
                    await new Promise(res => {
                        const onLoaded = () => {
                            videoElem.removeEventListener('loadeddata', onLoaded)
                            videoElem.removeEventListener('canplay', onLoaded)
                            res(true)
                        }
                        videoElem.addEventListener('loadeddata', onLoaded)
                        videoElem.addEventListener('canplay', onLoaded)
                        setTimeout(res, 300)
                    })
                }
            }

            const initialCamStream = getCameraOnlyStream()
            const initialCamTrack = initialCamStream?.getVideoTracks().find(t => t.readyState === 'live' && !(t as any).isDummy) || initialCamStream?.getVideoTracks()[0]
            if (initialCamStream && initialCamTrack) {
                liveStreamCamActiveTrackIdRef.current = initialCamTrack.id
                camVideoElem.srcObject = initialCamStream
                try {
                    await camVideoElem.play()
                } catch (_) {}
            }

            // Draw initial frame onto canvas before starting recorder
            renderLiveCanvasFrameRef.current ? renderLiveCanvasFrameRef.current() : renderLiveCanvasFrame()

            // Start unthrottled background Web Worker timer so rendering never pauses when tab is in background
            let workerStarted = false
            try {
                const workerScript = `
                    let timerId = null;
                    self.onmessage = function(e) {
                        if (e.data === 'start') {
                            if (timerId) clearInterval(timerId);
                            timerId = setInterval(function() {
                                self.postMessage('tick');
                            }, 1000 / 30);
                        } else if (e.data === 'stop') {
                            if (timerId) clearInterval(timerId);
                            timerId = null;
                        }
                    };
                `
                const blob = new Blob([workerScript], { type: 'application/javascript' })
                const workerUrl = URL.createObjectURL(blob)
                const worker = new Worker(workerUrl)
                worker.onmessage = () => {
                    if (renderLiveCanvasFrameRef.current) {
                        renderLiveCanvasFrameRef.current()
                    }
                }
                worker.postMessage('start')
                liveStreamWorkerRef.current = worker
                workerStarted = true
            } catch (wErr) {
                console.warn('[LiveStream] Web Worker fallback to setInterval:', wErr)
            }

            // Only use setInterval fallback if Web Worker failed to start (avoid double 60fps choking)
            if (!workerStarted) {
                const intervalId = setInterval(() => {
                    if (renderLiveCanvasFrameRef.current) {
                        renderLiveCanvasFrameRef.current()
                    }
                }, 1000 / 30)
                liveStreamIntervalRef.current = intervalId
            }

            // Capture 30fps canvas stream
            const canvasStream: MediaStream = (canvas as any).captureStream
                ? (canvas as any).captureStream(30)
                : ((canvas as any).mozCaptureStream ? (canvas as any).mozCaptureStream(30) : new MediaStream())

            const videoTrack = canvasStream.getVideoTracks()[0]
            const audioTrack = dest.stream.getAudioTracks()[0]

            const combinedStream = new MediaStream()
            if (videoTrack) combinedStream.addTrack(videoTrack)
            if (audioTrack) combinedStream.addTrack(audioTrack)
            liveStreamCombinedStreamRef.current = combinedStream

            // Codecs: Prioritize H.264 in WebM container (prevents VP8 canvas alpha_mode:1 SIGSEGV crash in FFmpeg)
            let mimeType = 'video/webm;codecs=h264,opus'
            if (typeof MediaRecorder !== 'undefined') {
                const candidates = [
                    'video/webm;codecs=h264,opus',
                    'video/webm;codecs=h264',
                    'video/webm;codecs=avc1,opus',
                    'video/webm;codecs=vp8,opus',
                    'video/webm;codecs=vp8',
                    'video/webm'
                ]
                for (const cand of candidates) {
                    if (MediaRecorder.isTypeSupported(cand)) {
                        mimeType = cand
                        break
                    }
                }
            }
            console.log('[LiveStream] Selected MediaRecorder MIME type:', mimeType)

            const streamBitrate = config.bitrate ? config.bitrate * 1000 : (config.resolution === '1080p' ? 4000000 : 2500000)
            let recorder: MediaRecorder
            try {
                recorder = new MediaRecorder(combinedStream, {
                    mimeType,
                    videoBitsPerSecond: streamBitrate,
                    videoKeyFrameIntervalDuration: 1000
                } as any)
            } catch (constructErr) {
                console.warn('[LiveStream] Fallback MediaRecorder constructor:', constructErr)
                recorder = new MediaRecorder(combinedStream, {
                    mimeType,
                    videoBitsPerSecond: streamBitrate
                })
            }

            recorder.ondataavailable = async (e) => {
                if (e.data && e.data.size > 0 && socket) {
                    try {
                        const buffer = await e.data.arrayBuffer()
                        socket.emit('meeting:livestream-chunk', {
                            meetingId: activeMeetingId,
                            chunk: buffer
                        })
                    } catch (chunkErr) {
                        console.warn('[LiveStream] Chunk buffer conversion failed:', chunkErr)
                    }
                }
            }

            recorder.start(500)
            liveStreamRecorderRef.current = recorder
            addToast(`Broadcast studio live! Streaming to ${config.platform.toUpperCase()} (${config.resolution}).`, 'success')
        } catch (streamErr) {
            console.warn('[LiveStream] Client recorder error:', streamErr)
            addToast('Failed to start live stream recorder.', 'danger')
        }
    }

    const handleStopLiveStream = () => {
        setIsLiveStreaming(false)
        setLiveStreamConfig(null)

        try {
            sessionStorage.removeItem(`jts_live_${meetingId || meetingInput}`)
        } catch (_) {}

        if (liveStreamIntervalRef.current) {
            clearInterval(liveStreamIntervalRef.current)
            liveStreamIntervalRef.current = null
        }

        if (liveStreamWorkerRef.current) {
            try {
                liveStreamWorkerRef.current.postMessage('stop')
                liveStreamWorkerRef.current.terminate()
            } catch (_) {}
            liveStreamWorkerRef.current = null
        }

        if (liveStreamRecorderRef.current && liveStreamRecorderRef.current.state !== 'inactive') {
            try {
                liveStreamRecorderRef.current.stop()
            } catch (_) {}
            liveStreamRecorderRef.current = null
        }

        if (liveStreamCombinedStreamRef.current) {
            liveStreamCombinedStreamRef.current.getTracks().forEach(t => t.stop())
            liveStreamCombinedStreamRef.current = null
        }

        if (liveStreamVideoElemRef.current) {
            liveStreamVideoElemRef.current.srcObject = null
            liveStreamVideoElemRef.current.remove()
            liveStreamVideoElemRef.current = null
        }

        if (liveStreamCamVideoElemRef.current) {
            liveStreamCamVideoElemRef.current.srcObject = null
            liveStreamCamVideoElemRef.current.remove()
            liveStreamCamVideoElemRef.current = null
        }

        for (const entry of liveStreamRemoteVideosRef.current.values()) {
            try {
                entry.video.srcObject = null
                entry.video.remove()
            } catch (_) {}
        }
        liveStreamRemoteVideosRef.current.clear()

        for (const entry of liveStreamAudioSourcesRef.current.values()) {
            try {
                entry.node.disconnect()
            } catch (_) {}
        }
        liveStreamAudioSourcesRef.current.clear()

        if (liveStreamCompressorRef.current) {
            try {
                liveStreamCompressorRef.current.disconnect()
            } catch (_) {}
            liveStreamCompressorRef.current = null
        }

        if (liveStreamAudioCtxRef.current && liveStreamAudioCtxRef.current.state !== 'closed') {
            try {
                liveStreamAudioCtxRef.current.close()
            } catch (_) {}
            liveStreamAudioCtxRef.current = null
        }

        socket?.emit('meeting:livestream-toggle', {
            meetingId: meetingId || meetingInput,
            isStreaming: false
        })
        addToast('Live stream broadcast stopped.', 'info')
    }

    return {
        isRecording,
        setIsRecording,
        isCloudRecording,
        setIsCloudRecording,
        toggleCloudRecording,
        startRecording,
        stopRecording,
        isLiveStreaming,
        setIsLiveStreaming,
        liveStreamConfig,
        setLiveStreamConfig,
        handleStartLiveStream,
        handleStopLiveStream,
        cloudRecordRecorderRef,
        isLiveStreamStandby,
        toggleLiveStreamStandby: () => {
            setIsLiveStreamStandby(prev => {
                const next = !prev
                liveStreamStandbyRef.current = next
                if (next) {
                    addToast('Broadcast Standby: Feed paused on stream.', 'info')
                } else {
                    addToast('Broadcast Live: Video feed resumed.', 'success')
                }
                syncLiveStreamAudio()
                return next
            })
        },
        liveStreamLayoutMode,
        setLiveStreamLayoutMode: (mode: 'auto' | 'spotlight' | 'grid' | 'pip') => {
            setLiveStreamLayoutMode(mode)
            liveStreamLayoutModeRef.current = mode
        },
        liveStreamTickerText,
        setLiveStreamTickerText: (text: string) => {
            setLiveStreamTickerText(text)
            liveStreamTickerTextRef.current = text
        },
        showLiveStreamTicker,
        toggleLiveStreamTicker: () => {
            setShowLiveStreamTicker(prev => {
                const next = !prev
                showLiveStreamTickerRef.current = next
                return next
            })
        },
        liveStreamCombinedStreamRef
    }
}
