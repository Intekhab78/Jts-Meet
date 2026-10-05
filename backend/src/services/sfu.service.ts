import { AccessToken } from 'livekit-server-sdk'
import { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from '../config'

export interface SfuTokenResult {
    sfuEnabled: boolean
    livekitUrl?: string
    token?: string
    message?: string
}

export class SfuService {
    /**
     * Check if LiveKit SFU credentials are configured
     */
    public isConfigured(): boolean {
        return Boolean(LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL)
    }

    /**
     * Generate a signed LiveKit SFU participant access token
     */
    public async generateParticipantToken(params: {
        meetingId: string
        userId: string
        displayName: string
        isHost?: boolean
    }): Promise<SfuTokenResult> {
        if (!this.isConfigured()) {
            return {
                sfuEnabled: false,
                message: 'SFU is not configured; using mesh WebRTC fallback'
            }
        }

        try {
            const { meetingId, userId, displayName, isHost = false } = params

            const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
                identity: userId,
                name: displayName || 'Participant',
                ttl: '6h'
            })

            at.addGrant({
                roomJoin: true,
                room: meetingId,
                canPublish: true,
                canSubscribe: true,
                canPublishData: true,
                roomAdmin: isHost,
                roomCreate: isHost
            })

            const token = await at.toJwt()

            return {
                sfuEnabled: true,
                livekitUrl: LIVEKIT_URL,
                token
            }
        } catch (err: any) {
            console.warn('[SfuService] Token generation failed:', err.message)
            return {
                sfuEnabled: false,
                message: 'Failed to issue SFU token, fallback to mesh WebRTC'
            }
        }
    }
}

export const sfuService = new SfuService()
