import mongoose from 'mongoose'

/**
 * Executes a callback within a MongoDB session transaction if supported (Replica Set / Sharded),
 * or directly without a transaction if connected to a standalone MongoDB instance.
 */
export async function withTransactionOrDirect<T>(
    fn: (session?: mongoose.ClientSession) => Promise<T>
): Promise<T> {
    let session: mongoose.ClientSession | null = null
    let supportsTransactions = false

    try {
        const client = mongoose.connection.getClient() as any
        const type = client?.topology?.description?.type
        supportsTransactions = type === 'ReplicaSetWithPrimary' || type === 'Sharded'
    } catch {
        supportsTransactions = false
    }

    if (supportsTransactions) {
        try {
            session = await mongoose.startSession()
            session.startTransaction()
            const result = await fn(session)
            await session.commitTransaction()
            return result
        } catch (err: any) {
            if (session) {
                try {
                    await session.abortTransaction()
                } catch {}
            }
            // If the failure was because transactions are not allowed on this instance, fall back to direct execution
            if (
                err?.message?.includes('replica set member') ||
                err?.codeName === 'IllegalOperation' ||
                err?.message?.includes('Transaction numbers are only allowed')
            ) {
                return await fn(undefined)
            }
            throw err
        } finally {
            if (session) {
                try {
                    session.endSession()
                } catch {}
            }
        }
    } else {
        // Direct execution without session/transaction
        return await fn(undefined)
    }
}
