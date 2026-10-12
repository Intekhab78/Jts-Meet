import { useState, useRef, useEffect, useCallback } from 'react'
import {
    isElectron,
    captureDesktopSource,
    setScreenPickerOpener,
    DesktopCaptureSource
} from '../services/screen.service'

interface UseMeetingScreenShareControlsProps {
    screenSharingUserId: string | null
    screenSharingUserIds: string[]
    startScreenShare: (stream?: any) => Promise<any> | void
    stopScreenShare: () => void
    screenSharePolicy: 'everyone' | 'host_only'
    canManageRef: React.RefObject<boolean>
    addToast: (message: string, type?: any) => void
}

export const useMeetingScreenShareControls = ({
    screenSharingUserId,
    screenSharingUserIds,
    startScreenShare,
    stopScreenShare,
    screenSharePolicy,
    canManageRef,
    addToast
}: UseMeetingScreenShareControlsProps) => {
    // Multi-Presenter Takeover Confirmation States
    const [showTakeoverModal, setShowTakeoverModal] = useState(false)
    const [takeoverPresenterId, setTakeoverPresenterId] = useState<string | null>(null)
    const [showScreenPicker, setShowScreenPicker] = useState(false)
    const screenPickerCallbackRef = useRef<((source: DesktopCaptureSource, includeAudio: boolean) => void) | null>(null)
    const screenPickerCancelRef = useRef<(() => void) | null>(null)

    // Register opener so any Electron screen-share trigger pops up the picker dialog
    useEffect(() => {
        setScreenPickerOpener((onSelect, onCancel) => {
            screenPickerCallbackRef.current = onSelect
            screenPickerCancelRef.current = onCancel
            setShowScreenPicker(true)
        })
        return () => {
            setScreenPickerOpener(null)
        }
    }, [])

    const handleScreenSourceSelected = useCallback(async (source: DesktopCaptureSource, includeAudio: boolean) => {
        if (screenPickerCallbackRef.current) {
            screenPickerCallbackRef.current(source, includeAudio)
            screenPickerCallbackRef.current = null
            screenPickerCancelRef.current = null
            return
        }

        try {
            const stream = await captureDesktopSource(source.id, includeAudio)
            await startScreenShare(stream)
        } catch (err: any) {
            console.error('[MeetingRoom] Failed to capture selected desktop source:', err)
            addToast(err?.message || 'Failed to share selected screen or window', 'warning')
        }
    }, [startScreenShare, addToast])

    const handleScreenPickerClosed = useCallback(() => {
        if (screenPickerCancelRef.current) {
            screenPickerCancelRef.current()
            screenPickerCancelRef.current = null
            screenPickerCallbackRef.current = null
        }
        setShowScreenPicker(false)
    }, [])

    const handleToggleScreenShare = useCallback(() => {
        if (screenSharingUserId === 'me' || screenSharingUserIds.includes('me')) {
            stopScreenShare()
            return
        }
        if (screenSharePolicy === 'host_only' && !canManageRef.current) {
            addToast('Host has restricted screen sharing to Host only.', 'warning')
            return
        }
        const activeRemoteSharer = screenSharingUserIds.find(id => id !== 'me')
        if (activeRemoteSharer) {
            setTakeoverPresenterId(activeRemoteSharer)
            setShowTakeoverModal(true)
        } else {
            if (isElectron()) {
                setShowScreenPicker(true)
            } else {
                startScreenShare()
            }
        }
    }, [screenSharingUserId, screenSharingUserIds, startScreenShare, stopScreenShare, screenSharePolicy, canManageRef, addToast])

    return {
        showTakeoverModal,
        setShowTakeoverModal,
        takeoverPresenterId,
        setTakeoverPresenterId,
        showScreenPicker,
        setShowScreenPicker,
        handleScreenSourceSelected,
        handleScreenPickerClosed,
        handleToggleScreenShare
    }
}
