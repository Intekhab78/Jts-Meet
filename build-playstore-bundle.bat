@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   JTS MEET - 1-CLICK PLAY STORE (.AAB) BUNDLE GENERATOR
echo ========================================================
echo.

cd /d "%~dp0mobile"
call build-bundle.bat
