@echo off
echo 🎵 Setting up Lori's Music File for Cook Smart
echo.

REM Check if source file exists
if not exist "C:\Users\toota\Music\loris-song.mp3" (
    echo ❌ Source file not found: C:\Users\toota\Music\loris-song.mp3
    echo Please check the file path and try again.
    pause
    exit /b 1
)

REM Create android assets directory if it doesn't exist
if not exist "android\app\src\main\assets" (
    echo 📁 Creating Android assets directory...
    mkdir "android\app\src\main\assets"
)

REM Copy the music file to Android assets
echo 📋 Copying loris-song.mp3 to Android assets...
copy "C:\Users\toota\Music\loris-song.mp3" "android\app\src\main\assets\lori_song.mp3"

if %ERRORLEVEL% EQU 0 (
    echo ✅ Successfully copied loris-song.mp3 to android\app\src\main\assets\lori_song.mp3
) else (
    echo ❌ Failed to copy music file
    pause
    exit /b 1
)

REM Check if iOS assets directory exists and copy there too
if exist "ios" (
    if not exist "ios\CookSmartFresh\Assets" (
        echo 📁 Creating iOS assets directory...
        mkdir "ios\CookSmartFresh\Assets"
    )
    
    echo 📋 Copying to iOS assets...
    copy "C:\Users\toota\Music\loris-song.mp3" "ios\CookSmartFresh\Assets\lori_song.mp3"
    
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Successfully copied to iOS assets as well
    ) else (
        echo ⚠️ iOS copy failed, but Android copy succeeded
    )
)

echo.
echo 🎵 Music File Setup Complete!
echo.
echo 📱 File Locations:
echo    Android: android\app\src\main\assets\lori_song.mp3
if exist "ios\CookSmartFresh\Assets\lori_song.mp3" (
    echo    iOS: ios\CookSmartFresh\Assets\lori_song.mp3
)
echo.
echo 📋 Next Steps:
echo 1. Provide Lori's personalized welcome message
echo 2. Run: node backend\scripts\create-lori-sears.js
echo 3. Update her welcome content when ready
echo 4. Test her login and welcome screen
echo.
pause