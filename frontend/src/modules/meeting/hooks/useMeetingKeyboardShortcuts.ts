import { useEffect } from 'react'
import { isScreenShareSupported } from '../services/screen.service'

export interface UseMeetingKeyboardShortcutsProps {
    joined: boolean
    toggleMute: () => void
    toggleVideo: () => void
    handleTogglePiP: () => void
    handleToggleScreenShare: () => void
    setActivePanel: React.Dispatch<React.SetStateAction<any>>
    socket: any
    meetingId: string
    meetingInput: string
    handRaised: boolean
    setHandRaised: React.Dispatch<React.SetStateAction<boolean>>
    setShowWhiteboard: React.Dispatch<React.SetStateAction<boolean>>
    setShowCaptions: React.Dispatch<React.SetStateAction<boolean>>
    setShowPolls: React.Dispatch<React.SetStateAction<boolean>>
    setShowSummary: React.Dispatch<React.SetStateAction<boolean>>
    setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>
    setShowDeviceSettings: React.Dispatch<React.SetStateAction<boolean>>
    setShowEndMeetingModal: React.Dispatch<React.SetStateAction<boolean>>
}

export function useMeetingKeyboardShortcuts({
    joined,
    toggleMute,
    toggleVideo,
    handleTogglePiP,
    handleToggleScreenShare,
    setActivePanel,
    socket,
    meetingId,
    meetingInput,
    handRaised,
    setHandRaised,
    setShowWhiteboard,
    setShowCaptions,
    setShowPolls,
    setShowSummary,
    setShowShortcuts,
    setShowDeviceSettings,
    setShowEndMeetingModal
}: UseMeetingKeyboardShortcutsProps) {
    useEffect(() => {
        if (!joined) return

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return
            }

            // Spacebar shortcut -> Toggle Mic
            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault()
                toggleMute()
                return
            }

            // Alt Shortcuts
            if (e.altKey) {
                const key = e.key.toLowerCase()
                if (key === 'p') {
                    e.preventDefault()
                    handleTogglePiP()
                    return
                }
                if (key === 's') {
                    e.preventDefault()
                    if (isScreenShareSupported()) {
                        handleToggleScreenShare()
                    }
                    return
                }
                if (key === 'c') {
                    e.preventDefault()
                    setActivePanel((prev: any) => prev === 'chat' ? null : 'chat')
                    return
                }
                if (key === 'n') {
                    e.preventDefault()
                    setActivePanel((prev: any) => prev === 'notes' ? null : 'notes')
                    return
                }
            }

            // Single key shortcuts (no modifier keys)
            if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
                const key = e.key.toLowerCase()
                if (key === 'm') {
                    e.preventDefault()
                    toggleMute()
                    return
                }
                if (key === 'v') {
                    e.preventDefault()
                    toggleVideo()
                    return
                }
                if (key === 'h') {
                    e.preventDefault()
                    socket?.emit('meeting:raise-hand', { meetingId: meetingId || meetingInput, raised: !handRaised })
                    setHandRaised((prev: boolean) => !prev)
                    return
                }
            }

            // Ctrl+D or Cmd+D -> Toggle Mic
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                e.preventDefault()
                toggleMute()
                return
            }

            // Ctrl+E or Cmd+E -> Toggle Camera
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
                e.preventDefault()
                toggleVideo()
                return
            }

            // Ctrl+Shift+W -> Toggle Whiteboard
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'w') {
                e.preventDefault()
                setShowWhiteboard((prev: boolean) => !prev)
                return
            }

            // Ctrl+Shift+C -> Toggle Captions
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
                e.preventDefault()
                setShowCaptions((prev: boolean) => !prev)
                return
            }

            // Ctrl+Shift+P -> Toggle Polls
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
                e.preventDefault()
                setShowPolls((prev: boolean) => !prev)
                return
            }

            // Ctrl+Shift+S -> Open AI Summary
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
                e.preventDefault()
                setShowSummary((prev: boolean) => !prev)
                return
            }

            // Escape -> Close active panel / modals
            if (e.key === 'Escape') {
                setActivePanel(null)
                setShowWhiteboard(false)
                setShowPolls(false)
                setShowDeviceSettings(false)
                setShowSummary(false)
                setShowShortcuts(false)
                setShowEndMeetingModal(false)
                return
            }

            // ? -> Toggle Shortcuts Modal
            if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault()
                setShowShortcuts((prev: boolean) => !prev)
                return
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [
        joined,
        toggleMute,
        toggleVideo,
        handleTogglePiP,
        handleToggleScreenShare,
        setActivePanel,
        socket,
        meetingId,
        meetingInput,
        handRaised,
        setHandRaised,
        setShowWhiteboard,
        setShowCaptions,
        setShowPolls,
        setShowSummary,
        setShowShortcuts,
        setShowDeviceSettings,
        setShowEndMeetingModal
    ])
}
