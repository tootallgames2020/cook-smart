@echo off
echo ========================================
echo Cook Smart - Deployment Status Check
echo ========================================
echo.

echo ========================================
echo Backend Status (API Server)
echo ========================================
echo.

echo Testing backend health...
curl -s -w "Response Time: %%{time_total}s | HTTP Status: %%{http_code}\n" https://api.cooksmartapp.com/health
echo.

echo Checking PM2 service status on server...
ssh -i "c:\Users\toota\.ssh\cook-smart-key.pem" ubuntu@34.203.8.150 "
    echo '📊 PM2 Status:'
    pm2 status cook-smart-backend
    echo ''
    echo '📋 Recent Logs (last 10 lines):'
    pm2 logs cook-smart-backend --lines 10 --nostream
    echo ''
    echo '💾 Server Resources:'
    free -h | head -2
    df -h / | tail -1
"

echo.
echo ========================================
echo Website Status (Amplify)
echo ========================================
echo.

echo Latest deployment status:
aws amplify list-jobs --app-id d1766n6qply87y --branch-name fresh-project-migration --max-results 3 --query "jobSummaries[].[jobId,status,startTime,endTime]" --output table

echo.
echo App configuration:
aws amplify get-app --app-id d1766n6qply87y --query "app.[name,defaultDomain,repository]" --output table

echo.
echo Testing website...
curl -s -I https://cooksmartapp.com | head -1

echo.
echo ========================================
echo Quick Health Summary
echo ========================================
echo.

echo 🔗 API Health: 
curl -s https://api.cooksmartapp.com/health | head -1
echo.

echo 🔗 Website Status:
curl -s -o /dev/null -w "HTTP %%{http_code} | Time: %%{time_total}s\n" https://cooksmartapp.com

echo.
echo ========================================
echo Status Check Complete
echo ========================================
echo.
echo If you see any issues above:
echo - For backend: Use deploy-backend-improved.bat
echo - For website: Use deploy-website-improved.bat
echo - For both: Use deploy-all.bat
echo.
pause