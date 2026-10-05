import { Router } from 'express'
import { paymentController } from './payment.controller'
import { authenticate } from '../../middleware/authMiddleware'
import { asyncWrapper } from '../../utils/asyncWrapper'

const router = Router()

// Stripe Checkout Session Creation
router.post('/stripe/checkout-session', authenticate, asyncWrapper(paymentController.createStripeCheckout))

// Stripe Webhook (Stripe signs with signature header, no auth token)
router.post('/stripe/webhook', asyncWrapper(paymentController.handleStripeWebhook))

// Razorpay Order Creation
router.post('/razorpay/order', authenticate, asyncWrapper(paymentController.createRazorpayOrder))

// Razorpay Payment Verification
router.post('/razorpay/verify', authenticate, asyncWrapper(paymentController.verifyRazorpayPayment))

// Organization Billing Transactions
router.get('/transactions/:organizationId', authenticate, asyncWrapper(paymentController.getOrganizationTransactions))

// Download Tax/GST Invoice PDF
router.get('/transactions/:transactionId/invoice', authenticate, asyncWrapper(paymentController.downloadInvoice))

export default router
