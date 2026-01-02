@echo off
echo ========================================
echo EMERGENCY DEPLOYMENT - Cook Smart
echo ========================================
echo.
echo ⚠️  WARNING: This is for emergency fixes only!
echo This will force deploy both backend and website.
echo.

set /p emergency="Is this an emergency deployment? (yes/no): "
if /i not "%emergency%"=="yes" (
    echo Emergency deployment cancelled.
    echo Use deploy-all.bat for normal deployments.
    pause
    exit /b
)

echo.
echo 🚨 EMERGENCY DEPLOYMENT STARTING...
echo.

echo ========================================
echo Step 1: Force Backend Deployment
echo ========================================
echo.

ssh -i "c:\Users\toota\.ssh\cook-smart-key.pem" ubuntu@34.203.8.150 "
    cd /home/ubuntu/cook-smart/backend/backend
    echo '🚨 Emergency backend deployment...'
    git stash
    git clean -fd
    git pull origin fresh-project-migration --force
    npm install --production
    pm2 restart cook-smart-backend
    pm2 status cook-smart-backend
    echo '✅ Emergency backend deployment complete!'
"

echo.
echo ========================================
echo Step 2: Force Website Deployment
echo ========================================
echo.

echo Updating Amplify environment variables...
aws amplify update-app --app-id d1766n6qply87y --environment-variables "AMPLIFY_DIFF_DEPLOY=false,AMPLIFY_MONOREPO_APP_ROOT=website,NEXT_PUBLIC_API_URL=https://api.cooksmartapp.com,NEXT_PUBLIC_SITE_URL=https://cooksmartapp.com"

echo.
echo Starting emergency website deployment...
aws amplify start-job --app-id d1766n6qply87y --branch-name fresh-project-migration --job-type RELEASE

echo.
echo ========================================
echo Emergency Deployment Complete
echo ========================================
echo.
echo ✅ Backend: Force deployed and restarted
echo 🔄 Website: Emergency deployment started
echo.
echo 🔗 API: https://api.cooksmartapp.com
echo 🔗 Website: https://cooksmartapp.com
echo.
echo ⏰ Website deployment will complete in 3-5 minutes.
echo Use check-status-complete.bat to verify everything is working.
echo.
pause