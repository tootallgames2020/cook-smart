@echo off
echo 🚀 Deploying Cook Smart Website...

echo.
echo ⚠️  NOTICE: This website now uses AWS Amplify for hosting
echo    The old CloudFront setup has been replaced with a more reliable solution.
echo.
echo    If this is your first deployment, run: infrastructure\deploy-amplify.bat
echo    For regular updates, just push to GitHub - Amplify will auto-deploy!
echo.

set /p choice="Deploy method? (1=GitHub Push [Recommended], 2=Manual Deploy, 3=Setup Infrastructure): "

if "%choice%"=="1" (
    echo.
    echo 📋 GitHub Auto-Deploy Instructions:
    echo    1. Commit your changes: git add . && git commit -m "Update website"
    echo    2. Push to GitHub: git push origin fresh-project-migration
    echo    3. Amplify will automatically build and deploy (3-5 minutes)
    echo    4. Monitor at: https://console.aws.amazon.com/amplify/
    echo.
    echo 💡 This is the recommended method - no manual steps needed!
    echo.
    pause
    exit /b 0
)

if "%choice%"=="2" (
    echo.
    echo 📋 Manual deployment...
    cd infrastructure
    call manual-deploy.bat
    cd ..
    exit /b 0
)

if "%choice%"=="3" (
    echo.
    echo 📋 Setting up infrastructure...
    cd infrastructure
    call deploy-amplify.bat
    cd ..
    exit /b 0
)

echo ❌ Invalid choice. Please run again and select 1, 2, or 3.
pause