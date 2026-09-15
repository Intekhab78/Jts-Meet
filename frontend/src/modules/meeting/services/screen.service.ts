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
    return typeof window !== 'undefined' && !!window.electronAPI?.isDesktop
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
        // 1. Get list of available sources (screens + windows)
        const sources = await window.electronAPI.getScreenSources()

        if (!sources || sources.length === 0) {
            throw new Error('No screen sources found on this device')
        }

        // 2. For now, auto-select the first "Entire Screen" source.
        //    Later you can show a picker UI using the sources array.
        const screenSource = sources.find(s => s.name.toLowerCase().includes('screen')) || sources[0]

        // 3. Tell the main process which source to use
        window.electronAPI.setScreenSource(screenSource.id)

        // 4. Call getDisplayMedia — Electron intercepts this via setDisplayMediaRequestHandler
        return navigator.mediaDevices.getDisplayMedia({
            video: {
                // @ts-ignore — Electron-specific constraint (chromeMediaSource)
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: screenSource.id,
                    minWidth: 1280,
                    maxWidth: 1920,
                    minHeight: 720,
                    maxHeight: 1080
                }
            },
            audio: false // Electron handles audio separately via 'loopback'
        } as any)
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

