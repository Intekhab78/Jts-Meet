import React, { useCallback, useMemo, useState } from 'react'
import { useFileUpload } from '../useFileUpload'
import type { FileContextType } from '../file.types'
import { FilePreview } from './FilePreview'
import { UploadedFileCard } from './UploadedFileCard'

interface FileUploaderProps {
    token: string
    contextType?: FileContextType
    contextId?: string
    allowMultiple?: boolean
    onUploadComplete?: (files: Array<unknown>) => void
}

const IconUploadCloud = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 16 12 12 8 16" />
        <line x1="12" y1="12" x2="12" y2="21" />
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
)

const IconX = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
)

export function FileUploader({
    token,
    contextType,
    contextId,
    allowMultiple = true,
    onUploadComplete,
}: FileUploaderProps) {
    const {
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
        cancelUpload,
    } = useFileUpload()

    const [dragOver, setDragOver] = useState(false)

    const handleInputChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            if (event.target.files) {
                selectFiles(allowMultiple ? event.target.files : [event.target.files[0]])
            }
        },
        [selectFiles, allowMultiple]
    )

    const handleDrop = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault()
            setDragOver(false)
            const files = Array.from(event.dataTransfer.files)
            selectFiles(allowMultiple ? files : files.slice(0, 1))
        },
        [selectFiles, allowMultiple]
    )

    const handleUpload = useCallback(async () => {
        await uploadSelectedFiles(token, contextType, contextId)
    }, [uploadSelectedFiles, token, contextType, contextId])

    const content = useMemo(
        () => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Drop Zone */}
                <div
                    className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    style={{ position: 'relative' }}
                >
                    <label
                        htmlFor="jts-file-input"
                        style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
                    >
                        <div style={{ color: dragOver ? 'var(--color-accent)' : 'var(--color-text-muted)', transition: 'color 200ms' }}>
                            <IconUploadCloud />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{
                                fontSize: '0.875rem', fontWeight: 500,
                                color: dragOver ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                margin: '0 0 4px',
                                transition: 'color 200ms',
                            }}>
                                {dragOver ? 'Drop files here' : 'Drag & drop files here'}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                                or{' '}
                                <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
                                    browse to upload
                                </span>
                            </p>
                        </div>
                        <input
                            id="jts-file-input"
                            type="file"
                            multiple={allowMultiple}
                            onChange={handleInputChange}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                        />
                    </label>
                </div>

                {/* Selected files preview */}
                {selectedFiles.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                            </span>
                            <button
                                type="button"
                                onClick={clearSelection}
                                disabled={uploading}
                                className="btn btn-ghost"
                                style={{ fontSize: '0.75rem', padding: '4px 10px', gap: 4 }}
                            >
                                <IconX /> Clear all
                            </button>
                        </div>
                        {selectedFiles.map((file, index) => (
                            <FilePreview
                                key={`${file.name}-${index}`}
                                file={file}
                                previewUrl={previewFiles[index]}
                                onRemove={() => removeFile(index)}
                            />
                        ))}
                    </div>
                )}

                {/* Progress */}
                {uploading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="anim-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                                Uploading…
                            </span>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                                {uploadProgress}%
                            </span>
                        </div>
                        <div className="progress-bar-track">
                            <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="anim-fade-in" style={{
                        background: 'var(--color-danger-light)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        fontSize: '0.8125rem',
                        color: '#f87171',
                    }}>
                        {error}
                    </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        type="button"
                        onClick={handleUpload}
                        disabled={selectedFiles.length === 0 || uploading}
                        className="btn btn-primary"
                        style={{ flex: 1, justifyContent: 'center' }}
                    >
                        {uploading ? 'Uploading…' : 'Upload'}
                    </button>
                    {uploading && (
                        <button
                            type="button"
                            onClick={cancelUpload}
                            className="btn btn-danger"
                            style={{ flexShrink: 0 }}
                        >
                            Cancel
                        </button>
                    )}
                </div>

                {/* Uploaded files */}
                {uploadedFiles.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="anim-slide-up">
                        <div className="divider" />
                        <span style={{
                            fontSize: '0.8125rem', fontWeight: 600,
                            color: 'var(--color-text-secondary)',
                            letterSpacing: '-0.01em',
                        }}>
                            Uploaded ({uploadedFiles.length})
                        </span>
                        {uploadedFiles.map((file, i) => (
                            <UploadedFileCard
                                key={file._id}
                                file={file}
                                token={token}
                            />
                        ))}
                    </div>
                )}
            </div>
        ),
        [
            allowMultiple, cancelUpload, clearSelection, error, dragOver,
            handleDrop, handleInputChange, handleUpload, previewFiles,
            removeFile, selectedFiles, token, uploadProgress, uploading, uploadedFiles,
        ]
    )

    return content
}
