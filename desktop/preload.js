const { contextBridge, ipcRenderer, clipboard } = require('electron')

// Expose safe, isolated API to the web application
contextBridge.exposeInMainWorld('electronAPI', {
    isDesktop: true,
    isElectron: true,
    platform: process.platform,

    // Remote control input (existing)
    sendRemoteControlInput: (event) => {
        ipcRenderer.send('remote-control:input', event)
    },

    // ─── Native Clipboard ───────────────────────────────────────────────────────
    writeClipboardText: (text) => {
        if (typeof text === 'string') {
            clipboard.writeText(text)
        }
    },

    // ─── Screen Share (Electron desktopCapturer) ───────────────────────────────
    // Get all available screen & window sources with thumbnails
    getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),

    // Tell main process which sourceId the user picked — returns Promise<boolean>
    setScreenSource: (sourceId) => ipcRenderer.invoke('set-screen-source', sourceId),

    // ─── Incoming Call Alert & Focus ───────────────────────────────────────────
    notifyIncomingCall: (callData) => ipcRenderer.send('incoming-call:alert', callData),
    dismissIncomingCallAlert: () => ipcRenderer.send('incoming-call:dismiss'),
    focusApp: () => ipcRenderer.send('app:focus')
})

