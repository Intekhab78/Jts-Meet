import crypto from 'crypto'
import https from 'https'
import http from 'http'
import { Integration, IIntegration, IntegrationEvent, IntegrationType } from './integration.model'

export interface CreateIntegrationDto {
    name: string
    type: IntegrationType
    url: string
    secret?: string
    events: IntegrationEvent[]
    config?: {
        channelName?: string
        googleFolderId?: string
        autoSyncRecordings?: boolean
    }
}

// In-memory mock fallback when MongoDB is disconnected in dev environment
const memoryIntegrations: any[] = []

export async function listIntegrations(userId: string, orgId?: string) {
    try {
        const query: any = orgId ? { organizationId: orgId } : { userId }
        const docs = await Integration.find(query).sort({ createdAt: -1 }).lean()
        if (docs && docs.length > 0) return docs
    } catch (err) {
        // Fallback to memory
    }

    if (orgId) {
        return memoryIntegrations.filter(i => i.organizationId === orgId)
    }
    return memoryIntegrations.filter(i => i.userId === userId)
}

export async function createIntegration(userId: string, orgId: string | undefined, dto: CreateIntegrationDto) {
    const item = {
        organizationId: orgId,
        userId,
        name: dto.name,
        type: dto.type,
        url: dto.url,
        secret: dto.secret || crypto.randomBytes(16).toString('hex'),
        events: dto.events || ['meeting.started', 'meeting.ended', 'recording.ready'],
        status: 'active' as const,
        config: dto.config || {},
        deliveryLogs: [],
        createdAt: new Date(),
        updatedAt: new Date()
    }

    try {
        const doc = await Integration.create(item)
        return doc
    } catch (err) {
        const memoryItem = { ...item, _id: 'mem_' + Date.now() }
        memoryIntegrations.push(memoryItem)
        return memoryItem
    }
}

export async function deleteIntegration(userId: string, id: string) {
    try {
        const res = await Integration.deleteOne({ _id: id })
        if (res.deletedCount > 0) return true
    } catch (err) {}

    const idx = memoryIntegrations.findIndex(i => i._id === id || i.id === id)
    if (idx !== -1) {
        memoryIntegrations.splice(idx, 1)
        return true
    }
    return false
}

export async function toggleIntegration(userId: string, id: string, status: 'active' | 'paused') {
    try {
        const doc = await Integration.findOneAndUpdate(
            { _id: id },
            { $set: { status, updatedAt: new Date() } },
            { new: true }
        )
        if (doc) return doc
    } catch (err) {}

    const item = memoryIntegrations.find(i => i._id === id || i.id === id)
    if (item) {
        item.status = status
        item.updatedAt = new Date()
        return item
    }
    return null
}

function sendHttpRequest(urlStr: string, body: string, headers: Record<string, string>): Promise<{ statusCode: number, responseBody: string, durationMs: number }> {
    return new Promise((resolve) => {
        const start = Date.now()
        try {
            const url = new URL(urlStr)
            const isHttps = url.protocol === 'https:'
            const client = isHttps ? https : http

            const options = {
                method: 'POST',
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    'User-Agent': 'JTS-Meet-Webhook-Dispatcher/1.0',
                    ...headers
                },
                timeout: 6000
            }

            const req = client.request(options, (res) => {
                let responseData = ''
                res.on('data', (chunk) => { responseData += chunk })
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode || 200,
                        responseBody: responseData.slice(0, 500),
                        durationMs: Date.now() - start
                    })
                })
            })

            req.on('error', (err) => {
                resolve({
                    statusCode: 502,
                    responseBody: 'Network error: ' + (err.message || 'Connection failed'),
                    durationMs: Date.now() - start
                })
            })

            req.on('timeout', () => {
                req.destroy()
                resolve({
                    statusCode: 504,
                    responseBody: 'Gateway Timeout (Request exceeded 6s)',
                    durationMs: Date.now() - start
                })
            })

            req.write(body)
            req.end()
        } catch (err: any) {
            resolve({
                statusCode: 400,
                responseBody: 'Invalid URL format: ' + err.message,
                durationMs: Date.now() - start
            })
        }
    })
}

function formatPayload(type: IntegrationType, eventType: IntegrationEvent, payloadData: any) {
    if (type === 'slack') {
        const title = `🚀 *JTS Meet Event: ${eventType}*`
        const text = `*Meeting:* ${payloadData.title || payloadData.meetingId || 'General Conference'}\n*Host:* ${payloadData.hostName || 'Organizer'}\n*Time:* ${new Date().toLocaleTimeString()}`
        return JSON.stringify({
            text: `[JTS Meet] ${eventType}: ${payloadData.title || 'Meeting Session'}`,
            blocks: [
                {
                    type: 'header',
                    text: { type: 'plain_text', text: '🎥 JTS Meet Enterprise Alert' }
                },
                {
                    type: 'section',
                    text: { type: 'mrkdwn', text: `${title}\n${text}` }
                },
                {
                    type: 'context',
                    elements: [
                        { type: 'mrkdwn', text: `Meeting ID: \`${payloadData.meetingId}\` | Secure Cloud Conference` }
                    ]
                }
            ]
        })
    }

    if (type === 'discord') {
        return JSON.stringify({
            username: 'JTS Meet Bot',
            avatar_url: 'https://meet.jtsmiddleeast.com/favicon.ico',
            embeds: [
                {
                    title: `JTS Meet Event: ${eventType.toUpperCase()}`,
                    description: `Conference Session: **${payloadData.title || payloadData.meetingId || 'Live Room'}**`,
                    color: 0x6366f1,
                    fields: [
                        { name: 'Meeting ID', value: `\`${payloadData.meetingId}\``, inline: true },
                        { name: 'Host', value: payloadData.hostName || 'Admin', inline: true },
                        { name: 'Timestamp', value: new Date().toISOString(), inline: false }
                    ],
                    footer: { text: 'JTS Meet Enterprise Integrations Hub' }
                }
            ]
        })
    }

    // Default Webhook / REST JSON
    return JSON.stringify({
        event: eventType,
        id: 'evt_' + Date.now(),
        timestamp: new Date().toISOString(),
        data: payloadData
    })
}

export async function testIntegration(userId: string, id: string) {
    let integration: any = null
    try {
        integration = await Integration.findById(id).lean()
    } catch (_) {}

    if (!integration) {
        integration = memoryIntegrations.find(i => i._id === id || i.id === id)
    }

    if (!integration) {
        throw new Error('Integration not found')
    }

    const testPayload = formatPayload(integration.type, 'meeting.started', {
        meetingId: 'room-demo-test',
        title: 'Q3 Enterprise Product Review (Test Simulation)',
        hostName: 'Test Administrator',
        participantsCount: 4
    })

    const timestamp = Date.now().toString()
    const signature = integration.secret 
        ? crypto.createHmac('sha256', integration.secret).update(timestamp + '.' + testPayload).digest('hex')
        : ''

    const result = await sendHttpRequest(integration.url, testPayload, {
        'x-jts-signature': signature,
        'x-jts-timestamp': timestamp,
        'x-jts-event': 'meeting.started'
    })

    const logEntry = {
        eventId: 'test_' + Date.now(),
        eventType: 'meeting.started' as IntegrationEvent,
        timestamp: new Date(),
        statusCode: result.statusCode,
        responseBody: result.responseBody,
        durationMs: result.durationMs,
        success: result.statusCode >= 200 && result.statusCode < 300
    }

    try {
        await Integration.updateOne(
            { _id: id },
            {
                $set: { lastDeliveredAt: new Date() },
                $push: { deliveryLogs: { $each: [logEntry], $slice: -20 } }
            }
        )
    } catch (_) {
        if (integration.deliveryLogs) {
            integration.deliveryLogs.unshift(logEntry)
            if (integration.deliveryLogs.length > 20) integration.deliveryLogs.pop()
        }
    }

    return {
        success: logEntry.success,
        statusCode: result.statusCode,
        durationMs: result.durationMs,
        responseBody: result.responseBody
    }
}

export async function dispatchWebhookEvent(orgId: string | undefined, eventType: IntegrationEvent, payloadData: any) {
    try {
        const query: any = {
            events: eventType,
            status: 'active'
        }
        if (orgId) {
            query.organizationId = orgId
        }

        let targets: any[] = []
        try {
            targets = await Integration.find(query).lean()
        } catch (_) {}

        if (!targets || targets.length === 0) {
            targets = memoryIntegrations.filter(i => 
                i.status === 'active' && 
                i.events.includes(eventType) && 
                (!orgId || i.organizationId === orgId)
            )
        }

        for (const item of targets) {
            const body = formatPayload(item.type, eventType, payloadData)
            const timestamp = Date.now().toString()
            const signature = item.secret 
                ? crypto.createHmac('sha256', item.secret).update(timestamp + '.' + body).digest('hex')
                : ''

            // Dispatch in background
            sendHttpRequest(item.url, body, {
                'x-jts-signature': signature,
                'x-jts-timestamp': timestamp,
                'x-jts-event': eventType
            }).then(res => {
                const log = {
                    eventId: 'evt_' + Date.now(),
                    eventType,
                    timestamp: new Date(),
                    statusCode: res.statusCode,
                    responseBody: res.responseBody,
                    durationMs: res.durationMs,
                    success: res.statusCode >= 200 && res.statusCode < 300
                }
                Integration.updateOne(
                    { _id: item._id },
                    {
                        $set: { lastDeliveredAt: new Date() },
                        $push: { deliveryLogs: { $each: [log], $slice: -20 } }
                    }
                ).catch(() => {})
            }).catch(() => {})
        }
    } catch (err) {
        console.error('Failed to dispatch webhook event:', err)
    }
}
