const { app, BrowserWindow, ipcMain, screen, Menu, desktopCapturer, session, Notification } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

// Disable Chromium background throttling so screen share and WebRTC never pause when another OS window is clicked
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.commandLine.appendSwitch('disable-renderer-backgrounding')

let mainWindow = null
let inputProcess = null
let lastMoveTime = 0
let selectedScreenSourceId = null
let activeCallNotification = null

function setupDisplayMediaHandler(sess) {
    if (!sess || typeof sess.setDisplayMediaRequestHandler !== 'function') return
    sess.setDisplayMediaRequestHandler(
        (request, callback) => {
            desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
                if (!sources || sources.length === 0) {
                    return callback({})
                }
                const chosen = (selectedScreenSourceId && sources.find(s => s.id === selectedScreenSourceId)) || sources[0]
                const response = { video: chosen }
                // Only attach audio if the renderer explicitly requested audio capture
                if (request.audioRequested) {
                    response.audio = 'loopback'
                }
                callback(response)
            }).catch((err) => {
                console.error('[ScreenShare] desktopCapturer error:', err)
                callback({})
            })
        },
        { useSystemPicker: false }
    )
}


function getInputExecutablePath() {
    const devPath = path.join(__dirname, 'jts-input-injector.exe')
    if (fs.existsSync(devPath)) return devPath
    if (process.resourcesPath) {
        const resPath = path.join(process.resourcesPath, 'jts-input-injector.exe')
        if (fs.existsSync(resPath)) return resPath
    }
    return devPath
}

function initInputProcess() {
    if (process.platform !== 'win32') return
    const exePath = getInputExecutablePath()
    try {
        inputProcess = spawn(exePath, [], {
            stdio: ['pipe', 'ignore', 'ignore'],
            windowsHide: true
        })
        inputProcess.on('error', (err) => {
            console.error('[Desktop] Input injector process error:', err?.message || err)
            inputProcess = null
        })
        inputProcess.on('exit', () => {
            inputProcess = null
        })
    } catch (e) {
        console.error('[Desktop] Failed to spawn input injector process:', e)
    }
}

// Native Windows Input Simulator using compiled high-performance Win32 Injector
function simulateWindowsInput(action, x, y, button, key, deltaY) {
    if (process.platform !== 'win32') return
    if (!inputProcess || !inputProcess.stdin || inputProcess.stdin.destroyed) {
        initInputProcess()
    }
    if (!inputProcess || !inputProcess.stdin || inputProcess.stdin.destroyed) return

    const safeX = Number.isFinite(x) ? Math.round(x) : 0
    const safeY = Number.isFinite(y) ? Math.round(y) : 0

    try {
        if (action === 'move') {
            const now = Date.now()
            if (now - lastMoveTime < 12) return // Smooth 80Hz cursor tracking
            lastMoveTime = now
            inputProcess.stdin.write(`MOVE ${safeX} ${safeY}\n`)
        } else if (action === 'click') {
            const btn = button === 2 ? 2 : (button === 1 ? 1 : 0)
            inputProcess.stdin.write(`CLICK ${safeX} ${safeY} ${btn}\n`)
        } else if (action === 'down') {
            const btn = button === 2 ? 2 : (button === 1 ? 1 : 0)
            inputProcess.stdin.write(`DOWN ${safeX} ${safeY} ${btn}\n`)
        } else if (action === 'up') {
            const btn = button === 2 ? 2 : (button === 1 ? 1 : 0)
            inputProcess.stdin.write(`UP ${safeX} ${safeY} ${btn}\n`)
        } else if (action === 'dblclick') {
            inputProcess.stdin.write(`DBLCLICK ${safeX} ${safeY}\n`)
        } else if (action === 'contextmenu') {
            inputProcess.stdin.write(`CONTEXTMENU ${safeX} ${safeY}\n`)
        } else if (action === 'scroll') {
            const scrollAmount = Math.round((Number.isFinite(deltaY) ? deltaY : 0) * -1)
            inputProcess.stdin.write(`SCROLL ${scrollAmount}\n`)
        } else if (action === 'key' && key) {
            inputProcess.stdin.write(`KEY down ${key}\n`)
        } else if (action === 'keyup' && key) {
            inputProcess.stdin.write(`KEY up ${key}\n`)
        }
    } catch (err) {
        console.error('[Desktop] Failed to write to input stream:', err)
    }
}

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    mainWindow = new BrowserWindow({
        width: Math.min(1440, width),
        height: Math.min(900, height),
        minWidth: 1024,
        minHeight: 640,
        title: 'JTS Meet - Enterprise Video Conferencing',
        icon: path.join(__dirname, '../frontend/public/favicon.ico'),
        backgroundColor: '#0a0b0f',
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            backgroundThrottling: false
        }
    })

    // ─── FIX: Enable screen sharing via getDisplayMedia in Electron ──────────
    // Electron blocks getDisplayMedia by default. This handler intercepts the
    // browser's screen-share request and routes it through desktopCapturer.
    setupDisplayMediaHandler(mainWindow.webContents.session)
    setupDisplayMediaHandler(session.defaultSession)


    // ─── Auto-approve Media (Microphone & Camera) and Screen permissions in Electron session
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowed = ['media', 'mediaKeySystem', 'notifications', 'pointerLock', 'fullscreen', 'display-capture']
        callback(allowed.includes(permission))
    })
    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        const allowed = ['media', 'mediaKeySystem', 'notifications', 'pointerLock', 'fullscreen', 'display-capture']
        return allowed.includes(permission)
    })

    // Determine target URL:
    // 1. If explicit FRONTEND_URL is set in environment, use that
    // 2. If dev flag passed or localhost is available, prioritize http://localhost:3000
    // 3. Fallback to production https://meet.jtsmiddleeast.com
    const isPackaged = app.isPackaged
    const isDev = process.argv.includes('--dev') || (!isPackaged && process.env.NODE_ENV !== 'production')
    const primaryUrl = process.env.FRONTEND_URL || (isDev ? 'http://localhost:3000' : 'http://localhost:3000')
    const fallbackUrl = 'https://meet.jtsmiddleeast.com'

    mainWindow.loadURL(primaryUrl).catch(() => {
        if (primaryUrl !== fallbackUrl) {
            console.log('[Desktop] Primary URL unavailable, loading fallback:', fallbackUrl)
            mainWindow.loadURL(fallbackUrl).catch(() => {
                showOfflineScreen()
            })
        } else {
            showOfflineScreen()
        }
    })

    // Offline / Network Failure Screen
    function showOfflineScreen() {
        if (!mainWindow) return
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>JTS Meet - Connection Error</title>
                <style>
                    body {
                        background: #0a0b0f;
                        color: #f8fafc;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        text-align: center;
                    }
                    .card {
                        background: #13151c;
                        border: 1px solid rgba(255,255,255,0.1);
                        border-radius: 16px;
                        padding: 36px 48px;
                        max-width: 440px;
                        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                    }
                    h2 { margin: 16px 0 8px; color: #fff; font-size: 1.25rem; }
                    p { color: #94a3b8; font-size: 0.875rem; line-height: 1.5; margin-bottom: 24px; }
                    button {
                        background: #3b82f6;
                        color: #fff;
                        border: none;
                        padding: 10px 24px;
                        border-radius: 9999px;
                        font-weight: 600;
                        font-size: 0.875rem;
                        cursor: pointer;
                        transition: background 0.2s;
                    }
                    button:hover { background: #2563eb; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div style="font-size: 2.5rem;">📡</div>
                    <h2>Unable to Connect</h2>
                    <p>Could not connect to JTS Meet servers. Please check your internet connection and retry.</p>
                    <button onclick="window.location.href='${primaryUrl}'">Retry Connection</button>
                </div>
            </body>
            </html>
        `)}`)
    }

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

// ─── IPC: Provide list of screen/window sources to frontend for picker UI ───
ipcMain.handle('get-screen-sources', async () => {
    try {
        const sources = await desktopCapturer.getSources({
            types: ['screen', 'window'],
            thumbnailSize: { width: 320, height: 180 }
        })
        // Serialize sources (thumbnail is a NativeImage — convert to dataURL)
        return sources.map(src => ({
            id: src.id,
            name: src.name,
            thumbnail: src.thumbnail.toDataURL()
        }))
    } catch (err) {
        console.error('[ScreenShare] getSources error:', err)
        return []
    }
})

// ─── IPC: Set a specific sourceId for next getDisplayMedia call ──────────────
ipcMain.on('set-screen-source', (_event, sourceId) => {
    selectedScreenSourceId = sourceId
    if (mainWindow && mainWindow.webContents && mainWindow.webContents.session) {
        setupDisplayMediaHandler(mainWindow.webContents.session)
    }
    if (session.defaultSession) {
        setupDisplayMediaHandler(session.defaultSession)
    }
})

// Handle Remote Control Input Events from Presenter's Frontend Overlay
ipcMain.on('remote-control:input', (event, data) => {
    try {
        const primaryDisplay = screen.getPrimaryDisplay()
        const { width, height } = primaryDisplay.bounds

        const targetX = Math.round((data.x ?? 0.5) * width)
        const targetY = Math.round((data.y ?? 0.5) * height)

        if (data.type === 'mouse') {
            simulateWindowsInput(data.action, targetX, targetY, data.button, null, data.deltaY)
        } else if (data.type === 'key' && data.key) {
            if (data.action === 'up') {
                simulateWindowsInput('keyup', targetX, targetY, null, data.key)
            } else {
                simulateWindowsInput('key', targetX, targetY, null, data.key)
            }
        }
    } catch (err) {
        console.error('[Desktop] Input simulation error:', err?.message || err)
    }
})

// ─── IPC: Incoming Call Native Desktop Alert & Taskbar Flash ─────────────────
ipcMain.on('incoming-call:alert', (_event, callData) => {
    try {
        if (mainWindow) {
            mainWindow.flashFrame(true)
            if (mainWindow.isMinimized()) {
                mainWindow.restore()
            }
            mainWindow.showInactive()
        }

        // Native Windows 10/11 Toast Notification
        if (Notification.isSupported()) {
            if (activeCallNotification) {
                try { activeCallNotification.close() } catch {}
            }

            const isAudio = callData?.callType === 'audio'
            const notifTitle = isAudio ? '📞 Incoming Audio Call' : '📹 Incoming Video Call'
            const notifBody = `${callData?.callerName || 'A colleague'} is calling you on JTS Meet... Click to answer.`

            activeCallNotification = new Notification({
                title: notifTitle,
                body: notifBody,
                icon: path.join(__dirname, '../frontend/public/favicon.ico'),
                urgency: 'critical',
                timeoutType: 'never'
            })

            activeCallNotification.on('click', () => {
                if (mainWindow) {
                    mainWindow.flashFrame(false)
                    if (mainWindow.isMinimized()) mainWindow.restore()
                    mainWindow.show()
                    mainWindow.focus()
                }
                activeCallNotification = null
            })

            activeCallNotification.show()
        }
    } catch (err) {
        console.warn('[Desktop] Error showing incoming call alert:', err)
    }
})

ipcMain.on('incoming-call:dismiss', () => {
    try {
        if (activeCallNotification) {
            activeCallNotification.close()
            activeCallNotification = null
        }
        if (mainWindow) {
            mainWindow.flashFrame(false)
        }
    } catch {}
})

ipcMain.on('app:focus', () => {
    try {
        if (activeCallNotification) {
            activeCallNotification.close()
            activeCallNotification = null
        }
        if (mainWindow) {
            mainWindow.flashFrame(false)
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.show()
            mainWindow.focus()
        }
    } catch {}
})

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('will-quit', () => {
    if (inputProcess) {
        try {
            inputProcess.stdin.end()
            inputProcess.kill()
        } catch (e) {}
        inputProcess = null
    }
})
