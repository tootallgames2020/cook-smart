@echo off
echo ========================================
echo COOK SMART WEBSITE DEPLOYMENT
echo ========================================
echo.

echo Step 1: Building website...
cd website
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)
cd ..

echo.
echo Step 2: Deploying static assets to S3...
aws s3 sync website/out/ s3://cooksmartapp-website --delete --cache-control "public, max-age=31536000, immutable" --exclude "*.html" --exclude "*.xml" --exclude "*.txt"

echo.
echo Step 3: Deploying HTML files to S3...
aws s3 sync website/out/ s3://cooksmartapp-website --delete --cache-control "public, max-age=0, must-revalidate" --include "*.html" --include "*.xml" --include "*.txt"

echo.
echo Step 4: Invalidating CloudFront cache...
aws cloudfront create-invalidation --distribution-id E31XPFYZVQELB6 --paths "/*"

echo.
echo ✅ DEPLOYMENT COMPLETE!
echo.
echo Website will be live at https://cooksmartapp.com in 1-2 minutes
echo Contact form now uses Formspree for beta signups
echo.
pause