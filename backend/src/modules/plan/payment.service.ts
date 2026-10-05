import crypto from 'crypto'
import { Types } from 'mongoose'
import { PaymentTransaction, PaymentProvider } from './payment.model'
import { getPlanByPlanId } from './plan.service'
import { upgradeOrganizationPlan } from '../organization/organization.service'
import { Organization } from '../organization/organization.model'
import { User } from '../../models/user.model'
import { PlatformSettings } from '../admin/platformSettings.model'

// Default fallback API Keys from environment
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || ''
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || ''

class PaymentService {
    /**
     * Resolve active Stripe credentials from DB PlatformSettings or Environment
     */
    private async getStripeClient(): Promise<{ stripe: any; webhookSecret: string }> {
        let key = STRIPE_SECRET_KEY
        let webhookSec = STRIPE_WEBHOOK_SECRET

        try {
            const settings: any = await PlatformSettings.findOne({ key: 'global_config' }).lean()
            if (settings?.stripeSecretKey) {
                key = settings.stripeSecretKey
            }
            if (settings?.stripeWebhookSecret) {
                webhookSec = settings.stripeWebhookSecret
            }
        } catch (_) {}

        if (!key) {
            throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment or Admin Platform Settings.')
        }

        const Stripe = require('stripe')
        const stripe = new Stripe(key, { apiVersion: '2023-10-16' })
        return { stripe, webhookSecret: webhookSec }
    }

    /**
     * Resolve active Razorpay credentials from DB PlatformSettings or Environment
     */
    private async getRazorpayClient(): Promise<{ razorpay: any; keyId: string; keySecret: string }> {
        let keyId = process.env.RAZORPAY_KEY_ID || RAZORPAY_KEY_ID
        let keySecret = process.env.RAZORPAY_KEY_SECRET || RAZORPAY_KEY_SECRET

        try {
            const settings: any = await PlatformSettings.findOne({ key: 'global_config' }).lean()
            if (settings?.razorpayKeyId && settings?.razorpayKeySecret) {
                keyId = settings.razorpayKeyId
                keySecret = settings.razorpayKeySecret
            }
        } catch (_) {}

        if (!keyId || !keySecret) {
            throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.')
        }

        const Razorpay = require('razorpay')
        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret })
        return { razorpay, keyId, keySecret }
    }

    /**
     * Create a Stripe Checkout Session for subscription upgrade
     */
    public async createStripeCheckoutSession(params: {
        organizationId: string
        userId: string
        planId: string
        billingCycle?: 'monthly' | 'yearly'
        successUrl: string
        cancelUrl: string
    }): Promise<{ checkoutUrl: string; sessionId: string }> {
        const { organizationId, userId, planId, billingCycle = 'monthly', successUrl, cancelUrl } = params

        const plan = await getPlanByPlanId(planId)
        if (!plan) {
            throw new Error(`Plan "${planId}" not found`)
        }

        const org = await Organization.findById(organizationId)
        if (!org) {
            throw new Error('Organization not found')
        }

        const user = await User.findById(userId)
        if (!user) {
            throw new Error('User not found')
        }

        const { stripe } = await this.getStripeClient()
        const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
        const amountCents = Math.round(price * 100)

        const transactionId = 'tx_str_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: user.email,
            client_reference_id: organizationId,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `JTS-Meet ${plan.name} Plan (${billingCycle})`,
                            description: `Upgrade ${org.name} to ${plan.name} (${plan.limits.maxSeats} seats, ${plan.limits.maxStorageGb} GB cloud recording)`
                        },
                        unit_amount: amountCents
                    },
                    quantity: 1
                }
            ],
            metadata: {
                transactionId,
                organizationId,
                userId,
                planId,
                billingCycle
            },
            success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&tx=${transactionId}`,
            cancel_url: cancelUrl
        })

        // Log pending transaction in DB
        await PaymentTransaction.create({
            transactionId,
            organizationId: new Types.ObjectId(organizationId),
            userId: new Types.ObjectId(userId),
            planId,
            billingCycle,
            provider: 'stripe',
            amount: price,
            currency: 'USD',
            status: 'pending',
            orderId: session.id,
            customerEmail: user.email,
            metadata: {
                stripeSessionId: session.id
            }
        })

        return {
            checkoutUrl: session.url,
            sessionId: session.id
        }
    }

    /**
     * Process Stripe webhook signature and event
     */
    public async handleStripeWebhook(signature: string, rawBody: Buffer): Promise<{ received: boolean; event: string }> {
        const { stripe, webhookSecret } = await this.getStripeClient()

        let event: any
        if (webhookSecret) {
            event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
        } else {
            // In dev without secret, parse JSON payload safely
            event = JSON.parse(rawBody.toString('utf8'))
        }

        console.log(`[PaymentService][Stripe] Webhook event received: ${event.type}`)

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object
            const { organizationId, planId, userId, transactionId } = session.metadata || {}

            if (organizationId && planId) {
                // Update transaction status
                await PaymentTransaction.findOneAndUpdate(
                    { $or: [{ transactionId }, { orderId: session.id }] },
                    {
                        $set: {
                            status: 'completed',
                            paymentId: session.payment_intent || session.id,
                            completedAt: new Date()
                        }
                    }
                )

                // Execute organization plan upgrade
                await upgradeOrganizationPlan(organizationId, userId || '', planId, session.id)
                console.log(`[PaymentService][Stripe] Organization ${organizationId} upgraded to ${planId}`)
            }
        }

        return { received: true, event: event.type }
    }

    /**
     * Create Razorpay Order
     */
    public async createRazorpayOrder(params: {
        organizationId: string
        userId: string
        planId: string
        billingCycle?: 'monthly' | 'yearly'
    }): Promise<{ orderId: string; amount: number; currency: string; keyId: string }> {
        const { organizationId, userId, planId, billingCycle = 'monthly' } = params

        const plan = await getPlanByPlanId(planId)
        if (!plan) {
            throw new Error(`Plan "${planId}" not found`)
        }

        const org = await Organization.findById(organizationId)
        if (!org) {
            throw new Error('Organization not found')
        }

        const user = await User.findById(userId)
        if (!user) {
            throw new Error('User not found')
        }

        const { razorpay, keyId } = await this.getRazorpayClient()
        const priceUsd = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
        const exchangeRate = 83
        const amountInr = Math.round(priceUsd * exchangeRate)
        const amountPaise = amountInr * 100

        const receipt = `rcpt_${Date.now().toString().slice(-8)}`
        const order = await razorpay.orders.create({
            amount: amountPaise,
            currency: 'INR',
            receipt,
            notes: {
                organizationId,
                userId,
                planId,
                billingCycle,
                priceUsd: String(priceUsd),
                exchangeRate: String(exchangeRate)
            }
        })

        const transactionId = 'tx_rzp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
        const taxRate = 0.18
        const subtotal = Number((amountInr / (1 + taxRate)).toFixed(2))
        const taxAmount = Number((amountInr - subtotal).toFixed(2))

        await PaymentTransaction.create({
            transactionId,
            organizationId: new Types.ObjectId(organizationId),
            userId: new Types.ObjectId(userId),
            planId,
            billingCycle,
            provider: 'razorpay',
            amount: amountInr,
            currency: 'INR',
            subtotal,
            taxAmount,
            taxRate,
            status: 'pending',
            orderId: order.id,
            customerEmail: user.email,
            metadata: {
                razorpayOrderId: order.id,
                amountPaise,
                amountInr,
                priceUsd,
                exchangeRate
            }
        })

        return {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId
        }
    }

    /**
     * Verify Razorpay Payment Signature and upgrade plan
     */
    public async verifyRazorpayPayment(params: {
        orderId: string
        paymentId: string
        signature: string
        organizationId: string
        userId: string
        planId: string
    }): Promise<{ success: boolean; organization: any }> {
        const { orderId, paymentId, signature, organizationId, userId, planId } = params

        const { keySecret } = await this.getRazorpayClient()

        // Verify cryptographic HMAC SHA256 signature
        const hmac = crypto.createHmac('sha256', keySecret)
        hmac.update(`${orderId}|${paymentId}`)
        const generatedSignature = hmac.digest('hex')

        if (generatedSignature !== signature) {
            throw new Error('Invalid payment signature. Verification failed.')
        }

        // Update transaction log
        await PaymentTransaction.findOneAndUpdate(
            { orderId },
            {
                $set: {
                    status: 'completed',
                    paymentId,
                    signature,
                    completedAt: new Date()
                }
            }
        )

        // Upgrade organization plan
        const upgradedOrg = await upgradeOrganizationPlan(organizationId, userId, planId, paymentId)

        return {
            success: true,
            organization: upgradedOrg
        }
    }

    /**
     * Get transaction billing history for an organization
     */
    public async getOrganizationTransactions(organizationId: string) {
        return PaymentTransaction.find({ organizationId: new Types.ObjectId(organizationId) })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean()
    }
}

export const paymentService = new PaymentService()
