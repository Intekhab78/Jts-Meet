@echo off
echo ==============================================
echo Opening JTS Meet Mobile Project in Android Studio...
echo ==============================================
cd /d "%~dp0"
call npx cap open android
if %errorlevel% neq 0 (
    echo.
    echo If Android Studio didn't launch automatically,
    echo open Android Studio manually and select this folder:
    echo %~dp0android
    echo.
)
pause
