const { contextBridge, ipcRenderer } = require('electron')

// Expose safe, isolated API to the web application
contextBridge.exposeInMainWorld('electronAPI', {
    isDesktop: true,
    platform: process.platform,
    sendRemoteControlInput: (event) => {
        ipcRenderer.send('remote-control:input', event)
    }
})
