@echo off
echo ========================================
echo Cook Smart - Website Deployment
echo ========================================
echo.

echo Target: AWS Amplify (cooksmartapp.com)
echo App ID: d1766n6qply87y
echo Branch: fresh-project-migration
echo.

set /p confirm="Deploy website now? (y/n): "
if /i not "%confirm%"=="y" (
    echo Deployment cancelled.
    pause
    exit /b
)

echo.
echo 🚀 Starting website deployment...
echo.

echo Checking current deployment status...
aws amplify list-jobs --app-id d1766n6qply87y --branch-name fresh-project-migration --max-results 1 --query "jobSummaries[0].[jobId,status,startTime]" --output table
echo.

echo Starting new deployment...
aws amplify start-job --app-id d1766n6qply87y --branch-name fresh-project-migration --job-type RELEASE --query "jobSummary.[jobId,status,startTime]" --output table

if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to start website deployment!
    echo Check your AWS credentials and try again.
    pause
    exit /b 1
)

echo.
echo ✅ Website deployment started successfully!
echo.

echo ========================================
echo Monitoring Deployment Progress
echo ========================================
echo.

echo Deployment typically takes 3-5 minutes.
echo You can monitor progress with the following commands:
echo.
echo Check status:
echo aws amplify list-jobs --app-id d1766n6qply87y --branch-name fresh-project-migration --max-results 1
echo.
echo Get detailed logs:
echo aws amplify get-job --app-id d1766n6qply87y --branch-name fresh-project-migration --job-id [JOB_ID]
echo.

set /p wait="Wait and check status now? (y/n): "
if /i "%wait%"=="y" (
    echo.
    echo Waiting 2 minutes for deployment to progress...
    timeout /t 120 /nobreak > nul
    
    echo.
    echo Current deployment status:
    aws amplify list-jobs --app-id d1766n6qply87y --branch-name fresh-project-migration --max-results 1 --query "jobSummaries[0].[jobId,status,startTime,endTime]" --output table
)

echo.
echo ========================================
echo Website Deployment Summary
echo ========================================
echo 🔄 Deployment initiated successfully
echo 🔗 Website URL: https://cooksmartapp.com
echo 📊 Monitor: AWS Amplify Console
echo.
echo Note: Website deployment takes 3-5 minutes to complete.
echo Check the status in a few minutes to confirm success.
echo.
pause