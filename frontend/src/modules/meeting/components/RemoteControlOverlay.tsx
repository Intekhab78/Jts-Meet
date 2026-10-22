import React, { useRef, useEffect, useState, useCallback } from 'react'
import { IconMonitor, IconX, IconCopy, IconCheck, IconAlertTriangle, IconZap } from '../../../components/common/Icons'

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
            {/* PRESENTER SAFETY BANNER: Top Floating Control Pill */}
            {isPresenter && (
                <div
                    style={{
                        position: 'absolute',
                        top: 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '6px 14px',
                        background: 'rgba(13, 17, 23, 0.94)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: `1px solid ${isDesktopApp ? 'rgba(52, 211, 153, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                        borderRadius: '9999px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                        zIndex: 100,
                        color: '#ffffff',
                        fontSize: '0.8125rem',
                        pointerEvents: 'auto',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                        maxWidth: '92vw'
                    }}
                >
                    {/* Glowing Live Dot & Text */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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
                        <span style={{ color: '#cbd5e1', fontSize: '0.8125rem' }}>
                            <strong style={{ color: '#ffffff', fontWeight: 700 }}>{activeControllerName || 'Remote User'}</strong> is controlling your screen
                        </span>
                    </div>

                    {/* Mode Tag */}
                    {isDesktopApp ? (
                        <span style={{
                            fontSize: '0.65rem',
                            color: '#34d399',
                            background: 'rgba(52, 211, 153, 0.15)',
                            border: '1px solid rgba(52, 211, 153, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            flexShrink: 0
                        }}>
                            AnyDesk Desktop Mode
                        </span>
                    ) : (
                        <span style={{
                            fontSize: '0.65rem',
                            color: '#fbbf24',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                        }} title="Presenter is on browser. For full Windows OS control, run JTS Meet Desktop App">
                            <IconAlertTriangle size={11} color="#fbbf24" />
                            Browser Web Mode
                        </span>
                    )}

                    {/* Revoke Button */}
                    <button
                        onClick={onRevokeControl}
                        style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            border: 'none',
                            color: '#ffffff',
                            padding: '5px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        title="Instantly revoke remote control (Press Esc)"
                    >
                        <IconX size={12} color="#ffffff" />
                        <span>Revoke (Esc)</span>
                    </button>
                </div>
            )}

            {/* CONTROLLER TOOLBAR: AnyDesk Studio Bar */}
            {isController && (
                <div
                    style={{
                        position: 'absolute',
                        top: 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 14px',
                        background: 'rgba(15, 23, 42, 0.92)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        borderRadius: '9999px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 16px rgba(59, 130, 246, 0.25)',
                        zIndex: 100,
                        color: '#ffffff',
                        pointerEvents: 'auto',
                        userSelect: 'none',
                        maxWidth: '96vw',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}
                >
                    {/* Status Dot */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 2 }}>
                        <span
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: '#3b82f6',
                                boxShadow: '0 0 10px #3b82f6',
                                display: 'inline-block'
                            }}
                        />
                        <span style={{ fontSize: '0.78125rem', color: '#e2e8f0', fontWeight: 600 }}>
                            Controlling Screen
                        </span>
                        <span style={{
                            fontSize: '0.625rem',
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#93c5fd',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            letterSpacing: '0.04em'
                        }}>
                            ANYDESK MODE
                        </span>
                    </div>

                    <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />

                    {/* Quick Windows OS Actions */}
                    <button
                        type="button"
                        onClick={() => sendHotkey('WIN')}
                        style={actionButtonStyle}
                        title="Open Windows Start Menu on remote system"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)' }}
                    >
                        <span>⊞ Start</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => sendHotkey('WIN_R')}
                        style={actionButtonStyle}
                        title="Open Windows Run Dialog (Win + R)"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)' }}
                    >
                        <span>Run (Win+R)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => sendHotkey('WIN_D')}
                        style={actionButtonStyle}
                        title="Show Desktop (Win + D)"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)' }}
                    >
                        <span>Desktop</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => sendHotkey('WIN_E')}
                        style={actionButtonStyle}
                        title="Open File Explorer (Win + E)"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)' }}
                    >
                        <span>Explorer</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => sendHotkey('TASKMGR')}
                        style={actionButtonStyle}
                        title="Open Windows Task Manager (Ctrl + Shift + Esc)"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)' }}
                    >
                        <span>Task Mgr</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setShowAppLauncher(!showAppLauncher)
                            setShowTextPrompt(false)
                        }}
                        style={{
                            ...actionButtonStyle,
                            background: showAppLauncher ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                            borderColor: showAppLauncher ? '#3b82f6' : 'rgba(255, 255, 255, 0.16)',
                            color: '#93c5fd'
                        }}
                        title="Quick launch Notepad, Calc, Chrome, CMD or custom Windows app"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = showAppLauncher ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.08)' }}
                    >
                        <IconZap size={13} color="#60a5fa" />
                        <span>Launch App</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setShowTextPrompt(!showTextPrompt)
                            setShowAppLauncher(false)
                        }}
                        style={{
                            ...actionButtonStyle,
                            background: showTextPrompt ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                            borderColor: showTextPrompt ? '#3b82f6' : 'rgba(255, 255, 255, 0.16)',
                            color: copiedFeedback ? '#34d399' : '#f1f5f9'
                        }}
                        title="Send typed text directly to remote focused application"
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = showTextPrompt ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.08)' }}
                    >
                        {copiedFeedback ? <IconCheck size={13} color="#34d399" /> : <IconCopy size={13} color="#93c5fd" />}
                        <span>{copiedFeedback ? 'Sent!' : 'Paste Text'}</span>
                    </button>

                    <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />

                    {/* Release Button */}
                    <button
                        type="button"
                        onClick={onReleaseControl}
                        style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#fca5a5',
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.35)'; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.color = '#fca5a5' }}
                        title="Release control (Esc)"
                    >
                        <IconX size={12} />
                        <span>Release (Esc)</span>
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
