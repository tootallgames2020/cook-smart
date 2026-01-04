@echo off
echo ========================================
echo Cook Smart Budget-Optimized Deployment
echo ========================================
echo.
echo This script will deploy Cook Smart using the budget-optimized architecture:
echo - Single EC2 t3.small instance (~$17/month)
echo - Local PostgreSQL database
echo - Direct connection via Elastic IP
echo - SSL via Let's Encrypt
echo.

REM Check if AWS CLI is configured
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: AWS CLI not configured or not authenticated
    pause
    exit /b 1
)

echo Current AWS Account:
aws sts get-caller-identity --query "Account" --output text
echo.

echo ========================================
echo STEP 1: CREATE SECURITY GROUP
echo ========================================
echo.
echo Creating security group for Cook Smart backend...

REM Create security group
aws ec2 create-security-group ^
    --group-name cook-smart-backend-sg-v2 ^
    --description "Cook Smart Backend Security Group v2" ^
    --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=cook-smart-backend-sg-v2},{Key=Project,Value=CookSmart},{Key=Environment,Value=Production}]"

if %errorlevel% neq 0 (
    echo ERROR: Failed to create security group
    pause
    exit /b 1
)

REM Get security group ID
for /f "tokens=*" %%i in ('aws ec2 describe-security-groups --group-names cook-smart-backend-sg-v2 --query "SecurityGroups[0].GroupId" --output text') do set SG_ID=%%i
echo Security Group ID: %SG_ID%

REM Add HTTP rule
aws ec2 authorize-security-group-ingress ^
    --group-id %SG_ID% ^
    --protocol tcp ^
    --port 80 ^
    --cidr 0.0.0.0/0

REM Add HTTPS rule
aws ec2 authorize-security-group-ingress ^
    --group-id %SG_ID% ^
    --protocol tcp ^
    --port 443 ^
    --cidr 0.0.0.0/0

REM Add SSH rule (for management)
aws ec2 authorize-security-group-ingress ^
    --group-id %SG_ID% ^
    --protocol tcp ^
    --port 22 ^
    --cidr 0.0.0.0/0

echo Security group created successfully!

echo.
echo ========================================
echo STEP 2: CREATE EC2 INSTANCE
echo ========================================
echo.
echo Creating EC2 t3.small instance...

REM Create EC2 instance
aws ec2 run-instances ^
    --image-id ami-0e86e20dae90224e1 ^
    --count 1 ^
    --instance-type t3.small ^
    --key-name cook-smart-key ^
    --security-group-ids %SG_ID% ^
    --block-device-mappings "[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":30,\"VolumeType\":\"gp3\",\"DeleteOnTermination\":true}}]" ^
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=cook-smart-backend-v2},{Key=Project,Value=CookSmart},{Key=Environment,Value=Production}]" ^
    --user-data file://scripts/ec2-user-data.sh

if %errorlevel% neq 0 (
    echo ERROR: Failed to create EC2 instance
    pause
    exit /b 1
)

REM Get instance ID
for /f "tokens=*" %%i in ('aws ec2 describe-instances --filters "Name=tag:Name,Values=cook-smart-backend-v2" "Name=instance-state-name,Values=pending,running" --query "Reservations[0].Instances[0].InstanceId" --output text') do set INSTANCE_ID=%%i
echo Instance ID: %INSTANCE_ID%

echo Waiting for instance to be running...
aws ec2 wait instance-running --instance-ids %INSTANCE_ID%
echo Instance is now running!

echo.
echo ========================================
echo STEP 3: CREATE AND ASSIGN ELASTIC IP
echo ========================================
echo.
echo Creating Elastic IP...

REM Allocate Elastic IP
aws ec2 allocate-address --domain vpc --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=cook-smart-backend-eip-v2},{Key=Project,Value=CookSmart}]"

if %errorlevel% neq 0 (
    echo ERROR: Failed to allocate Elastic IP
    pause
    exit /b 1
)

REM Get Elastic IP allocation ID
for /f "tokens=*" %%i in ('aws ec2 describe-addresses --filters "Name=tag:Name,Values=cook-smart-backend-eip-v2" --query "Addresses[0].AllocationId" --output text') do set EIP_ALLOC_ID=%%i
echo Elastic IP Allocation ID: %EIP_ALLOC_ID%

REM Get Elastic IP address
for /f "tokens=*" %%i in ('aws ec2 describe-addresses --allocation-ids %EIP_ALLOC_ID% --query "Addresses[0].PublicIp" --output text') do set EIP_ADDRESS=%%i
echo Elastic IP Address: %EIP_ADDRESS%

REM Associate Elastic IP with instance
aws ec2 associate-address --instance-id %INSTANCE_ID% --allocation-id %EIP_ALLOC_ID%

if %errorlevel% neq 0 (
    echo ERROR: Failed to associate Elastic IP
    pause
    exit /b 1
)

echo Elastic IP associated successfully!

echo.
echo ========================================
echo STEP 4: UPDATE ROUTE 53 DNS
echo ========================================
echo.
echo Updating DNS record for api.cooksmartapp.com...

REM Create Route 53 change batch
echo {> dns-change.json
echo   "Comment": "Update Cook Smart API endpoint",>> dns-change.json
echo   "Changes": [>> dns-change.json
echo     {>> dns-change.json
echo       "Action": "UPSERT",>> dns-change.json
echo       "ResourceRecordSet": {>> dns-change.json
echo         "Name": "api.cooksmartapp.com",>> dns-change.json
echo         "Type": "A",>> dns-change.json
echo         "TTL": 300,>> dns-change.json
echo         "ResourceRecords": [>> dns-change.json
echo           {>> dns-change.json
echo             "Value": "%EIP_ADDRESS%">> dns-change.json
echo           }>> dns-change.json
echo         ]>> dns-change.json
echo       }>> dns-change.json
echo     }>> dns-change.json
echo   ]>> dns-change.json
echo }>> dns-change.json

REM Update Route 53 record
aws route53 change-resource-record-sets --hosted-zone-id Z0980869VT72IDSPDPAX --change-batch file://dns-change.json

if %errorlevel% neq 0 (
    echo ERROR: Failed to update DNS record
    pause
    exit /b 1
)

echo DNS record updated successfully!
del dns-change.json

echo.
echo ========================================
echo DEPLOYMENT COMPLETE - PHASE 1
echo ========================================
echo.
echo Infrastructure created successfully:
echo ✓ Security Group: %SG_ID%
echo ✓ EC2 Instance: %INSTANCE_ID%
echo ✓ Elastic IP: %EIP_ADDRESS%
echo ✓ DNS Record: api.cooksmartapp.com -> %EIP_ADDRESS%
echo.
echo NEXT STEPS:
echo 1. Wait 5-10 minutes for instance to fully initialize
echo 2. Run: scripts\setup-cook-smart-server.bat
echo 3. This will SSH into the server and install the application
echo.
echo Instance Details:
echo - Type: t3.small (2 vCPU, 2GB RAM, 30GB storage)
echo - OS: Ubuntu 22.04 LTS
echo - Cost: ~$17/month
echo - SSH: ssh -i ~/.ssh/cook-smart-key.pem ubuntu@%EIP_ADDRESS%
echo.
pause