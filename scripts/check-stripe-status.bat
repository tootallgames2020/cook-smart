@echo off
echo ========================================
echo Cook Smart - Stripe Status Check
echo ========================================
echo.

cd backend
node scripts/check-stripe-status.js

echo.
echo ========================================
echo Status check complete!
echo ========================================
pause