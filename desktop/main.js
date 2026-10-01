const { app, BrowserWindow, ipcMain, screen, Menu, desktopCapturer, session, Notification } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

// Disable dev security warnings in renderer DevTools console
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// Prevent crash / error dialog from stream EPIPE or broken pipes
process.stdout?.on('error', (err) => { if (err && err.code === 'EPIPE') return })
process.stderr?.on('error', (err) => { if (err && err.code === 'EPIPE') return })
process.on('uncaughtException', (err) => {
    if (err && (err.code === 'EPIPE' || (typeof err.message === 'string' && err.message.includes('EPIPE')))) {
        console.warn('[Desktop] Handled stream EPIPE:', err.message)
        return
    }
    console.error('[Desktop] Uncaught exception:', err)
})

// Disable Chromium background throttling so screen share and WebRTC never pause when another OS window is clicked
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.commandLine.appendSwitch('disable-renderer-backgrounding')

// Register deep-linking scheme (e.g. jtsmeet://meet/room-code)
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('jtsmeet', process.execPath, [path.resolve(process.argv[1])])
    }
} else {
    app.setAsDefaultProtocolClient('jtsmeet')
}

// Enforce single instance to prevent duplicate audio/meeting collisions
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (_event, commandLine) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.show()
            mainWindow.focus()
            const deepLink = commandLine.find(arg => arg.startsWith('jtsmeet://'))
            if (deepLink) {
                const target = deepLink.replace('jtsmeet://', '')
                mainWindow.webContents.send('app:navigate', target)
            }
        }
    })
}

let mainWindow = null
let inputProcess = null
let lastMoveTime = 0
let selectedScreenSourceId = null
let activeCallNotification = null

function setupDisplayMediaHandler(sess) {
    if (!sess || typeof sess.setDisplayMediaRequestHandler !== 'function') return
    sess.setDisplayMediaRequestHandler(
        (request, callback) => {
            desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 1, height: 1 } }).then((sources) => {
                if (!sources || sources.length === 0) {
                    console.warn('[ScreenShare] No desktop sources available')
                    return callback({})
                }
                const chosen = (selectedScreenSourceId && sources.find(s => s.id === selectedScreenSourceId)) || sources[0]
                console.log('[ScreenShare] setDisplayMediaRequestHandler serving source:', chosen ? `${chosen.id} (${chosen.name})` : 'none')
                const response = { video: chosen }
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
        if (inputProcess.stdin) {
            inputProcess.stdin.on('error', (err) => {
                // Prevent unhandled stream error (EPIPE)
                console.warn('[Desktop] Input injector stdin error:', err?.message || err)
                inputProcess = null
            })
        }
        inputProcess.on('error', (err) => {
            console.error('[Desktop] Input injector process error:', err?.message || err)
            inputProcess = null
        })
        inputProcess.on('exit', () => {
            inputProcess = null
        })
    } catch (e) {
        console.error('[Desktop] Failed to spawn input injector process:', e)
        inputProcess = null
    }
}

// Native Windows Input Simulator using compiled high-performance Win32 Injector
function simulateWindowsInput(action, x, y, button, key, deltaY) {
    if (process.platform !== 'win32') return
    if (!inputProcess || !inputProcess.stdin || inputProcess.stdin.destroyed || !inputProcess.stdin.writable) {
        initInputProcess()
    }
    if (!inputProcess || !inputProcess.stdin || inputProcess.stdin.destroyed || !inputProcess.stdin.writable) return

    const safeX = Number.isFinite(x) ? Math.round(x) : 0
    const safeY = Number.isFinite(y) ? Math.round(y) : 0

    let cmd = null
    if (action === 'move') {
        const now = Date.now()
        if (now - lastMoveTime < 12) return // Smooth 80Hz cursor tracking
        lastMoveTime = now
        cmd = `MOVE ${safeX} ${safeY}\n`
    } else if (action === 'click') {
        const btn = button === 2 ? 2 : (button === 1 ? 1 : 0)
        cmd = `CLICK ${safeX} ${safeY} ${btn}\n`
    } else if (action === 'down') {
        const btn = button === 2 ? 2 : (button === 1 ? 1 : 0)
        cmd = `DOWN ${safeX} ${safeY} ${btn}\n`
    } else if (action === 'up') {
        const btn = button === 2 ? 2 : (button === 1 ? 1 : 0)
        cmd = `UP ${safeX} ${safeY} ${btn}\n`
    } else if (action === 'dblclick') {
        cmd = `DBLCLICK ${safeX} ${safeY}\n`
    } else if (action === 'contextmenu') {
        cmd = `CONTEXTMENU ${safeX} ${safeY}\n`
    } else if (action === 'scroll') {
        const scrollAmount = Math.round((Number.isFinite(deltaY) ? deltaY : 0) * -1)
        cmd = `SCROLL ${scrollAmount}\n`
    } else if (action === 'key' && key) {
        cmd = `KEY down ${key}\n`
    } else if (action === 'keyup' && key) {
        cmd = `KEY up ${key}\n`
    }

    if (cmd && inputProcess && inputProcess.stdin && !inputProcess.stdin.destroyed && inputProcess.stdin.writable) {
        try {
            inputProcess.stdin.write(cmd, (err) => {
                if (err) {
                    inputProcess = null
                }
            })
        } catch (err) {
            inputProcess = null
        }
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
    const setupPermissions = (targetSession) => {
        if (!targetSession) return
        const allowed = [
            'media',
            'mediaKeySystem',
            'notifications',
            'pointerLock',
            'fullscreen',
            'display-capture',
            'clipboard-read',
            'clipboard-sanitized-write',
            'clipboard'
        ]
        targetSession.setPermissionRequestHandler((webContents, permission, callback) => {
            callback(allowed.includes(permission))
        })
        targetSession.setPermissionCheckHandler((webContents, permission) => {
            return allowed.includes(permission)
        })
    }
    setupPermissions(session.defaultSession)
    setupPermissions(mainWindow.webContents.session)

    // Determine target URL:
    // 1. If explicit FRONTEND_URL is set in environment, use that
    // 2. If dev flag passed or localhost is available, prioritize http://localhost:3000
    // 3. Fallback to production https://meet.jtsmiddleeast.com
    const isPackaged = app.isPackaged
    const isDev = process.argv.includes('--dev') || (!isPackaged && process.env.NODE_ENV !== 'production')
    const primaryUrl = process.env.FRONTEND_URL || (isDev ? 'http://localhost:3000' : 'https://meet.jtsmiddleeast.com')
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
            thumbnailSize: { width: 480, height: 270 },
            fetchWindowIcons: true
        })
        // Serialize sources (thumbnail and appIcon are NativeImage — convert to dataURL)
        return sources.map(src => ({
            id: src.id,
            name: src.name,
            thumbnail: src.thumbnail ? src.thumbnail.toDataURL() : '',
            appIcon: src.appIcon ? src.appIcon.toDataURL() : null
        }))
    } catch (err) {
        console.error('[ScreenShare] getSources error:', err)
        return []
    }
})

// ─── IPC: Set a specific sourceId for next getDisplayMedia call ──────────────
ipcMain.handle('set-screen-source', async (_event, sourceId) => {
    selectedScreenSourceId = sourceId
    console.log('[ScreenShare] Selected screen source ID set to:', sourceId)
    return true
})

// Handle Remote Control Input Events from Presenter's Frontend Overlay
ipcMain.on('remote-control:input', (event, data) => {
    try {
        const allDisplays = screen.getAllDisplays()
        let targetDisplay = screen.getPrimaryDisplay()

        // Multi-monitor support: calculate relative offset if secondary display is targeted
        if (data.displayIndex !== undefined && allDisplays[data.displayIndex]) {
            targetDisplay = allDisplays[data.displayIndex]
        } else if (selectedScreenSourceId) {
            const match = selectedScreenSourceId.match(/screen:(\d+)/i)
            if (match && allDisplays[parseInt(match[1], 10)]) {
                targetDisplay = allDisplays[parseInt(match[1], 10)]
            }
        }

        const { x: offsetX, y: offsetY, width, height } = targetDisplay.bounds

        const targetX = Math.round(offsetX + (data.x ?? 0.5) * width)
        const targetY = Math.round(offsetY + (data.y ?? 0.5) * height)

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
