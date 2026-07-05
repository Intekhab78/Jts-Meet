import { createClient, RedisClientType } from 'redis'
import { REDIS_URL } from '../config'

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
                reconnectStrategy: (retries) => {
                    if (this.isClosing) {
                        return false // Stop trying to reconnect when closing down
                    }
                    if (retries >= 5) {
                        this.isClosing = true
                        return false // Stop retrying
                    }
                    return Math.min(retries * 100, 10000)
                }
            }
        }) as RedisClientType

        this.client.on('error', (err) => {
            // Silence connection refused errors in local environments
            if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
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
            if (!this.client || !this.client.isOpen) {
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
