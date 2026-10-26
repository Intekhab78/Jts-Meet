@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo       JTS MEET - 1-CLICK APK GENERATOR
echo ========================================================
echo.

:: 1. Navigate to script directory (mobile folder)
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

:: 5. Compile Android APK with Gradle
echo [Step 3/3] Compiling Android APK with Gradle...
cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo [ERROR] Gradle APK build failed!
    pause
    exit /b %errorlevel%
)
cd ..

:: 6. Create clean output folder and copy APK
if not exist "dist-apk" mkdir "dist-apk"
copy /y "android\app\build\outputs\apk\debug\app-debug.apk" "dist-apk\JTS-Meet-Mobile.apk" >nul

if not exist "..\dist-apk" mkdir "..\dist-apk"
copy /y "android\app\build\outputs\apk\debug\app-debug.apk" "..\dist-apk\JTS-Meet-Mobile.apk" >nul

echo.
echo ========================================================
echo       SUCCESS: APK GENERATED SUCCESSFULLY!
echo ========================================================
echo.
echo Your APK file is ready at:
echo %~dp0dist-apk\JTS-Meet-Mobile.apk
echo.

:: Open explorer with APK selected
explorer.exe /select,"%~dp0dist-apk\JTS-Meet-Mobile.apk"

pause
