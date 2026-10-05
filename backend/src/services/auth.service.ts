import * as jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { User } from '../models/user.model'
import { Session } from '../models/session.model'
import { Organization } from '../modules/organization/organization.model'
import mongoose, { Types } from 'mongoose'
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config'
import { LoginPayload, RegisterPayload } from '../validators/auth.validator'
import { sendOTPEmail, sendResetPasswordEmail } from './email.service'
import { withTransactionOrDirect } from '../utils/transactionHelper'
import { generateAccessToken, generateRefreshToken, hashToken, REFRESH_TOKEN_EXPIRY_DAYS } from '../utils/tokenHelper'

interface AuthResult {
    user: Record<string, any>
    accessToken: string
    refreshToken: string
    token?: string
}

export async function createSession(
    userId: string,
    deviceInfo = '',
    ipAddress = '',
    session?: mongoose.ClientSession,
    familyId?: string
): Promise<{ accessToken: string; refreshToken: string; token: string }> {
    const userQuery = User.findById(userId)
    const user = await (session ? userQuery.session(session) : userQuery)

    const tokenVersion = user?.tokenVersion ?? 0
    const accessToken = generateAccessToken({
        userId,
        tokenVersion,
        email: user?.email,
        isSuperAdmin: user?.isSuperAdmin
    })

    const { token: rawRefreshToken, hash } = generateRefreshToken()
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    const activeFamilyId = familyId || crypto.randomUUID()

    const newSession = new Session({
        userId,
        refreshToken: rawRefreshToken,
        deviceInfo,
        ipAddress,
        expiresAt
    })
    await newSession.save(session ? { session } : undefined)

    if (user) {
        if (!user.refreshTokens) {
            user.refreshTokens = []
        }
        user.refreshTokens = user.refreshTokens.filter(t => t.expiresAt > new Date() && (!t.revokedAt || Date.now() - t.revokedAt.getTime() < 7 * 24 * 60 * 60 * 1000)).slice(-20)
        user.refreshTokens.push({
            tokenHash: hash,
            familyId: activeFamilyId,
            createdAt: new Date(),
            expiresAt,
            userAgent: deviceInfo,
            ip: ipAddress,
            revokedAt: null
        })
        await user.save(session ? { session } : undefined)
    }

    return { accessToken, refreshToken: rawRefreshToken, token: accessToken }
}

function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function registerUser(payload: RegisterPayload, deviceInfo?: string, ipAddress?: string): Promise<AuthResult> {
    return withTransactionOrDirect(async (session) => {
        const query = User.findOne({ email: payload.email.toLowerCase().trim() })
        let user = await (session ? query.session(session) : query)
        
        const otpCode = generateOTP()
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000)

        if (user) {
            if (!user.emailVerified) {
                user.fullName = payload.fullName.trim()
                user.password = payload.password
                user.otpCode = otpCode
                user.otpExpires = otpExpires
                await user.save(session ? { session } : undefined)
            } else {
                throw { status: 409, message: 'Email already exists' }
            }
        } else {
            user = new User({
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
            await user.save(session ? { session } : undefined)
        }

        const { accessToken, refreshToken } = await createSession(user._id.toString(), deviceInfo, ipAddress, session)

        sendOTPEmail(user.email, otpCode).catch((err) => {
            console.error('Failed to send verification email:', err)
        })

        return { user: user.toJSON(), accessToken, refreshToken }
    })
}

export async function loginUser(payload: LoginPayload, deviceInfo?: string, ipAddress?: string): Promise<AuthResult> {
    return withTransactionOrDirect(async (session) => {
        const query = User.findOne({ email: payload.email.toLowerCase().trim() }).select('+password')
        const user = await (session ? query.session(session) : query)
        if (!user) {
            throw { status: 401, message: 'Invalid credentials' }
        }

        const isMatch = await bcrypt.compare(payload.password, user.password)
        if (!isMatch) {
            throw { status: 401, message: 'Invalid credentials' }
        }

        user.status = 'online'
        user.lastSeen = new Date()
        await user.save(session ? { session } : undefined)

        const { accessToken, refreshToken } = await createSession(user._id.toString(), deviceInfo, ipAddress, session)

        return { user: user.toJSON(), accessToken, refreshToken }
    })
}

export async function getCurrentUser(userId: string): Promise<Record<string, any>> {
    if (!userId || !Types.ObjectId.isValid(userId)) {
        throw { status: 401, message: 'Invalid user session' }
    }
    const user = await User.findById(userId)
    if (!user) {
        throw { status: 404, message: 'User not found' }
    }
    return user.toJSON()
}

export async function verifyOtp(email: string, code: string, deviceInfo?: string, ipAddress?: string): Promise<AuthResult> {
    return withTransactionOrDirect(async (session) => {
        const query = User.findOne({ email: email.toLowerCase().trim() })
        const user = await (session ? query.session(session) : query)
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
        await user.save(session ? { session } : undefined)

        const { accessToken, refreshToken } = await createSession(user._id.toString(), deviceInfo, ipAddress, session)

        return { user: user.toJSON(), accessToken, refreshToken }
    })
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
    user.tokenVersion = (user.tokenVersion || 0) + 1
    user.refreshTokens = []
    await user.save()

    await Session.deleteMany({ userId: user._id }).exec()
}

export async function refreshSessionToken(
    oldRefreshToken: string,
    deviceInfo = '',
    ipAddress = ''
): Promise<{ accessToken: string; refreshToken: string; token: string }> {
    return withTransactionOrDirect(async (session) => {
        const hashedOld = hashToken(oldRefreshToken)

        let userQuery = User.findOne({ 'refreshTokens.tokenHash': hashedOld })
        let user = await (session ? userQuery.session(session) : userQuery)

        if (!user) {
            // Check legacy unhashed session
            const legacyQuery = Session.findOne({ refreshToken: oldRefreshToken })
            const legacySession = await (session ? legacyQuery.session(session) : legacyQuery)
            if (legacySession) {
                if (legacySession.expiresAt < new Date()) {
                    await legacySession.deleteOne(session ? { session } : undefined)
                    throw { status: 401, message: 'Refresh token expired' }
                }
                const userId = legacySession.userId.toString()
                await legacySession.deleteOne(session ? { session } : undefined)
                return await createSession(userId, deviceInfo, ipAddress, session)
            }
            throw { status: 401, message: 'Invalid refresh token' }
        }

        const tokenEntry = user.refreshTokens?.find(t => t.tokenHash === hashedOld)
        if (!tokenEntry) {
            throw { status: 401, message: 'Invalid refresh token' }
        }

        // Token reuse detection (Security alert):
        // If an already-revoked token is presented, someone is attempting replay! Invalidate entire family.
        if (tokenEntry.revokedAt) {
            const compromisedFamily = tokenEntry.familyId
            if (user.refreshTokens) {
                for (const t of user.refreshTokens) {
                    if (t.familyId === compromisedFamily) {
                        t.revokedAt = new Date()
                    }
                }
            }
            await user.save(session ? { session } : undefined)
            await Session.deleteMany({ userId: user._id }).exec()
            throw { status: 401, message: 'Refresh token reuse detected. Access revoked.' }
        }

        if (tokenEntry.expiresAt < new Date()) {
            throw { status: 401, message: 'Refresh token expired' }
        }

        // Mark old token as revoked/used
        tokenEntry.revokedAt = new Date()
        await user.save(session ? { session } : undefined)

        await Session.deleteOne({ refreshToken: oldRefreshToken }).catch(() => {})

        const tokens = await createSession(user._id.toString(), deviceInfo, ipAddress, session, tokenEntry.familyId)
        return tokens
    })
}

export async function invalidateSession(refreshToken: string): Promise<void> {
    const hashed = hashToken(refreshToken)
    await User.updateOne(
        { 'refreshTokens.tokenHash': hashed },
        { $set: { 'refreshTokens.$.revokedAt': new Date() } }
    ).exec()
    await Session.deleteOne({ refreshToken }).exec()
}

export async function logoutAllDevices(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
        $inc: { tokenVersion: 1 },
        $set: { refreshTokens: [] }
    }).exec()
    await Session.deleteMany({ userId }).exec()
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
    user.tokenVersion = (user.tokenVersion || 0) + 1
    user.refreshTokens = []
    await user.save()

    await Session.deleteMany({ userId: user._id }).exec()
}

export async function listActiveSessions(userId: string): Promise<any[]> {
    return Session.find({ userId }).sort({ createdAt: -1 }).exec()
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
    await Session.deleteOne({ _id: sessionId, userId }).exec()
}

export async function loginOrCreateSsoUser(email: string, orgSlug: string, deviceInfo = '', ipAddress = ''): Promise<AuthResult> {
    return withTransactionOrDirect(async (session) => {
        const cleanEmail = email.toLowerCase().trim()
        const cleanSlug = orgSlug.toLowerCase().trim()

        const orgQuery = Organization.findOne({ slug: cleanSlug })
        const org = await (session ? orgQuery.session(session) : orgQuery)
        if (!org) {
            throw { status: 404, message: 'Organization workspace not found' }
        }

        const userQuery = User.findOne({ email: cleanEmail })
        let user = await (session ? userQuery.session(session) : userQuery)
        if (!user) {
            user = new User({
                fullName: cleanEmail.split('@')[0],
                email: cleanEmail,
                password: crypto.randomBytes(16).toString('hex'),
                profileImage: '',
                status: 'online',
                emailVerified: true,
                lastSeen: new Date()
            })
            await user.save(session ? { session } : undefined)
        } else {
            user.status = 'online'
            user.lastSeen = new Date()
            user.emailVerified = true
            await user.save(session ? { session } : undefined)
        }

        const isMember = org.members.some(m => m.userId.toString() === user!._id.toString())
        if (!isMember) {
            org.members.push({
                userId: user._id as Types.ObjectId,
                role: 'member',
                joinedAt: new Date(),
                invitedBy: org.ownerId,
                status: 'active'
            })
            await org.save(session ? { session } : undefined)
        } else {
            const member = org.members.find(m => m.userId.toString() === user!._id.toString())
            if (member && member.status !== 'active') {
                member.status = 'active'
                member.joinedAt = new Date()
                await org.save(session ? { session } : undefined)
            }
        }

        const { accessToken, refreshToken } = await createSession(user._id.toString(), deviceInfo, ipAddress, session)

        return { user: user.toJSON(), accessToken, refreshToken }
    })
}

async function verifyGoogleIdToken(idToken: string) {
    try {
        const response = await (global as any).fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`)
        if (!response.ok) {
            throw new Error('Google token validation failed')
        }
        const payload = await response.json() as {
            aud: string
            sub: string
            email: string
            name?: string
            picture?: string
        }

        const { GOOGLE_CLIENT_ID } = require('../config')
        if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
            throw new Error('Google token audience mismatch')
        }

        return {
            googleId: payload.sub,
            email: payload.email,
            name: payload.name || payload.email.split('@')[0],
            picture: payload.picture || ''
        }
    } catch (err: any) {
        throw { status: 400, message: err.message || 'Invalid Google Token' }
    }
}

export async function loginOrCreateGoogleUser(idToken: string, deviceInfo = '', ipAddress = ''): Promise<AuthResult> {
    const googleData = await verifyGoogleIdToken(idToken)

    return withTransactionOrDirect(async (session) => {
        const cleanEmail = googleData.email.toLowerCase().trim()

        const userQuery = User.findOne({ googleId: googleData.googleId })
        let user = await (session ? userQuery.session(session) : userQuery)

        if (!user) {
            const emailQuery = User.findOne({ email: cleanEmail })
            user = await (session ? emailQuery.session(session) : emailQuery)

            if (user) {
                user.googleId = googleData.googleId
                user.provider = 'google'
                user.emailVerified = true
                await user.save(session ? { session } : undefined)
            } else {
                const secureRandomPassword = crypto.randomBytes(16).toString('hex')
                user = new User({
                    fullName: googleData.name,
                    email: cleanEmail,
                    password: secureRandomPassword,
                    profileImage: googleData.picture,
                    googleId: googleData.googleId,
                    provider: 'google',
                    emailVerified: true,
                    status: 'online',
                    lastSeen: new Date()
                })
                await user.save(session ? { session } : undefined)
            }
        } else {
            user.status = 'online'
            user.lastSeen = new Date()
            await user.save(session ? { session } : undefined)
        }

        const { accessToken, refreshToken } = await createSession(user._id.toString(), deviceInfo, ipAddress, session)

        return { user: user.toJSON(), accessToken, refreshToken }
    })
}

export async function loginOrCreateMicrosoftUser(code: string, redirectUri: string, deviceInfo = '', ipAddress = ''): Promise<AuthResult> {
    const { AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID } = require('../config')

    // 1. Exchange authorization code for Microsoft tokens
    const params = new URLSearchParams()
    params.append('client_id', AZURE_CLIENT_ID)
    params.append('client_secret', AZURE_CLIENT_SECRET)
    params.append('code', code)
    params.append('redirect_uri', redirectUri)
    params.append('grant_type', 'authorization_code')

    let response: any
    try {
        response = await (global as any).fetch(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        })
    } catch (err: any) {
        throw { status: 502, message: 'Microsoft identity platform connection refused: ' + err.message }
    }

    const tokenData = await response.json()
    if (!response.ok) {
        throw { status: 400, message: tokenData.error_description || 'Failed to exchange authorization code' }
    }

    const idToken = tokenData.id_token
    if (!idToken) {
        throw { status: 400, message: 'Microsoft token response did not contain an id_token' }
    }

    // 2. Decode & Validate Claims (Audience, Issuer, Expiration)
    const decoded = jwt.decode(idToken) as {
        aud: string
        iss: string
        exp: number
        email?: string
        preferred_username?: string
        name?: string
        oid?: string
        tid?: string
    }

    if (!decoded) {
        throw { status: 400, message: 'Invalid Microsoft ID Token format' }
    }

    if (AZURE_CLIENT_ID && decoded.aud !== AZURE_CLIENT_ID) {
        throw { status: 400, message: 'Microsoft token audience mismatch' }
    }

    if (!decoded.iss || (!decoded.iss.startsWith('https://login.microsoftonline.com/') && !decoded.iss.startsWith('https://sts.windows.net/'))) {
        throw { status: 400, message: 'Invalid Microsoft token issuer' }
    }

    if (decoded.exp * 1000 < Date.now()) {
        throw { status: 400, message: 'Microsoft ID Token has expired' }
    }

    const email = decoded.email || decoded.preferred_username
    if (!email) {
        throw { status: 400, message: 'Microsoft account profile is missing email address' }
    }

    const cleanEmail = email.toLowerCase().trim()

    // 3. Database operations
    return withTransactionOrDirect(async (session) => {
        const userQuery = User.findOne({ microsoftId: decoded.oid })
        let user = await (session ? userQuery.session(session) : userQuery)

        if (!user) {
            const emailQuery = User.findOne({ email: cleanEmail })
            user = await (session ? emailQuery.session(session) : emailQuery)

            if (user) {
                user.microsoftId = decoded.oid
                user.tenantId = decoded.tid
                user.provider = 'microsoft'
                user.emailVerified = true
                await user.save(session ? { session } : undefined)
            } else {
                const secureRandomPassword = crypto.randomBytes(16).toString('hex')
                user = new User({
                    fullName: decoded.name || cleanEmail.split('@')[0],
                    email: cleanEmail,
                    password: secureRandomPassword,
                    profileImage: '',
                    microsoftId: decoded.oid,
                    tenantId: decoded.tid,
                    provider: 'microsoft',
                    emailVerified: true,
                    status: 'online',
                    lastSeen: new Date()
                })
                await user.save(session ? { session } : undefined)
            }
        } else {
            user.status = 'online'
            user.lastSeen = new Date()
            await user.save(session ? { session } : undefined)
        }

        const { accessToken, refreshToken } = await createSession(user._id.toString(), deviceInfo, ipAddress, session)

        return { user: user.toJSON(), accessToken, refreshToken }
    })
}
