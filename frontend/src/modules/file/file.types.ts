export type FileContextType = 'chat' | 'meetingChat' | 'teamChannel' | 'profile' | 'other'

export interface FileMetadata {
    _id: string
    originalName: string
    fileName: string
    mimeType: string
    extension: string
    size: number
    storageProvider: string
    storageKey: string
    secureUrl: string
    uploadedBy: string
    uploadedAt: string
    deletedAt?: string | null
    checksum: string
    contextType?: FileContextType | null
    contextId?: string | null
}

export interface FileUploadResult {
    data: FileMetadata
}

export interface FileUploadOptions {
    token?: string
    contextType?: FileContextType
    contextId?: string
    onProgress?: (progress: number) => void
    setXhr?: (xhr: XMLHttpRequest) => void
}
