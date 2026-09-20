/**
 * Screen sharing service — works in both browser AND Electron desktop app.
 *
 * In a standard browser:  uses navigator.mediaDevices.getDisplayMedia() directly.
 * In Electron:            Electron blocks getDisplayMedia unless a
 *                         setDisplayMediaRequestHandler is registered in main.js.
 *                         We signal the main process first (setScreenSource),
 *                         then call getDisplayMedia — Electron intercepts it
 *                         and returns the desktopCapturer stream.
 *
 * NOTE: Window.electronAPI types are declared in src/types/electron.d.ts
 */

export function isElectron(): boolean {
    return typeof window !== 'undefined' && !!(window.electronAPI?.isDesktop || window.electronAPI?.isElectron)
}

export function isScreenShareSupported(): boolean {
    if (isElectron()) {
        // In Electron, desktopCapturer is always available
        return true
    }
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia
}

export async function getScreenShareStream(): Promise<MediaStream> {
    if (isElectron() && window.electronAPI?.getScreenSources && window.electronAPI?.setScreenSource) {
        // ── Electron path ────────────────────────────────────────────────────────
        try {
            // 1. Get list of available sources (screens + windows)
            const sources = await window.electronAPI.getScreenSources()

            if (!sources || sources.length === 0) {
                throw new Error('No screen sources found on this device')
            }

            // 2. Select primary screen (or window)
            const screenSource = sources.find(s => s.name.toLowerCase().includes('screen')) || sources[0]

            // 3. Tell the main process which source to use
            window.electronAPI.setScreenSource(screenSource.id)

            // 4. Call getDisplayMedia — Electron intercepts this via setDisplayMediaRequestHandler
            // NOTE: Do NOT pass `mandatory: { chromeMediaSource }` to getDisplayMedia!
            // Passing `mandatory` to getDisplayMedia throws "Failed to execute 'getDisplayMedia': Invalid constraints".
            return await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
                audio: false
            })
        } catch (electronErr: any) {
            console.warn('[ScreenService] Electron getDisplayMedia failed, trying getUserMedia fallback:', electronErr)
            // Fallback for older Chromium / Electron environments where getDisplayMedia is not wired to desktopCapturer
            try {
                const sources = await window.electronAPI.getScreenSources()
                const screenSource = sources.find(s => s.name.toLowerCase().includes('screen')) || sources[0]
                if (screenSource && (navigator.mediaDevices as any).getUserMedia) {
                    return await (navigator.mediaDevices as any).getUserMedia({
                        audio: false,
                        video: {
                            mandatory: {
                                chromeMediaSource: 'desktop',
                                chromeMediaSourceId: screenSource.id,
                                minWidth: 1280,
                                maxWidth: 1920,
                                minHeight: 720,
                                maxHeight: 1080
                            }
                        }
                    })
                }
            } catch (fallbackErr) {
                console.error('[ScreenService] Electron getUserMedia fallback failed:', fallbackErr)
            }
            throw electronErr
        }
    }

    // ── Standard browser path ────────────────────────────────────────────────
    return navigator.mediaDevices.getDisplayMedia({
        video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
        },
        audio: true
    })
}

export function stopScreenShareStream(stream: MediaStream): void {
    stream.getTracks().forEach((track) => track.stop())
}

