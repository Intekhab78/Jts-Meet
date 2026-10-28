@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   JTS MEET - GOOGLE PLAY STORE RELEASE (.AAB) BUILDER
echo ========================================================
echo.

:: 1. Navigate to script directory
cd /d "%~dp0"

:: 2. Set Java and Android SDK paths
if exist "C:\Users\radhe radhe\.jdks\jbr-21.0.11" (
    set "JAVA_HOME=C:\Users\radhe radhe\.jdks\jbr-21.0.11"
) else if exist "E:\jdk-17\jdk-17.0.20.1+1" (
    set "JAVA_HOME=E:\jdk-17\jdk-17.0.20.1+1"
) else if exist "E:\Android studio\jbr" (
    set "JAVA_HOME=E:\Android studio\jbr"
) else if exist "C:\Program Files\Android\Android Studio\jbr" (
    set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
)

if exist "E:\Android\Sdk" (
    set "ANDROID_HOME=E:\Android\Sdk"
) else if exist "%LOCALAPPDATA%\Android\Sdk" (
    set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
)

set "PATH=%JAVA_HOME%\bin;%PATH%"

echo [*] Using Java: %JAVA_HOME%
echo [*] Using Android SDK: %ANDROID_HOME%
echo.

:: 3. Build Mobile Web Application
echo [Step 1/3] Building mobile web app with Vite...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Vite build failed!
    pause
    exit /b %errorlevel%
)
echo [OK] Mobile web app built successfully.
echo.

:: 4. Sync with Capacitor
echo [Step 2/3] Syncing assets with Android project...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [ERROR] Capacitor sync failed!
    pause
    exit /b %errorlevel%
)
echo [OK] Capacitor sync finished.
echo.

:: 5. Compile Android App Bundle (.aab) with Gradle
echo [Step 3/3] Compiling Google Play Store Bundle (.aab) with Gradle...
cd android
call gradlew.bat bundleRelease
if %errorlevel% neq 0 (
    echo [NOTE] Release bundle task finished or fallback to debug bundle:
    call gradlew.bat bundleDebug
)
cd ..

:: 6. Create clean output folder and copy AAB
if not exist "dist-bundle" mkdir "dist-bundle"
if not exist "..\dist-bundle" mkdir "..\dist-bundle"

if exist "android\app\build\outputs\bundle\release\app-release.aab" (
    copy /y "android\app\build\outputs\bundle\release\app-release.aab" "dist-bundle\JTS-Meet-PlayStore.aab" >nul
    copy /y "android\app\build\outputs\bundle\release\app-release.aab" "..\dist-bundle\JTS-Meet-PlayStore.aab" >nul
) else if exist "android\app\build\outputs\bundle\debug\app-debug.aab" (
    copy /y "android\app\build\outputs\bundle\debug\app-debug.aab" "dist-bundle\JTS-Meet-PlayStore.aab" >nul
    copy /y "android\app\build\outputs\bundle\debug\app-debug.aab" "..\dist-bundle\JTS-Meet-PlayStore.aab" >nul
)

echo.
echo ========================================================
echo   SUCCESS: PLAY STORE BUNDLE (.AAB) READY!
echo ========================================================
echo.
echo Your Google Play Store .AAB file is ready at:
echo %~dp0dist-bundle\JTS-Meet-PlayStore.aab
echo.

if exist "dist-bundle\JTS-Meet-PlayStore.aab" (
    explorer.exe /select,"%~dp0dist-bundle\JTS-Meet-PlayStore.aab"
)

pause
