@echo off
echo Recreating the EXACT working backend setup from December...

REM Create instance with minimal user data (just basic setup)
echo Creating Ubuntu instance...
for /f %%i in ('aws ec2 run-instances --image-id ami-0030e4319cbf4dbf2 --instance-type t3.small --key-name cook-smart-key --security-group-ids sg-0b72c335d79282f46 --subnet-id subnet-099358dc4a94a775b --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=cook-smart-backend}]" --query "Instances[0].InstanceId" --output text') do set INSTANCE_ID=%%i

echo Instance created: %INSTANCE_ID%

REM Wait for running
echo Waiting for instance to start...
aws ec2 wait instance-running --instance-ids %INSTANCE_ID%

REM Get IP
for /f %%i in ('aws ec2 describe-instances --instance-ids %INSTANCE_ID% --query "Reservations[0].Instances[0].PublicIpAddress" --output text') do set INSTANCE_IP=%%i

echo Instance IP: %INSTANCE_IP%

REM Update DNS to point to new instance
echo Updating DNS...
(
echo {
echo   "Comment": "Recreate working backend",
echo   "Changes": [
echo     {
echo       "Action": "UPSERT",
echo       "ResourceRecordSet": {
echo         "Name": "api.cooksmartapp.com",
echo         "Type": "A",
echo         "TTL": 300,
echo         "ResourceRecords": [
echo           {
echo             "Value": "%INSTANCE_IP%"
echo           }
echo         ]
echo       }
echo     }
echo   ]
echo }
) > dns-update-working.json

aws route53 change-resource-record-sets --hosted-zone-id Z0980869VT72IDSPDPAX --change-batch file://dns-update-working.json

echo Waiting 3 minutes for instance to be ready for SSH...
timeout /t 180 /nobreak

echo ========================================
echo MANUAL DEPLOYMENT REQUIRED
echo ========================================
echo Instance: %INSTANCE_ID%
echo IP: %INSTANCE_IP%
echo 
echo Next steps (run these manually):
echo 1. ssh -i ~/.ssh/cook-smart-key.pem ubuntu@%INSTANCE_IP%
echo 2. Follow the exact deployment process from December
echo 
echo The working deployment process:
echo - Install Node.js, PM2, nginx
echo - Clone repository to /home/ubuntu/cook-smart
echo - Setup backend with proper .env
echo - Build and start with PM2
echo - Configure nginx proxy
echo ========================================

del dns-update-working.json
pause