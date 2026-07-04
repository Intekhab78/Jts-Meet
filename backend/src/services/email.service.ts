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
