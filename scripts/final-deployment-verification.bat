@echo off
echo ========================================
echo FINAL DEPLOYMENT VERIFICATION
echo ========================================
echo.
echo Running comprehensive checks before deployment...
echo.

set ERROR_COUNT=0

echo ========================================
echo CHECK 1: TypeScript Compilation
echo ========================================
echo.
echo Checking frontend TypeScript...
npx tsc --noEmit
if %errorlevel% neq 0 (
    echo ❌ Frontend TypeScript errors found!
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Frontend TypeScript: 0 errors
)

echo.
echo Checking backend TypeScript...
cd backend
npx tsc --noEmit
if %errorlevel% neq 0 (
    echo ❌ Backend TypeScript errors found!
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Backend TypeScript: 0 errors
)
cd ..

echo.
echo ========================================
echo CHECK 2: ESLint Validation
echo ========================================
echo.
npx eslint src/ App.tsx --max-warnings 0
if %errorlevel% neq 0 (
    echo ❌ ESLint errors found!
    set /a ERROR_COUNT+=1
) else (
    echo ✅ ESLint: 0 errors
)

echo.
echo ========================================
echo CHECK 3: Critical Files Exist
echo ========================================
echo.

set CRITICAL_FILES=App.tsx src/screens/HomeScreen.tsx src/screens/CoFounderWelcomeScreen.tsx backend/src/server.ts backend/src/routes/auth.ts backend/migrations/000_complete_database_setup.sql backend/migrations/001_insert_special_users.sql scripts/deploy-cook-smart-budget.bat scripts/upload-codebase.bat

for %%f in (%CRITICAL_FILES%) do (
    if exist "%%f" (
        echo ✅ %%f
    ) else (
        echo ❌ MISSING: %%f
        set /a ERROR_COUNT+=1
    )
)

echo.
echo ========================================
echo CHECK 4: AWS CLI Configuration
echo ========================================
echo.
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AWS CLI not configured!
    set /a ERROR_COUNT+=1
) else (
    echo ✅ AWS CLI configured
    echo Account: 
    aws sts get-caller-identity --query "Account" --output text
)

echo.
echo ========================================
echo CHECK 5: Database Schema Validation
echo ========================================
echo.

findstr /C:"CREATE TABLE.*users" backend\migrations\000_complete_database_setup.sql >nul
if %errorlevel% neq 0 (
    echo ❌ Users table not found in schema!
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Users table defined
)

findstr /C:"is_creator" backend\migrations\000_complete_database_setup.sql >nul
if %errorlevel% neq 0 (
    echo ❌ Special user flags not found in schema!
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Special user flags defined
)

echo.
echo ========================================
echo CHECK 6: Special User Data
echo ========================================
echo.

findstr /C:"bradturnbough80@gmail.com" backend\migrations\001_insert_special_users.sql >nul
if %errorlevel% neq 0 (
    echo ❌ Brad's account not found!
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Brad's account defined
)

findstr /C:"brianaolszewski1@gmail.com" backend\migrations\001_insert_special_users.sql >nul
if %errorlevel% neq 0 (
    echo ❌ Briana's account not found!
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Briana's account defined
)

findstr /C:"dwoodswoods2@gmail.com" backend\migrations\001_insert_special_users.sql >nul
if %errorlevel% neq 0 (
    echo ❌ Donna's account not found!
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Donna's account defined
)

findstr /C:"boldtcu@gmail.com" backend\migrations\001_insert_special_users.sql >nul
if %errorlevel% neq 0 (
    echo ❌ Lori's account not found!
    set /a ERROR_COUNT+=1
) else (
    echo ✅ Lori's account defined
)

echo.
echo ========================================
echo FINAL VERIFICATION RESULT
echo ========================================
echo.

if %ERROR_COUNT% equ 0 (
    echo ✅ ALL CHECKS PASSED - READY FOR DEPLOYMENT!
    echo.
    echo 🚀 Cook Smart is ready to deploy tonight!
    echo.
    echo Next steps:
    echo 1. Run: scripts\create-fresh-ssh-key.bat
    echo 2. Run: scripts\deploy-cook-smart-budget.bat
    echo 3. Wait for infrastructure setup (15 minutes)
    echo 4. Run: scripts\upload-codebase.bat [SERVER_IP]
    echo 5. SSH in and complete deployment
    echo.
    echo Total deployment time: ~1 hour
    echo Monthly cost: ~$17
    echo.
) else (
    echo ❌ %ERROR_COUNT% ERRORS FOUND - DEPLOYMENT NOT READY!
    echo.
    echo Please fix all errors before attempting deployment.
    echo Cook Smart must have ZERO errors for successful deployment.
)

echo.
pause