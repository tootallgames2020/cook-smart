@echo off
echo 🔧 Backend Fix - Step by Step
echo ==============================

echo.
echo Step 1: Stop all processes
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters commands="pm2 delete all"

echo.
echo Step 2: Copy environment file
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters commands="cd /home/ubuntu/cook-smart/backend/backend && cp .env.example .env"

echo.
echo Step 3: Set database host
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters commands="cd /home/ubuntu/cook-smart/backend/backend && sed -i 's/your-database-host/cook-smart-db-beta.cgfwigy2i9lk.us-east-1.rds.amazonaws.com/g' .env"

echo.
echo Step 4: Set database user
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters commands="cd /home/ubuntu/cook-smart/backend/backend && sed -i 's/your-db-user/cooksmartadmin/g' .env"

echo.
echo Step 5: Set database password
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters commands="cd /home/ubuntu/cook-smart/backend/backend && sed -i 's/your-db-password/CookSmart2024!/g' .env"

echo.
echo Step 6: Start backend server
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters commands="cd /home/ubuntu/cook-smart/backend/backend && pm2 start dist/server.js --name cook-smart-backend"

echo.
echo Waiting 20 seconds for server to start...
timeout /t 20 /nobreak > nul

echo.
echo Testing health endpoint...
curl -s https://api.cooksmartapp.com/health

echo.
echo Testing auth endpoint...
curl -X POST -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"test\"}" https://api.cooksmartapp.com/api/v1/auth/login