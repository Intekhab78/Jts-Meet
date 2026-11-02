import { createClient, RedisClientType } from 'redis'
import { REDIS_URL, NODE_ENV } from '../config'

export class RedisService {
    private static instance: RedisService | null = null
    private client: RedisClientType | null = null
    private isClosing = false

    private constructor() {
        this.initialize()
    }

    public static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService()
        }
        return RedisService.instance
    }

    private initialize() {
        this.client = createClient({
            url: REDIS_URL,
            socket: {
                connectTimeout: 10000,
                keepAlive: true,
                keepAliveInitialDelay: 15000,
                reconnectStrategy: (retries) => {
                    if (this.isClosing) {
                        return false // Stop trying to reconnect when closing down explicitly
                    }
                    if (NODE_ENV !== 'production' && retries >= 5) {
                        return false // In dev without Redis, stop retrying after 5 attempts to prevent log spam
                    }
                    // In production, keep retrying with exponential backoff up to 3s with jitter
                    const jitter = Math.floor(Math.random() * 200)
                    const delay = Math.min(retries * 200, 3000)
                    return delay + jitter
                }
            }
        }) as RedisClientType

        this.client.on('error', (err) => {
            // Silence connection refused errors and transient timeout errors during restarts
            if (
                err?.code === 'ECONNREFUSED' ||
                err?.message?.includes('ECONNREFUSED') ||
                err?.name === 'TimeoutError' ||
                err?.message?.includes('Timeout') ||
                err?.name === 'AbortError'
            ) {
                return
            }
            // eslint-disable-next-line no-console
            console.error('Redis Service Client Error:', err)
        })

        this.client.on('connect', () => {
            // eslint-disable-next-line no-console
            console.log('Redis Service Client connected successfully')
        })

        this.client.on('ready', () => {
            // eslint-disable-next-line no-console
            console.log('Redis Service Client is ready')
        })

        this.client.on('reconnecting', () => {
            // eslint-disable-next-line no-console
            console.log('Redis Service Client is reconnecting...')
        })

        this.client.on('end', () => {
            // eslint-disable-next-line no-console
            console.log('Redis Service Client connection has ended')
        })
    }

    public getClient(): RedisClientType {
        if (!this.client) {
            throw new Error('Redis service is not initialized')
        }
        return this.client
    }

    public async connect(): Promise<void> {
        const client = this.getClient()
        if (!client.isOpen) {
            // eslint-disable-next-line no-console
            console.log('Starting Redis connection startup sequence...')
            await client.connect()
        }
    }

    public async disconnect(): Promise<void> {
        this.isClosing = true
        if (this.client && this.client.isOpen) {
            await this.client.quit()
            // eslint-disable-next-line no-console
            console.log('Redis Service Client disconnected gracefully')
        }
    }

    public async healthCheck(): Promise<boolean> {
        try {
            if (!this.client || !this.client.isOpen || !this.client.isReady) {
                return false
            }
            const pingResponse = await this.client.ping()
            return pingResponse === 'PONG'
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Redis Service Health Check failed:', error)
            return false
        }
    }
}
