const { app, BrowserWindow, ipcMain, screen, Menu } = require('electron')
const path = require('path')
const { exec } = require('child_process')

let mainWindow = null

// Native Windows Input Simulator using Windows Win32 API
function simulateWindowsInput(action, x, y, button, key, deltaY) {
    if (process.platform !== 'win32') return

    if (action === 'move') {
        const psCommand = `powershell -NoProfile -Command "[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})"`
        exec(psCommand)
    } else if (action === 'click') {
        const flag = button === 2 ? 0x18 : 0x06 // Right click (0x08 | 0x10) : Left click (0x02 | 0x04)
        const psCommand = `powershell -NoProfile -Command "[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y}); Add-Type -TypeDefinition '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);' -Name Win32Mouse -Namespace Win32; [Win32.Win32Mouse]::mouse_event(${flag}, 0, 0, 0, 0)"`
        exec(psCommand)
    } else if (action === 'down') {
        const flag = button === 2 ? 0x08 : 0x02 // Right down : Left down
        const psCommand = `powershell -NoProfile -Command "[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y}); Add-Type -TypeDefinition '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);' -Name Win32Mouse -Namespace Win32; [Win32.Win32Mouse]::mouse_event(${flag}, 0, 0, 0, 0)"`
        exec(psCommand)
    } else if (action === 'up') {
        const flag = button === 2 ? 0x10 : 0x04 // Right up : Left up
        const psCommand = `powershell -NoProfile -Command "Add-Type -TypeDefinition '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);' -Name Win32Mouse -Namespace Win32; [Win32.Win32Mouse]::mouse_event(${flag}, 0, 0, 0, 0)"`
        exec(psCommand)
    } else if (action === 'dblclick') {
        const psCommand = `powershell -NoProfile -Command "[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y}); Add-Type -TypeDefinition '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);' -Name Win32Mouse -Namespace Win32; [Win32.Win32Mouse]::mouse_event(0x06, 0, 0, 0, 0); Start-Sleep -Milliseconds 50; [Win32.Win32Mouse]::mouse_event(0x06, 0, 0, 0, 0)"`
        exec(psCommand)
    } else if (action === 'contextmenu') {
        const psCommand = `powershell -NoProfile -Command "[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y}); Add-Type -TypeDefinition '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);' -Name Win32Mouse -Namespace Win32; [Win32.Win32Mouse]::mouse_event(0x18, 0, 0, 0, 0)"`
        exec(psCommand)
    } else if (action === 'scroll') {
        const scrollAmount = Math.round((deltaY || 0) * -1)
        const psCommand = `powershell -NoProfile -Command "Add-Type -TypeDefinition '[DllImport(\\"user32.dll\\")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);' -Name Win32Mouse -Namespace Win32; [Win32.Win32Mouse]::mouse_event(0x0800, 0, 0, ${scrollAmount}, 0)"`
        exec(psCommand)
    } else if (action === 'key' && key) {
        const escapedKey = key.replace(/([+^%~{}()])/g, '{$1}')
        const psCommand = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escapedKey}')"`
        exec(psCommand)
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
