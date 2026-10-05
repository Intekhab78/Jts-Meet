import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config'

export const ACCESS_TOKEN_EXPIRY = '15m'
export const REFRESH_TOKEN_EXPIRY_DAYS = 30

export interface JwtAccessTokenPayload {
    userId: string
    tokenVersion: number
    email?: string
    isSuperAdmin?: boolean
    [key: string]: any
}

export function generateAccessToken(payload: { userId: string; tokenVersion?: number; email?: string; isSuperAdmin?: boolean }): string {
    return jwt.sign(
        {
            userId: payload.userId,
            tokenVersion: payload.tokenVersion ?? 0,
            email: payload.email,
            isSuperAdmin: payload.isSuperAdmin
        },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    )
}

export function generateRefreshToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(40).toString('hex')
    const hash = hashToken(token)
    return { token, hash }
}

export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
}

export function getRefreshTokenCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production'
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax' as const,
        path: '/',
        maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    }
}
