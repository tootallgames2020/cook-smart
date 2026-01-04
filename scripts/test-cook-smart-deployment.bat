@echo off
echo ========================================
echo Cook Smart Deployment Test
echo ========================================
echo.
echo This script tests the deployed Cook Smart API to ensure it's working correctly.
echo.

REM Get the server IP
for /f "tokens=*" %%i in ('aws ec2 describe-addresses --filters "Name=tag:Name,Values=cook-smart-backend-eip-v2" --query "Addresses[0].PublicIp" --output text') do set SERVER_IP=%%i

if "%SERVER_IP%"=="None" (
    echo ERROR: Could not find server IP
    pause
    exit /b 1
)

echo Server IP: %SERVER_IP%
echo Testing API endpoints...
echo.

echo ========================================
echo TEST 1: Health Check
echo ========================================
echo.
echo Testing HTTP health endpoint...
curl -s -w "HTTP Status: %%{http_code}\n" http://%SERVER_IP%/health
echo.

echo Testing HTTPS health endpoint...
curl -s -w "HTTP Status: %%{http_code}\n" https://api.cooksmartapp.com/health
echo.

echo ========================================
echo TEST 2: FatSecret Integration
echo ========================================
echo.
echo Testing FatSecret authentication...
curl -s -w "HTTP Status: %%{http_code}\n" -X POST -H "Content-Type: application/json" https://api.cooksmartapp.com/test/fatsecret-auth
echo.

echo ========================================
echo TEST 3: Barcode Scanning
echo ========================================
echo.
echo Testing barcode scan with sample barcode...
curl -s -w "HTTP Status: %%{http_code}\n" -X POST -H "Content-Type: application/json" -d "{\"barcode\":\"041196912586\"}" https://api.cooksmartapp.com/barcode/scan
echo.

echo ========================================
echo TEST 4: Recipe Search
echo ========================================
echo.
echo Testing recipe search...
curl -s -w "HTTP Status: %%{http_code}\n" -X POST -H "Content-Type: application/json" -d "{\"ingredients\":[\"chicken\",\"rice\"]}" https://api.cooksmartapp.com/recipes/search
echo.

echo ========================================
echo TEST 5: Server Status
echo ========================================
echo.
echo Checking server status via SSH...
ssh -i ~/.ssh/cook-smart-key.pem -o StrictHostKeyChecking=no ubuntu@%SERVER_IP% "sudo su - cook-smart -c './status.sh'"

echo.
echo ========================================
echo TEST COMPLETE
echo ========================================
echo.
echo If all tests show HTTP Status 200 and return data, your deployment is successful!
echo.
echo If tests fail:
echo 1. Check that FatSecret credentials are configured in .env file
echo 2. Restart the application: pm2 restart cook-smart-backend
echo 3. Check logs: pm2 logs cook-smart-backend
echo.
pause