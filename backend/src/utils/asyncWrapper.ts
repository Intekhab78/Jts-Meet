import { Request, Response, NextFunction } from 'express'

export const asyncWrapper = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
}
