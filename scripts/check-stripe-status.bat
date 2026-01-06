@echo off
REM ============================================================================
REM Cook Smart - Stripe Status Check Script
REM ============================================================================
REM This script checks the current Stripe configuration and key status
REM Usage: check-stripe-status.bat
REM ============================================================================

echo.
echo 🔍 Cook Smart - Stripe Status Check
echo ==================================
echo.

echo 📡 Connecting to server...
echo.

REM Check if backend is running
echo 🔍 Backend Service Status:
ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "pm2 status cook-smart-backend"
echo.

REM Check current Stripe configuration (masked for security)
echo 🔑 Current Stripe Configuration:
ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "cd /home/ubuntu/cook-smart/backend && grep '^STRIPE_' .env | sed 's/\(.*=.*\)\(.\{4\}\)$/\1****\2/g'"
echo.

REM Test API health
echo 🏥 API Health Check:
curl -s https://api.cooksmartapp.com/health
echo.
echo.

REM Check recent logs for Stripe-related errors
echo 📋 Recent Stripe-related logs (last 50 lines):
ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "pm2 logs cook-smart-backend --lines 50 | grep -i stripe || echo 'No Stripe-related logs found'"
echo.

REM List available backups
echo 💾 Available Configuration Backups:
ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "cd /home/ubuntu/cook-smart/backend && ls -la .env.backup.* 2>/dev/null | tail -5 || echo 'No backups found'"
echo.

echo ✅ Status check complete
echo.
pause