@echo off
echo ========================================
echo Cook Smart Server Setup - Phase 2
echo ========================================
echo.
echo This script will SSH into the EC2 instance and deploy the Cook Smart application.
echo.

REM Get the Elastic IP from the previous deployment
for /f "tokens=*" %%i in ('aws ec2 describe-addresses --filters "Name=tag:Name,Values=cook-smart-backend-eip-v2" --query "Addresses[0].PublicIp" --output text') do set SERVER_IP=%%i

if "%SERVER_IP%"=="None" (
    echo ERROR: Could not find Elastic IP. Make sure deploy-cook-smart-budget.bat completed successfully.
    pause
    exit /b 1
)

echo Server IP: %SERVER_IP%
echo.

echo ========================================
echo STEP 1: VERIFY SERVER IS READY
echo ========================================
echo.
echo Checking if server is ready for SSH connection...
echo This may take a few minutes for the instance to fully initialize...

:WAIT_LOOP
echo Attempting SSH connection...
ssh -i ~/.ssh/cook-smart-key.pem -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@%SERVER_IP% "echo 'Server is ready'" >nul 2>&1
if %errorlevel% equ 0 goto SERVER_READY

echo Server not ready yet, waiting 30 seconds...
timeout /t 30 /nobreak >nul
goto WAIT_LOOP

:SERVER_READY
echo ✓ Server is ready for deployment!

echo.
echo ========================================
echo STEP 2: DEPLOY APPLICATION
echo ========================================
echo.
echo Deploying Cook Smart application to the server...

REM Create temporary deployment script
echo #!/bin/bash > temp_deploy.sh
echo set -e >> temp_deploy.sh
echo echo "Starting Cook Smart deployment..." >> temp_deploy.sh
echo sudo su - cook-smart -c "cd /home/cook-smart && ./deploy.sh" >> temp_deploy.sh
echo echo "Deployment script completed!" >> temp_deploy.sh

REM Copy and execute deployment script
scp -i ~/.ssh/cook-smart-key.pem -o StrictHostKeyChecking=no temp_deploy.sh ubuntu@%SERVER_IP%:/tmp/
ssh -i ~/.ssh/cook-smart-key.pem -o StrictHostKeyChecking=no ubuntu@%SERVER_IP% "chmod +x /tmp/temp_deploy.sh && /tmp/temp_deploy.sh"

if %errorlevel% neq 0 (
    echo ERROR: Deployment failed
    pause
    exit /b 1
)

del temp_deploy.sh

echo.
echo ========================================
echo STEP 3: CONFIGURE ENVIRONMENT
echo ========================================
echo.
echo Setting up environment variables...

REM Create environment configuration script
echo #!/bin/bash > temp_env_setup.sh
echo set -e >> temp_env_setup.sh
echo echo "Configuring environment variables..." >> temp_env_setup.sh
echo sudo su - cook-smart -c "cd /home/cook-smart/app/backend && cp /home/cook-smart/.env.template .env" >> temp_env_setup.sh
echo echo "Environment template copied. You'll need to edit it with your FatSecret credentials." >> temp_env_setup.sh

REM Copy and execute environment setup
scp -i ~/.ssh/cook-smart-key.pem -o StrictHostKeyChecking=no temp_env_setup.sh ubuntu@%SERVER_IP%:/tmp/
ssh -i ~/.ssh/cook-smart-key.pem -o StrictHostKeyChecking=no ubuntu@%SERVER_IP% "chmod +x /tmp/temp_env_setup.sh && /tmp/temp_env_setup.sh"

del temp_env_setup.sh

echo.
echo ========================================
echo STEP 4: SET UP SSL CERTIFICATE
echo ========================================
echo.
echo Setting up SSL certificate for api.cooksmartapp.com...

REM Create SSL setup script
echo #!/bin/bash > temp_ssl_setup.sh
echo set -e >> temp_ssl_setup.sh
echo echo "Setting up SSL certificate..." >> temp_ssl_setup.sh
echo sudo certbot --nginx -d api.cooksmartapp.com --non-interactive --agree-tos --email services.cooksmart@gmail.com >> temp_ssl_setup.sh
echo echo "SSL certificate setup completed!" >> temp_ssl_setup.sh

REM Copy and execute SSL setup
scp -i ~/.ssh/cook-smart-key.pem -o StrictHostKeyChecking=no temp_ssl_setup.sh ubuntu@%SERVER_IP%:/tmp/
ssh -i ~/.ssh/cook-smart-key.pem -o StrictHostKeyChecking=no ubuntu@%SERVER_IP% "chmod +x /tmp/temp_ssl_setup.sh && /tmp/temp_ssl_setup.sh"

if %errorlevel% neq 0 (
    echo WARNING: SSL setup may have failed. You can set it up manually later.
)

del temp_ssl_setup.sh

echo.
echo ========================================
echo STEP 5: VERIFY DEPLOYMENT
echo ========================================
echo.
echo Checking if the application is running...

REM Test the health endpoint
curl -s http://%SERVER_IP%/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Application is responding on HTTP
) else (
    echo ⚠ Application may not be running yet
)

REM Test HTTPS endpoint
curl -s https://api.cooksmartapp.com/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Application is responding on HTTPS
) else (
    echo ⚠ HTTPS may not be configured yet
)

echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Cook Smart has been deployed successfully!
echo.
echo Server Details:
echo - IP Address: %SERVER_IP%
echo - HTTP URL: http://api.cooksmartapp.com
echo - HTTPS URL: https://api.cooksmartapp.com
echo - SSH Access: ssh -i ~/.ssh/cook-smart-key.pem ubuntu@%SERVER_IP%
echo.
echo IMPORTANT NEXT STEPS:
echo 1. SSH into the server and configure your FatSecret API credentials:
echo    ssh -i ~/.ssh/cook-smart-key.pem ubuntu@%SERVER_IP%
echo    sudo su - cook-smart
echo    nano app/backend/.env
echo.
echo 2. Add your FatSecret credentials to the .env file:
echo    FATSECRET_CLIENT_ID=your_actual_client_id
echo    FATSECRET_CLIENT_SECRET=your_actual_client_secret
echo.
echo 3. Restart the application:
echo    pm2 restart cook-smart-backend
echo.
echo 4. Test the API endpoints:
echo    curl https://api.cooksmartapp.com/health
echo    curl https://api.cooksmartapp.com/barcode/scan -X POST -H "Content-Type: application/json" -d "{\"barcode\":\"123456789\"}"
echo.
echo 5. Update your mobile app to use: https://api.cooksmartapp.com
echo.
echo Useful Commands (run on server as cook-smart user):
echo - Check status: ./status.sh
echo - View logs: pm2 logs cook-smart-backend
echo - Restart app: pm2 restart cook-smart-backend
echo - Deploy updates: ./deploy.sh
echo.
echo Monthly Cost: ~$17 (t3.small instance + storage + data transfer)
echo.
pause