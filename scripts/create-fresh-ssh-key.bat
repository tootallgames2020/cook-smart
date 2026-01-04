@echo off
echo ========================================
echo Creating Fresh SSH Key for Cook Smart
echo ========================================
echo.

REM Delete existing key pair from AWS (if it exists)
echo Deleting existing cook-smart-key from AWS...
aws ec2 delete-key-pair --key-name cook-smart-key 2>nul

REM Create new key pair and save to file
echo Creating new SSH key pair...
aws ec2 create-key-pair --key-name cook-smart-key --query "KeyMaterial" --output text > %USERPROFILE%\.ssh\cook-smart-key.pem

if %errorlevel% neq 0 (
    echo ERROR: Failed to create SSH key pair
    pause
    exit /b 1
)

REM Set proper permissions on Windows
echo Setting file permissions...
icacls %USERPROFILE%\.ssh\cook-smart-key.pem /inheritance:r
icacls %USERPROFILE%\.ssh\cook-smart-key.pem /grant:r %USERNAME%:F

echo.
echo ✅ Fresh SSH key created successfully!
echo Key location: %USERPROFILE%\.ssh\cook-smart-key.pem
echo.
echo You can now proceed with deployment:
echo   scripts\deploy-cook-smart-budget.bat
echo.
pause