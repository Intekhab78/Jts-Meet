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

export async function createSession(userId: string, deviceInfo = '', ipAddress = '', session?: mongoose.ClientSession): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = createToken(userId)
    const refreshToken = crypto.randomBytes(40).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const newSession = new Session({
        userId,
        refreshToken,
        deviceInfo,
        ipAddress,
        expiresAt
    })
    await newSession.save({ session })

    return { accessToken, refreshToken }
}

function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function registerUser(payload: RegisterPayload, deviceInfo?: string, ipAddress?: string): Promise<AuthResult> {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        let user = await User.findOne({ email: payload.email.toLowerCase().trim() }).session(session)
        
        const otpCode = generateOTP()
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000)

        if (user) {
            if (!user.emailVerified) {
                user.fullName = payload.fullName.trim()
                user.password = payload.password
                user.otpCode = otpCode
                user.otpExpires = otpExpires
                await user.save({ session })
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
            await user.save({ session })
        }

        const { accessToken, refreshToken } = await createSession(user._id.toString(), deviceInfo, ipAddress, session)

        await session.commitTransaction()

        sendOTPEmail(user.email, otpCode).catch((err) => {
            console.error('Failed to send verification email:', err)
        })

        return { user: user.toJSON(), accessToken, refreshToken }
    } catch (err) {
        await session.abortTransaction()
        throw err
    } finally {
        session.endSession()
    }
}

export async function loginUser(payload: LoginPayload, deviceInfo?: string, ipAddress?: string): Promise<AuthResult> {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const user = await User.findOne({ email: payload.email.toLowerCase().trim() }).select('+password').session(session)
        if (!user) {
            throw { status: 401, message: 'Invalid credentials' }
        }

        const isMatch = await bcrypt.compare(payload.password, user.password)
        if (!isMatch) {
            throw { status: 401, message: 'Invalid credentials' }
        }

        user.status = 'online'
        user.lastSeen = new Date()
        await user.save({ session })

        const { accessToken, refreshToken } = await createSession(user._id.toString(), deviceInfo, ipAddress, session)

        await session.commitTransaction()
        return { user: user.toJSON(), accessToken, refreshToken }
    } catch (err) {
        await session.abortTransaction()
        throw err
    } finally {
        session.endSession()
    }
}

export async function getCurrentUser(userId: string): Promise<Record<string, any>> {
    const user = await User.findById(userId)
    if (!user) {
        throw { status: 404, message: 'User not found' }
    }
    return user.toJSON()
}

export async function verifyOtp(email: string, code: string, deviceInfo?: string, ipAddress?: string): Promise<AuthResult> {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() }).session(session)
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
        await user.save({ session })

        const { accessToken, refreshToken } = await createSession(user._id.toString(), deviceInfo, ipAddress, session)

        await session.commitTransaction()
        return { user: user.toJSON(), accessToken, refreshToken }
    } catch (err) {
        await session.abortTransaction()
        throw err
    } finally {
        session.endSession()
    }
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
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const currentSession = await Session.findOne({ refreshToken: oldRefreshToken }).session(session)
        if (!currentSession) {
            throw { status: 401, message: 'Invalid refresh token' }
        }
        if (currentSession.expiresAt < new Date()) {
            await currentSession.deleteOne({ session })
            await session.commitTransaction()
            throw { status: 401, message: 'Refresh token expired' }
        }

        const userId = currentSession.userId.toString()
        await currentSession.deleteOne({ session })

        const tokens = await createSession(userId, deviceInfo, ipAddress, session)

        await session.commitTransaction()
        return tokens
    } catch (err) {
        await session.abortTransaction()
        throw err
    } finally {
        session.endSession()
    }
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

export async function loginOrCreateSsoUser(email: string, orgSlug: string, deviceInfo = '', ipAddress = ''): Promise<AuthResult> {
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const cleanEmail = email.toLowerCase().trim()
        const cleanSlug = orgSlug.toLowerCase().trim()

        const org = await Organization.findOne({ slug: cleanSlug }).session(session)
        if (!org) {
            throw { status: 404, message: 'Organization workspace not found' }
        }

        let user = await User.findOne({ email: cleanEmail }).session(session)
        if (!user) {
            user = new User({
                fullName: cleanEmail.split('@')[0],
                email: cleanEmail,
                password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
                profileImage: '',
                status: 'online',
                emailVerified: true,
                lastSeen: new Date()
            })
            await user.save({ session })
        } else {
            user.status = 'online'
            user.lastSeen = new Date()
            user.emailVerified = true
            await user.save({ session })
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
            await org.save({ session })
        } else {
            const member = org.members.find(m => m.userId.toString() === user!._id.toString())
            if (member && member.status !== 'active') {
                member.status = 'active'
                member.joinedAt = new Date()
                await org.save({ session })
            }
        }

        const { accessToken, refreshToken } = await createSession(user._id.toString(), deviceInfo, ipAddress, session)

        await session.commitTransaction()
        return { user: user.toJSON(), accessToken, refreshToken }
    } catch (err) {
        await session.abortTransaction()
        throw err
    } finally {
        session.endSession()
    }
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

    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        const cleanEmail = googleData.email.toLowerCase().trim()

        let user = await User.findOne({ googleId: googleData.googleId }).session(session)

        if (!user) {
            user = await User.findOne({ email: cleanEmail }).session(session)

            if (user) {
                user.googleId = googleData.googleId
                user.provider = 'google'
                user.emailVerified = true
                await user.save({ session })
            } else {
                const secureRandomPassword = crypto.randomBytes(16).toString('hex')
                user = new User({
                    fullName: googleData.name,
                    email: cleanEmail,
                    password: await bcrypt.hash(secureRandomPassword, 10),
                    profileImage: googleData.picture,
                    googleId: googleData.googleId,
                    provider: 'google',
                    emailVerified: true,
                    status: 'online',
                    lastSeen: new Date()
                })
                await user.save({ session })
            }
        } else {
            user.status = 'online'
            user.lastSeen = new Date()
            await user.save({ session })
        }

        const { accessToken, refreshToken } = await createSession(user._id.toString(), deviceInfo, ipAddress, session)

        await session.commitTransaction()
        return { user: user.toJSON(), accessToken, refreshToken }
    } catch (err) {
        await session.abortTransaction()
        throw err
    } finally {
        session.endSession()
    }
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
    const session = await mongoose.startSession()
    session.startTransaction()

    try {
        let user = await User.findOne({ microsoftId: decoded.oid }).session(session)

        if (!user) {
            user = await User.findOne({ email: cleanEmail }).session(session)

            if (user) {
                user.microsoftId = decoded.oid
                user.tenantId = decoded.tid
                user.provider = 'microsoft'
                user.emailVerified = true
                await user.save({ session })
            } else {
                const secureRandomPassword = crypto.randomBytes(16).toString('hex')
                user = new User({
                    fullName: decoded.name || cleanEmail.split('@')[0],
                    email: cleanEmail,
                    password: await bcrypt.hash(secureRandomPassword, 10),
                    profileImage: '',
                    microsoftId: decoded.oid,
                    tenantId: decoded.tid,
                    provider: 'microsoft',
                    emailVerified: true,
                    status: 'online',
                    lastSeen: new Date()
                })
                await user.save({ session })
            }
        } else {
            user.status = 'online'
            user.lastSeen = new Date()
            await user.save({ session })
        }

        const { accessToken, refreshToken } = await createSession(user._id.toString(), deviceInfo, ipAddress, session)

        await session.commitTransaction()
        return { user: user.toJSON(), accessToken, refreshToken }
    } catch (err) {
        await session.abortTransaction()
        throw err
    } finally {
        session.endSession()
    }
}
