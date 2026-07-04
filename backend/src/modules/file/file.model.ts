import { Schema, model, Document, Types } from 'mongoose'

export interface IFileMetadata extends Document {
    originalName: string
    fileName: string
    mimeType: string
    extension: string
    size: number
    storageProvider: string
    storageKey: string
    secureUrl: string
    uploadedBy: Types.ObjectId
    uploadedAt: Date
    deletedAt?: Date | null
    checksum: string
    contextType?: 'chat' | 'meetingChat' | 'teamChannel' | 'profile' | 'channel'
    contextId?: string
    organizationId?: Types.ObjectId | null
    teamId?: Types.ObjectId | null
    channelId?: Types.ObjectId | null
    messageId?: Types.ObjectId | null
}

const FileMetadataSchema = new Schema<IFileMetadata>(
    {
        originalName: { type: String, required: true },
        fileName: { type: String, required: true },
        mimeType: { type: String, required: true },
        extension: { type: String, required: true },
        size: { type: Number, required: true },
        storageProvider: { type: String, required: true },
        storageKey: { type: String, required: true, unique: true },
        secureUrl: { type: String, required: true },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        uploadedAt: { type: Date, default: () => new Date(), required: true },
        deletedAt: { type: Date, default: null },
        checksum: { type: String, required: true, index: true },
        contextType: { type: String, enum: ['chat', 'meetingChat', 'teamChannel', 'profile', 'channel'], default: null },
        contextId: { type: String, default: null },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
        teamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
        channelId: { type: Schema.Types.ObjectId, ref: 'Channel', default: null },
        messageId: { type: Schema.Types.ObjectId, ref: 'ChannelChat', default: null }
    },
    { timestamps: true }
)

export const FileMetadata = model<IFileMetadata>('FileMetadata', FileMetadataSchema)

