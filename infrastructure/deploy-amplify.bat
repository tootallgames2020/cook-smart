@echo off
echo Deploying Cook Smart Website Infrastructure...

echo.
echo IMPORTANT: This will replace the current broken CloudFront setup
echo    with a proper AWS Amplify hosting solution.
echo.
echo    This script will:
echo    1. Delete the broken CloudFront distribution
echo    2. Clean up the S3 bucket
echo    3. Deploy new Amplify infrastructure
echo    4. Set up proper domain routing
echo.
set /p confirm="Continue? (y/N): "
if /i not "%confirm%"=="y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo Step 1: Cleaning up broken CloudFront setup...

echo   - Getting current CloudFront distribution...
aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='Cook Smart Website'].Id" --output text > temp_dist_id.txt
set /p DIST_ID=<temp_dist_id.txt
del temp_dist_id.txt

if not "%DIST_ID%"=="" (
    echo   - Found distribution: %DIST_ID%
    echo   - Disabling distribution...
    aws cloudfront get-distribution-config --id %DIST_ID% --query "DistributionConfig" > temp-dist-config.json
    
    REM Update the config to disable the distribution
    powershell -Command "(Get-Content temp-dist-config.json | ConvertFrom-Json) | ForEach-Object { $_.Enabled = $false } | ConvertTo-Json -Depth 10 | Out-File temp-dist-config-disabled.json -Encoding UTF8"
    
    echo   - Updating distribution to disabled state...
    aws cloudfront get-distribution-config --id %DIST_ID% --query "ETag" --output text > temp_etag.txt
    set /p ETAG=<temp_etag.txt
    del temp_etag.txt
    aws cloudfront update-distribution --id %DIST_ID% --distribution-config file://temp-dist-config-disabled.json --if-match %ETAG%
    
    echo   - Waiting for distribution to be disabled (this may take 10-15 minutes)...
    aws cloudfront wait distribution-deployed --id %DIST_ID%
    
    echo   - Deleting distribution...
    aws cloudfront get-distribution-config --id %DIST_ID% --query "ETag" --output text > temp_etag2.txt
    set /p ETAG=<temp_etag2.txt
    del temp_etag2.txt
    aws cloudfront delete-distribution --id %DIST_ID% --if-match %ETAG%
    
    del temp-dist-config.json temp-dist-config-disabled.json
    echo   - CloudFront distribution cleaned up
) else (
    echo   - No CloudFront distribution found to clean up
)

echo.
echo Step 2: Cleaning up S3 bucket...
echo   - Emptying S3 bucket...
aws s3 rm s3://cooksmartapp-website --recursive
echo   - Deleting S3 bucket...
aws s3 rb s3://cooksmartapp-website --force
echo   - S3 bucket cleaned up

echo.
echo Step 3: Deploying new Amplify infrastructure...
echo   - Creating CloudFormation stack...
aws cloudformation deploy ^
    --template-file amplify-setup.yml ^
    --stack-name cook-smart-website ^
    --capabilities CAPABILITY_IAM ^
    --parameter-overrides ^
        GitHubRepo=https://github.com/YOUR_USERNAME/cook-smart ^
        GitHubBranch=fresh-project-migration

if %errorlevel% neq 0 (
    echo Infrastructure deployment failed!
    pause
    exit /b 1
)

echo   - Infrastructure deployed successfully

echo.
echo Step 4: Getting deployment information...
aws cloudformation describe-stacks --stack-name cook-smart-website --query "Stacks[0].Outputs[?OutputKey=='AmplifyAppId'].OutputValue" --output text > temp_app_id.txt
set /p APP_ID=<temp_app_id.txt
del temp_app_id.txt

aws cloudformation describe-stacks --stack-name cook-smart-website --query "Stacks[0].Outputs[?OutputKey=='AmplifyAppUrl'].OutputValue" --output text > temp_app_url.txt
set /p APP_URL=<temp_app_url.txt
del temp_app_url.txt

echo.
echo Deployment Complete!
echo.
echo Infrastructure Details:
echo    • Amplify App ID: %APP_ID%
echo    • Temporary URL: %APP_URL%
echo    • Final URL: https://cooksmartapp.com
echo.
echo Next Steps:
echo    1. Connect your GitHub repository to Amplify
echo    2. Verify the domain DNS settings
echo    3. Trigger the first build
echo.
echo Open Amplify Console:
echo    https://console.aws.amazon.com/amplify/home#/apps/%APP_ID%
echo.

pause