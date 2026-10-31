import { initializeApp, cert, App, getApps } from 'firebase-admin/app'
import { getMessaging, Messaging } from 'firebase-admin/messaging'
import path from 'path'
import fs from 'fs'

let firebaseApp: App | null = null
let messagingInstance: Messaging | null = null

try {
    const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account.json')
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
        if (getApps().length === 0) {
            firebaseApp = initializeApp({
                credential: cert(serviceAccount)
            })
        } else {
            firebaseApp = getApps()[0]
        }
        messagingInstance = getMessaging(firebaseApp)
        console.log('[Firebase] Admin SDK v14 initialized successfully for project:', serviceAccount.project_id)
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        if (getApps().length === 0) {
            firebaseApp = initializeApp({
                credential: cert(serviceAccount)
            })
        } else {
            firebaseApp = getApps()[0]
        }
        messagingInstance = getMessaging(firebaseApp)
        console.log('[Firebase] Admin SDK initialized from env for project:', serviceAccount.project_id)
    } else {
        console.warn('[Firebase] firebase-service-account.json not found. FCM background pushes will be skipped.')
    }
} catch (error: any) {
    console.error('[Firebase] Error initializing Firebase Admin SDK:', error?.message || error)
}

export const getFirebaseApp = () => firebaseApp
export const getFirebaseMessaging = () => messagingInstance
export default { getFirebaseApp, getFirebaseMessaging }
