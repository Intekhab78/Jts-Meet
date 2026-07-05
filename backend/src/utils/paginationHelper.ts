import { Types } from 'mongoose'

export interface CursorQueryParams {
    pageSize?: number
    limit?: number
    cursor?: string
    search?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    [key: string]: any
}

export function parseCursorQuery(reqQuery: any) {
    const limit = Math.min(100, Number(reqQuery.pageSize || reqQuery.limit) || 20)
    const cursor = reqQuery.cursor ? String(reqQuery.cursor) : undefined
    const search = reqQuery.search ? String(reqQuery.search).trim() : undefined
    const sortBy = reqQuery.sortBy ? String(reqQuery.sortBy) : '_id'
    const sortOrder = reqQuery.sortOrder === 'asc' ? 'asc' : 'desc'
    return { limit, cursor, search, sortBy, sortOrder }
}

export async function executeCursorQuery(
    model: any,
    baseQuery: any,
    params: ReturnType<typeof parseCursorQuery>,
    searchFields: string[],
    filterMappings: Record<string, any> = {}
) {
    const { limit, cursor, search, sortBy, sortOrder } = params
    const query = { ...baseQuery }

    // Apply filters
    for (const [key, val] of Object.entries(filterMappings)) {
        if (val !== undefined && val !== 'all') {
            query[key] = val
        }
    }

    // Apply search
    if (search && searchFields.length > 0) {
        const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
        const searchRegex = new RegExp(escapedSearch, 'i')
        query.$or = searchFields.map(field => ({ [field]: searchRegex }))
    }

    // Apply cursor
    if (cursor && Types.ObjectId.isValid(cursor)) {
        const cursorId = new Types.ObjectId(cursor)
        const sortDir = sortOrder === 'asc' ? 1 : -1
        if (sortBy === '_id') {
            query._id = sortDir === 1 ? { $gt: cursorId } : { $lt: cursorId }
        } else {
            // For general fields, we use double match condition for stable sorting
            // In case the sorting field value is equal, fallback to secondary _id comparison
            const sortFieldVal = await model.findById(cursorId).select(sortBy).exec()
            if (sortFieldVal && sortFieldVal[sortBy] !== undefined) {
                const cmp = sortDir === 1 ? '$gt' : '$lt'
                query.$or = [
                    { [sortBy]: { [cmp]: sortFieldVal[sortBy] } },
                    { [sortBy]: sortFieldVal[sortBy], _id: { [cmp]: cursorId } }
                ]
            } else {
                query._id = sortDir === 1 ? { $gt: cursorId } : { $lt: cursorId }
            }
        }
    }

    const sortDirVal = sortOrder === 'asc' ? 1 : -1
    const sortParams: any = {}
    if (sortBy !== '_id') {
        sortParams[sortBy] = sortDirVal
    }
    sortParams._id = sortDirVal

    const results = await model.find(query)
        .sort(sortParams)
        .limit(limit + 1)
        .exec()

    const hasMore = results.length > limit
    let nextCursor: string | null = null

    if (hasMore) {
        results.pop()
        const lastDoc = results[results.length - 1]
        nextCursor = lastDoc._id.toString()
    }

    return {
        data: results.map((d: any) => typeof d.toJSON === 'function' ? d.toJSON() : d),
        nextCursor,
        hasMore
    }
}
