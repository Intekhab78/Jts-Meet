import { Schema, model, Document, Types } from 'mongoose'

export type PaymentProvider = 'stripe' | 'razorpay' | 'manual'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface IPaymentTransaction extends Document {
    transactionId: string
    organizationId: Types.ObjectId
    userId: Types.ObjectId
    planId: string
    billingCycle: 'monthly' | 'yearly'
    provider: PaymentProvider
    amount: number
    currency: string
    status: PaymentStatus
    orderId?: string
    paymentId?: string
    signature?: string
    customerEmail?: string
    invoiceNumber?: string
    taxRate?: number
    taxAmount?: number
    subtotal?: number
    customerName?: string
    organizationName?: string
    metadata?: Record<string, any>
    completedAt?: Date
    createdAt: Date
    updatedAt: Date
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
    {
        transactionId: { type: String, required: true, unique: true, index: true },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        planId: { type: String, required: true },
        billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
        provider: { type: String, enum: ['stripe', 'razorpay', 'manual'], required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'USD' },
        status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending', index: true },
        orderId: { type: String },
        paymentId: { type: String },
        signature: { type: String },
        customerEmail: { type: String },
        customerName: { type: String },
        organizationName: { type: String },
        invoiceNumber: { type: String, index: true },
        taxRate: { type: Number, default: 0.18 },
        taxAmount: { type: Number, default: 0 },
        subtotal: { type: Number, default: 0 },
        metadata: { type: Schema.Types.Mixed },
        completedAt: { type: Date }
    },
    { timestamps: true }
)

export const PaymentTransaction = model<IPaymentTransaction>('PaymentTransaction', PaymentTransactionSchema)
