import { Request, Response, NextFunction } from 'express'
import { sendError } from '../utils/responseHelper'

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    let status = err?.status || 500
    let message = err?.message || 'Internal Server Error'
    let data = err?.data || null

    if (err?.name === 'ValidationError') {
        status = 400
        message = 'Validation failed'
        data = Object.values(err.errors || {}).map((error: any) => error.message)
    }

    if (err?.code === 11000) {
        status = 409
        const duplicateField = Object.keys(err.keyPattern || {}).join(', ') || 'email'
        message = `Duplicate field value: ${duplicateField}`
        data = null
    }

    // eslint-disable-next-line no-console
    console.error(err)
    return sendError(res, status, message, data)
}
