import bcrypt from 'bcrypt'
import { Schema, model, Document } from 'mongoose'

export interface IUser extends Document {
    fullName: string
    email: string
    password: string
    profileImage?: string
    status: 'online' | 'offline'
    emailVerified: boolean
    googleId?: string | null
    microsoftId?: string | null
    tenantId?: string | null
    provider?: string | null
    lastSeen?: Date | null
    otpCode?: string | null
    otpExpires?: Date | null
    createdAt: Date
    updatedAt: Date
}

const UserSchema = new Schema<IUser>(
    {
        fullName: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, select: false },
        profileImage: { type: String, default: '' },
        status: { type: String, enum: ['online', 'offline'], default: 'offline' },
        emailVerified: { type: Boolean, default: false },
        googleId: { type: String, default: null, index: true },
        microsoftId: { type: String, default: null, index: true },
        tenantId: { type: String, default: null },
        provider: { type: String, default: null, index: true },
        lastSeen: { type: Date, default: null },
        otpCode: { type: String, default: null },
        otpExpires: { type: Date, default: null }
    },
    { timestamps: true }
)

UserSchema.index({ fullName: 1 })
UserSchema.index({ createdAt: 1 })

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next()
    }

    const hashedPassword = await bcrypt.hash(this.password, 12)
    this.password = hashedPassword
    next()
})

UserSchema.methods.toJSON = function () {
    const obj = this.toObject()
    delete obj.password
    return obj
}

export const User = model<IUser>('User', UserSchema)
