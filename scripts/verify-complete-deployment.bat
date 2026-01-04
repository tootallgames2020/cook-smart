@echo off
echo 🔍 Cook Smart Complete Deployment Verification
echo ===============================================

echo.
echo 📊 Backend Server Status
echo ========================

echo Checking EC2 instance status...
aws ec2 describe-instances --instance-ids "i-0e2c8623378f172c8" --query "Reservations[0].Instances[0].[State.Name,PublicIpAddress]" --output table

echo.
echo 🌐 API Connectivity Tests
echo =========================

echo 1. HTTPS Health Check:
curl -s -w "   Status: %%{http_code} | Time: %%{time_total}s | Size: %%{size_download} bytes\n" https://api.cooksmartapp.com/health

echo.
echo 2. HTTP Redirect Test:
curl -s -w "   Status: %%{http_code} (should be 301)\n" -o nul http://api.cooksmartapp.com/health

echo.
echo 3. SSL Certificate Info:
curl -I https://api.cooksmartapp.com/health | findstr "HTTP\|Server\|Strict-Transport-Security\|Date"

echo.
echo 4. API Response Content:
curl -s https://api.cooksmartapp.com/health | jq . 2>nul || curl -s https://api.cooksmartapp.com/health

echo.
echo 🔒 SSL Security Verification
echo ============================

echo Checking SSL certificate details...
openssl s_client -connect api.cooksmartapp.com:443 -servername api.cooksmartapp.com < nul 2>nul | findstr "subject\|issuer\|Verify return code" 2>nul || echo "OpenSSL not available - using curl instead"

echo.
echo 📱 Mobile App Configuration
echo ===========================

echo Current API configuration:
findstr "API_BASE_URL" src\config\api.ts

echo.
echo Current app version:
findstr "versionCode\|versionName" android\app\build.gradle

echo.
echo 🔧 Backend Process Status
echo =========================

echo Checking PM2 processes on server...
aws ssm send-command ^
    --instance-ids "i-0e2c8623378f172c8" ^
    --document-name "AWS-RunShellScript" ^
    --parameters "commands=['pm2 status', 'pm2 logs cook-smart-backend --lines 5']" ^
    --output table

echo.
echo ⏳ Waiting for PM2 status check...
timeout /t 10 /nobreak > nul

echo.
echo 🧪 API Endpoint Tests
echo ====================

echo Testing authentication endpoint...
curl -s -w "Auth endpoint: %%{http_code}\n" -o nul https://api.cooksmartapp.com/api/v1/auth/me

echo Testing recipes endpoint...
curl -s -w "Recipes endpoint: %%{http_code}\n" -o nul https://api.cooksmartapp.com/api/v1/recipes

echo Testing barcode endpoint...
curl -s -w "Barcode endpoint: %%{http_code}\n" -o nul https://api.cooksmartapp.com/api/v1/barcode/scan

echo.
echo 📦 APK Build Readiness
echo ======================

if exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo ✅ APK exists from previous build
    for %%I in ("android\app\build\outputs\apk\release\app-release.apk") do (
        echo    Size: %%~zI bytes
        echo    Modified: %%~tI
    )
) else (
    echo ⚠️  No APK found - ready for fresh build
)

echo.
echo 🎯 Deployment Health Summary
echo ============================

set /a SCORE=0

REM Test HTTPS API
curl -s https://api.cooksmartapp.com/health | findstr "OK" >nul && (
    echo ✅ HTTPS API: Working
    set /a SCORE+=1
) || (
    echo ❌ HTTPS API: Failed
)

REM Test HTTP redirect
curl -s -w "%%{http_code}" -o nul http://api.cooksmartapp.com/health | findstr "301" >nul && (
    echo ✅ HTTP Redirect: Working
    set /a SCORE+=1
) || (
    echo ❌ HTTP Redirect: Failed
)

REM Check SSL headers
curl -I https://api.cooksmartapp.com/health | findstr "Strict-Transport-Security" >nul && (
    echo ✅ SSL Security: Enabled
    set /a SCORE+=1
) || (
    echo ❌ SSL Security: Missing
)

REM Check app configuration
findstr "https://api.cooksmartapp.com" src\config\api.ts >nul && (
    echo ✅ App Config: HTTPS Enabled
    set /a SCORE+=1
) || (
    echo ❌ App Config: Not HTTPS
)

echo.
echo 📊 Health Score: %SCORE%/4

if %SCORE% EQU 4 (
    echo 🎉 All systems operational - Ready for APK build!
    echo.
    echo 🚀 To build APK: scripts\build-ssl-apk.bat
) else (
    echo ⚠️  Some issues detected - Review above results
    echo.
    echo 🔧 To fix issues: scripts\complete-fresh-deployment.bat
)

echo.
echo 📋 Quick Commands:
echo    Fresh deployment: scripts\complete-fresh-deployment.bat
echo    Build APK:        scripts\build-ssl-apk.bat
echo    Verify again:     scripts\verify-complete-deployment.bat