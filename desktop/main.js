const { app, BrowserWindow, ipcMain, screen, Menu, desktopCapturer, session } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let mainWindow = null
let inputProcess = null
let lastMoveTime = 0
let selectedScreenSourceId = null

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


function initInputProcess() {
    if (process.platform !== 'win32') return
    try {
        inputProcess = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '-'], {
            stdio: ['pipe', 'ignore', 'ignore'],
            windowsHide: true
        })
        inputProcess.on('error', (err) => {
            console.error('[Desktop] Input process error:', err?.message || err)
            inputProcess = null
        })
        inputProcess.on('exit', () => {
            inputProcess = null
        })
        // Initialize Win32 Types once on the persistent stream
        const initScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);' -Name Win32Mouse -Namespace Win32
`
        inputProcess.stdin.write(initScript + '\r\n')
    } catch (e) {
        console.error('[Desktop] Failed to spawn input process:', e)
    }
}

// Native Windows Input Simulator using persistent stdin streaming
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
            if (now - lastMoveTime < 16) return // Cap cursor move to ~60Hz
            lastMoveTime = now
            inputProcess.stdin.write(`[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${safeX}, ${safeY})\r\n`)
        } else if (action === 'click') {
            const flag = button === 2 ? 0x18 : 0x06
            inputProcess.stdin.write(`[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${safeX}, ${safeY}); [Win32.Win32Mouse]::mouse_event(${flag}, 0, 0, 0, 0)\r\n`)
        } else if (action === 'down') {
            const flag = button === 2 ? 0x08 : 0x02
            inputProcess.stdin.write(`[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${safeX}, ${safeY}); [Win32.Win32Mouse]::mouse_event(${flag}, 0, 0, 0, 0)\r\n`)
        } else if (action === 'up') {
            const flag = button === 2 ? 0x10 : 0x04
            inputProcess.stdin.write(`[Win32.Win32Mouse]::mouse_event(${flag}, 0, 0, 0, 0)\r\n`)
        } else if (action === 'dblclick') {
            inputProcess.stdin.write(`[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${safeX}, ${safeY}); [Win32.Win32Mouse]::mouse_event(0x06, 0, 0, 0, 0); Start-Sleep -Milliseconds 50; [Win32.Win32Mouse]::mouse_event(0x06, 0, 0, 0, 0)\r\n`)
        } else if (action === 'contextmenu') {
            inputProcess.stdin.write(`[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${safeX}, ${safeY}); [Win32.Win32Mouse]::mouse_event(0x18, 0, 0, 0, 0)\r\n`)
        } else if (action === 'scroll') {
            const scrollAmount = Math.round((Number.isFinite(deltaY) ? deltaY : 0) * -1)
            inputProcess.stdin.write(`[Win32.Win32Mouse]::mouse_event(0x0800, 0, 0, ${scrollAmount}, 0)\r\n`)
        } else if (action === 'key' && key) {
            const safeKey = String(key).slice(0, 50).replace(/([+^%~{}()[\]])/g, '{$1}')
            const keyB64 = Buffer.from(safeKey, 'utf8').toString('base64')
            inputProcess.stdin.write(`try { [System.Windows.Forms.SendKeys]::SendWait([System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("${keyB64}"))) } catch {}\r\n`)
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
            sandbox: false
        }
    })

    // ─── FIX: Enable screen sharing via getDisplayMedia in Electron ──────────
    // Electron blocks getDisplayMedia by default. This handler intercepts the
    // browser's screen-share request and routes it through desktopCapturer.
    setupDisplayMediaHandler(mainWindow.webContents.session)
    setupDisplayMediaHandler(session.defaultSession)


    // Determine target URL:
    // 1. If packaged (.exe production release): loads live cloud frontend https://meet.jtsmiddleeast.com
    // 2. If development: loads http://localhost:3000 with fallback to production
    const isPackaged = app.isPackaged
    const isDev = process.argv.includes('--dev') || (!isPackaged && process.env.NODE_ENV !== 'production')
    const primaryUrl = isDev ? 'http://localhost:3000' : (process.env.FRONTEND_URL || 'https://meet.jtsmiddleeast.com')
    const fallbackUrl = 'https://meet.jtsmiddleeast.com'

    mainWindow.loadURL(primaryUrl).catch(() => {
        if (primaryUrl !== fallbackUrl) {
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
        } else if (data.type === 'key' && data.key && data.action === 'down') {
            simulateWindowsInput('key', targetX, targetY, null, data.key)
        }
    } catch (err) {
        console.error('[Desktop] Input simulation error:', err?.message || err)
    }
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
