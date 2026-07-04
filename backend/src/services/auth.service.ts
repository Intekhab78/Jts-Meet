import * as jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { User } from '../models/user.model'
import { Session } from '../models/session.model'
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config'
import { LoginPayload, RegisterPayload } from '../validators/auth.validator'
import { sendOTPEmail, sendResetPasswordEmail } from './email.service'

interface AuthResult {
    user: Record<string, any>
    accessToken: string
    refreshToken: string
}

function createToken(userId: string) {
    const secret: jwt.Secret = JWT_SECRET as jwt.Secret
    const options: jwt.SignOptions = {
        expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
    }
    return jwt.sign({ userId }, secret, options)
}

async function createSession(userId: string, deviceInfo = '', ipAddress = ''): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = createToken(userId)
    const refreshToken = crypto.randomBytes(40).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await Session.create({
        userId,
        refreshToken,
        deviceInfo,
        ipAddress,
        expiresAt
    })

    return { accessToken, refreshToken }
}

function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function registerUser(payload: RegisterPayload, deviceInfo?: string, ipAddress?: string): Promise<AuthResult> {
    const existingUser = await User.findOne({ email: payload.email.toLowerCase() })
    if (existingUser) {
        throw { status: 409, message: 'Email already exists' }
    }

    const otpCode = generateOTP()
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000)

    const user = new User({
        fullName: payload.fullName.trim(),
        email: payload.email.toLowerCase().trim(),
        password: payload.password,
        profileImage: payload.profileImage || '',
        status: 'offline',
        emailVerified: false,
        lastSeen: null,
        otpCode,
        otpExpires
    })

    await user.save()

    sendOTPEmail(user.email, otpCode).catch((err) => {
        console.error('Failed to send verification email:', err)
    })

    const { accessToken, refreshToken } = await createSession(user._id.toString(), deviceInfo, ipAddress)
    return { user: user.toJSON(), accessToken, refreshToken }
}

export async function loginUser(payload: LoginPayload, deviceInfo?: string, ipAddress?: string): Promise<AuthResult> {
    const user = await User.findOne({ email: payload.email.toLowerCase().trim() }).select('+password')
    if (!user) {
        throw { status: 401, message: 'Invalid credentials' }
    }

    const isMatch = await bcrypt.compare(payload.password, user.password)
    if (!isMatch) {
        throw { status: 401, message: 'Invalid credentials' }
    }

    user.status = 'online'
    user.lastSeen = new Date()
    await user.save()

    const { accessToken, refreshToken } = await createSession(user._id.toString(), deviceInfo, ipAddress)
    return { user: user.toJSON(), accessToken, refreshToken }
}

export async function getCurrentUser(userId: string): Promise<Record<string, any>> {
    const user = await User.findById(userId)
    if (!user) {
        throw { status: 404, message: 'User not found' }
    }
    return user.toJSON()
}

export async function verifyOtp(email: string, code: string, deviceInfo?: string, ipAddress?: string): Promise<AuthResult> {
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
        throw { status: 404, message: 'User not found' }
    }

    if (!user.otpCode || user.otpCode !== code) {
        throw { status: 400, message: 'Invalid OTP code' }
    }

    if (user.otpExpires && user.otpExpires < new Date()) {
        throw { status: 400, message: 'OTP code has expired' }
    }

    user.emailVerified = true
    user.otpCode = null
    user.otpExpires = null
    await user.save()

    const { accessToken, refreshToken } = await createSession(user._id.toString(), deviceInfo, ipAddress)
    return { user: user.toJSON(), accessToken, refreshToken }
}

export async function resendOtp(email: string): Promise<void> {
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
        throw { status: 404, message: 'User not found' }
    }

    const otpCode = generateOTP()
    user.otpCode = otpCode
    user.otpExpires = new Date(Date.now() + 15 * 60 * 1000)
    await user.save()

    await sendOTPEmail(user.email, otpCode)
}

export async function forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
        throw { status: 404, message: 'User not found' }
    }

    const otpCode = generateOTP()
    user.otpCode = otpCode
    user.otpExpires = new Date(Date.now() + 15 * 60 * 1000)
    await user.save()

    await sendResetPasswordEmail(user.email, otpCode)
}

export async function resetPassword(email: string, code: string, password: RegisterPayload['password']): Promise<void> {
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
        throw { status: 404, message: 'User not found' }
    }

    if (!user.otpCode || user.otpCode !== code) {
        throw { status: 400, message: 'Invalid OTP code' }
    }

    if (user.otpExpires && user.otpExpires < new Date()) {
        throw { status: 400, message: 'OTP code has expired' }
    }

    user.password = password
    user.otpCode = null
    user.otpExpires = null
    await user.save()
}

export async function refreshSessionToken(oldRefreshToken: string, deviceInfo = '', ipAddress = ''): Promise<{ accessToken: string; refreshToken: string }> {
    const session = await Session.findOne({ refreshToken: oldRefreshToken }).exec()
    if (!session) {
        throw { status: 401, message: 'Invalid refresh token' }
    }
    if (session.expiresAt < new Date()) {
        await session.deleteOne()
        throw { status: 401, message: 'Refresh token expired' }
    }

    const userId = session.userId.toString()
    await session.deleteOne()

    return createSession(userId, deviceInfo, ipAddress)
}

export async function invalidateSession(refreshToken: string): Promise<void> {
    await Session.deleteOne({ refreshToken }).exec()
}

export async function updateUserProfile(userId: string, fullName?: string, profileImage?: string): Promise<Record<string, any>> {
    const user = await User.findById(userId)
    if (!user) {
        throw { status: 404, message: 'User not found' }
    }
    if (fullName) user.fullName = fullName.trim()
    if (profileImage !== undefined) user.profileImage = profileImage
    await user.save()
    return user.toJSON()
}

export async function changeUserPassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId).select('+password')
    if (!user) {
        throw { status: 404, message: 'User not found' }
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password)
    if (!isMatch) {
        throw { status: 400, message: 'Incorrect current password' }
    }
    user.password = newPassword
    await user.save()
}

export async function listActiveSessions(userId: string): Promise<any[]> {
    return Session.find({ userId }).sort({ createdAt: -1 }).exec()
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
    await Session.deleteOne({ _id: sessionId, userId }).exec()
}
