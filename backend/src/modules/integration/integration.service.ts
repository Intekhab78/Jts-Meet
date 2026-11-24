import crypto from 'crypto'
import https from 'https'
import http from 'http'
import dns from 'dns'
import { Types } from 'mongoose'
import { Integration, IIntegration, IntegrationEvent, IntegrationType } from './integration.model'
import { Organization } from '../organization/organization.model'
import { User } from '../../models/user.model'
import { isSuperAdminUser } from '../../middleware/adminMiddleware'
import { getDynamicEmailConfig } from '../../services/email.service'
import { getEffectivePlanForOrg } from '../plan/planEntitlements'

function makeForbiddenError(message: string) {
    const err: any = new Error(message)
    err.status = 403
    return err
}

async function verifyOrgAdminOrMember(userId: string, orgId?: string | null, requireAdmin: boolean = false): Promise<void> {
    if (!orgId) return
    if (!Types.ObjectId.isValid(orgId)) {
        throw makeForbiddenError('Forbidden: Invalid organization ID')
    }
    const org = await Organization.findById(orgId).select('ownerId members').lean()
    if (!org) {
        throw makeForbiddenError('Forbidden: Organization not found')
    }
    if (String(org.ownerId) === String(userId)) {
        return
    }
    const member = org.members?.find((m: any) => String(m.userId) === String(userId))
    if (member && (!requireAdmin || ['owner', 'admin'].includes(member.role))) {
        return
    }
    const user = Types.ObjectId.isValid(userId) ? await User.findById(userId).select('email isSuperAdmin').lean() : null
    if (user && isSuperAdminUser(user)) {
        return
    }
    throw makeForbiddenError('Forbidden: Insufficient organization permissions for this integration')
}

async function assertCanManageIntegration(userId: string, existing: any, action: string): Promise<void> {
    const ownerId = existing.userId || existing.createdBy
    if (ownerId && String(ownerId) === String(userId)) {
        return
    }
    if (existing.organizationId) {
        await verifyOrgAdminOrMember(userId, String(existing.organizationId), true)
        return
    }
    throw makeForbiddenError(`Forbidden: You do not have permission to ${action} this integration`)
}

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

export function isPrivateOrReservedIp(ip: string): boolean {
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7)
    }

    if (ip === '::1' || ip === '0.0.0.0' || ip === 'localhost') return true

    const parts = ip.split('.').map(Number)
    if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
        const [a, b] = parts
        // 127.0.0.0/8 (Loopback)
        if (a === 127) return true
        // 10.0.0.0/8 (Private)
        if (a === 10) return true
        // 172.16.0.0/12 (Private)
        if (a === 172 && b >= 16 && b <= 31) return true
        // 192.168.0.0/16 (Private)
        if (a === 192 && b === 168) return true
        // 169.254.0.0/16 (Link Local / Cloud Metadata)
        if (a === 169 && b === 254) return true
        // 0.0.0.0/8 (Current network)
        if (a === 0) return true
    }

    const lower = ip.toLowerCase()
    if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:')) {
        return true
    }

    return false
}

export async function validateWebhookUrl(urlStr: string): Promise<{ valid: boolean; reason?: string }> {
    try {
        const parsed = new URL(urlStr)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return { valid: false, reason: 'Webhook URL must use HTTP or HTTPS protocol' }
        }

        const hostname = parsed.hostname.toLowerCase().trim()
        const isDev = process.env.NODE_ENV !== 'production'

        if (!isDev) {
            if (
                hostname === 'localhost' ||
                hostname.endsWith('.localhost') ||
                hostname.endsWith('.internal') ||
                hostname.endsWith('.local')
            ) {
                return { valid: false, reason: 'Localhost and internal hostnames are prohibited in production' }
            }

            if (isPrivateOrReservedIp(hostname)) {
                return { valid: false, reason: 'Private or reserved IP addresses are prohibited' }
            }

            try {
                const resolved = await dns.promises.lookup(hostname)
                if (isPrivateOrReservedIp(resolved.address)) {
                    return { valid: false, reason: `Target host resolves to restricted IP: ${resolved.address}` }
                }
            } catch (dnsErr: any) {
                return { valid: false, reason: `Unable to resolve webhook hostname: ${dnsErr.message}` }
            }
        }

        return { valid: true }
    } catch (err: any) {
        return { valid: false, reason: 'Invalid URL format' }
    }
}

// In-memory mock fallback when MongoDB is disconnected in dev environment
const memoryIntegrations: any[] = []

export async function listIntegrations(userId: string, orgId?: string) {
    if (orgId) {
        await verifyOrgAdminOrMember(userId, orgId, false)
    }

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
    if (orgId) {
        await verifyOrgAdminOrMember(userId, orgId, true)
    }

    let normalizedUrl = (dto.url || '').trim()

    if (dto.type === 'email' && !/^https?:\/\//i.test(normalizedUrl)) {
        const rawList = normalizedUrl.replace(/^mailto:/i, '').split(',').map(s => s.trim()).filter(Boolean)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (rawList.length === 0 || !rawList.every(e => emailRegex.test(e))) {
            throw { status: 400, message: 'Please enter valid recipient email address(es) or an HTTP(S) webhook URL' }
        }
        normalizedUrl = `mailto:${rawList.join(',')}`
    } else {
        const urlValidation = await validateWebhookUrl(normalizedUrl)
        if (!urlValidation.valid) {
            throw { status: 400, message: urlValidation.reason || 'Invalid webhook URL' }
        }
    }

    // Dynamic Plan-Based Quota Check
    if (orgId) {
        try {
            const effectivePlan = await getEffectivePlanForOrg(orgId)
            const planTier = effectivePlan.planTier
            const maxAllowed = !effectivePlan.isPaid ? 2 : effectivePlan.limits.maxSeats >= 200 ? 999999 : 10

            let currentCount = 0
            try {
                currentCount = await Integration.countDocuments({ organizationId: orgId })
            } catch (_) {
                currentCount = memoryIntegrations.filter(i => i.organizationId === orgId).length
            }

            if (currentCount >= maxAllowed) {
                throw {
                    status: 403,
                    message: `Webhook quota exceeded for ${planTier.toUpperCase()} plan (${currentCount}/${maxAllowed} endpoints). Please upgrade to Growth Pro or Enterprise for additional webhook integrations.`
                }
            }
        } catch (planErr: any) {
            if (planErr.status === 403) throw planErr
        }
    }

    const item = {
        organizationId: orgId,
        userId,
        name: dto.name,
        type: dto.type,
        url: normalizedUrl,
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
        const existing = await Integration.findById(id).lean()
        if (existing) {
            await assertCanManageIntegration(userId, existing, 'delete')
            const res = await Integration.deleteOne({ _id: id })
            if (res.deletedCount > 0) return true
        }
    } catch (err: any) {
        if (err?.status === 403 || err?.message?.startsWith('Forbidden')) throw err
    }

    const idx = memoryIntegrations.findIndex(i => i._id === id || i.id === id)
    if (idx !== -1) {
        await assertCanManageIntegration(userId, memoryIntegrations[idx], 'delete')
        memoryIntegrations.splice(idx, 1)
        return true
    }
    return false
}

export async function toggleIntegration(userId: string, id: string, status: 'active' | 'paused') {
    try {
        const existing = await Integration.findById(id).lean()
        if (existing) {
            await assertCanManageIntegration(userId, existing, 'modify')
            const doc = await Integration.findOneAndUpdate(
                { _id: id },
                { $set: { status, updatedAt: new Date() } },
                { new: true }
            )
            if (doc) return doc
        }
    } catch (err: any) {
        if (err?.status === 403 || err?.message?.startsWith('Forbidden')) throw err
    }

    const item = memoryIntegrations.find(i => i._id === id || i.id === id)
    if (item) {
        await assertCanManageIntegration(userId, item, 'modify')
        item.status = status
        item.updatedAt = new Date()
        return item
    }
    return null
}

function sendHttpRequest(urlStr: string, body: string, headers: Record<string, string>): Promise<{ statusCode: number, responseBody: string, durationMs: number }> {
    return new Promise(async (resolve) => {
        const start = Date.now()
        try {
            const validation = await validateWebhookUrl(urlStr)
            if (!validation.valid) {
                return resolve({
                    statusCode: 403,
                    responseBody: 'SSRF Protection: Blocked target address (' + (validation.reason || 'Restricted host') + ')',
                    durationMs: Date.now() - start
                })
            }

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

    if (type === 'teams') {
        const title = `🎥 JTS Meet Event: ${eventType}`
        return JSON.stringify({
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            "summary": `JTS Meet: ${eventType}`,
            "themeColor": "4f52b2",
            "title": title,
            "sections": [{
                "activityTitle": payloadData.title || payloadData.meetingId || 'Live Video Conference',
                "activitySubtitle": `Host: ${payloadData.hostName || 'Organizer'} • ${new Date().toLocaleTimeString()}`,
                "facts": [
                    { "name": "Meeting ID:", "value": String(payloadData.meetingId || 'N/A') },
                    { "name": "Event Type:", "value": eventType }
                ]
            }]
        })
    }

    if (type === 'zapier') {
        return JSON.stringify({
            event: eventType,
            source: 'jts-meet',
            timestamp: new Date().toISOString(),
            data: payloadData
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

    if (type === 'calendar') {
        return JSON.stringify({
            event: eventType,
            calendarAction: eventType === 'meeting.started' ? 'SYNC_EVENT' : 'ARCHIVE_EVENT',
            summary: payloadData.title || `JTS Meet: ${payloadData.meetingId}`,
            description: `Live JTS Meet session hosted by ${payloadData.hostName || 'Organizer'}. Join URL: https://meet.jtsmiddleeast.com/#room=${payloadData.meetingId}`,
            start: { dateTime: new Date().toISOString() },
            end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
            attendees: payloadData.participants || []
        })
    }

    if (type === 'email') {
        return JSON.stringify({
            event: eventType,
            subject: `[JTS Meet Alert] ${eventType.toUpperCase()}: ${payloadData.title || payloadData.meetingId}`,
            recipients: payloadData.recipients || ['admin@jtsmeet.com'],
            htmlBody: `<h3>JTS Meet Event: ${eventType}</h3><p>Meeting <strong>${payloadData.title || payloadData.meetingId}</strong> has triggered an event at ${new Date().toLocaleString()}.</p>`,
            data: payloadData
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

async function deliverIntegrationEvent(
    integration: any,
    eventType: IntegrationEvent,
    payloadData: any
): Promise<{ statusCode: number; responseBody: string; durationMs: number }> {
    const start = Date.now()
    const targetUrl = String(integration.url || '').trim()

    if (integration.type === 'email' && !/^https?:\/\//i.test(targetUrl)) {
        const recipients = targetUrl.replace(/^mailto:/i, '').split(',').map(s => s.trim()).filter(Boolean)
        if (recipients.length === 0) {
            return { statusCode: 400, responseBody: 'No recipient email configured', durationMs: Date.now() - start }
        }
        try {
            const { transporter, from } = await getDynamicEmailConfig()
            const title = payloadData.title || payloadData.meetingId || 'JTS Meet Session'
            const subject = `[JTS Meet] ${eventType}: ${title}`
            const html = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #4f46e5; margin: 0 0 12px;">JTS Meet Enterprise Alert</h2>
                    <p style="color: #0f172a; font-size: 14px; margin: 0 0 12px;">
                        <strong>Event:</strong> ${eventType}<br/>
                        <strong>Session:</strong> ${title}<br/>
                        <strong>Host:</strong> ${payloadData.hostName || 'Organizer'}<br/>
                        <strong>Time:</strong> ${new Date().toLocaleString()}
                    </p>
                </div>
            `
            const info = await transporter.sendMail({
                from,
                to: recipients.join(', '),
                subject,
                html
            })
            return {
                statusCode: 200,
                responseBody: `Email delivered to ${recipients.join(', ')} (id: ${info.messageId || 'sent'})`,
                durationMs: Date.now() - start
            }
        } catch (err: any) {
            return {
                statusCode: 500,
                responseBody: `SMTP delivery failed: ${err?.message || 'Check SMTP settings in Admin Console'}`,
                durationMs: Date.now() - start
            }
        }
    }

    if (integration.type === 'calendar' && targetUrl.includes('/api/calendar/feed/')) {
        return {
            statusCode: 200,
            responseBody: `ICS Calendar Feed active (${targetUrl}). Subscribe in Google Calendar / Outlook via URL.`,
            durationMs: Date.now() - start
        }
    }

    const body = formatPayload(integration.type, eventType, payloadData)
    const timestamp = Date.now().toString()
    const signature = integration.secret
        ? crypto.createHmac('sha256', integration.secret).update(timestamp + '.' + body).digest('hex')
        : ''

    return sendHttpRequest(targetUrl, body, {
        'x-jts-signature': signature,
        'x-jts-timestamp': timestamp,
        'x-jts-event': eventType
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

    await assertCanManageIntegration(userId, integration, 'test')

    const result = await deliverIntegrationEvent(integration, 'meeting.started', {
        meetingId: 'room-demo-test',
        title: 'Q3 Enterprise Product Review (Test Simulation)',
        hostName: 'Test Administrator',
        participantsCount: 4
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
    if (!orgId) return
    try {
        const query: any = {
            events: eventType,
            status: 'active',
            organizationId: orgId
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
            // Dispatch in background
            deliverIntegrationEvent(item, eventType, payloadData).then(res => {
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
