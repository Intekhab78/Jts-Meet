import React from 'react'
import type { Socket } from 'socket.io-client'

export interface MeetingWhiteboardProps {
    isOpen: boolean
    onClose: () => void
    meetingId: string
    socket: Socket | null
    userName?: string
}

export type ToolType =
    | 'select'
    | 'pan'
    | 'pen'
    | 'highlighter'
    | 'eraser'
    | 'arrow'
    | 'line'
    | 'rect'
    | 'circle'
    | 'text'
    | 'sticky'
    | 'laser'
    | 'image'

export type GridPattern = 'dots' | 'grid' | 'lines' | 'blank'

export interface StrokePoint {
    x: number
    y: number
}

export interface StrokeData {
    id?: string
    tool: ToolType
    color: string
    size: number
    points: StrokePoint[]
    text?: string
    fontSize?: number
    stickyColor?: string
    fillColor?: string
    imageUrl?: string
    width?: number
    height?: number
}

export interface StrokeBounds {
    minX: number
    minY: number
    maxX: number
    maxY: number
    width: number
    height: number
}

export const USER_COLORS = [
    '#6366f1',
    '#ec4899',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#8b5cf6',
    '#ef4444',
    '#14b8a6'
]

export const generateStrokeId = () =>
    'str_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36)

export const PRESET_COLORS = [
    '#0f172a', // Jet Slate
    '#2563eb', // Vivid Blue
    '#dc2626', // Bright Crimson
    '#16a34a', // Emerald
    '#d97706', // Warm Amber
    '#7c3aed', // Royal Purple
    '#db2777', // Rose Pink
    '#64748b', // Slate Gray
    '#ffffff'  // Pure White
]

export const STICKY_COLORS = [
    { color: '#fef08a', name: 'Yellow' },
    { color: '#bbf7d0', name: 'Mint' },
    { color: '#bfdbfe', name: 'Sky' },
    { color: '#fbcfe8', name: 'Rose' },
    { color: '#fed7aa', name: 'Peach' }
]

// Distinct Modern Whiteboard Tool Icons
export const ToolIcons: Record<ToolType, React.ReactNode> = {
    select: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="m13 13 6 6" />
        </svg>
    ),
    pan: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 0 0-4 0v5" />
            <path d="M14 10V4a2 2 0 0 0-4 0v7" />
            <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </svg>
    ),
    pen: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
        </svg>
    ),
    highlighter: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 11-6 6v3h3l6-6" />
            <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
        </svg>
    ),
    eraser: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
            <path d="M22 21H7" />
            <path d="m5 11 9 9" />
        </svg>
    ),
    arrow: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="19" x2="19" y2="5" />
            <polyline points="9 5 19 5 19 15" />
        </svg>
    ),
    line: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="20" x2="20" y2="4" />
        </svg>
    ),
    rect: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2.5" />
        </svg>
    ),
    circle: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
        </svg>
    ),
    text: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
    ),
    sticky: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
            <path d="M15 3v6h6" />
        </svg>
    ),
    laser: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" fill="#ef4444" stroke="#ef4444" />
            <line x1="12" y1="2" x2="12" y2="6" stroke="#ef4444" />
            <line x1="12" y1="18" x2="12" y2="22" stroke="#ef4444" />
            <line x1="2" y1="12" x2="6" y2="12" stroke="#ef4444" />
            <line x1="18" y1="12" x2="22" y2="12" stroke="#ef4444" />
        </svg>
    ),
    image: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
        </svg>
    )
}

export interface ToolItem {
    id: ToolType
    label: string
    shortcut: string
    icon: React.ReactNode
}

export interface ToolGroup {
    id: string
    tools: ToolItem[]
}

export const TOOL_GROUPS: ToolGroup[] = [
    {
        id: 'navigate',
        tools: [
            { id: 'select', label: 'Select & Move', shortcut: 'V', icon: ToolIcons.select },
            { id: 'pan', label: 'Hand Tool', shortcut: 'H', icon: ToolIcons.pan }
        ]
    },
    {
        id: 'draw',
        tools: [
            { id: 'pen', label: 'Pen', shortcut: 'P', icon: ToolIcons.pen },
            { id: 'highlighter', label: 'Highlighter', shortcut: 'M', icon: ToolIcons.highlighter },
            { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: ToolIcons.eraser }
        ]
    },
    {
        id: 'shapes',
        tools: [
            { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: ToolIcons.arrow },
            { id: 'line', label: 'Line', shortcut: 'L', icon: ToolIcons.line },
            { id: 'rect', label: 'Rectangle', shortcut: 'R', icon: ToolIcons.rect },
            { id: 'circle', label: 'Circle', shortcut: 'C', icon: ToolIcons.circle }
        ]
    },
    {
        id: 'annotate',
        tools: [
            { id: 'text', label: 'Text Note', shortcut: 'T', icon: ToolIcons.text },
            { id: 'sticky', label: 'Sticky Note', shortcut: 'S', icon: ToolIcons.sticky },
            { id: 'image', label: 'Insert Image', shortcut: 'I', icon: ToolIcons.image },
            { id: 'laser', label: 'Laser Pointer', shortcut: 'Z', icon: ToolIcons.laser }
        ]
    }
]
