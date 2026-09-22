import nodemailer from 'nodemailer'

const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const EMAIL_FROM = process.env.EMAIL_FROM || (SMTP_USER ? `"JTS-Meet" <${SMTP_USER}>` : '"JTS-Meet" <noreply@jtsmeet.com>')

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    }
})

export async function sendOTPEmail(to: string, code: string): Promise<void> {
    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                <h2 style="color: #4f46e5; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">JTS-Meet</h2>
            </div>
            <h3 style="color: #0f172a; margin: 0 0 12px; font-size: 18px; font-weight: 700;">Verify your JTS-Meet Account</h3>
            <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
                Thank you for joining JTS-Meet. To verify your email address, please use the following single-use verification code:
            </p>
            <div style="font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #4338ca; background-color: #f1f5f9; padding: 14px 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                ${code}
            </div>
            <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 20px 0 0;">
                This code will expire in 15 minutes. If you did not request this code, please disregard this email.
            </p>
        </div>
    `

    try {
        await transporter.sendMail({
            from: EMAIL_FROM,
            to,
            subject: 'Verify your JTS-Meet Account',
            html
        })
    } catch (err: any) {
        console.error(`[EMAIL_SERVICE] Failed to send OTP email to ${to}:`, err?.message || err)
    }
}

export async function sendResetPasswordEmail(to: string, code: string): Promise<void> {
    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
                <h2 style="color: #dc2626; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">JTS-Meet</h2>
            </div>
            <h3 style="color: #0f172a; margin: 0 0 12px; font-size: 18px; font-weight: 700;">Password Reset Request</h3>
            <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
                We received a request to reset the password for your JTS-Meet account. Please use the following code:
            </p>
            <div style="font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #b91c1c; background-color: #fef2f2; padding: 14px 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                ${code}
            </div>
            <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 20px 0 0;">
                This verification code will expire in 15 minutes. If you did not initiate this request, please change your password immediately.
            </p>
        </div>
    `

    try {
        await transporter.sendMail({
            from: EMAIL_FROM,
            to,
            subject: 'Reset your JTS-Meet Password',
            html
        })
    } catch (err: any) {
        console.error(`[EMAIL_SERVICE] Failed to send reset password email to ${to}:`, err?.message || err)
    }
}

export interface MeetingEmailDetails {
    scheduledDate?: string
    scheduledTime?: string
    teamName?: string
    isLiveNow?: boolean
}

export async function sendMeetingInvitationEmail(
    to: string, 
    meetingId: string, 
    meetingTitle: string, 
    hostName: string, 
    inviteLink: string,
    details?: MeetingEmailDetails
): Promise<void> {
    const isLive = !!details?.isLiveNow
    const timeDisplay = isLive
        ? '🔴 Started Just Now (Active Live)'
        : (details?.scheduledDate && details?.scheduledTime
            ? `${details.scheduledDate} at ${details.scheduledTime}`
            : (details?.scheduledTime ? `Today at ${details.scheduledTime}` : 'Happening Now / Instant Conference'))

    const subject = isLive 
        ? `🔴 LIVE NOW: ${hostName} has started "${meetingTitle}"` 
        : `📅 Invitation: ${meetingTitle} - JTS Meet`

    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; padding: 8px 14px; background: ${isLive ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'}; border-radius: 8px; color: #ffffff; font-weight: 800; font-size: 16px; margin-bottom: 12px;">
                    ${isLive ? '🔴 LIVE NOW — JTS Meet' : 'JTS Meet'}
                </div>
                <h2 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">
                    ${isLive ? 'Meeting Has Started!' : 'Conference Invitation'}
                </h2>
                <p style="color: ${isLive ? '#ef4444' : '#64748b'}; font-size: 14px; margin: 4px 0 0; font-weight: ${isLive ? '700' : '400'};">
                    ${isLive ? `⚡ ${hostName} is waiting in the meeting room right now` : `${hostName} has invited you to a video meeting`}
                </p>
            </div>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; width: 130px; font-weight: 600;">Meeting Topic:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-size: 15px;">${meetingTitle}</td>
                    </tr>
                    ${details?.teamName ? `
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Team:</td>
                        <td style="padding: 6px 0; color: #4f46e5; font-weight: 600;">👥 ${details.teamName}</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Host:</td>
                        <td style="padding: 6px 0; color: #0f172a;">${hostName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Status / When:</td>
                        <td style="padding: 6px 0; color: ${isLive ? '#ef4444' : '#059669'}; font-weight: 700;">${timeDisplay}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Meeting ID:</td>
                        <td style="padding: 6px 0; color: #4f46e5; font-family: monospace; font-weight: 700;">${meetingId}</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; margin: 28px 0;">
                <a href="${inviteLink}" style="background: ${isLive ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'}; color: #ffffff; padding: 14px 34px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: ${isLive ? '0 4px 16px rgba(239, 68, 68, 0.4)' : '0 4px 12px rgba(99, 102, 241, 0.35)'};">
                    ${isLive ? '🚀 Join Live Meeting Now' : '🎥 Join Meeting Now'}
                </a>
            </div>

            <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; margin-top: 24px;">
                <p style="font-size: 12px; color: #475569; margin: 0; line-height: 1.5;">
                    <strong>Direct Link:</strong> <a href="${inviteLink}" style="color: #4f46e5; word-break: break-all;">${inviteLink}</a>
                </p>
            </div>

            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; margin-bottom: 0;">
                Sent via JTS-Meet Real-time Video Conferencing Platform.
            </p>
        </div>
    `

    try {
        await transporter.sendMail({
            from: EMAIL_FROM,
            to,
            subject,
            html
        })
    } catch (err: any) {
        console.warn(`[EMAIL_SERVICE] Failed to send meeting email to ${to}:`, err?.message || err)
    }
}

export async function sendTeamInvitationEmail(
    to: string,
    teamName: string,
    inviterName: string,
    role: string,
    teamLink: string
): Promise<void> {
    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; padding: 8px 14px; background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); border-radius: 8px; color: #ffffff; font-weight: 800; font-size: 16px; margin-bottom: 12px;">
                    JTS Meet
                </div>
                <h2 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">You've Been Added to a Team</h2>
                <p style="color: #64748b; font-size: 14px; margin: 4px 0 0;">
                    ${inviterName} has added you to <strong>${teamName}</strong>
                </p>
            </div>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px; text-align: center;">
                <p style="margin: 0 0 12px; font-size: 15px; color: #0f172a; line-height: 1.6;">
                    You are now a member of the team <strong>"${teamName}"</strong> on JTS-Meet with the role of <strong>${role.toUpperCase()}</strong>.
                </p>
                <p style="margin: 0; font-size: 13px; color: #64748b;">
                    Collaborate with your teammates, participate in channel discussions, and join team conferences.
                </p>
            </div>

            <div style="text-align: center; margin: 28px 0;">
                <a href="${teamLink}" style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); color: #ffffff; padding: 14px 34px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);">
                    👥 Open Team Workspace
                </a>
            </div>

            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; margin-bottom: 0;">
                Sent via JTS-Meet Real-time Video Conferencing Platform.
            </p>
        </div>
    `

    try {
        await transporter.sendMail({
            from: EMAIL_FROM,
            to,
            subject: `👥 Team Invitation: You've been added to "${teamName}"`,
            html
        })
    } catch (err: any) {
        console.error(`[EMAIL_SERVICE] Failed to send team invite email to ${to}:`, err?.message || err)
    }
}

export async function sendOrganizationInvitationEmail(
    to: string,
    orgName: string,
    inviterName: string,
    joinLink: string,
    isRegistered: boolean
): Promise<void> {
    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; padding: 8px 14px; background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); border-radius: 8px; color: #ffffff; font-weight: 800; font-size: 16px; margin-bottom: 12px;">
                    JTS Meet
                </div>
                <h2 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">Workspace Invitation</h2>
                <p style="color: #64748b; font-size: 14px; margin: 4px 0 0;">
                    You have been invited to join <strong>${orgName}</strong>
                </p>
            </div>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px; text-align: center;">
                <p style="margin: 0 0 12px; font-size: 15px; color: #0f172a; line-height: 1.6;">
                    <strong>${inviterName}</strong> has invited you to collaborate in the organization <strong>${orgName}</strong> on JTS-Meet.
                </p>
                <p style="font-size: 13px; color: #64748b; margin: 0;">
                    ${isRegistered ? 'Sign in to access your organization channels, teams, and meetings.' : 'Create your account to accept this invitation and get started.'}
                </p>
            </div>

            <div style="text-align: center; margin: 28px 0;">
                <a href="${joinLink}" style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); color: #ffffff; padding: 14px 34px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);">
                    ${isRegistered ? '🏢 Sign In & Join Workspace' : '🚀 Register & Join Workspace'}
                </a>
            </div>

            <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; margin-top: 24px;">
                <p style="font-size: 12px; color: #475569; margin: 0; line-height: 1.5;">
                    <strong>Direct Link:</strong> <a href="${joinLink}" style="color: #4f46e5; word-break: break-all;">${joinLink}</a>
                </p>
            </div>

            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px; margin-bottom: 0;">
                Sent via JTS-Meet Real-time Video Conferencing Platform.
            </p>
        </div>
    `

    try {
        await transporter.sendMail({
            from: EMAIL_FROM,
            to,
            subject: `🏢 Invitation to join "${orgName}" on JTS-Meet`,
            html
        })
    } catch (err: any) {
        console.error(`[EMAIL_SERVICE] Failed to send org invite email to ${to}:`, err?.message || err)
    }
}

export interface PostMeetingEmailParams {
    to: string[]
    meetingTitle: string
    meetingId: string
    duration: string
    date: string
    summaryBullets?: string[]
    actionItems?: string[]
    attendees?: Array<{ name: string; email?: string; duration?: string; role?: string; joinTime?: string; leaveTime?: string; status?: string }>
    recordingUrl?: string
    csvAttachment?: {
        filename?: string
        content: string
    }
}

export async function sendPostMeetingSummaryEmail(params: PostMeetingEmailParams): Promise<void> {
    if (!params.to || params.to.length === 0) return

    const summaryHtml = (params.summaryBullets && params.summaryBullets.length > 0)
        ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 18px 0;">
            <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">📋 Key Discussion Points & MoM</h4>
            <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 13.5px; line-height: 1.6;">
                ${params.summaryBullets.map(b => `<li style="margin-bottom: 6px;">${b}</li>`).join('')}
            </ul>
           </div>`
        : ''

    const actionItemsHtml = (params.actionItems && params.actionItems.length > 0)
        ? `<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 18px 0;">
            <h4 style="margin: 0 0 10px 0; color: #1d4ed8; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">⚡ Next Steps & Action Items</h4>
            <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 13.5px; line-height: 1.6;">
                ${params.actionItems.map(a => `<li style="margin-bottom: 6px;">${a}</li>`).join('')}
            </ul>
           </div>`
        : ''

    const attendeesHtml = (params.attendees && params.attendees.length > 0)
        ? `<div style="margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #1e293b; font-size: 14px;">👥 Attendance Sheet (${params.attendees.length} Attendees)</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: #f1f5f9; text-align: left;">
                        <th style="padding: 8px 12px; border-radius: 6px 0 0 6px; color: #475569;">Name</th>
                        <th style="padding: 8px 12px; color: #475569;">Role</th>
                        <th style="padding: 8px 12px; color: #475569;">Status</th>
                        <th style="padding: 8px 12px; color: #475569;">Join Time</th>
                        <th style="padding: 8px 12px; border-radius: 0 6px 6px 0; color: #475569;">Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${params.attendees.map(a => `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px 12px; font-weight: 600; color: #1e293b;">${a.name}</td>
                            <td style="padding: 8px 12px; color: #64748b;">${a.role || 'Participant'}</td>
                            <td style="padding: 8px 12px; color: #64748b;">${a.status || 'Attended'}</td>
                            <td style="padding: 8px 12px; color: #64748b;">${a.joinTime || '-'}</td>
                            <td style="padding: 8px 12px; color: #64748b;">${a.duration || params.duration}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
           </div>`
        : ''

    const csvAttachmentNotice = params.csvAttachment && params.csvAttachment.content
        ? `<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 16px; margin: 18px 0; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 18px;">📎</span>
            <div>
                <strong style="color: #166534; font-size: 13px; display: block;">Attendance CSV Report Attached</strong>
                <span style="color: #15803d; font-size: 12px;">Full CSV audit file (<code>${params.csvAttachment.filename || `Attendance-${params.meetingId}.csv`}</code>) is attached to this email.</span>
            </div>
           </div>`
        : ''

    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; line-height: 1.5;">
            <div style="border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 20px;">
                <h2 style="color: #4f46e5; margin: 0; font-size: 22px; font-weight: 800;">JTS-Meet</h2>
                <div style="margin-top: 6px;">
                    <span style="font-size: 11px; font-weight: 700; color: #6366f1; background: #e0e7ff; padding: 3px 8px; border-radius: 12px;">
                        POST-MEETING ATTENDANCE & SUMMARY REPORT
                    </span>
                </div>
            </div>

            <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">
                ${params.meetingTitle}
            </h3>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 18px;">
                <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Date:</strong> ${params.date}</p>
                <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Total Duration:</strong> ${params.duration}</p>
                <p style="margin: 0; font-size: 13px;"><strong>Meeting ID:</strong> ${params.meetingId}</p>
            </div>

            ${csvAttachmentNotice}
            ${summaryHtml}
            ${actionItemsHtml}
            ${attendeesHtml}

            ${params.recordingUrl ? `
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${params.recordingUrl}" style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); color: #ffffff; padding: 12px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block;">
                        ▶ Watch Meeting Recording
                    </a>
                </div>
            ` : ''}

            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                Generated automatically by JTS-Meet Enterprise Conferencing Suite.
            </p>
        </div>
    `

    const mailOptions: any = {
        from: EMAIL_FROM,
        to: params.to.join(','),
        subject: `📊 Attendance Report & Summary: ${params.meetingTitle} (${params.date})`,
        html
    }

    if (params.csvAttachment && params.csvAttachment.content) {
        mailOptions.attachments = [
            {
                filename: params.csvAttachment.filename || `Attendance-${params.meetingId}.csv`,
                content: params.csvAttachment.content,
                contentType: 'text/csv'
            }
        ]
    }

    try {
        await transporter.sendMail(mailOptions)
        console.log(`[sendPostMeetingSummaryEmail] Sent attendance summary email with CSV to ${params.to.join(', ')}`)
    } catch (err) {
        console.error('[sendPostMeetingSummaryEmail] Error dispatching post-meeting email:', err)
    }
}

