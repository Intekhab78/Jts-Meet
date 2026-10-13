import { useState, useRef } from 'react'
import type { Channel, ChannelAttachment } from '../channel.types'
import { listChannelFiles, uploadChannelFile } from '../channel.service'
import { API_BASE } from '../../../config'

interface UseChannelFilesParams {
    selectedChannel: Channel | null
    token: string
    socketInstance: any
    sentByCurrentTabIds: React.MutableRefObject<Set<string>>
    setMessages: React.Dispatch<React.SetStateAction<any[]>>
}

export function useChannelFiles({
    selectedChannel,
    token,
    socketInstance,
    sentByCurrentTabIds,
    setMessages
}: UseChannelFilesParams) {
    const [files, setFiles] = useState<any[]>([])
    const [uploadingFile, setUploadingFile] = useState(false)
    const [isDraggingOver, setIsDraggingOver] = useState(false)
    const [dragCounter, setDragCounter] = useState(0)
    const [fileSearchQuery, setFileSearchQuery] = useState('')

    const fileInputRef = useRef<HTMLInputElement>(null)

    const loadFiles = async (channelId: string) => {
        try {
            const list = await listChannelFiles(channelId, token)
            setFiles(list || [])
        } catch (err) {
            console.error('Failed to load channel files:', err)
        }
    }

    const uploadFilesAndPost = async (fileList: FileList | File[]) => {
        if (!fileList || fileList.length === 0 || !selectedChannel) return

        setUploadingFile(true)
        try {
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i]
                const uploaded = await uploadChannelFile(selectedChannel._id, file, token)

                const ext = file.name.split('.').pop()?.toLowerCase() || ''
                let fileCategory = 'other'
                if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || file.type.startsWith('image/')) {
                    fileCategory = 'image'
                } else if (['pdf'].includes(ext) || file.type === 'application/pdf') {
                    fileCategory = 'pdf'
                } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
                    fileCategory = 'sheet'
                } else if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
                    fileCategory = 'doc'
                } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
                    fileCategory = 'archive'
                } else if (['js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'json', 'sql', 'sh'].includes(ext)) {
                    fileCategory = 'code'
                }

                const fileUrl = uploaded.secureUrl || `${API_BASE}/api/file/${uploaded._id}/download`

                const attachmentData: ChannelAttachment = {
                    name: file.name,
                    url: fileUrl,
                    fileType: fileCategory,
                    size: file.size,
                    mimeType: file.type
                }

                // Post file attachment message into channel chat
                const res = await fetch(`${API_BASE}/api/channel/${selectedChannel._id}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        content: `Shared attachment: ${file.name}`,
                        messageType: fileCategory === 'image' ? 'image' : 'file',
                        attachments: [attachmentData]
                    })
                })
                const data = await res.json()
                if (data.success && socketInstance) {
                    if (data.data?._id) {
                        sentByCurrentTabIds.current.add(data.data._id.toString())
                    }
                    socketInstance.emit('channel:message:send', data.data)
                    setMessages(prev => {
                        if (prev.some(m => m._id === data.data._id)) return prev
                        return [...prev, data.data]
                    })
                }
            }
            await loadFiles(selectedChannel._id)
        } catch (err: any) {
            alert(err?.message || 'Failed to upload files')
        } finally {
            setUploadingFile(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            uploadFilesAndPost(e.target.files)
        }
    }

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragCounter(prev => prev + 1)
        setIsDraggingOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragCounter(prev => {
            const next = prev - 1
            if (next <= 0) {
                setIsDraggingOver(false)
                return 0
            }
            return next
        })
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDraggingOver(false)
        setDragCounter(0)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            uploadFilesAndPost(e.dataTransfer.files)
        }
    }

    return {
        files,
        setFiles,
        uploadingFile,
        loadFiles,
        uploadFilesAndPost,
        handleFileUpload,
        fileInputRef,
        isDraggingOver,
        handleDragEnter,
        handleDragLeave,
        handleDragOver,
        handleDrop,
        fileSearchQuery,
        setFileSearchQuery
    }
}
