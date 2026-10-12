import { useState, useRef, useEffect } from 'react'

interface UseMeetingNetworkAndToolbarProps {
    socket: any
    meetingId: string
    meetingInput: string
    myDisplayName: string
    connectToMeetingRef: React.MutableRefObject<(id: string, name: string) => void>
    lowBandwidthMode: boolean
    remoteStreams: Record<string, MediaStream | null>
    showMoreMenu: boolean
    showReactionsPopover: boolean
    activePanel: string | null
    addToast: (msg: string, type?: any) => void
}

export const useMeetingNetworkAndToolbar = ({
    socket,
    meetingId,
    meetingInput,
    myDisplayName,
    connectToMeetingRef,
    lowBandwidthMode,
    remoteStreams,
    showMoreMenu,
    showReactionsPopover,
    activePanel,
    addToast
}: UseMeetingNetworkAndToolbarProps) => {
    // Network resilience & reconnection states
    const [isNetworkOffline, setIsNetworkOffline] = useState(!navigator.onLine)
    const [showRestoredNotice, setShowRestoredNotice] = useState(false)

    // Toolbar visibility states
    const [toolbarVisible, setToolbarVisible] = useState(true)
    const [isToolbarHovered, setIsToolbarHovered] = useState(false)
    const isToolbarHoveredRef = useRef(false)
    const showMoreMenuRef = useRef(false)
    const showReactionsPopoverRef = useRef(false)
    const activePanelRef = useRef<string | null>(null)
    const footerToolbarRef = useRef<HTMLElement>(null)
    const [windowWidth, setWindowWidth] = useState(window.innerWidth)

    showMoreMenuRef.current = showMoreMenu
    showReactionsPopoverRef.current = showReactionsPopover
    activePanelRef.current = activePanel

    // Window resize listener
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Toolbar auto-hide listener - never auto-hide when menus, popovers, sidepanels or hover are active
    useEffect(() => {
        let timeoutId: number
        const handleMouseMove = () => {
            setToolbarVisible(true)
            clearTimeout(timeoutId)
            timeoutId = window.setTimeout(() => {
                if (showMoreMenuRef.current || showReactionsPopoverRef.current || activePanelRef.current !== null || isToolbarHoveredRef.current) {
                    return // Keep toolbar visible while menus, panels or hover are active
                }
                setToolbarVisible(false)
            }, 3500)
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            clearTimeout(timeoutId)
        }
    }, [])

    useEffect(() => {
        if (showMoreMenu || showReactionsPopover || activePanel !== null || isToolbarHovered) {
            setToolbarVisible(true)
        }
    }, [showMoreMenu, showReactionsPopover, activePanel, isToolbarHovered])

    // Network offline / online reconnection listener
    useEffect(() => {
        const handleOffline = () => {
            setIsNetworkOffline(true)
            addToast('Internet connection lost. Attempting to reconnect...', 'warning')
        }
        const handleOnline = () => {
            setIsNetworkOffline(false)
            setShowRestoredNotice(true)
            addToast('Internet connection restored', 'success')
            setTimeout(() => setShowRestoredNotice(false), 4000)
            if (socket) {
                socket.connect()
                const currentId = meetingId || meetingInput.trim()
                if (currentId) {
                    connectToMeetingRef.current(currentId, myDisplayName)
                }
            }
        }

        window.addEventListener('offline', handleOffline)
        window.addEventListener('online', handleOnline)
        return () => {
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('online', handleOnline)
        }
    }, [socket, meetingId, meetingInput, myDisplayName, connectToMeetingRef, addToast])

    // Adaptive Low-Bandwidth Mode: Pause/resume incoming video tracks to save data
    useEffect(() => {
        Object.values(remoteStreams).forEach(stream => {
            if (stream) {
                stream.getVideoTracks().forEach(track => {
                    track.enabled = !lowBandwidthMode
                })
            }
        })
    }, [lowBandwidthMode, remoteStreams])

    const isToolbarActuallyVisible = toolbarVisible || showMoreMenu || showReactionsPopover || activePanel !== null || isToolbarHovered

    return {
        isNetworkOffline,
        setIsNetworkOffline,
        showRestoredNotice,
        toolbarVisible,
        setToolbarVisible,
        isToolbarHovered,
        setIsToolbarHovered,
        isToolbarHoveredRef,
        showMoreMenuRef,
        showReactionsPopoverRef,
        activePanelRef,
        windowWidth,
        footerToolbarRef,
        isToolbarActuallyVisible
    }
}
