@echo off
echo 🔧 Simple Backend Fix - Individual Commands
echo ===========================================

echo.
echo Step 1: Stop all PM2 processes
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=pm2 delete all"

echo.
echo Step 2: Copy environment template
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=cd /home/ubuntu/cook-smart/backend/backend && cp .env.example .env"

echo.
echo Step 3: Set database host
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=cd /home/ubuntu/cook-smart/backend/backend && echo 'DB_HOST=cook-smart-db-beta.cgfwigy2i9lk.us-east-1.rds.amazonaws.com' >> .env"

echo.
echo Step 4: Set database credentials
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=cd /home/ubuntu/cook-smart/backend/backend && echo 'DB_USER=cooksmartadmin' >> .env && echo 'DB_PASSWORD=CookSmart2024!' >> .env"

echo.
echo Step 5: Pull latest code
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=cd /home/ubuntu/cook-smart/backend/backend && git pull origin fresh-project-migration"

echo.
echo Step 6: Install dependencies
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=cd /home/ubuntu/cook-smart/backend/backend && npm install"

echo.
echo Step 7: Build TypeScript
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=cd /home/ubuntu/cook-smart/backend/backend && npm run build"

echo.
echo Step 8: Start backend server
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=cd /home/ubuntu/cook-smart/backend/backend && pm2 start dist/server.js --name cook-smart-backend"

echo.
echo Waiting 30 seconds for server to start...
timeout /t 30 /nobreak > nul

echo.
echo Step 9: Test health endpoint
curl -s https://api.cooksmartapp.com/health

echo.
echo Step 10: Test auth endpoint
curl -X POST -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"test\"}" https://api.cooksmartapp.com/api/v1/auth/login

echo.
echo ✅ Simple fix complete!