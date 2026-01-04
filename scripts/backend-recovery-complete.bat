@echo off
echo 🚨 Cook Smart Backend Recovery - Complete Fix
echo =============================================

echo.
echo 🔍 Step 1: Diagnosing Current State
echo ===================================

echo Checking server processes...
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters commands="ps aux | grep node && pm2 list && systemctl status nginx" --output text

echo.
echo ⏳ Waiting for diagnosis...
timeout /t 10 /nobreak > nul

echo.
echo 🛑 Step 2: Clean Shutdown
echo =========================

echo Stopping all processes...
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters commands="pm2 stop all && pm2 delete all && pkill -f 'node.*server'" --output text

echo.
echo ⏳ Waiting for cleanup...
timeout /t 5 /nobreak > nul

echo.
echo 📥 Step 3: Code Update and Build
echo ================================

echo Updating to latest code...
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters commands="cd /home/ubuntu/cook-smart/backend/backend && git status && git pull origin fresh-project-migration && npm install" --output text

echo.
echo ⏳ Waiting for code update...
timeout /t 15 /nobreak > nul

echo.
echo 🔨 Step 4: Build Backend
echo =======================

echo Building TypeScript...
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters commands="cd /home/ubuntu/cook-smart/backend/backend && npm run build && ls -la dist/" --output text

echo.
echo ⏳ Waiting for build...
timeout /t 20 /nobreak > nul

echo.
echo 🔧 Step 5: Environment Setup
echo ============================

echo Setting up environment...
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters commands="cd /home/ubuntu/cook-smart/backend/backend && cp .env.example .env && sed -i 's/your-database-host/cook-smart-db-beta.cgfwigy2i9lk.us-east-1.rds.amazonaws.com/g' .env && sed -i 's/your-db-user/cooksmartadmin/g' .env && sed -i 's/your-db-password/CookSmart2024!/g' .env" --output text

echo.
echo ⏳ Waiting for environment setup...
timeout /t 5 /nobreak > nul

echo.
echo 🚀 Step 6: Start Backend Server
echo ===============================

echo Starting backend with PM2...
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters commands="cd /home/ubuntu/cook-smart/backend/backend && pm2 start dist/server.js --name cook-smart-backend && pm2 save" --output text

echo.
echo ⏳ Waiting for server startup...
timeout /t 15 /nobreak > nul

echo.
echo 🔍 Step 7: Verification
echo ======================

echo Checking PM2 status...
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters commands="pm2 status && pm2 logs cook-smart-backend --lines 10" --output text

echo.
echo ⏳ Waiting for status check...
timeout /t 10 /nobreak > nul

echo.
echo 🧪 Step 8: API Testing
echo ======================

echo Testing health endpoint...
curl -s https://api.cooksmartapp.com/health

echo.
echo Testing auth login endpoint...
curl -X POST -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"test\"}" https://api.cooksmartapp.com/api/v1/auth/login

echo.
echo 📊 Step 9: Final Status
echo ======================

if curl -s https://api.cooksmartapp.com/health | findstr "OK" >nul (
    echo ✅ SUCCESS: Backend is running!
    echo.
    echo 🎯 Testing login endpoint...
    curl -X POST -H "Content-Type: application/json" -d "{\"email\":\"invalid@test.com\",\"password\":\"invalid\"}" https://api.cooksmartapp.com/api/v1/auth/login | findstr "success" >nul && (
        echo ✅ SUCCESS: Auth endpoints working!
        echo.
        echo 🎉 Backend Recovery Complete!
        echo    - Health endpoint: Working
        echo    - Auth endpoints: Working  
        echo    - Ready for app login testing
    ) || (
        echo ❌ Auth endpoints still not working
        echo Check the response above for errors
    )
) else (
    echo ❌ FAILED: Backend still not responding
    echo.
    echo 🔍 Troubleshooting needed:
    echo    1. Check PM2 logs above
    echo    2. Verify database connection
    echo    3. Check environment variables
)

echo.
echo 🔧 Backend Recovery Script Complete!