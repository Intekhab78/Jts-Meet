import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { uploadFile } from './file.service'
import { FileMetadata, FileContextType } from './file.types'

export interface UseFileUploadResult {
    selectedFiles: File[]
    previewFiles: string[]
    uploadedFiles: FileMetadata[]
    uploading: boolean
    uploadProgress: number
    error: string | null
    selectFiles: (files: FileList | File[]) => void
    removeFile: (index: number) => void
    clearSelection: () => void
    uploadSelectedFiles: (token: string, contextType?: FileContextType, contextId?: string) => Promise<void>
    cancelUpload: () => void
}

export function useFileUpload(): UseFileUploadResult {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [uploadedFiles, setUploadedFiles] = useState<FileMetadata[]>([])
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const xhrRef = useRef<XMLHttpRequest | null>(null)

    const previewFiles = useMemo(
        () => selectedFiles.map((file) => URL.createObjectURL(file)),
        [selectedFiles]
    )

    useEffect(() => {
        return () => {
            previewFiles.forEach((url) => URL.revokeObjectURL(url))
        }
    }, [previewFiles])

    const selectFiles = useCallback((files: FileList | File[]) => {
        const fileArray = Array.isArray(files) ? files : Array.from(files)
        setSelectedFiles((current) => [...current, ...fileArray])
        setError(null)
    }, [])

    const removeFile = useCallback((index: number) => {
        setSelectedFiles((current) => current.filter((_, idx) => idx !== index))
    }, [])

    const clearSelection = useCallback(() => {
        setSelectedFiles([])
        setError(null)
        setUploadProgress(0)
    }, [])

    const uploadSelectedFiles = useCallback(
        async (token: string, contextType?: FileContextType, contextId?: string) => {
            if (selectedFiles.length === 0) {
                setError('No files selected for upload')
                return
            }

            setUploading(true)
            setUploadProgress(0)
            setError(null)

            try {
                const results: FileMetadata[] = []

                for (const file of selectedFiles) {
                    const result = await uploadFile(file, {
                        token,
                        contextType,
                        contextId,
                        onProgress: (progress) => setUploadProgress(progress),
                        setXhr: (xhr) => {
                            xhrRef.current = xhr
                        }
                    })
                    results.push(result)
                    xhrRef.current = null
                }

                setUploadedFiles((current) => [...current, ...results])
                setSelectedFiles([])
            } catch (uploadError: any) {
                setError(uploadError?.message || 'Upload failed')
            } finally {
                setUploading(false)
                setUploadProgress(0)
                xhrRef.current = null
            }
        },
        [selectedFiles]
    )

    const cancelUpload = useCallback(() => {
        if (xhrRef.current) {
            xhrRef.current.abort()
            xhrRef.current = null
            setUploading(false)
            setError('Upload canceled')
        }
    }, [])

    return {
        selectedFiles,
        previewFiles,
        uploadedFiles,
        uploading,
        uploadProgress,
        error,
        selectFiles,
        removeFile,
        clearSelection,
        uploadSelectedFiles,
        cancelUpload
    }
}
