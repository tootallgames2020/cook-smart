@echo off
echo 🚀 Manual Deployment to AWS Amplify...

echo.
echo This script manually deploys the website to Amplify
echo (useful if GitHub auto-deploy isn't working)
echo.

set /p app_id="Enter your Amplify App ID: "
if "%app_id%"=="" (
    echo ❌ App ID is required
    pause
    exit /b 1
)

echo.
echo 📋 Step 1: Building website...
cd ..\website
call npm ci
if %errorlevel% neq 0 (
    echo ❌ npm install failed!
    pause
    exit /b 1
)

call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo ✅ Build completed

echo.
echo 📋 Step 2: Creating deployment package...
cd out
tar -czf ..\website-build.tar.gz *
cd ..

echo.
echo 📋 Step 3: Uploading to Amplify...
aws amplify create-deployment ^
    --app-id %app_id% ^
    --branch-name fresh-project-migration ^
    --file-map "website-build.tar.gz=website-build.tar.gz"

if %errorlevel% neq 0 (
    echo ❌ Upload failed!
    pause
    exit /b 1
)

echo.
echo 📋 Step 4: Starting deployment...
aws amplify start-deployment ^
    --app-id %app_id% ^
    --branch-name fresh-project-migration ^
    --source-url "website-build.tar.gz"

echo.
echo ✅ Deployment started!
echo.
echo 🔗 Monitor progress:
echo    https://console.aws.amazon.com/amplify/home#/apps/%app_id%
echo.
echo ⏱️  Deployment typically takes 2-3 minutes
echo    Your site will be live at https://cooksmartapp.com once complete
echo.

REM Cleanup
del website-build.tar.gz

cd ..\infrastructure
pause