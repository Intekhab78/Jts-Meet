import { Request, Response } from 'express'
import { paymentService } from './payment.service'
import { invoiceService } from '../../services/invoice.service'
import { PaymentTransaction } from './payment.model'
import { Types } from 'mongoose'
import { sendSuccess, sendError } from '../../utils/responseHelper'

export const paymentController = {
    /**
     * POST /api/payment/stripe/checkout-session
     */
    createStripeCheckout: async (req: Request, res: Response) => {
        try {
            const userId = (req as any).userId
            if (!userId) {
                return sendError(res, 401, 'Unauthorized')
            }

            const { organizationId, planId, billingCycle, successUrl, cancelUrl } = req.body
            if (!organizationId || !planId) {
                return sendError(res, 400, 'organizationId and planId are required')
            }

            const origin = req.get('origin') || 'http://localhost:3000'
            const resolvedSuccessUrl = successUrl || `${origin}/#/organization?payment=success`
            const resolvedCancelUrl = cancelUrl || `${origin}/#/organization?payment=cancelled`

            const result = await paymentService.createStripeCheckoutSession({
                organizationId,
                userId,
                planId,
                billingCycle: billingCycle || 'monthly',
                successUrl: resolvedSuccessUrl,
                cancelUrl: resolvedCancelUrl
            })

            return sendSuccess(res, result, 'Stripe checkout session initialized')
        } catch (error: any) {
            console.error('[createStripeCheckout] Error:', error)
            return sendError(res, 500, error.message || 'Failed to initialize Stripe checkout')
        }
    },

    /**
     * POST /api/payment/stripe/webhook
     */
    handleStripeWebhook: async (req: Request, res: Response) => {
        try {
            const signature = req.headers['stripe-signature'] as string
            const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body))

            if (!signature && process.env.NODE_ENV === 'production') {
                return sendError(res, 400, 'Missing stripe-signature header')
            }

            const result = await paymentService.handleStripeWebhook(signature, rawBody)
            return res.status(200).json(result)
        } catch (error: any) {
            console.error('[handleStripeWebhook] Error:', error)
            return res.status(400).send(`Webhook Error: ${error.message}`)
        }
    },

    /**
     * POST /api/payment/razorpay/order
     */
    createRazorpayOrder: async (req: Request, res: Response) => {
        try {
            const userId = (req as any).userId
            if (!userId) {
                return sendError(res, 401, 'Unauthorized')
            }

            const { organizationId, planId, billingCycle } = req.body
            if (!organizationId || !planId) {
                return sendError(res, 400, 'organizationId and planId are required')
            }

            const result = await paymentService.createRazorpayOrder({
                organizationId,
                userId,
                planId,
                billingCycle: billingCycle || 'monthly'
            })

            return sendSuccess(res, result, 'Razorpay order created successfully')
        } catch (error: any) {
            console.error('[createRazorpayOrder] Error:', error)
            return sendError(res, 500, error.message || 'Failed to create Razorpay order')
        }
    },

    /**
     * POST /api/payment/razorpay/verify
     */
    verifyRazorpayPayment: async (req: Request, res: Response) => {
        try {
            const userId = (req as any).userId
            if (!userId) {
                return sendError(res, 401, 'Unauthorized')
            }

            const { orderId, paymentId, signature, organizationId, planId } = req.body
            if (!orderId || !paymentId || !signature || !organizationId || !planId) {
                return sendError(res, 400, 'orderId, paymentId, signature, organizationId, and planId are required')
            }

            const result = await paymentService.verifyRazorpayPayment({
                orderId,
                paymentId,
                signature,
                organizationId,
                userId,
                planId
            })

            return sendSuccess(res, result, 'Payment verified and organization subscription upgraded successfully')
        } catch (error: any) {
            console.error('[verifyRazorpayPayment] Error:', error)
            return sendError(res, 400, error.message || 'Payment verification failed')
        }
    },

    /**
     * GET /api/payment/transactions/:organizationId
     */
    getOrganizationTransactions: async (req: Request, res: Response) => {
        try {
            const organizationId = String(req.params.organizationId || '')
            if (!organizationId) {
                return sendError(res, 400, 'organizationId is required')
            }

            const transactions = await paymentService.getOrganizationTransactions(organizationId)
            return sendSuccess(res, transactions, 'Billing transactions retrieved successfully')
        } catch (error: any) {
            console.error('[getOrganizationTransactions] Error:', error)
            return sendError(res, 500, error.message || 'Failed to retrieve transactions')
        }
    },

    /**
     * GET /api/payment/transactions/:transactionId/invoice
     */
    downloadInvoice: async (req: Request, res: Response) => {
        try {
            const transactionId = String(req.params.transactionId || '')
            if (!transactionId) {
                return sendError(res, 400, 'transactionId is required')
            }

            const transaction = await PaymentTransaction.findOne({
                $or: [{ transactionId }, ...(Types.ObjectId.isValid(transactionId) ? [{ _id: new Types.ObjectId(transactionId) }] : [])]
            })

            if (!transaction) {
                return sendError(res, 404, 'Transaction not found')
            }

            const invoiceData = await invoiceService.prepareInvoiceData(transaction)

            res.setHeader('Content-Type', 'application/pdf')
            res.setHeader('Content-Disposition', `attachment; filename="${invoiceData.invoiceNumber}.pdf"`)

            await invoiceService.generateInvoicePdf(invoiceData, res)
        } catch (error: any) {
            console.error('[downloadInvoice] Error:', error)
            return sendError(res, 500, error.message || 'Failed to generate invoice PDF')
        }
    }
}
