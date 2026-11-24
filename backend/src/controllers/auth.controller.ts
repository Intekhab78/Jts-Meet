import crypto from 'crypto'
import { Request, Response } from 'express'
import { sendError, sendSuccess } from '../utils/responseHelper'
import {
    registerUser,
    loginUser,
    getCurrentUser,
    verifyOtp,
    resendOtp,
    forgotPassword,
    resetPassword,
    refreshSessionToken,
    invalidateSession,
    logoutAllDevices,
    updateUserProfile,
    changeUserPassword,
    listActiveSessions,
    revokeSession,
    loginOrCreateSsoUser,
    loginOrCreateGoogleUser,
    loginOrCreateMicrosoftUser,
    verifyGoogleIdToken
} from '../services/auth.service'
import { Organization } from '../modules/organization/organization.model'
import { getEffectivePlanForOrg } from '../modules/plan/planEntitlements'
import { validateRegister, validateLogin } from '../validators/auth.validator'
import { AuthRequest } from '../middleware/authMiddleware'
import { updateUserStatus } from '../socket/presence'
import { getRefreshTokenCookieOptions } from '../utils/tokenHelper'

export const authController = {
    register: async (req: Request, res: Response) => {
        const { valid, errors } = validateRegister(req.body)

        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        const deviceInfo = req.headers['user-agent'] || ''
        const ipAddress = req.ip || ''

        try {
            const authResult = await registerUser(req.body, deviceInfo, ipAddress)
            if (authResult.refreshToken) {
                res.cookie('refreshToken', authResult.refreshToken, getRefreshTokenCookieOptions())
            }
            return sendSuccess(res, { ...authResult, token: authResult.accessToken }, 'Registration successful')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Registration failed')
        }
    },

    login: async (req: Request, res: Response) => {
        const { valid, errors } = validateLogin(req.body)

        if (!valid) {
            return sendError(res, 400, 'Validation failed', { errors })
        }

        const deviceInfo = req.headers['user-agent'] || ''
        const ipAddress = req.ip || ''

        try {
            const authResult = await loginUser(req.body, deviceInfo, ipAddress)
            if (authResult.refreshToken) {
                res.cookie('refreshToken', authResult.refreshToken, getRefreshTokenCookieOptions())
            }
            return sendSuccess(res, { ...authResult, token: authResult.accessToken }, 'Login successful')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Login failed')
        }
    },

    getCurrentUser: async (req: AuthRequest, res: Response) => {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const user = await getCurrentUser(req.userId)
        return sendSuccess(res, user, 'Current user retrieved')
    },

    verifyOtp: async (req: Request, res: Response) => {
        const { email, code } = req.body as { email: string; code: string }
        if (!email || !code) {
            return sendError(res, 400, 'Email and OTP code are required')
        }

        const deviceInfo = req.headers['user-agent'] || ''
        const ipAddress = req.ip || ''

        try {
            const authResult = await verifyOtp(email, code, deviceInfo, ipAddress)
            if (authResult.refreshToken) {
                res.cookie('refreshToken', authResult.refreshToken, getRefreshTokenCookieOptions())
            }
            return sendSuccess(res, { ...authResult, token: authResult.accessToken }, 'OTP verified successfully')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Verification failed')
        }
    },

    resendOtp: async (req: Request, res: Response) => {
        const { email } = req.body as { email: string }
        if (!email) {
            return sendError(res, 400, 'Email is required')
        }

        try {
            await resendOtp(email)
            return sendSuccess(res, null, 'OTP resent successfully')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Failed to resend OTP')
        }
    },

    forgotPassword: async (req: Request, res: Response) => {
        const { email } = req.body as { email: string }
        if (!email) {
            return sendError(res, 400, 'Email is required')
        }

        try {
            await forgotPassword(email)
            return sendSuccess(res, null, 'Reset code sent successfully')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Failed to request password reset')
        }
    },

    resetPassword: async (req: Request, res: Response) => {
        const { email, code, password } = req.body as { email: string; code: string; password?: string }
        if (!email || !code || !password) {
            return sendError(res, 400, 'Email, reset code, and new password are required')
        }

        if (password.length < 8) {
            return sendError(res, 400, 'Password must be at least 8 characters long')
        }

        try {
            await resetPassword(email, code, password)
            res.clearCookie('refreshToken', getRefreshTokenCookieOptions())
            return sendSuccess(res, null, 'Password reset successful')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Failed to reset password')
        }
    },

    refreshToken: async (req: Request, res: Response) => {
        const incomingRefreshToken = req.cookies?.refreshToken || (req.body as any)?.refreshToken
        if (!incomingRefreshToken) {
            return sendError(res, 400, 'Refresh token is required')
        }

        const deviceInfo = req.headers['user-agent'] || ''
        const ipAddress = req.ip || ''

        try {
            const result = await refreshSessionToken(incomingRefreshToken, deviceInfo, ipAddress)
            res.cookie('refreshToken', result.refreshToken, getRefreshTokenCookieOptions())
            return sendSuccess(res, { ...result, token: result.accessToken }, 'Tokens refreshed successfully')
        } catch (err: any) {
            res.clearCookie('refreshToken', getRefreshTokenCookieOptions())
            return sendError(res, err.status || 401, err.message || 'Failed to refresh token')
        }
    },

    logout: async (req: Request, res: Response) => {
        const incomingRefreshToken = req.cookies?.refreshToken || (req.body as any)?.refreshToken
        if (incomingRefreshToken) {
            try {
                await invalidateSession(incomingRefreshToken)
            } catch (_) {}
        }
        res.clearCookie('refreshToken', getRefreshTokenCookieOptions())
        return sendSuccess(res, null, 'Logged out successfully')
    },

    logoutAll: async (req: AuthRequest, res: Response) => {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }
        try {
            await logoutAllDevices(req.userId)
            res.clearCookie('refreshToken', getRefreshTokenCookieOptions())
            return sendSuccess(res, null, 'Logged out from all devices')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Failed to logout from all devices')
        }
    },

    updateProfile: async (req: AuthRequest, res: Response) => {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const { fullName, profileImage, twoFactorEnabled } = req.body as {
            fullName?: string
            profileImage?: string
            twoFactorEnabled?: boolean
        }

        try {
            const user = await updateUserProfile(req.userId, fullName, profileImage, twoFactorEnabled)
            return sendSuccess(res, user, 'Profile updated successfully')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Failed to update profile')
        }
    },

    updateStatus: async (req: AuthRequest, res: Response) => {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const { status, customStatus } = req.body as { status?: string; customStatus?: string }
        const validStatuses = ['online', 'busy', 'away', 'dnd', 'in_meeting', 'offline']
        if (status && !validStatuses.includes(status)) {
            return sendError(res, 400, 'Invalid presence status')
        }

        try {
            const user = await updateUserStatus(req.userId, (status || 'online') as any, customStatus)
            return sendSuccess(res, user, 'Presence status updated successfully')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Failed to update presence status')
        }
    },

    changePassword: async (req: AuthRequest, res: Response) => {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const { oldPassword, newPassword } = req.body as { oldPassword?: string; newPassword?: string }
        if (!oldPassword || !newPassword) {
            return sendError(res, 400, 'Old and new passwords are required')
        }

        if (newPassword.length < 8) {
            return sendError(res, 400, 'New password must be at least 8 characters long')
        }

        try {
            await changeUserPassword(req.userId, oldPassword, newPassword)
            return sendSuccess(res, null, 'Password changed successfully')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Failed to change password')
        }
    },

    getSessions: async (req: AuthRequest, res: Response) => {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        try {
            const sessions = await listActiveSessions(req.userId)
            return sendSuccess(res, sessions, 'Active sessions retrieved')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Failed to retrieve sessions')
        }
    },

    revokeSession: async (req: AuthRequest, res: Response) => {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId

        try {
            await revokeSession(req.userId, sessionId)
            return sendSuccess(res, null, 'Session revoked successfully')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Failed to revoke session')
        }
    },

    ssoLogin: async (req: Request, res: Response) => {
        const orgSlug = req.params.orgSlug as string
        if (!orgSlug) {
            return sendError(res, 400, 'Organization slug is required')
        }

        try {
            const org = await Organization.findOne({ slug: orgSlug.toLowerCase().trim() })
            if (!org) {
                return sendError(res, 404, 'Organization workspace not found')
            }
            const effectivePlan = await getEffectivePlanForOrg(String(org._id))
            if (!effectivePlan.features.ssoLogin) {
                return sendError(res, 403, 'SAML / SSO login is not enabled on this organization\'s current plan. Please upgrade to Enterprise.')
            }
            return sendSuccess(res, { slug: org.slug, name: org.name }, 'Organization found')
        } catch (err: any) {
            return sendError(res, 500, err.message || 'SSO initiation failed')
        }
    },

    ssoCallback: async (req: Request, res: Response) => {
        const { email, orgSlug, ssoToken, idToken } = req.body
        if (!email || !orgSlug) {
            return sendError(res, 400, 'Email and Organization slug are required')
        }

        // Security Guard: Never issue sessions from unverified { email, orgSlug } payloads.
        // Require either a timing-safe SSO assertion secret or a cryptographically verified IdP idToken matching email.
        const configuredSsoSecret = process.env.SSO_SHARED_SECRET
        let isAuthorized = false

        if (configuredSsoSecret && typeof ssoToken === 'string') {
            const a = Buffer.from(ssoToken)
            const b = Buffer.from(configuredSsoSecret)
            if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
                isAuthorized = true
            }
        }

        if (!isAuthorized && typeof idToken === 'string' && idToken.trim().length > 0) {
            try {
                const verified = await verifyGoogleIdToken(idToken.trim())
                if (
                    verified?.email &&
                    verified.emailVerified !== false &&
                    verified.email.toLowerCase().trim() === String(email).toLowerCase().trim()
                ) {
                    isAuthorized = true
                }
            } catch (_) {
                isAuthorized = false
            }
        }

        if (!isAuthorized) {
            return sendError(res, 403, 'SSO verification failed: Valid IdP assertion token is required')
        }

        const deviceInfo = req.headers['user-agent'] || ''
        const ipAddress = req.ip || ''

        try {
            const org = await Organization.findOne({ slug: String(orgSlug).toLowerCase().trim() })
            if (!org) {
                return sendError(res, 404, 'Organization workspace not found')
            }
            const effectivePlan = await getEffectivePlanForOrg(String(org._id))
            if (!effectivePlan.features.ssoLogin) {
                return sendError(res, 403, 'SAML / SSO login is not enabled on this organization\'s current plan. Please upgrade to Enterprise.')
            }
            const authResult = await loginOrCreateSsoUser(email, orgSlug, deviceInfo, ipAddress)
            return sendSuccess(res, authResult, 'SSO Authentication successful')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'SSO Authentication failed')
        }
    },

    googleLogin: async (req: Request, res: Response) => {
        const { idToken } = req.body
        if (!idToken) {
            return sendError(res, 400, 'Google ID Token is required')
        }

        const deviceInfo = req.headers['user-agent'] || ''
        const ipAddress = req.ip || ''

        try {
            const authResult = await loginOrCreateGoogleUser(idToken, deviceInfo, ipAddress)
            return sendSuccess(res, authResult, 'Google login successful')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Google login failed')
        }
    },

    microsoftLogin: async (req: Request, res: Response) => {
        const { code, redirectUri } = req.body
        if (!code || !redirectUri) {
            return sendError(res, 400, 'Authorization code and redirectUri are required')
        }

        const deviceInfo = req.headers['user-agent'] || ''
        const ipAddress = req.ip || ''

        try {
            const authResult = await loginOrCreateMicrosoftUser(code, redirectUri, deviceInfo, ipAddress)
            return sendSuccess(res, authResult, 'Microsoft login successful')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Microsoft login failed')
        }
    }
}
