@echo off
echo 🔧 Cook Smart Backend Auth Fix
echo ==============================

echo.
echo 🚨 Issue: Login endpoint returning "Cannot POST /api/v1/auth/login"
echo 💡 Solution: Deploy latest backend code and restart server
echo.

echo 📡 Step 1: Deploying Latest Backend Code
echo =========================================

aws ssm send-command ^
    --instance-ids "i-0e2c8623378f172c8" ^
    --document-name "AWS-RunShellScript" ^
    --parameters "commands=['cd /home/ubuntu/cook-smart/backend/backend','echo \"📥 Pulling latest changes...\"','git pull origin fresh-project-migration','echo \"📦 Installing dependencies...\"','npm install','echo \"🔨 Building TypeScript...\"','npm run build','echo \"✅ Backend code updated\"']" ^
    --output table

echo.
echo ⏳ Waiting for code deployment...
timeout /t 30 /nobreak > nul

echo.
echo 🔄 Step 2: Restarting Backend Server
echo ====================================

aws ssm send-command ^
    --instance-ids "i-0e2c8623378f172c8" ^
    --document-name "AWS-RunShellScript" ^
    --parameters "commands=['cd /home/ubuntu/cook-smart/backend/backend','echo \"🔄 Restarting PM2 processes...\"','pm2 restart cook-smart-backend','echo \"📊 PM2 Status:\"','pm2 status','echo \"📝 Recent logs:\"','pm2 logs cook-smart-backend --lines 10']" ^
    --output table

echo.
echo ⏳ Waiting for server restart...
timeout /t 20 /nobreak > nul

echo.
echo 🧪 Step 3: Testing Auth Endpoints
echo =================================

echo Testing health endpoint...
curl -s https://api.cooksmartapp.com/health | findstr "status" || echo "Health check failed"

echo.
echo Testing auth login endpoint...
curl -X POST -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\",\"password\":\"test123\"}" https://api.cooksmartapp.com/api/v1/auth/login

echo.
echo 📊 Step 4: Verification Results
echo ===============================

echo If you see a proper JSON response (not HTML error), the fix worked!
echo Expected response: {"success":false,"message":"Invalid email or password"}
echo.
echo 🎯 Next Steps:
echo    1. Try logging into the app again
echo    2. If still failing, check app logs for more details
echo    3. Report any remaining issues

echo.
echo 🔧 Backend Auth Fix Complete!