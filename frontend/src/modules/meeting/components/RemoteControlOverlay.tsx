import React, { useRef, useEffect, useState, useCallback } from 'react'

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

// Extend Window interface for Electron Desktop Client integration
declare global {
    interface Window {
        electronAPI?: {
            isDesktop?: boolean
            sendRemoteControlInput: (event: {
                type: 'mouse' | 'key'
                action: string
                x?: number
                y?: number
                button?: number
                deltaY?: number
                key?: string
                code?: string
                ctrlKey?: boolean
                altKey?: boolean
                shiftKey?: boolean
                metaKey?: boolean
            }) => void
        }
    }
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
    const isDesktopApp = typeof window !== 'undefined' && !!window.electronAPI?.isDesktop

    // Normalized coordinates helper
    const getNormalizedCoords = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return { x: 0.5, y: 0.5 }
        const rect = containerRef.current.getBoundingClientRect()
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
        return { x, y }
    }

    // CONTROLLER: Capture mouse movements and clicks
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isController || !socket || !meetingId) return
        const { x, y } = getNormalizedCoords(e)

        socket.emit('remote-control:mouse', {
            meetingId,
            controllerId: activeControllerId,
            type: 'move',
            x,
            y
        })
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isController || !socket || !meetingId) return
        const { x, y } = getNormalizedCoords(e)

        socket.emit('remote-control:mouse', {
            meetingId,
            controllerId: activeControllerId,
            type: 'down',
            x,
            y,
            button: e.button
        })
    }

    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isController || !socket || !meetingId) return
        const { x, y } = getNormalizedCoords(e)

        socket.emit('remote-control:mouse', {
            meetingId,
            controllerId: activeControllerId,
            type: 'up',
            x,
            y,
            button: e.button
        })
    }

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isController || !socket || !meetingId) return
        const { x, y } = getNormalizedCoords(e)

        socket.emit('remote-control:mouse', {
            meetingId,
            controllerId: activeControllerId,
            type: 'click',
            x,
            y,
            button: e.button
        })
    }

    const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isController || !socket || !meetingId) return
        const { x, y } = getNormalizedCoords(e)

        socket.emit('remote-control:mouse', {
            meetingId,
            controllerId: activeControllerId,
            type: 'dblclick',
            x,
            y,
            button: e.button
        })
    }

    const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
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
    }

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
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
    }

    // CONTROLLER: Capture keyboard inputs
    useEffect(() => {
        if (!isController || !socket || !meetingId) return

        const handleKeyDown = (e: KeyboardEvent) => {
            // If user is typing in a modal or input, let it through
            const activeTag = document.activeElement?.tagName.toLowerCase()
            if (activeTag === 'input' || activeTag === 'textarea') return

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
    }, [isController, socket, meetingId, activeControllerId])

    // PRESENTER & OBSERVERS: Listen to incoming remote mouse/key events
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
                    isClicking: data.type === 'down' || data.type === 'click',
                    lastActive: Date.now()
                })
            }

            // If Presenter is running inside Electron Desktop App, inject real hardware OS mouse action!
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
            // If Presenter is running inside Electron Desktop App, inject real hardware OS key action!
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

        socket.on('remote-control:mouse', handleRemoteMouse)
        socket.on('remote-control:key', handleRemoteKey)

        return () => {
            socket.off('remote-control:mouse', handleRemoteMouse)
            socket.off('remote-control:key', handleRemoteKey)
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
            onClick={handleClick}
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
                        padding: '5px 8px 5px 14px',
                        background: 'rgba(13, 17, 23, 0.94)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        borderRadius: '9999px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 16px rgba(239, 68, 68, 0.2)',
                        zIndex: 100,
                        color: '#ffffff',
                        fontSize: '0.8125rem',
                        pointerEvents: 'auto',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                        maxWidth: '90vw'
                    }}
                >
                    {/* Glowing Live Dot & Text */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: '#ef4444',
                                boxShadow: '0 0 10px #ef4444',
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
                            Desktop OS
                        </span>
                    ) : (
                        <span style={{
                            fontSize: '0.65rem',
                            color: '#93c5fd',
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            flexShrink: 0
                        }}>
                            Web Remote
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
                        <span>✕</span>
                        <span>Revoke (Esc)</span>
                    </button>
                </div>
            )}

            {/* CONTROLLER BANNER: Bottom/Top Notification for the Controller */}
            {isController && (
                <div
                    style={{
                        position: 'absolute',
                        top: 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '5px 8px 5px 14px',
                        background: 'rgba(13, 17, 23, 0.94)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        borderRadius: '9999px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 16px rgba(59, 130, 246, 0.25)',
                        zIndex: 100,
                        color: '#ffffff',
                        fontSize: '0.8125rem',
                        pointerEvents: 'auto',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                        maxWidth: '90vw'
                    }}
                >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: '0.95rem' }}>🎮</span>
                        <span style={{ color: '#ffffff', fontWeight: 600 }}>You are controlling this screen</span>
                    </div>

                    <button
                        onClick={onReleaseControl}
                        style={{
                            background: 'rgba(255, 255, 255, 0.12)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                            padding: '5px 12px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'all 0.15s ease',
                            flexShrink: 0
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                        title="Release remote control"
                    >
                        <span>Release (Esc)</span>
                    </button>
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
                        transition: 'left 0.05s linear, top 0.05s linear',
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
                        <span>🎮</span>
                        <span>{activeControllerName || 'Remote Control'}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
