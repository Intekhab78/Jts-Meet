import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { asyncWrapper } from '../utils/asyncWrapper'
import { authenticate } from '../middleware/authMiddleware'

const router = Router()

router.post('/register', asyncWrapper(authController.register))
router.post('/login', asyncWrapper(authController.login))
router.get('/me', authenticate, asyncWrapper(authController.getCurrentUser))
router.get('/sso/login/:orgSlug', asyncWrapper(authController.ssoLogin))
router.post('/sso/callback', asyncWrapper(authController.ssoCallback))
import passport from 'passport'
import { FRONTEND_URL } from '../config'

router.post('/google', asyncWrapper(authController.googleLogin))
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
    try {
        const { accessToken } = req.user as any
        res.redirect(`${FRONTEND_URL}/?token=${accessToken}`)
    } catch (err: any) {
        res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(err.message || 'Google Auth failed')}`)
    }
})
router.post('/microsoft', asyncWrapper(authController.microsoftLogin))

router.post('/verify-otp', asyncWrapper(authController.verifyOtp))
router.post('/resend-otp', asyncWrapper(authController.resendOtp))
router.post('/forgot-password', asyncWrapper(authController.forgotPassword))
router.post('/reset-password', asyncWrapper(authController.resetPassword))

router.post('/refresh-token', asyncWrapper(authController.refreshToken))
router.post('/logout', asyncWrapper(authController.logout))

router.put('/profile', authenticate, asyncWrapper(authController.updateProfile))
router.post('/change-password', authenticate, asyncWrapper(authController.changePassword))
router.get('/sessions', authenticate, asyncWrapper(authController.getSessions))
router.delete('/sessions/:sessionId', authenticate, asyncWrapper(authController.revokeSession))

export default router
