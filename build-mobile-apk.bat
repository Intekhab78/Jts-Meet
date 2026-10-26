@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo       JTS MEET - 1-CLICK MOBILE APK GENERATOR
echo ========================================================
echo.

cd /d "%~dp0mobile"
call build-apk.bat
