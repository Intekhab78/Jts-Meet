import PDFDocument from 'pdfkit'
import { IPaymentTransaction } from '../modules/plan/payment.model'
import { Organization } from '../modules/organization/organization.model'
import { User } from '../models/user.model'
import { getPlanByPlanId } from '../modules/plan/plan.service'

export interface InvoiceData {
    invoiceNumber: string
    date: string
    transactionId: string
    paymentId: string
    provider: string
    customerName: string
    customerEmail: string
    organizationName: string
    planName: string
    billingCycle: string
    currency: string
    subtotal: number
    taxRate: number
    taxAmount: number
    totalAmount: number
    status: string
    originalAmountUsd?: number
    exchangeRate?: number
}

export class InvoiceService {
    /**
     * Generate an InvoiceData model from a PaymentTransaction document
     */
    public async prepareInvoiceData(transaction: IPaymentTransaction): Promise<InvoiceData> {
        const org = await Organization.findById(transaction.organizationId).lean()
        const user = await User.findById(transaction.userId).lean()
        const plan = await getPlanByPlanId(transaction.planId)

        let totalAmount = transaction.amount
        // Auto-heal legacy or unconverted Razorpay records where amount was stored as USD
        if (transaction.provider === 'razorpay' && transaction.metadata?.amountPaise) {
            const actualInr = transaction.metadata.amountPaise / 100
            if (totalAmount < actualInr) {
                totalAmount = actualInr
            }
        }

        const taxRate = transaction.taxRate !== undefined ? transaction.taxRate : 0.18
        const subtotal = transaction.subtotal && transaction.subtotal > 0 && transaction.subtotal > totalAmount * 0.5
            ? transaction.subtotal
            : Number((totalAmount / (1 + taxRate)).toFixed(2))
        const taxAmount = transaction.taxAmount && transaction.taxAmount > 0
            ? transaction.taxAmount
            : Number((totalAmount - subtotal).toFixed(2))

        const year = transaction.completedAt ? transaction.completedAt.getFullYear() : new Date().getFullYear()
        const invoiceNumber = transaction.invoiceNumber || `INV-${year}-${transaction.transactionId.slice(-6).toUpperCase()}`

        const originalAmountUsd = transaction.metadata?.priceUsd || (transaction.currency === 'USD' ? totalAmount : Math.round(totalAmount / 83))
        const exchangeRate = transaction.metadata?.exchangeRate || (transaction.currency === 'INR' ? 83 : undefined)

        return {
            invoiceNumber,
            date: (transaction.completedAt || transaction.createdAt || new Date()).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            transactionId: transaction.transactionId,
            paymentId: transaction.paymentId || 'N/A',
            provider: (transaction.provider || 'card').toUpperCase(),
            customerName: user?.fullName || 'Valued Customer',
            customerEmail: transaction.customerEmail || user?.email || '',
            organizationName: org?.name || 'Organization',
            planName: plan?.name || transaction.planId.toUpperCase(),
            billingCycle: (transaction.billingCycle || 'monthly').toUpperCase(),
            currency: transaction.currency || 'USD',
            subtotal,
            taxRate: Math.round(taxRate * 100),
            taxAmount,
            totalAmount,
            status: transaction.status === 'completed' ? 'PAID' : transaction.status.toUpperCase(),
            originalAmountUsd,
            exchangeRate
        }
    }

    /**
     * Stream a professional PDF invoice directly to a Writable stream (e.g. Express Response)
     */
    public generateInvoicePdf(data: InvoiceData, stream: NodeJS.WritableStream): Promise<void> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 45, size: 'A4' })

            doc.on('error', reject)
            doc.pipe(stream)
            stream.on('finish', resolve)

            // Primary Brand Colors
            const brandPrimary = '#0f172a'
            const brandAccent = '#2563eb'
            const textDark = '#1e293b'
            const textMuted = '#64748b'
            const borderGray = '#e2e8f0'

            // --- Header Banner ---
            doc.rect(0, 0, 595.28, 12).fill(brandAccent)

            doc.moveDown(0.8)
            doc.fontSize(22).font('Helvetica-Bold').fillColor(brandPrimary).text('JTS-MEET ENTERPRISE', 45, 35)
            doc.fontSize(9).font('Helvetica').fillColor(textMuted).text('Next-Gen Cloud Conferencing & Collaboration Hub', 45, 62)

            // Invoice badge
            doc.fontSize(18).font('Helvetica-Bold').fillColor(brandAccent).text('TAX INVOICE', 400, 35, { align: 'right' })
            doc.fontSize(9).font('Helvetica').fillColor(textDark).text(`Invoice No: ${data.invoiceNumber}`, 400, 58, { align: 'right' })
            doc.fontSize(9).font('Helvetica').fillColor(textMuted).text(`Date: ${data.date}`, 400, 72, { align: 'right' })

            // Divider
            doc.moveTo(45, 95).lineTo(550, 95).strokeColor(borderGray).lineWidth(1).stroke()

            // --- Billed To & Provider Information ---
            const startY = 115
            doc.fontSize(10).font('Helvetica-Bold').fillColor(brandPrimary).text('BILLED TO:', 45, startY)
            doc.fontSize(11).font('Helvetica-Bold').fillColor(textDark).text(data.organizationName, 45, startY + 16)
            doc.fontSize(9).font('Helvetica').fillColor(textMuted).text(`Contact: ${data.customerName}`, 45, startY + 32)
            doc.fontSize(9).font('Helvetica').fillColor(textMuted).text(`Email: ${data.customerEmail}`, 45, startY + 46)

            doc.fontSize(10).font('Helvetica-Bold').fillColor(brandPrimary).text('PAYMENT DETAILS:', 350, startY)
            doc.fontSize(9).font('Helvetica').fillColor(textMuted).text(`Method: ${data.provider} Online Payment`, 350, startY + 16)
            doc.fontSize(9).font('Helvetica').fillColor(textMuted).text(`Ref ID: ${data.transactionId}`, 350, startY + 30)
            doc.fontSize(9).font('Helvetica').fillColor(textMuted).text(`Gateway ID: ${data.paymentId}`, 350, startY + 44)
            doc.fontSize(9).font('Helvetica-Bold').fillColor(data.status === 'PAID' ? '#16a34a' : '#ea580c').text(`Status: ${data.status} ✓`, 350, startY + 58)

            // --- Line Items Table Header ---
            const tableY = 205
            doc.rect(45, tableY, 505, 24).fill('#f8fafc')
            doc.rect(45, tableY, 505, 24).strokeColor(borderGray).lineWidth(0.5).stroke()

            doc.fontSize(9).font('Helvetica-Bold').fillColor(brandPrimary)
            doc.text('DESCRIPTION', 55, tableY + 7)
            doc.text('CYCLE', 270, tableY + 7)
            doc.text('QTY', 340, tableY + 7, { width: 30, align: 'center' })
            doc.text('UNIT PRICE', 380, tableY + 7, { width: 80, align: 'right' })
            doc.text('AMOUNT', 470, tableY + 7, { width: 75, align: 'right' })

            // Item Row
            const rowY = tableY + 32
            doc.fontSize(10).font('Helvetica-Bold').fillColor(textDark)
            doc.text(`JTS-Meet ${data.planName} Plan Subscription`, 55, rowY)
            doc.fontSize(8.5).font('Helvetica').fillColor(textMuted)
            const exchangeNote = data.currency === 'INR' && data.originalAmountUsd
                ? `Plan Tier: $${data.originalAmountUsd} USD • Converted @ ₹${data.exchangeRate || 83}/USD for Domestic INR Payment`
                : 'Enterprise video meetings, cloud recording, noise cancellation, multi-tenant workspace'
            doc.text(exchangeNote, 55, rowY + 14)

            const formattedSubtotal = `${data.currency} ${data.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            const formattedTotal = `${data.currency} ${data.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            const formattedTax = `${data.currency} ${data.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

            doc.fontSize(9).font('Helvetica').fillColor(textDark)
            doc.text(data.billingCycle, 270, rowY)
            doc.text('1', 340, rowY, { width: 30, align: 'center' })
            doc.text(formattedSubtotal, 380, rowY, { width: 80, align: 'right' })
            doc.fontSize(9).font('Helvetica-Bold').fillColor(brandPrimary)
            doc.text(formattedSubtotal, 470, rowY, { width: 75, align: 'right' })

            // Row Bottom Divider
            doc.moveTo(45, rowY + 36).lineTo(550, rowY + 36).strokeColor(borderGray).lineWidth(0.5).stroke()

            // --- Calculation Summary Table ---
            const summaryY = rowY + 55
            const labelX = 310
            const valX = 425
            const widthVal = 120

            doc.fontSize(9).font('Helvetica').fillColor(textMuted)
            doc.text('Subtotal:', labelX, summaryY)
            doc.text(formattedSubtotal, valX, summaryY, { width: widthVal, align: 'right' })

            doc.text(`Tax / GST (${data.taxRate}%):`, labelX, summaryY + 18)
            doc.text(formattedTax, valX, summaryY + 18, { width: widthVal, align: 'right' })

            // Total Bar
            doc.rect(300, summaryY + 36, 250, 30).fill('#f1f5f9')
            doc.rect(300, summaryY + 36, 250, 30).strokeColor(borderGray).lineWidth(0.5).stroke()

            doc.fontSize(11).font('Helvetica-Bold').fillColor(brandPrimary)
            doc.text('Grand Total:', 310, summaryY + 45)
            doc.fontSize(12).font('Helvetica-Bold').fillColor(brandAccent)
            doc.text(formattedTotal, valX - 10, summaryY + 44, { width: widthVal + 10, align: 'right' })

            // --- Authenticity & Compliance Box ---
            const boxY = 430
            doc.rect(45, boxY, 505, 75).fill('#fafafa')
            doc.rect(45, boxY, 505, 75).strokeColor('#cbd5e1').lineWidth(0.5).stroke()

            doc.fontSize(9).font('Helvetica-Bold').fillColor(brandPrimary).text('TAX & AUTHENTICITY NOTICE', 60, boxY + 12)
            doc.fontSize(8).font('Helvetica').fillColor(textMuted).text(
                'This document is an electronically generated and digitally validated tax invoice. No physical signature is required. ' +
                'JTS-Meet adheres to international digital services tax compliance standards. For any invoice queries or adjustments, ' +
                'please contact billing support at billing@jtsmeet.com quoting your invoice number.',
                60, boxY + 28, { width: 475, lineGap: 2 }
            )

            // --- Footer ---
            doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text(
                'JTS-Meet Technologies • Cloud Collaboration Infrastructure • https://meet.jtsmiddleeast.com',
                45, 780, { align: 'center', width: 505 }
            )

            doc.end()
        })
    }
}

export const invoiceService = new InvoiceService()
