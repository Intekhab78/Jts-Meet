const { contextBridge, ipcRenderer } = require('electron')

// Expose safe, isolated API to the web application
contextBridge.exposeInMainWorld('electronAPI', {
    isDesktop: true,
    platform: process.platform,

    // Remote control input (existing)
    sendRemoteControlInput: (event) => {
        ipcRenderer.send('remote-control:input', event)
    },

    // ─── Screen Share (Electron desktopCapturer) ───────────────────────────────
    // Get all available screen & window sources with thumbnails
    getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),

    // Tell main process which sourceId the user picked — then call getDisplayMedia()
    setScreenSource: (sourceId) => ipcRenderer.send('set-screen-source', sourceId)
})

