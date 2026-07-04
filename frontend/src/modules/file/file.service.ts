import { FileMetadata, FileUploadOptions } from './file.types'

import { API_BASE } from '../../config'

function buildAuthHeaders(token?: string) {
    return token ? { Authorization: `Bearer ${token}` } : undefined
}

export function uploadFile(
    file: File,
    options: FileUploadOptions = {}
): Promise<FileMetadata> {
    const { token, contextType, contextId, onProgress, setXhr } = options

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const formData = new FormData()

        formData.append('file', file)
        if (contextType) {
            formData.append('contextType', contextType)
        }
        if (contextId) {
            formData.append('contextId', contextId)
        }

        if (setXhr) {
            setXhr(xhr)
        }

        xhr.open('POST', `${API_BASE}/api/file/upload`, true)
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        }

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                onProgress(Math.round((event.loaded / event.total) * 100))
            }
        }

        xhr.onreadystatechange = () => {
            if (xhr.readyState !== XMLHttpRequest.DONE) {
                return
            }

            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText)
                    resolve(response.data as FileMetadata)
                } catch (error) {
                    reject(new Error('Invalid response from file upload'))
                }
                return
            }

            let errorMessage = 'File upload failed'
            try {
                const errorResponse = JSON.parse(xhr.responseText)
                if (errorResponse?.message) {
                    errorMessage = errorResponse.message
                }
            } catch {
                if (xhr.statusText) {
                    errorMessage = xhr.statusText
                }
            }

            reject(new Error(errorMessage))
        }

        xhr.onerror = () => reject(new Error('File upload failed'))
        xhr.send(formData)
    })
}

export async function getFileMetadata(fileId: string, token?: string): Promise<FileMetadata> {
    const response = await fetch(`${API_BASE}/api/file/${fileId}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(buildAuthHeaders(token) ?? {})
        }
    })

    if (!response.ok) {
        throw new Error(`Unable to fetch file metadata: ${response.statusText}`)
    }

    const payload = await response.json()
    return payload.data as FileMetadata
}

export async function deleteFile(fileId: string, token?: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/file/${fileId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            ...(buildAuthHeaders(token) ?? {})
        }
    })

    if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.message || 'Unable to delete file')
    }
}

export function getFileDownloadUrl(fileId: string): string {
    return `${API_BASE}/api/file/${fileId}/download`
}
