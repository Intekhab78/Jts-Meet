import { Response } from 'express'

export function sendSuccess(res: Response, data: any = null, message = 'Success') {
    return res.json({ success: true, message, data })
}

export function sendError(res: Response, status = 500, message = 'Error', data: any = null) {
    return res.status(status).json({ success: false, message, data })
}
