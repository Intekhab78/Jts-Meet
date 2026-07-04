export async function getScreenShareStream(): Promise<MediaStream> {
    return navigator.mediaDevices.getDisplayMedia({ video: true })
}

export function stopScreenShareStream(stream: MediaStream): void {
    stream.getTracks().forEach((track) => track.stop())
}

export function isScreenShareSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia
}
