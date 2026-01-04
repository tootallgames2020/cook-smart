@echo off
echo 🚨 Emergency Backend Fix - Simplified Approach
echo ================================================

echo.
echo Step 1: Stop all processes
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=pm2 delete all"

echo.
echo Step 2: Navigate to backend directory
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=cd /home/ubuntu/cook-smart/backend/backend"

echo.
echo Step 3: Copy environment file
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=cd /home/ubuntu/cook-smart/backend/backend && cp .env.example .env"

echo.
echo Step 4: Create proper environment file with cat
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=cd /home/ubuntu/cook-smart/backend/backend && cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
APP_URL=https://cooksmartapp.com
API_URL=https://api.cooksmartapp.com
DB_HOST=cook-smart-db-beta.cgfwigy2i9lk.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=cooksmartdb
DB_USER=cooksmartadmin
DB_PASSWORD=CookSmart2024!
JWT_SECRET=cook-smart-jwt-secret-production-2024-secure-key
JWT_EXPIRES_IN=90d
FATSECRET_CLIENT_ID=your-fatsecret-client-id
FATSECRET_CLIENT_SECRET=your-fatsecret-client-secret
FATSECRET_BASE_URL=https://platform.fatsecret.com/rest/server.api
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=Cook Smart <noreply@cooksmartapp.com>
DISCORD_WEBHOOK_URL=your-discord-webhook-url
DISCORD_ERROR_WEBHOOK_URL=your-discord-error-webhook-url
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
MAX_FILE_SIZE=10485760
UPLOAD_PATH=uploads/
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
LOG_FILE=logs/app.log
ENABLE_CACHING=true
ENABLE_RATE_LIMITING=true
ENABLE_CORS=true
ENABLE_COMPRESSION=true
EOF"

echo.
echo Waiting 10 seconds for environment setup...
timeout /t 10 /nobreak > nul

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
echo Waiting 20 seconds for server to start...
timeout /t 20 /nobreak > nul

echo.
echo Step 9: Check PM2 status
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=pm2 status"

echo.
echo Step 10: Check logs
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=pm2 logs cook-smart-backend --lines 20"

echo.
echo Step 11: Test health endpoint
curl -s https://api.cooksmartapp.com/health

echo.
echo Step 12: Test auth endpoint
curl -X POST -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"test\"}" https://api.cooksmartapp.com/api/v1/auth/login

echo.
echo ✅ Emergency fix complete!
echo If still getting 502, the issue is likely with nginx or the server process.