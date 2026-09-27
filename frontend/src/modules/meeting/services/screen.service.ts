/**
 * Screen sharing service — works in both browser AND Electron desktop app.
 *
 * In a standard browser:  uses navigator.mediaDevices.getDisplayMedia() directly.
 * In Electron:            Presents a Google Meet-style Screen & Window Picker UI,
 *                         then captures the selected source via desktopCapturer / getUserMedia.
 */

export interface DesktopCaptureSource {
    id: string
    name: string
    thumbnail: string
    appIcon?: string | null
}

type ScreenPickerCallback = (source: DesktopCaptureSource, includeAudio: boolean) => void
type ScreenPickerCanceller = () => void

let activeScreenPickerOpener: ((onSelect: ScreenPickerCallback, onCancel: ScreenPickerCanceller) => void) | null = null

/**
 * Register the ScreenPickerModal opener so getScreenShareStream can prompt the user
 * whenever screen sharing is initiated inside the Electron desktop app.
 */
export function setScreenPickerOpener(opener: typeof activeScreenPickerOpener) {
    activeScreenPickerOpener = opener
}

export function isElectron(): boolean {
    return typeof window !== 'undefined' && !!(window.electronAPI?.isDesktop || window.electronAPI?.isElectron)
}

export function isScreenShareSupported(): boolean {
    if (isElectron()) {
        return true
    }
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia
}

/**
 * Fetch available screens and windows from Electron desktopCapturer
 */
export async function getDesktopSources(): Promise<DesktopCaptureSource[]> {
    if (!isElectron() || !window.electronAPI?.getScreenSources) {
        return []
    }
    try {
        return await window.electronAPI.getScreenSources()
    } catch (err) {
        console.error('[ScreenService] Failed to get desktop sources:', err)
        return []
    }
}

/**
 * Capture a specific desktop source (screen or window) in Electron
 */
export async function captureDesktopSource(sourceId: string, includeAudio = false): Promise<MediaStream> {
    if (!isElectron()) {
        throw new Error('captureDesktopSource can only be called in Electron environment')
    }

    // 1. Tell main process which source ID is active
    if (window.electronAPI?.setScreenSource) {
        try {
            await window.electronAPI.setScreenSource(sourceId)
        } catch (e) {
            console.warn('[ScreenService] Error setting screen source in main process:', e)
        }
    }

    let stream: MediaStream | null = null

    // 2. Primary capture approach: getUserMedia with chromeMediaSource: 'desktop'
    // This is the battle-tested, standard Electron screen capture method.
    try {
        const constraints: any = {
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: sourceId,
                    minWidth: 1280,
                    maxWidth: 1920,
                    minHeight: 720,
                    maxHeight: 1080,
                    maxFrameRate: 30
                }
            }
        }

        if ((navigator.mediaDevices as any)?.getUserMedia) {
            stream = await (navigator.mediaDevices as any).getUserMedia(constraints)
        } else if ((navigator as any)?.webkitGetUserMedia) {
            stream = await new Promise<MediaStream>((resolve, reject) => {
                (navigator as any).webkitGetUserMedia(constraints, resolve, reject)
            })
        }
    } catch (gumErr) {
        console.warn('[ScreenService] getUserMedia desktop capture failed, trying getDisplayMedia:', gumErr)
    }

    // 3. Fallback capture approach: navigator.mediaDevices.getDisplayMedia
    if (!stream || stream.getVideoTracks().length === 0) {
        try {
            stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920, max: 2560 },
                    height: { ideal: 1080, max: 1440 },
                    frameRate: { ideal: 30, max: 60 }
                },
                audio: includeAudio
            })
        } catch (gdmErr) {
            console.error('[ScreenService] getDisplayMedia fallback also failed:', gdmErr)
            throw gdmErr
        }
    }

    if (!stream || stream.getVideoTracks().length === 0) {
        throw new Error('Failed to acquire video track from selected screen source')
    }

    const vTrack = stream.getVideoTracks()[0]
    if (vTrack && 'contentHint' in vTrack) {
        vTrack.contentHint = 'detail'
    }

    return stream
}

/**
 * Universal Screen Share Stream Getter.
 *
 * In Electron:
 * - If sourceId is already supplied, captures that source immediately.
 * - Otherwise, opens the ScreenPickerModal so the user can choose which Screen or Window to share!
 *
 * In standard browser:
 * - Invokes browser's native getDisplayMedia picker directly.
 */
export async function getScreenShareStream(sourceId?: string, includeAudio = false): Promise<MediaStream> {
    if (isElectron()) {
        // If a specific sourceId is already chosen
        if (sourceId) {
            return await captureDesktopSource(sourceId, includeAudio)
        }

        // If a picker UI is registered, prompt the user just like Google Meet
        if (activeScreenPickerOpener) {
            return new Promise<MediaStream>((resolve, reject) => {
                activeScreenPickerOpener!(
                    async (chosenSource, withAudio) => {
                        try {
                            const stream = await captureDesktopSource(chosenSource.id, withAudio)
                            resolve(stream)
                        } catch (err) {
                            reject(err)
                        }
                    },
                    () => {
                        // User cancelled picker
                        reject(new DOMException('Screen sharing was cancelled by user', 'NotAllowedError'))
                    }
                )
            })
        }

        // Fallback if no picker opener registered
        const sources = await getDesktopSources()
        if (!sources || sources.length === 0) {
            throw new Error('No screen sources found on this device')
        }
        const defaultSource = sources.find(s => s.id.startsWith('screen')) || sources[0]
        return await captureDesktopSource(defaultSource.id, false)
    }

    // ── Standard browser path ────────────────────────────────────────────────
    const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
            width: { ideal: 1920, max: 2560 },
            height: { ideal: 1080, max: 1440 },
            frameRate: { ideal: 30, max: 60 }
        },
        audio: true
    })
    const vTrack = stream.getVideoTracks()[0]
    if (vTrack && 'contentHint' in vTrack) {
        vTrack.contentHint = 'detail'
    }
    return stream
}

export function stopScreenShareStream(stream: MediaStream): void {
    stream.getTracks().forEach((track) => {
        try {
            track.stop()
        } catch (e) {
            console.warn('[ScreenService] Error stopping track:', e)
        }
    })
}
