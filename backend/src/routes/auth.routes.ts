import { Router } from 'express'
import passport from 'passport'
import { authController } from '../controllers/auth.controller'
import { asyncWrapper } from '../utils/asyncWrapper'
import { authenticate } from '../middleware/authMiddleware'
import { authRateLimiter } from '../middleware/rateLimiter'
import { FRONTEND_URL } from '../config'

const router = Router()

router.post('/register', authRateLimiter, asyncWrapper(authController.register))
router.post('/login', authRateLimiter, asyncWrapper(authController.login))
router.get('/me', authenticate, asyncWrapper(authController.getCurrentUser))
router.get('/sso/login/:orgSlug', asyncWrapper(authController.ssoLogin))
router.post('/sso/callback', authRateLimiter, asyncWrapper(authController.ssoCallback))

router.post('/google', asyncWrapper(authController.googleLogin))
router.get('/google', (req: any, res: any, next: any) => {
    const state = req.query.platform === 'mobile' ? 'mobile' : 'web'
    return passport.authenticate('google', { scope: ['profile', 'email'], state })(req, res, next)
})
router.get('/google/callback', passport.authenticate('google', { session: false }), (req: any, res: any) => {
    const isMobile = req.query.state === 'mobile'
    try {
        const { accessToken } = req.user as any
        if (isMobile) {
            const deepLink = `jtsmeet://auth?token=${encodeURIComponent(accessToken)}`
            return res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Returning to JTS Meet...</title><style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#0f172a;text-align:center;padding:24px}.btn{background:#2563eb;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;margin-top:16px;display:inline-block}</style></head><body><h2>Signed in to JTS Meet!</h2><p>Returning you to the mobile app...</p><a class="btn" href="${deepLink}">Open JTS Meet App</a><script>window.location.replace(${JSON.stringify(deepLink)});</script></body></html>`)
        }
        const host = req.get('host') || ''
        const targetFrontend = host.includes('jtsmiddleeast.com') ? 'https://meet.jtsmiddleeast.com' : FRONTEND_URL
        res.redirect(`${targetFrontend}/?token=${accessToken}`)
    } catch (err: any) {
        if (isMobile) {
            const deepLinkErr = `jtsmeet://auth?error=${encodeURIComponent(err.message || 'Google Auth failed')}`
            return res.redirect(deepLinkErr)
        }
        const host = req.get('host') || ''
        const targetFrontend = host.includes('jtsmiddleeast.com') ? 'https://meet.jtsmiddleeast.com' : FRONTEND_URL
        res.redirect(`${targetFrontend}/login?error=${encodeURIComponent(err.message || 'Google Auth failed')}`)
    }
})
router.post('/microsoft', asyncWrapper(authController.microsoftLogin))

router.post('/verify-otp', authRateLimiter, asyncWrapper(authController.verifyOtp))
router.post('/resend-otp', authRateLimiter, asyncWrapper(authController.resendOtp))
router.post('/forgot-password', authRateLimiter, asyncWrapper(authController.forgotPassword))
router.post('/reset-password', authRateLimiter, asyncWrapper(authController.resetPassword))

router.post('/refresh-token', asyncWrapper(authController.refreshToken))
router.post('/refresh', asyncWrapper(authController.refreshToken))
router.post('/logout', asyncWrapper(authController.logout))
router.post('/logout-all', authenticate, asyncWrapper(authController.logoutAll))

router.put('/profile', authenticate, asyncWrapper(authController.updateProfile))
router.put('/status', authenticate, asyncWrapper(authController.updateStatus))
router.post('/change-password', authenticate, asyncWrapper(authController.changePassword))
router.get('/sessions', authenticate, asyncWrapper(authController.getSessions))
router.delete('/sessions/:sessionId', authenticate, asyncWrapper(authController.revokeSession))

export default router
