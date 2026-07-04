import mongoose from 'mongoose'
import { MONGO_URI } from './index'

export async function connectDB(): Promise<void> {
    if (!MONGO_URI) {
        console.warn('MONGO_URI not provided; skipping mongoose connection')
        return
    }
    await mongoose.connect(MONGO_URI)
    console.log('Connected to MongoDB')
}
