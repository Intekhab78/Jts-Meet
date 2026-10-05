@echo off
echo ========================================================
echo   JTS-Meet: Starting Standalone SFU Media Server (Windows)
echo ========================================================
echo.
cd /d "%~dp0.."
if exist "bin\livekit-server.exe" (
    echo Starting LiveKit SFU Server natively on Windows...
    echo SFU WebSocket URL: ws://localhost:7880
    echo HTTP Health URL:   http://localhost:7880
    echo API Key:           devkey
    echo API Secret:        secret
    echo.
    echo Press Ctrl+C anytime to stop the SFU server.
    echo.
    bin\livekit-server.exe --dev
) else (
    echo Native binary not found. Launching via Docker Compose...
    docker compose -f docker-compose.sfu.yml up
)
pause
