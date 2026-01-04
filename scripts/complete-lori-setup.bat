@echo off
echo 🎉 Complete Lori Sears Setup - Cook Smart Special User
echo.
echo This script will:
echo 1. Copy Lori's music file to mobile app assets
echo 2. Create her user account in the database
echo 3. Set up her welcome screen structure
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Please run this script from the Cook Smart project root directory
    pause
    exit /b 1
)

REM Step 1: Setup music file
echo 🎵 Step 1: Setting up Lori's music file...
call scripts\setup-lori-music.bat
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Music setup failed. Please check the file path and try again.
    pause
    exit /b 1
)

echo.
echo ✅ Music file setup complete!
echo.

REM Step 2: Create user account
echo 👤 Step 2: Creating Lori's user account...
echo.
echo Running: node backend\scripts\create-lori-sears.js
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found. Please install Node.js and try again.
    pause
    exit /b 1
)

REM Check if backend dependencies are installed
if not exist "backend\node_modules" (
    echo 📦 Installing backend dependencies...
    cd backend
    npm install
    cd ..
)

REM Run the user creation script
node backend\scripts\create-lori-sears.js
if %ERRORLEVEL% NEQ 0 (
    echo ❌ User creation failed. Please check the database connection and try again.
    pause
    exit /b 1
)

echo.
echo ✅ Lori Sears account created successfully!
echo.

REM Summary
echo 🎉 Setup Complete!
echo.
echo 📋 What was accomplished:
echo ✅ Music file copied to mobile app assets (lori_song.mp3)
echo ✅ User account created (boldtcu@gmail.com)
echo ✅ Special user privileges enabled (lifetime access)
echo ✅ Welcome screen structure configured
echo ✅ Placeholder welcome content added
echo.
echo 👤 Login Credentials:
echo    Email: boldtcu@gmail.com
echo    Password: Cuba#1
echo.
echo 📱 Current Status:
echo ✅ Lori can log in and see placeholder welcome screen
echo ⏳ Waiting for personalized welcome message from Brad
echo.
echo 📝 Next Steps:
echo 1. Provide Lori's personalized welcome message
echo 2. Run: node backend\scripts\update-lori-welcome-content.js
echo 3. Test her login and personalized welcome screen
echo 4. Deploy updated app with her music file
echo.
echo 🚀 Lori is ready to use Cook Smart with lifetime access!
echo.
pause