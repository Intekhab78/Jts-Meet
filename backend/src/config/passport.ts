import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NODE_ENV } from './index'
import { User } from '../models/user.model'
import { createSession } from '../services/auth.service'
import crypto from 'crypto'
import bcrypt from 'bcrypt'

const callbackURL = NODE_ENV === 'production'
    ? 'https://meetapi.jtsonline.shop/api/auth/google/callback'
    : 'http://localhost:4000/api/auth/google/callback'

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL,
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value
        if (!email) {
            return done(new Error('Google profile is missing an email address'))
        }

        const cleanEmail = email.toLowerCase().trim()

        let user = await User.findOne({ googleId: profile.id })

        if (!user) {
            user = await User.findOne({ email: cleanEmail })

            if (user) {
                user.googleId = profile.id
                user.provider = 'google'
                user.emailVerified = true
                await user.save()
            } else {
                const secureRandomPassword = crypto.randomBytes(16).toString('hex')
                user = new User({
                    fullName: profile.displayName || profile.name?.givenName || cleanEmail.split('@')[0],
                    email: cleanEmail,
                    password: await bcrypt.hash(secureRandomPassword, 10),
                    profileImage: profile.photos?.[0]?.value || '',
                    googleId: profile.id,
                    provider: 'google',
                    emailVerified: true,
                    status: 'online',
                    lastSeen: new Date()
                })
                await user.save()
            }
        } else {
            user.status = 'online'
            user.lastSeen = new Date()
            await user.save()
        }

        const deviceInfo = req.headers['user-agent'] || ''
        const ipAddress = req.ip || ''

        const sessionResult = await createSession(user._id.toString(), deviceInfo, ipAddress)
        
        return done(null, sessionResult)
    } catch (err: any) {
        return done(err)
    }
}))
