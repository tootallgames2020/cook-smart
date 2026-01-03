@echo off
echo 🔗 Setting up GitHub Connection for Amplify...

echo.
echo This script will help you connect your GitHub repository to AWS Amplify.
echo.
echo ⚠️  You'll need:
echo    1. Your GitHub repository URL
echo    2. GitHub personal access token (with repo permissions)
echo    3. The Amplify App ID from the previous deployment
echo.

set /p repo_url="Enter your GitHub repository URL: "
set /p github_token="Enter your GitHub personal access token: "
set /p app_id="Enter your Amplify App ID: "

echo.
echo 📋 Connecting GitHub repository to Amplify...

REM Create the GitHub connection
aws amplify create-app ^
    --name "cook-smart-website" ^
    --repository %repo_url% ^
    --access-token %github_token% ^
    --oauth-token %github_token%

if %errorlevel% neq 0 (
    echo ❌ Failed to connect GitHub repository!
    echo.
    echo 💡 Manual Setup Instructions:
    echo    1. Go to AWS Amplify Console
    echo    2. Select your app: %app_id%
    echo    3. Go to "App settings" > "General"
    echo    4. Click "Connect repository"
    echo    5. Select GitHub and authorize
    echo    6. Choose your repository and branch
    echo.
    pause
    exit /b 1
)

echo ✅ GitHub repository connected successfully!

echo.
echo 📋 Triggering initial build...
aws amplify start-job --app-id %app_id% --branch-name fresh-project-migration --job-type RELEASE

echo.
echo ✅ Build started! 
echo.
echo 🔗 Monitor build progress:
echo    https://console.aws.amazon.com/amplify/home#/apps/%app_id%
echo.
echo ⏱️  Build typically takes 3-5 minutes
echo    Your site will be live at https://cooksmartapp.com once complete
echo.

pause