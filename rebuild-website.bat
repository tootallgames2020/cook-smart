@echo off
echo Cook Smart Website - Complete Rebuild
echo.
echo This script will completely rebuild your website infrastructure
echo using AWS Amplify (the right way this time!)
echo.
echo IMPORTANT: This will replace the broken CloudFront setup
echo.

set /p confirm="Ready to rebuild? This will take 15-30 minutes (y/N): "
if /i not "%confirm%"=="y" (
    echo Cancelled. No changes made.
    pause
    exit /b 0
)

echo.
echo Starting complete rebuild...
echo.

REM Step 1: Deploy infrastructure
echo Step 1: Deploying AWS Amplify infrastructure...
cd infrastructure
call deploy-amplify.bat
if %errorlevel% neq 0 (
    echo Infrastructure deployment failed!
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo Infrastructure deployed successfully!
echo.

REM Step 2: Instructions for GitHub connection
echo Step 2: Connect GitHub Repository
echo.
echo You now need to connect your GitHub repository to Amplify.
echo.
echo Option A - Automatic (if you have a GitHub token):
echo    cd infrastructure
echo    setup-github-connection.bat
echo.
echo Option B - Manual (recommended):
echo    1. Go to: https://console.aws.amazon.com/amplify/
echo    2. Find your "cook-smart-website" app
echo    3. Click "Connect repository"
echo    4. Select GitHub and authorize
echo    5. Choose your repository and "fresh-project-migration" branch
echo    6. Click "Save and deploy"
echo.

set /p setup_choice="Setup GitHub connection now? (1=Automatic, 2=Manual, 3=Skip): "

if "%setup_choice%"=="1" (
    cd infrastructure
    call setup-github-connection.bat
    cd ..
)

if "%setup_choice%"=="2" (
    echo.
    echo Opening AWS Amplify Console...
    start https://console.aws.amazon.com/amplify/
    echo.
    echo Follow the manual setup instructions above.
    echo.
)

echo.
echo Rebuild Complete!
echo.
echo What's Changed:
echo    - Broken CloudFront setup removed
echo    - AWS Amplify infrastructure deployed
echo    - Proper Next.js static hosting configured
echo    - Custom domain routing set up
echo    - Auto-deploy from GitHub enabled
echo.
echo Your website will be available at:
echo    • https://cooksmartapp.com (once DNS is configured)
echo    • Amplify temporary URL (check console)
echo.
echo Next Steps:
echo    1. Verify GitHub connection in Amplify Console
echo    2. Check domain DNS settings if needed
echo    3. Push changes to GitHub - they'll auto-deploy!
echo.
echo Future deployments: Just push to GitHub!
echo    No more manual deployment scripts needed.
echo.

pause