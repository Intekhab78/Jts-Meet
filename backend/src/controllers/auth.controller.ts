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
    updateUserProfile,
    changeUserPassword,
    listActiveSessions,
    revokeSession
} from '../services/auth.service'
import { validateRegister, validateLogin } from '../validators/auth.validator'
import { AuthRequest } from '../middleware/authMiddleware'

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
            return sendSuccess(res, authResult, 'Registration successful')
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
            return sendSuccess(res, authResult, 'Login successful')
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
            return sendSuccess(res, authResult, 'OTP verified successfully')
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
            return sendSuccess(res, null, 'Password reset successful')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Failed to reset password')
        }
    },

    refreshToken: async (req: Request, res: Response) => {
        const { refreshToken } = req.body as { refreshToken?: string }
        if (!refreshToken) {
            return sendError(res, 400, 'Refresh token is required')
        }

        const deviceInfo = req.headers['user-agent'] || ''
        const ipAddress = req.ip || ''

        try {
            const result = await refreshSessionToken(refreshToken, deviceInfo, ipAddress)
            return sendSuccess(res, result, 'Tokens refreshed successfully')
        } catch (err: any) {
            return sendError(res, err.status || 401, err.message || 'Failed to refresh token')
        }
    },

    logout: async (req: Request, res: Response) => {
        const { refreshToken } = req.body as { refreshToken?: string }
        if (!refreshToken) {
            return sendError(res, 400, 'Refresh token is required')
        }

        try {
            await invalidateSession(refreshToken)
            return sendSuccess(res, null, 'Logged out successfully')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Failed to logout')
        }
    },

    updateProfile: async (req: AuthRequest, res: Response) => {
        if (!req.userId) {
            return sendError(res, 401, 'Unauthorized access')
        }

        const { fullName, profileImage } = req.body as { fullName?: string; profileImage?: string }

        try {
            const user = await updateUserProfile(req.userId, fullName, profileImage)
            return sendSuccess(res, user, 'Profile updated successfully')
        } catch (err: any) {
            return sendError(res, err.status || 500, err.message || 'Failed to update profile')
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
    }
}
