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

    // Master Web Audio API Multi-Source Mixer refs with Broadcast Dynamics Compressor
    const liveStreamAudioCtxRef = useRef<AudioContext | null>(null)
    const liveStreamAudioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
    const liveStreamCompressorRef = useRef<DynamicsCompressorNode | null>(null)
    const liveStreamAudioSourcesRef = useRef<Map<string, { node: MediaStreamAudioSourceNode; trackId: string }>>(new Map())

    // Dynamically pick the active broadcast stream: screen share vs camera
    const getActiveLiveStream = useCallback(() => {
        // 1. If screen sharing is active:
        if (screenSharingUserId) {
            if (screenSharingUserId === 'me') {
                const screenCandidate = localStream || activeLocalStream
                if (screenCandidate && screenCandidate.getVideoTracks().length > 0) {
                    return screenCandidate
                }
            } else if (remoteStreams && remoteStreams[screenSharingUserId]) {
                const remoteScreen = remoteStreams[screenSharingUserId]
                if (remoteScreen.getVideoTracks().length > 0) {
                    return remoteScreen
                }
            }
        }

        // 2. Fallback to Camera
        const camCandidate = cameraStream || localStream || activeLocalStream
        if (camCandidate && camCandidate.getVideoTracks().length > 0) {
            return camCandidate
        }

        return null
    }, [screenSharingUserId, remoteStreams, cameraStream, localStream, activeLocalStream])

    // Get secondary camera stream for Picture-in-Picture (PiP) when screenshare is active
    const getCameraOnlyStream = useCallback(() => {
        const camCandidate = cameraStream || localStream || activeLocalStream
        if (camCandidate && camCandidate.getVideoTracks().length > 0) {
            return camCandidate
        }
        return null
    }, [cameraStream, localStream, activeLocalStream])

    // Draw frame onto broadcast studio canvas with dynamic switching, multi-participant split-screen & standby graphics
    const renderLiveCanvasFrame = useCallback(() => {
        const canvas = liveStreamCanvasRef.current
        const video = liveStreamVideoElemRef.current
        const camVideo = liveStreamCamVideoElemRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const activeStream = getActiveLiveStream()
        const currentVideoTrack = activeStream?.getVideoTracks()[0] || null

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
        }

        // Sync hidden PiP camera element when screenshare is active
        const isSharing = !!screenSharingUserId
        const camStream = isSharing ? getCameraOnlyStream() : null
        const camTrack = camStream?.getVideoTracks()[0] || null

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
        }

        // Sync hidden remote participant video elements for multi-person studio broadcasts
        const activeRemoteVideos: { id: string; video: HTMLVideoElement }[] = []
        if (!isSharing && remoteStreams) {
            for (const [rId, rStream] of Object.entries(remoteStreams)) {
                const rTrack = rStream?.getVideoTracks()[0]
                if (rTrack && rTrack.enabled && !rTrack.muted) {
                    let entry = liveStreamRemoteVideosRef.current.get(rId)
                    if (!entry) {
                        const elem = document.createElement('video')
                        elem.muted = true
                        elem.playsInline = true
                        elem.autoplay = true
                        elem.setAttribute('playsinline', 'true')
                        elem.style.position = 'fixed'
                        elem.style.top = '-9999px'
                        elem.style.left = '-9999px'
                        elem.style.width = '320px'
                        elem.style.height = '180px'
                        elem.style.opacity = '0'
                        elem.style.pointerEvents = 'none'
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
                    if (entry.video.readyState >= 2 && entry.video.videoWidth > 0) {
                        activeRemoteVideos.push({ id: rId, video: entry.video })
                    }
                }
            }
        }

        const width = canvas.width
        const height = canvas.height
        const isMainVideoReady = video && video.readyState >= 2 && video.videoWidth > 0 && currentVideoTrack && currentVideoTrack.enabled && !currentVideoTrack.muted

        if (isSharing && isMainVideoReady) {
            // ── Mode A: Presentation Screenshare with Picture-in-Picture Inset ──
            ctx.fillStyle = '#0b0f19'
            ctx.fillRect(0, 0, width, height)

            const vWidth = video.videoWidth
            const vHeight = video.videoHeight
            const scale = Math.min(width / vWidth, height / vHeight)
            const drawW = vWidth * scale
            const drawH = vHeight * scale
            const drawX = (width - drawW) / 2
            const drawY = (height - drawH) / 2

            ctx.drawImage(video, drawX, drawY, drawW, drawH)

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
            if (camVideo && camVideo.readyState >= 2 && camTrack && camTrack.enabled && !camTrack.muted) {
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
                ctx.drawImage(camVideo, pipX, pipY, pipW, pipH)
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
        } else if (!isSharing && isMainVideoReady && activeRemoteVideos.length === 1) {
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
            ctx.drawImage(video, boxX1, boxY, boxW, boxH)
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

        } else if (isMainVideoReady) {
            // ── Mode C: Solo Centered Camera Broadcast ──
            ctx.fillStyle = '#0b0f19'
            ctx.fillRect(0, 0, width, height)

            const vWidth = video.videoWidth
            const vHeight = video.videoHeight
            const scale = Math.min(width / vWidth, height / vHeight)
            const drawW = vWidth * scale
            const drawH = vHeight * scale
            const drawX = (width - drawW) / 2
            const drawY = (height - drawH) / 2

            ctx.drawImage(video, drawX, drawY, drawW, drawH)
        } else {
            // ── Mode D: Elegant Standby Broadcast Graphic ──
            const gradient = ctx.createLinearGradient(0, 0, width, height)
            gradient.addColorStop(0, '#0f172a')
            gradient.addColorStop(1, '#020617')
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, width, height)

            const radialGlow = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, 260)
            radialGlow.addColorStop(0, 'rgba(59, 130, 246, 0.12)')
            radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
            ctx.fillStyle = radialGlow
            ctx.beginPath()
            ctx.arc(width / 2, height / 2, 260, 0, Math.PI * 2)
            ctx.fill()

            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 28px system-ui, -apple-system, sans-serif'
            ctx.textAlign = 'center'
            const title = meetingInfo?.title || 'JTS Meet Live'
            ctx.fillText(title, width / 2, height / 2 - 16)

            ctx.fillStyle = '#94a3b8'
            ctx.font = '500 16px system-ui, -apple-system, sans-serif'
            ctx.fillText('Live Broadcast • Camera Inactive', width / 2, height / 2 + 20)
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
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 17)
        } else {
            ctx.rect(badgeX, badgeY, badgeW, badgeH)
        }
        ctx.fill()
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'
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
    }, [getActiveLiveStream, getCameraOnlyStream, meetingInfo, screenSharingUserId, remoteStreams])

    // Master Audio Mixer with Studio Dynamics Compressor: Host Mic + All Remote Participants
    const syncLiveStreamAudio = useCallback(() => {
        const audioCtx = liveStreamAudioCtxRef.current
        const dest = liveStreamAudioDestRef.current
        if (!audioCtx || !dest || audioCtx.state === 'closed') return

        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {})
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

        const activeSources = liveStreamAudioSourcesRef.current
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
                    liveStreamRecorderRef.current.stop()
                    setTimeout(() => {
                        if (isLiveStreaming && liveStreamCombinedStreamRef.current) {
                            try {
                                liveStreamRecorderRef.current?.start(500)
                            } catch (_) {}
                        }
                    }, 80)
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
            liveStreamCanvasRef.current = canvas

            // CRITICAL: Append video to DOM (hidden offscreen) so Chromium enables full hardware decoding
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
            videoElem.style.top = '-9999px'
            videoElem.style.left = '-9999px'
            videoElem.style.width = '320px'
            videoElem.style.height = '180px'
            videoElem.style.opacity = '0'
            videoElem.style.pointerEvents = 'none'
            document.body.appendChild(videoElem)
            liveStreamVideoElemRef.current = videoElem

            // Pre-warm the video element with active track BEFORE starting recorder
            const activeStream = getActiveLiveStream()
            const initialTrack = activeStream?.getVideoTracks()[0]
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

            // Draw initial frame onto canvas before starting recorder
            renderLiveCanvasFrame()

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
                    renderLiveCanvasFrame()
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
                    renderLiveCanvasFrame()
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

            // Standard WebM VP8 Codec: Linux FFmpeg native compatibility (prevents H.264 WebM SIGSEGV crashes)
            let mimeType = 'video/webm;codecs=vp8,opus'
            if (typeof MediaRecorder !== 'undefined') {
                if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
                    mimeType = 'video/webm;codecs=vp8,opus'
                } else if (MediaRecorder.isTypeSupported('video/webm')) {
                    mimeType = 'video/webm'
                } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264,opus')) {
                    mimeType = 'video/webm;codecs=h264,opus'
                }
            }

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
        cloudRecordRecorderRef
    }
}
