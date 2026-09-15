/**
 * Global Electron Desktop API type declarations.
 * Exposed via desktop/preload.js using contextBridge.
 * This is the single source of truth — do NOT re-declare Window.electronAPI elsewhere.
 */

declare global {
    interface Window {
        electronAPI?: {
            /** True when running inside the Electron desktop app */
            isDesktop?: boolean

            /** Current OS platform (win32 | darwin | linux) */
            platform?: string

            // ─── Remote Desktop Control ─────────────────────────────────────────
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

            // ─── Screen Share (desktopCapturer) ─────────────────────────────────
            /** Returns list of available screen & window sources with thumbnails */
            getScreenSources?: () => Promise<Array<{
                id: string
                name: string
                thumbnail: string
            }>>

            /** Tell main process which sourceId to use for next getDisplayMedia call */
            setScreenSource?: (sourceId: string) => void
        }
    }
}

export {}
