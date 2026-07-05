import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'jtsdev2026@gmail.com',
        pass: 'sgswxzlxyqwgbnqd'
    }
})

export async function sendOTPEmail(to: string, code: string): Promise<void> {
    const html = `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5; margin-bottom: 16px;">JTS-Meet Verification Code</h2>
            <p>Thank you for registering with JTS-Meet! To complete your registration, please verify your email address using the 6-digit OTP code below:</p>
            <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1e1b4b; background-color: #f3f4f6; padding: 12px; text-align: center; border-radius: 6px; margin: 20px 0;">
                ${code}
            </div>
            <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">This code will expire in 15 minutes. If you did not request this email, you can safely ignore it.</p>
        </div>
    `

    await transporter.sendMail({
        from: '"JTS-Meet" <jtsdev2026@gmail.com>',
        to,
        subject: 'Verify your JTS-Meet Account',
        html
    })
}

export async function sendResetPasswordEmail(to: string, code: string): Promise<void> {
    const html = `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #dc2626; margin-bottom: 16px;">JTS-Meet Password Reset</h2>
            <p>We received a request to reset your password. Please use the 6-digit OTP code below to confirm this request:</p>
            <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1e1b4b; background-color: #f3f4f6; padding: 12px; text-align: center; border-radius: 6px; margin: 20px 0;">
                ${code}
            </div>
            <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">This code is valid for 15 minutes. If you did not request a password reset, please secure your account immediately.</p>
        </div>
    `

    await transporter.sendMail({
        from: '"JTS-Meet Support" <jtsdev2026@gmail.com>',
        to,
        subject: 'Reset your JTS-Meet Password',
        html
    })
}

export async function sendMeetingInvitationEmail(
    to: string, 
    meetingId: string, 
    meetingTitle: string, 
    hostName: string, 
    inviteLink: string
): Promise<void> {
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;">JTS-Meet Invitation</h2>
                <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">You have been invited to a video conference</p>
            </div>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; color: #0f172a;">Meeting Details</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                        <td style="padding: 4px 0; color: #6b7280; width: 120px; font-weight: 600;">Meeting Title:</td>
                        <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${meetingTitle}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #6b7280; font-weight: 600;">Host:</td>
                        <td style="padding: 4px 0; color: #0f172a;">${hostName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; color: #6b7280; font-weight: 600;">Meeting ID:</td>
                        <td style="padding: 4px 0; color: #4f46e5; font-family: monospace; font-weight: 700;">${meetingId}</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; margin: 28px 0;">
                <a href="${inviteLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 30px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 6px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
                    Join Meeting
                </a>
            </div>

            <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin-bottom: 0;">
                If the button above does not work, copy and paste this URL into your web browser:<br/>
                <a href="${inviteLink}" style="color: #4f46e5; text-decoration: underline; word-break: break-all;">${inviteLink}</a>
            </p>
        </div>
    `

    await transporter.sendMail({
        from: '"JTS-Meet" <jtsdev2026@gmail.com>',
        to,
        subject: `Invitation: ${meetingTitle} on JTS-Meet`,
        html
    })
}

export async function sendOrganizationInvitationEmail(
    to: string,
    orgName: string,
    inviterName: string,
    joinLink: string,
    isRegistered: boolean
): Promise<void> {
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;">Organization Invitation</h2>
                <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">You've been invited to join a workspace</p>
            </div>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
                <p style="margin-top: 0; font-size: 16px; color: #0f172a; line-height: 1.5;">
                    <strong>${inviterName}</strong> has invited you to collaborate in the organization <strong>${orgName}</strong> on JTS-Meet.
                </p>
                <p style="font-size: 14px; color: #6b7280; margin: 12px 0 0;">
                    ${isRegistered ? 'Sign in to accept the invitation and start collaborating!' : 'Create a free account to claim your guest profile and join the workspace!'}
                </p>
            </div>

            <div style="text-align: center; margin: 28px 0;">
                <a href="${joinLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 30px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 6px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
                    ${isRegistered ? 'Sign In & Accept' : 'Register & Join'}
                </a>
            </div>

            <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin-bottom: 0;">
                If the button above does not work, copy and paste this URL into your web browser:<br/>
                <a href="${joinLink}" style="color: #4f46e5; text-decoration: underline; word-break: break-all;">${joinLink}</a>
            </p>
        </div>
    `

    await transporter.sendMail({
        from: '"JTS-Meet" <jtsdev2026@gmail.com>',
        to,
        subject: `Invitation to join organization "${orgName}" on JTS-Meet`,
        html
    })
}

