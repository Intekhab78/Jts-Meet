export type SupportedConnector = 'slack' | 'teams' | 'discord' | 'calendar' | 'googledrive' | 'email' | 'zapier' | 'webhook'

export interface IntegrationsTabProps {
    token: string
    currentOrgId?: string
    planTier?: string
}

export interface DeliveryLog {
    timestamp: string
    eventType: string
    statusCode: number
    durationMs: number
    success: boolean
    responseBody?: string
    integrationId: string
    integrationName: string
    integrationType: string
    targetUrl: string
}

export interface WebhookIntegration {
    _id?: string
    id?: string
    name: string
    type: SupportedConnector
    url: string
    secret?: string
    status: 'active' | 'paused'
    events: string[]
    lastDeliveredAt?: string
    deliveryLogs?: any[]
}

export const SAMPLE_PAYLOADS: Record<string, any> = {
    'meeting.started': {
        event: 'meeting.started',
        timestamp: new Date().toISOString(),
        meeting: {
            id: 'room-exec-briefing',
            title: 'Q3 Enterprise Product Review & Strategy',
            host: {
                id: 'usr_admin99',
                name: 'Chief Admin',
                email: 'admin@jtsmeet.com'
            },
            joinUrl: 'https://meet.jtsmiddleeast.com/#room=room-exec-briefing',
            scheduledStartTime: new Date().toISOString(),
            roomType: 'conference_hall',
            features: {
                e2ee: true,
                aiTranscriberActive: true,
                cloudRecordingActive: true
            }
        }
    },
    'meeting.ended': {
        event: 'meeting.ended',
        timestamp: new Date().toISOString(),
        meeting: {
            id: 'room-exec-briefing',
            title: 'Q3 Enterprise Product Review & Strategy',
            durationMinutes: 47,
            totalParticipants: 14,
            endedBy: 'Chief Admin'
        }
    },
    'recording.ready': {
        event: 'recording.ready',
        timestamp: new Date().toISOString(),
        recording: {
            meetingId: 'room-exec-briefing',
            title: 'Q3 Enterprise Product Review & Strategy',
            downloadUrl: 'https://meet.jtsmiddleeast.com/recordings/vault/rec_98241a.mp4',
            fileSizeBytes: 142857140,
            durationSeconds: 2820,
            format: 'video/mp4',
            resolution: '1080p-60fps'
        }
    },
    'participant.joined': {
        event: 'participant.joined',
        timestamp: new Date().toISOString(),
        meetingId: 'room-exec-briefing',
        participant: {
            id: 'usr_sarah_lead',
            name: 'Sarah Jenkins',
            email: 'sarah.j@enterprise.com',
            role: 'co-host',
            ipAddress: '194.32.10.88'
        }
    },
    'ai.summary.completed': {
        event: 'ai.summary.completed',
        timestamp: new Date().toISOString(),
        meetingId: 'room-exec-briefing',
        aiReport: {
            sentimentScore: 'Highly Positive (92%)',
            actionItemsCount: 6,
            keyDecisions: [
                'Approved migration of legacy microservices to Kubernetes cluster.',
                'Greenlit Q4 APAC video relay server deployment.'
            ],
            transcriptionWordCount: 8412
        }
    }
}
