@echo off
echo 🔒 Cook Smart SSL APK Builder v1.1.8
echo ====================================

echo.
echo 📱 Building SSL-enabled APK for Cook Smart
echo    Version: 1.1.8 (Build 48)
echo    SSL API: https://api.cooksmartapp.com
echo    Target: Production Release
echo.

set /p CONFIRM="Ready to build APK? (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo Build cancelled.
    exit /b 0
)

echo.
echo 🧹 Step 1: Cleaning Previous Build
echo ==================================
cd android
call gradlew clean
if %ERRORLEVEL% neq 0 (
    echo ❌ Clean failed!
    cd ..
    exit /b 1
)

echo.
echo 🔨 Step 2: Building Release APK
echo ===============================
call gradlew assembleRelease --no-daemon
if %ERRORLEVEL% neq 0 (
    echo ❌ Build failed!
    cd ..
    exit /b 1
)

cd ..

echo.
echo 📊 Step 3: Build Results
echo =======================

if exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo ✅ APK built successfully!
    echo.
    echo 📍 Location: android\app\build\outputs\apk\release\app-release.apk
    
    for %%I in ("android\app\build\outputs\apk\release\app-release.apk") do (
        echo 📏 Size: %%~zI bytes (%.1f MB)
        set /a SIZE_MB=%%~zI/1024/1024
    )
    
    echo 🏷️  Version: 1.1.8 (Build 48)
    echo 🔒 SSL: Enabled (HTTPS only)
    echo 🌐 API: https://api.cooksmartapp.com
    echo ⏰ Built: %DATE% %TIME%
    
    echo.
    echo 🎯 APK Ready for Installation!
    echo ==============================
    echo.
    echo 📱 Installation Steps:
    echo    1. Transfer APK to Android device
    echo    2. Enable "Install from Unknown Sources"
    echo    3. Tap APK file to install
    echo    4. Launch Cook Smart app
    echo.
    echo 🧪 Testing Checklist:
    echo    □ App launches successfully
    echo    □ Login/Registration works
    echo    □ Recipe search functions
    echo    □ Barcode scanning works
    echo    □ All features operational
    echo.
    echo 🔗 API Status: 
    curl -s https://api.cooksmartapp.com/health | findstr "status" || echo "API check failed"
    
) else (
    echo ❌ APK build failed!
    echo.
    echo 🔍 Troubleshooting:
    echo    1. Check Gradle output above for errors
    echo    2. Ensure React Native entry point exists (index.js)
    echo    3. Verify Android SDK and build tools
    echo    4. Try: npm install && cd android && gradlew clean
    echo.
    exit /b 1
)

echo.
echo 🎉 SSL APK Build Complete!
echo =========================
echo Ready for testing and deployment.