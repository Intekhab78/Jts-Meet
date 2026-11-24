import { API_BASE } from '../../../config'

export interface SfuStatusResponse {
    success: boolean
    sfuConfigured: boolean
    sfuReachable: boolean
    livekitUrl?: string
}

export interface SfuConnectCallbacks {
    onRemoteStream: (userId: string, stream: MediaStream) => void
    onRemoveStream: (userId: string) => void
    onDisconnected: () => void
}

/**
 * Hybrid LiveKit SFU client service (lazy-loaded on demand when room size >= 15 and SFU is reachable).
 * Keeps zero bundle overhead for normal <15 user P2P Mesh meetings.
 */
class SfuClientService {
    private room: any = null
    private remoteStreams = new Map<string, MediaStream>()
    private connecting = false

    async checkAvailability(): Promise<SfuStatusResponse> {
        try {
            const res = await fetch(`${API_BASE}/api/webrtc/sfu/status`)
            if (!res.ok) {
                return { success: false, sfuConfigured: false, sfuReachable: false }
            }
            return await res.json()
        } catch {
            return { success: false, sfuConfigured: false, sfuReachable: false }
        }
    }

    isConnected(): boolean {
        return Boolean(this.room && this.room.state === 'connected')
    }

    async connect(
        meetingId: string,
        localStream: MediaStream | null,
        displayName: string | undefined,
        callbacks: SfuConnectCallbacks
    ): Promise<boolean> {
        if (this.connecting || this.isConnected()) {
            return this.isConnected()
        }
        this.connecting = true

        try {
            const status = await this.checkAvailability()
            if (!status.sfuReachable) {
                return false
            }

            const authToken = localStorage.getItem('jts_guest_token') || localStorage.getItem('jts_token') || ''
            if (!authToken) {
                return false
            }

            const qs = displayName ? `?displayName=${encodeURIComponent(displayName)}` : ''
            const tokenRes = await fetch(`${API_BASE}/api/webrtc/sfu/token/${encodeURIComponent(meetingId)}${qs}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            })
            if (!tokenRes.ok) {
                return false
            }

            const tokenJson = await tokenRes.json()
            if (!tokenJson?.success || !tokenJson?.data?.token || !tokenJson?.data?.livekitUrl) {
                return false
            }

            const { Room, RoomEvent } = await import('livekit-client')
            const room = new Room({
                adaptiveStream: true,
                dynacast: true
            })

            const attachTrack = (participantIdentity: string, mediaStreamTrack: MediaStreamTrack) => {
                if (!participantIdentity || !mediaStreamTrack) return
                let stream = this.remoteStreams.get(participantIdentity)
                if (!stream) {
                    stream = new MediaStream()
                    this.remoteStreams.set(participantIdentity, stream)
                }
                const existing = stream.getTracks().find(t => t.id === mediaStreamTrack.id)
                if (!existing) {
                    // Replace older track of the same kind so camera <-> screen share stays clean
                    stream.getTracks()
                        .filter(t => t.kind === mediaStreamTrack.kind)
                        .forEach(old => stream!.removeTrack(old))
                    stream.addTrack(mediaStreamTrack)
                }
                callbacks.onRemoteStream(participantIdentity, new MediaStream(stream.getTracks()))
            }

            room.on(RoomEvent.TrackSubscribed, (track: any, _pub: any, participant: any) => {
                if (track?.mediaStreamTrack && participant?.identity) {
                    attachTrack(participant.identity, track.mediaStreamTrack)
                }
            })

            room.on(RoomEvent.TrackUnsubscribed, (track: any, _pub: any, participant: any) => {
                if (!participant?.identity || !track?.mediaStreamTrack) return
                const stream = this.remoteStreams.get(participant.identity)
                if (stream) {
                    stream.removeTrack(track.mediaStreamTrack)
                    callbacks.onRemoteStream(participant.identity, new MediaStream(stream.getTracks()))
                }
            })

            room.on(RoomEvent.ParticipantDisconnected, (participant: any) => {
                if (participant?.identity) {
                    this.remoteStreams.delete(participant.identity)
                    callbacks.onRemoveStream(participant.identity)
                }
            })

            room.on(RoomEvent.Disconnected, () => {
                this.remoteStreams.clear()
                this.room = null
                callbacks.onDisconnected()
            })

            await room.connect(tokenJson.data.livekitUrl, tokenJson.data.token)
            this.room = room

            // Publish local audio & video tracks to SFU
            if (localStream) {
                for (const track of localStream.getTracks()) {
                    if (track.readyState === 'live' && !(track as any).isDummy) {
                        await room.localParticipant.publishTrack(track).catch(() => {})
                    }
                }
            }

            return true
        } catch (err) {
            console.warn('[SFU] Connection unavailable, remaining on Adaptive Mesh P2P:', err)
            await this.disconnect()
            return false
        } finally {
            this.connecting = false
        }
    }

    async replaceTrack(newTrack: MediaStreamTrack | null, kind: 'audio' | 'video'): Promise<void> {
        if (!this.room || !this.isConnected()) return
        try {
            const publications = Array.from(this.room.localParticipant.trackPublications.values()) as any[]
            for (const pub of publications) {
                if (pub.kind === kind && pub.track) {
                    await this.room.localParticipant.unpublishTrack(pub.track).catch(() => {})
                }
            }
            if (newTrack && newTrack.readyState === 'live' && !(newTrack as any).isDummy) {
                await this.room.localParticipant.publishTrack(newTrack).catch(() => {})
            }
        } catch (err) {
            console.warn('[SFU] Failed to replace published track:', err)
        }
    }

    async disconnect(): Promise<void> {
        if (this.room) {
            try {
                await this.room.disconnect()
            } catch {}
            this.room = null
        }
        this.remoteStreams.clear()
    }
}

export const sfuService = new SfuClientService()
