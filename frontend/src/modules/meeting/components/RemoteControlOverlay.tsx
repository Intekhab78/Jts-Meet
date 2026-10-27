import React, { useRef, useEffect, useState, useCallback } from 'react'
import { IconMonitor, IconX, IconCopy, IconCheck, IconAlertTriangle, IconZap, IconFolder, IconType } from '../../../components/common/Icons'

const IconWindowsLogo: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.949-1.801" />
    </svg>
)

const IconTerminalPrompt: React.FC<{ size?: number; color?: string }> = ({ size = 15, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
)

const IconActivityPulse: React.FC<{ size?: number; color?: string }> = ({ size = 15, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
)

export interface RemoteControlOverlayProps {
    meetingId: string
    socket: any
    isPresenter: boolean
    isController: boolean
    activeControllerId: string | null
    activeControllerName: string | null
    onRevokeControl: () => void
    onReleaseControl: () => void
}

interface RemoteCursorState {
    x: number // normalized 0..1
    y: number // normalized 0..1
    isClicking: boolean
    lastActive: number
}

export const RemoteControlOverlay: React.FC<RemoteControlOverlayProps> = ({
    meetingId,
    socket,
    isPresenter,
    isController,
    activeControllerId,
    activeControllerName,
    onRevokeControl,
    onReleaseControl
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [remoteCursor, setRemoteCursor] = useState<RemoteCursorState | null>(null)
    const [showTextPrompt, setShowTextPrompt] = useState<boolean>(false)
    const [textToInject, setTextToInject] = useState<string>('')
    const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false)
    const [showAppLauncher, setShowAppLauncher] = useState<boolean>(false)
    const [customAppToLaunch, setCustomAppToLaunch] = useState<string>('')
    const [launchedFeedback, setLaunchedFeedback] = useState<string | null>(null)
    const lastMouseMoveRef = useRef<number>(0)
    const isMouseDownRef = useRef<boolean>(false)

    const isDesktopApp = typeof window !== 'undefined' && !!window.electronAPI?.isDesktop

    // Pixel-Perfect Normalized Coordinates helper:
    // Takes letterboxing/pillarboxing of the video into account so clicks land exactly on the remote pixel
    const getNormalizedCoords = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return { x: 0.5, y: 0.5 }
        const rect = containerRef.current.getBoundingClientRect()
        const video = containerRef.current.parentElement?.querySelector('video') as HTMLVideoElement | null

        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
            const containerAspect = rect.width / rect.height
            const videoAspect = video.videoWidth / video.videoHeight
            let renderWidth = rect.width
            let renderHeight = rect.height
            let offsetX = 0
            let offsetY = 0

            if (containerAspect > videoAspect) {
                // Letterboxed on left & right
                renderWidth = rect.height * videoAspect
                offsetX = (rect.width - renderWidth) / 2
            } else {
                // Letterboxed on top & bottom
                renderHeight = rect.width / videoAspect
                offsetY = (rect.height - renderHeight) / 2
            }

            const clickX = e.clientX - (rect.left + offsetX)
            const clickY = e.clientY - (rect.top + offsetY)

            const normX = Math.max(0, Math.min(1, clickX / renderWidth))
            const normY = Math.max(0, Math.min(1, clickY / renderHeight))
            return { x: normX, y: normY }
        }

        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
        return { x, y }
    }, [])

    // CONTROLLER: Capture mouse movements (100Hz smooth tracking)
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isController || !socket || !meetingId) return
        const now = Date.now()
        if (now - lastMouseMoveRef.current < 16) return // ~60fps
        lastMouseMoveRef.current = now

        const { x, y } = getNormalizedCoords(e)

        socket.emit('remote-control:mouse', {
            meetingId,
            controllerId: activeControllerId,
            type: 'move',
            x,
            y
        })
    }, [isController, socket, meetingId, activeControllerId, getNormalizedCoords])

    // CONTROLLER: Mouse Down (Real hardware down)
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isController || !socket || !meetingId) return
        isMouseDownRef.current = true
        const { x, y } = getNormalizedCoords(e)

        socket.emit('remote-control:mouse', {
            meetingId,
            controllerId: activeControllerId,
            type: 'down',
            x,
            y,
            button: e.button
        })
    }, [isController, socket, meetingId, activeControllerId, getNormalizedCoords])

    // CONTROLLER: Mouse Up (Real hardware up)
    const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isController || !socket || !meetingId) return
        isMouseDownRef.current = false
        const { x, y } = getNormalizedCoords(e)

        socket.emit('remote-control:mouse', {
            meetingId,
            controllerId: activeControllerId,
            type: 'up',
            x,
            y,
            button: e.button
        })
    }, [isController, socket, meetingId, activeControllerId, getNormalizedCoords])

    // CONTROLLER: Double Click (Open desktop icons / files)
    const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isController || !socket || !meetingId) return
        const { x, y } = getNormalizedCoords(e)

        socket.emit('remote-control:mouse', {
            meetingId,
            controllerId: activeControllerId,
            type: 'dblclick',
            x,
            y,
            button: 0
        })
    }, [isController, socket, meetingId, activeControllerId, getNormalizedCoords])

    // CONTROLLER: Right Click (Windows Context Menu)
    const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isController || !socket || !meetingId) return
        e.preventDefault()
        const { x, y } = getNormalizedCoords(e)

        socket.emit('remote-control:mouse', {
            meetingId,
            controllerId: activeControllerId,
            type: 'contextmenu',
            x,
            y,
            button: 2
        })
    }, [isController, socket, meetingId, activeControllerId, getNormalizedCoords])

    // CONTROLLER: Mouse Wheel Scroll
    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        if (!isController || !socket || !meetingId) return
        const { x, y } = getNormalizedCoords(e as unknown as React.MouseEvent<HTMLDivElement>)

        socket.emit('remote-control:mouse', {
            meetingId,
            controllerId: activeControllerId,
            type: 'scroll',
            x,
            y,
            deltaY: e.deltaY
        })
    }, [isController, socket, meetingId, activeControllerId, getNormalizedCoords])

    // CONTROLLER: Send AnyDesk Hotkeys
    const sendHotkey = useCallback((hotkey: string) => {
        if (!isController || !socket || !meetingId) return
        socket.emit('remote-control:hotkey', {
            meetingId,
            controllerId: activeControllerId,
            hotkey
        })
    }, [isController, socket, meetingId, activeControllerId])

    // CONTROLLER: Send Text to Remote Active Window
    const sendClipboardText = useCallback((text: string) => {
        if (!isController || !socket || !meetingId || !text.trim()) return
        socket.emit('remote-control:text', {
            meetingId,
            controllerId: activeControllerId,
            text
        })
        setShowTextPrompt(false)
        setTextToInject('')
        setCopiedFeedback(true)
        setTimeout(() => setCopiedFeedback(false), 2000)
    }, [isController, socket, meetingId, activeControllerId])

    // CONTROLLER: Launch application directly on remote Windows machine
    const sendLaunchApp = useCallback((app: string) => {
        if (!isController || !socket || !meetingId || !app.trim()) return
        socket.emit('remote-control:launch', {
            meetingId,
            controllerId: activeControllerId,
            app: app.trim()
        })
        setShowAppLauncher(false)
        setCustomAppToLaunch('')
        setLaunchedFeedback(app.trim())
        setTimeout(() => setLaunchedFeedback(null), 3000)
    }, [isController, socket, meetingId, activeControllerId])

    // CONTROLLER: Capture keyboard inputs (when focused on stage)
    useEffect(() => {
        if (!isController || !socket || !meetingId) return

        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase()
            if (activeTag === 'input' || activeTag === 'textarea') return

            if (e.key === 'Escape') {
                onReleaseControl()
                return
            }

            socket.emit('remote-control:key', {
                meetingId,
                controllerId: activeControllerId,
                type: 'down',
                key: e.key,
                code: e.code,
                ctrlKey: e.ctrlKey,
                altKey: e.altKey,
                shiftKey: e.shiftKey,
                metaKey: e.metaKey
            })
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase()
            if (activeTag === 'input' || activeTag === 'textarea') return

            socket.emit('remote-control:key', {
                meetingId,
                controllerId: activeControllerId,
                type: 'up',
                key: e.key,
                code: e.code,
                ctrlKey: e.ctrlKey,
                altKey: e.altKey,
                shiftKey: e.shiftKey,
                metaKey: e.metaKey
            })
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [isController, socket, meetingId, activeControllerId, onReleaseControl])

    // PRESENTER: Socket Listeners for Inbound Remote Control Events
    useEffect(() => {
        if (!socket) return

        const handleRemoteMouse = (data: {
            meetingId: string
            controllerId: string
            type: string
            x: number
            y: number
            button?: number
            deltaY?: number
        }) => {
            if (data.x !== undefined && data.y !== undefined) {
                setRemoteCursor({
                    x: data.x,
                    y: data.y,
                    isClicking: data.type === 'down' || data.type === 'click' || data.type === 'dblclick',
                    lastActive: Date.now()
                })
            }

            // Presenter running in Desktop App -> Hardware OS simulation!
            if (isPresenter && window.electronAPI?.sendRemoteControlInput) {
                window.electronAPI.sendRemoteControlInput({
                    type: 'mouse',
                    action: data.type,
                    x: data.x,
                    y: data.y,
                    button: data.button,
                    deltaY: data.deltaY
                })
            }
        }

        const handleRemoteKey = (data: {
            meetingId: string
            controllerId: string
            type: string
            key: string
            code: string
            ctrlKey?: boolean
            altKey?: boolean
            shiftKey?: boolean
            metaKey?: boolean
        }) => {
            if (isPresenter && window.electronAPI?.sendRemoteControlInput) {
                window.electronAPI.sendRemoteControlInput({
                    type: 'key',
                    action: data.type,
                    key: data.key,
                    code: data.code,
                    ctrlKey: data.ctrlKey,
                    altKey: data.altKey,
                    shiftKey: data.shiftKey,
                    metaKey: data.metaKey
                })
            }
        }

        const handleRemoteHotkey = (data: {
            meetingId: string
            controllerId: string
            hotkey: string
        }) => {
            if (isPresenter && window.electronAPI?.sendRemoteControlInput) {
                window.electronAPI.sendRemoteControlInput({
                    type: 'hotkey',
                    hotkey: data.hotkey
                })
            }
        }

        const handleRemoteText = (data: {
            meetingId: string
            controllerId: string
            text: string
        }) => {
            if (isPresenter && window.electronAPI?.sendRemoteControlInput) {
                window.electronAPI.sendRemoteControlInput({
                    type: 'text',
                    text: data.text
                })
            }
        }

        const handleRemoteLaunch = (data: {
            meetingId: string
            controllerId: string
            app: string
        }) => {
            if (isPresenter && window.electronAPI?.sendRemoteControlInput) {
                window.electronAPI.sendRemoteControlInput({
                    type: 'launch',
                    app: data.app
                })
            }
        }

        socket.on('remote-control:mouse', handleRemoteMouse)
        socket.on('remote-control:key', handleRemoteKey)
        socket.on('remote-control:hotkey', handleRemoteHotkey)
        socket.on('remote-control:text', handleRemoteText)
        socket.on('remote-control:launch', handleRemoteLaunch)

        return () => {
            socket.off('remote-control:mouse', handleRemoteMouse)
            socket.off('remote-control:key', handleRemoteKey)
            socket.off('remote-control:hotkey', handleRemoteHotkey)
            socket.off('remote-control:text', handleRemoteText)
            socket.off('remote-control:launch', handleRemoteLaunch)
        }
    }, [socket, isPresenter])

    // PRESENTER: Instant safety revocation via Escape key
    useEffect(() => {
        if (!isPresenter || !activeControllerId) return

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onRevokeControl()
            }
        }

        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isPresenter, activeControllerId, onRevokeControl])

    // If no active controller is engaged, don't display overlay
    if (!activeControllerId && !isController) return null

    const actionButtonStyle: React.CSSProperties = {
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        color: '#f1f5f9',
        padding: '5px 10px',
        borderRadius: '8px',
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        transition: 'all 0.15s ease'
    }

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 35,
                pointerEvents: isController ? 'auto' : 'none',
                cursor: isController ? 'crosshair' : 'default',
                userSelect: 'none'
            }}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            onWheel={handleWheel}
        >
            {/* PRESENTER SAFETY BANNER: Ultra-Compact Icon-Only Floating Pill */}
            {isPresenter && (
                <div
                    style={{
                        position: 'absolute',
                        top: 10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 8px',
                        background: 'rgba(10, 11, 15, 0.75)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: `1px solid ${isDesktopApp ? 'rgba(52, 211, 153, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                        borderRadius: '9999px',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                        zIndex: 100,
                        color: '#ffffff',
                        pointerEvents: 'auto',
                        userSelect: 'none',
                        maxWidth: '92vw',
                        flexShrink: 0,
                        opacity: 0.45,
                        transition: 'opacity 0.25s ease, background 0.25s ease, box-shadow 0.25s ease'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.opacity = '1'
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6)'
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.opacity = '0.45'
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.4)'
                    }}
                >
                    {/* Glowing Live Dot + Controller Icon */}
                    <div
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 2px 0 4px', cursor: 'default' }}
                        title={`${activeControllerName || 'Remote User'} is controlling your screen`}
                    >
                        <span
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: isDesktopApp ? '#10b981' : '#f59e0b',
                                boxShadow: `0 0 10px ${isDesktopApp ? '#10b981' : '#f59e0b'}`,
                                display: 'inline-block',
                                flexShrink: 0
                            }}
                        />
                        <IconMonitor size={14} color={isDesktopApp ? '#34d399' : '#fbbf24'} />
                    </div>

                    {/* Mode Tag Icon */}
                    {isDesktopApp ? (
                        <div
                            style={{
                                background: 'rgba(52, 211, 153, 0.15)',
                                border: '1px solid rgba(52, 211, 153, 0.3)',
                                color: '#34d399',
                                width: 24,
                                height: 24,
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                cursor: 'help'
                            }}
                            title="AnyDesk Desktop Mode (Native Windows OS hardware control)"
                        >
                            <IconCheck size={12} color="#34d399" />
                        </div>
                    ) : (
                        <div
                            style={{
                                background: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                color: '#fbbf24',
                                width: 24,
                                height: 24,
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                cursor: 'help'
                            }}
                            title="Browser Web Mode (Presenter is on browser. For full Windows OS control, run JTS Meet Desktop App)"
                        >
                            <IconAlertTriangle size={12} color="#fbbf24" />
                        </div>
                    )}

                    <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)', margin: '0 1px' }} />

                    {/* Revoke Button - Pure Red Icon Button */}
                    <button
                        type="button"
                        onClick={onRevokeControl}
                        style={{
                            background: 'rgba(239, 68, 68, 0.25)',
                            border: '1px solid rgba(239, 68, 68, 0.5)',
                            color: '#fca5a5',
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            padding: 0,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = '#ef4444'
                            e.currentTarget.style.color = '#ffffff'
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'
                            e.currentTarget.style.color = '#fca5a5'
                        }}
                        title={`Revoke Remote Control from ${activeControllerName || 'User'} (Press Esc)`}
                    >
                        <IconX size={13} />
                    </button>
                </div>
            )}

            {/* CONTROLLER TOOLBAR: Sleek Icon-Only AnyDesk Studio Bar */}
            {isController && (
                <div
                    style={{
                        position: 'absolute',
                        top: 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 8px',
                        background: 'rgba(10, 11, 15, 0.78)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                        borderRadius: '9999px',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                        zIndex: 100,
                        color: '#ffffff',
                        pointerEvents: 'auto',
                        userSelect: 'none',
                        maxWidth: '96vw',
                        flexWrap: 'nowrap',
                        opacity: (showAppLauncher || showTextPrompt) ? 1 : 0.45,
                        transition: 'opacity 0.25s ease, background 0.25s ease, box-shadow 0.25s ease'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.opacity = '1'
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(59, 130, 246, 0.3)'
                    }}
                    onMouseLeave={e => {
                        if (!showAppLauncher && !showTextPrompt) {
                            e.currentTarget.style.opacity = '0.45'
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.4)'
                        }
                    }}
                >
                    {/* Status Indicator: Glowing Blue Dot & Screen Icon */}
                    <div
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 4px 0 6px' }}
                        title="Controlling Screen (Active)"
                    >
                        <span
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: '#3b82f6',
                                boxShadow: '0 0 10px #3b82f6',
                                display: 'inline-block',
                                flexShrink: 0
                            }}
                        />
                        <IconMonitor size={15} color="#93c5fd" />
                    </div>

                    <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />

                    {/* Quick Windows OS Actions - PURE ICONS */}
                    {/* 1. Windows Start Menu */}
                    <button
                        type="button"
                        onClick={() => sendHotkey('WIN')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.16)',
                            color: '#f1f5f9',
                            width: 34,
                            height: 34,
                            padding: 0,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                        }}
                        title="Windows Start Menu (Win)"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'; e.currentTarget.style.color = '#38bdf8' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#f1f5f9' }}
                    >
                        <IconWindowsLogo size={14} />
                    </button>

                    {/* 2. Run Dialog (Win + R) */}
                    <button
                        type="button"
                        onClick={() => sendHotkey('WIN_R')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.16)',
                            color: '#f1f5f9',
                            width: 34,
                            height: 34,
                            padding: 0,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                        }}
                        title="Run Dialog (Win + R)"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'; e.currentTarget.style.color = '#38bdf8' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#f1f5f9' }}
                    >
                        <IconTerminalPrompt size={15} />
                    </button>

                    {/* 3. Show Desktop (Win + D) */}
                    <button
                        type="button"
                        onClick={() => sendHotkey('WIN_D')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.16)',
                            color: '#f1f5f9',
                            width: 34,
                            height: 34,
                            padding: 0,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                        }}
                        title="Show Desktop (Win + D)"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'; e.currentTarget.style.color = '#38bdf8' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#f1f5f9' }}
                    >
                        <IconMonitor size={15} />
                    </button>

                    {/* 4. File Explorer (Win + E) */}
                    <button
                        type="button"
                        onClick={() => sendHotkey('WIN_E')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.16)',
                            color: '#f1f5f9',
                            width: 34,
                            height: 34,
                            padding: 0,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                        }}
                        title="File Explorer (Win + E)"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'; e.currentTarget.style.color = '#38bdf8' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#f1f5f9' }}
                    >
                        <IconFolder size={15} />
                    </button>

                    {/* 5. Task Manager (Ctrl + Shift + Esc) */}
                    <button
                        type="button"
                        onClick={() => sendHotkey('TASKMGR')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.16)',
                            color: '#f1f5f9',
                            width: 34,
                            height: 34,
                            padding: 0,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                        }}
                        title="Task Manager (Ctrl + Shift + Esc)"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'; e.currentTarget.style.color = '#38bdf8' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#f1f5f9' }}
                    >
                        <IconActivityPulse size={15} />
                    </button>

                    {/* 6. Quick Launch App */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowAppLauncher(!showAppLauncher)
                            setShowTextPrompt(false)
                        }}
                        style={{
                            background: showAppLauncher ? 'rgba(59, 130, 246, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                            border: showAppLauncher ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.16)',
                            color: showAppLauncher ? '#60a5fa' : '#93c5fd',
                            width: 34,
                            height: 34,
                            padding: 0,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                        }}
                        title="Quick App Launcher (Notepad, Calculator, Chrome, CMD...)"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = showAppLauncher ? 'rgba(59, 130, 246, 0.35)' : 'rgba(255, 255, 255, 0.08)' }}
                    >
                        <IconZap size={15} color={showAppLauncher ? '#93c5fd' : '#60a5fa'} />
                    </button>

                    {/* 7. Type / Paste Text to remote window */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowTextPrompt(!showTextPrompt)
                            setShowAppLauncher(false)
                        }}
                        style={{
                            background: showTextPrompt ? 'rgba(59, 130, 246, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                            border: showTextPrompt ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.16)',
                            color: copiedFeedback ? '#34d399' : (showTextPrompt ? '#93c5fd' : '#f1f5f9'),
                            width: 34,
                            height: 34,
                            padding: 0,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                        }}
                        title="Type / Send Text to Remote Window"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = showTextPrompt ? 'rgba(59, 130, 246, 0.35)' : 'rgba(255, 255, 255, 0.08)' }}
                    >
                        {copiedFeedback ? <IconCheck size={15} color="#34d399" /> : <IconType size={15} />}
                    </button>

                    <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />

                    {/* 8. Release Remote Control */}
                    <button
                        type="button"
                        onClick={onReleaseControl}
                        style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.45)',
                            color: '#fca5a5',
                            width: 34,
                            height: 34,
                            padding: 0,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.4)'
                            e.currentTarget.style.color = '#ffffff'
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                            e.currentTarget.style.color = '#fca5a5'
                        }}
                        title="Release Control (Esc)"
                    >
                        <IconX size={15} />
                    </button>
                </div>
            )}

            {/* Inline Quick Text Injection Drawer */}
            {isController && showTextPrompt && (
                <div
                    style={{
                        position: 'absolute',
                        top: 54,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                        zIndex: 110,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        maxWidth: '90vw',
                        pointerEvents: 'auto'
                    }}
                >
                    <input
                        type="text"
                        autoFocus
                        value={textToInject}
                        onChange={e => setTextToInject(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                sendClipboardText(textToInject)
                            } else if (e.key === 'Escape') {
                                setShowTextPrompt(false)
                            }
                        }}
                        placeholder="Type or paste text to inject into remote PC..."
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#ffffff',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8125rem',
                            outline: 'none',
                            width: 280
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => sendClipboardText(textToInject)}
                        style={{
                            background: '#3b82f6',
                            border: 'none',
                            color: '#ffffff',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        Send
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowTextPrompt(false)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 4
                        }}
                    >
                        <IconX size={14} />
                    </button>
                </div>
            )}

            {/* Inline Quick Application Launcher Drawer */}
            {isController && showAppLauncher && (
                <div
                    style={{
                        position: 'absolute',
                        top: 54,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(15, 23, 42, 0.96)',
                        backdropFilter: 'blur(24px)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        borderRadius: '14px',
                        padding: '14px 18px',
                        boxShadow: '0 20px 48px rgba(0,0,0,0.7)',
                        zIndex: 110,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        width: 440,
                        maxWidth: '92vw',
                        pointerEvents: 'auto'
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#93c5fd', fontSize: '0.8125rem', fontWeight: 700 }}>
                            <IconZap size={14} color="#60a5fa" />
                            <span>Quick Application Launcher</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowAppLauncher(false)}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                        >
                            <IconX size={14} />
                        </button>
                    </div>

                    {/* Preset Apps Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {[
                            { name: 'Notepad', cmd: 'notepad', icon: '📝' },
                            { name: 'Calculator', cmd: 'calc', icon: '🧮' },
                            { name: 'Chrome', cmd: 'chrome', icon: '🌐' },
                            { name: 'Explorer', cmd: 'explorer', icon: '📁' },
                            { name: 'Terminal', cmd: 'cmd', icon: '💻' },
                            { name: 'Settings', cmd: 'ms-settings:', icon: '⚙️' },
                            { name: 'MS Paint', cmd: 'mspaint', icon: '🎨' },
                            { name: 'Task Mgr', cmd: 'taskmgr', icon: '📊' },
                        ].map(app => (
                            <button
                                key={app.cmd}
                                type="button"
                                onClick={() => sendLaunchApp(app.cmd)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: '8px',
                                    padding: '8px 6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 4,
                                    color: '#f8fafc',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)'
                                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)'
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
                                }}
                            >
                                <span style={{ fontSize: '1.25rem' }}>{app.icon}</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{app.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Custom App / Command Runner */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <input
                            type="text"
                            value={customAppToLaunch}
                            onChange={e => setCustomAppToLaunch(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    sendLaunchApp(customAppToLaunch)
                                } else if (e.key === 'Escape') {
                                    setShowAppLauncher(false)
                                }
                            }}
                            placeholder="Or run any command (e.g. powershell, vlc, winword)..."
                            style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: '#ffffff',
                                padding: '7px 12px',
                                borderRadius: '8px',
                                fontSize: '0.8125rem',
                                outline: 'none'
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => sendLaunchApp(customAppToLaunch)}
                            disabled={!customAppToLaunch.trim()}
                            style={{
                                background: customAppToLaunch.trim() ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                color: customAppToLaunch.trim() ? '#ffffff' : '#64748b',
                                padding: '7px 16px',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: customAppToLaunch.trim() ? 'pointer' : 'not-allowed',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            Launch
                        </button>
                    </div>
                </div>
            )}

            {/* Launch feedback banner */}
            {launchedFeedback && (
                <div
                    style={{
                        position: 'absolute',
                        top: 54,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(16, 185, 129, 0.95)',
                        backdropFilter: 'blur(16px)',
                        color: '#ffffff',
                        padding: '6px 16px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
                        zIndex: 120,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}
                >
                    <IconCheck size={14} color="#ffffff" />
                    <span>Launched {launchedFeedback} on remote PC</span>
                </div>
            )}

            {/* LIVE REMOTE POINTER BADGE (Visible to Presenter & Other Observers) */}
            {remoteCursor && !isController && (
                <div
                    style={{
                        position: 'absolute',
                        left: `${remoteCursor.x * 100}%`,
                        top: `${remoteCursor.y * 100}%`,
                        transform: 'translate(-2px, -2px)',
                        pointerEvents: 'none',
                        transition: 'left 0.04s linear, top 0.04s linear',
                        zIndex: 45
                    }}
                >
                    {/* SVG Pointer Arrow */}
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{
                            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))',
                            transform: remoteCursor.isClicking ? 'scale(0.85)' : 'scale(1)',
                            transition: 'transform 0.1s ease'
                        }}
                    >
                        <path
                            d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                            fill="#3b82f6"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                        />
                    </svg>

                    {/* Remote Controller Name Tag */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 18,
                            left: 14,
                            background: '#3b82f6',
                            color: '#ffffff',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                        }}
                    >
                        <IconMonitor size={12} color="#ffffff" />
                        <span>{activeControllerName || 'Remote Control'}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
