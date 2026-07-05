import path from 'path'
import dotenv from 'dotenv'

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
dotenv.config({ path: path.resolve(process.cwd(), envFile) })

export const PORT = process.env.PORT ? Number(process.env.PORT) : 4000
export const MONGO_URI = process.env.MONGO_URI || ''
export const JWT_SECRET = process.env.JWT_SECRET || 'change-me'
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'
export const NODE_ENV = process.env.NODE_ENV || 'development'
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || ''
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || ''
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || ''
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
export const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || ''
export const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || ''
export const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || 'common'
