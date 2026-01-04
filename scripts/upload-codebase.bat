@echo off
echo ========================================
echo Upload Clean Cook Smart Codebase
echo ========================================
echo.
echo This script packages and uploads the current clean codebase
echo to the AWS EC2 server for deployment.
echo.

REM Check if server IP is provided
if "%1"=="" (
    echo ERROR: Please provide the server IP address
    echo Usage: scripts\upload-codebase.bat [SERVER_IP]
    echo Example: scripts\upload-codebase.bat 34.203.8.150
    pause
    exit /b 1
)

set SERVER_IP=%1
echo Server IP: %SERVER_IP%
echo.

REM Check if SSH key exists
if not exist "%USERPROFILE%\.ssh\cook-smart-key.pem" (
    echo ERROR: SSH key not found at %USERPROFILE%\.ssh\cook-smart-key.pem
    echo Please run: scripts\create-fresh-ssh-key.bat
    pause
    exit /b 1
)

echo ========================================
echo STEP 1: CREATE DEPLOYMENT PACKAGE
echo ========================================
echo.

REM Create temporary directory for packaging
if exist temp-deploy rmdir /s /q temp-deploy
mkdir temp-deploy

echo Copying essential files...

REM Copy backend directory (the core application)
xcopy backend temp-deploy\backend\ /E /I /Q
if %errorlevel% neq 0 (
    echo ERROR: Failed to copy backend directory
    pause
    exit /b 1
)

REM Copy mobile app source (for reference and future updates)
xcopy src temp-deploy\src\ /E /I /Q
if %errorlevel% neq 0 (
    echo ERROR: Failed to copy src directory
    pause
    exit /b 1
)

REM Copy essential root files
copy package.json temp-deploy\ >nul 2>&1
copy App.tsx temp-deploy\ >nul 2>&1
copy tsconfig.json temp-deploy\ >nul 2>&1
copy babel.config.js temp-deploy\ >nul 2>&1

REM Copy assets directory
if exist assets xcopy assets temp-deploy\assets\ /E /I /Q

echo Package created successfully!

echo.
echo ========================================
echo STEP 2: CREATE ARCHIVE
echo ========================================
echo.

REM Create tar archive (using Windows tar if available, otherwise 7zip)
echo Creating archive...
cd temp-deploy
tar -czf ..\cook-smart-codebase.tar.gz . 2>nul
if %errorlevel% neq 0 (
    echo Tar not available, trying 7zip...
    7z a -tgzip ..\cook-smart-codebase.tar.gz . >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Could not create archive. Please install 7zip or use WSL
        cd ..
        pause
        exit /b 1
    )
)
cd ..

echo Archive created: cook-smart-codebase.tar.gz

echo.
echo ========================================
echo STEP 3: UPLOAD TO SERVER
echo ========================================
echo.

echo Uploading codebase to server...
scp -i "%USERPROFILE%\.ssh\cook-smart-key.pem" -o StrictHostKeyChecking=no cook-smart-codebase.tar.gz ubuntu@%SERVER_IP%:/tmp/

if %errorlevel% neq 0 (
    echo ERROR: Failed to upload codebase
    pause
    exit /b 1
)

echo.
echo ========================================
echo STEP 4: EXTRACT ON SERVER
echo ========================================
echo.

echo Extracting codebase on server...
ssh -i "%USERPROFILE%\.ssh\cook-smart-key.pem" -o StrictHostKeyChecking=no ubuntu@%SERVER_IP% "sudo su - cook-smart -c 'cd /home/cook-smart && rm -rf app && mkdir app && cd app && tar -xzf /tmp/cook-smart-codebase.tar.gz && rm /tmp/cook-smart-codebase.tar.gz'"

if %errorlevel% neq 0 (
    echo ERROR: Failed to extract codebase on server
    pause
    exit /b 1
)

echo.
echo ========================================
echo CLEANUP
echo ========================================
echo.

REM Clean up local files
rmdir /s /q temp-deploy
del cook-smart-codebase.tar.gz

echo.
echo ========================================
echo UPLOAD COMPLETE!
echo ========================================
echo.
echo ✅ Clean codebase uploaded successfully to server
echo ✅ Files extracted to /home/cook-smart/app/
echo.
echo NEXT STEPS:
echo 1. SSH into server: ssh -i "%USERPROFILE%\.ssh\cook-smart-key.pem" ubuntu@%SERVER_IP%
echo 2. Switch to app user: sudo su - cook-smart
echo 3. Run deployment: ./deploy.sh
echo 4. Configure environment: nano app/backend/.env
echo 5. Restart application: pm2 restart cook-smart-backend
echo 6. Setup SSL: sudo certbot --nginx -d api.cooksmartapp.com
echo.
pause