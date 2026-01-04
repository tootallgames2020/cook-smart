@echo off
echo Creating new Ubuntu instance with comprehensive backend setup...

REM Terminate old instance first
echo Terminating old instance...
aws ec2 terminate-instances --instance-ids i-0bb4f3613cb2083ff

REM Wait for termination
echo Waiting for instance to terminate...
aws ec2 wait instance-terminated --instance-ids i-0bb4f3613cb2083ff

REM Create comprehensive user data script
echo Creating user data script...
(
echo #!/bin/bash
echo set -e
echo exec ^> ^^(tee /var/log/user-data.log^) 2^>^&1
echo echo "Starting Cook Smart setup at $(date)"
echo 
echo # Update system
echo apt update -y
echo apt upgrade -y
echo 
echo # Install Node.js 20 LTS
echo curl -fsSL https://deb.nodesource.com/setup_20.x ^| bash -
echo apt-get install -y nodejs
echo 
echo # Install PM2 and nginx
echo npm install -g pm2
echo apt-get install -y nginx
echo 
echo # Clone repository
echo cd /home/ubuntu
echo git clone https://github.com/tootallgames2020/cook-smart.git
echo cd cook-smart
echo git checkout fresh-project-migration
echo chown -R ubuntu:ubuntu /home/ubuntu/cook-smart
echo 
echo # Setup backend
echo cd /home/ubuntu/cook-smart/backend
echo cp .env.example .env
echo 
echo # Configure environment
echo sed -i 's/your-database-host/cook-smart-db-beta.cgfwigy2i9lk.us-east-1.rds.amazonaws.com/g' .env
echo sed -i 's/your-db-user/cooksmartadmin/g' .env
echo sed -i 's/your-db-password/CookSmart2024!/g' .env
echo sed -i 's/your-jwt-secret/cook-smart-jwt-secret-2024/g' .env
echo 
echo # Install dependencies and build
echo sudo -u ubuntu npm install
echo sudo -u ubuntu npm run build
echo 
echo # Start backend
echo sudo -u ubuntu pm2 start dist/server.js --name cook-smart-backend
echo sudo -u ubuntu pm2 save
echo 
echo # Configure nginx
echo cat ^> /etc/nginx/sites-available/cook-smart ^<^< 'EOF'
echo server {
echo     listen 80;
echo     server_name api.cooksmartapp.com;
echo     
echo     location / {
echo         proxy_pass http://localhost:3000;
echo         proxy_set_header Host $host;
echo         proxy_set_header X-Real-IP $remote_addr;
echo         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
echo         proxy_set_header X-Forwarded-Proto $scheme;
echo     }
echo }
echo EOF
echo 
echo # Enable nginx
echo ln -sf /etc/nginx/sites-available/cook-smart /etc/nginx/sites-enabled/
echo rm -f /etc/nginx/sites-enabled/default
echo nginx -t
echo systemctl reload nginx
echo 
echo # Test endpoints
echo sleep 10
echo curl -f http://localhost:3000/health ^|^| echo "Backend failed"
echo curl -f http://localhost/health ^|^| echo "Nginx failed"
echo 
echo echo "Setup completed at $(date)"
) > user-data-script.sh

REM Create new instance
echo Creating new instance...
for /f %%i in ('aws ec2 run-instances --image-id ami-0030e4319cbf4dbf2 --instance-type t3.small --key-name cook-smart-key --security-group-ids sg-0b72c335d79282f46 --subnet-id subnet-099358dc4a94a775b --user-data file://user-data-script.sh --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=cook-smart-backend-working}]" --query "Instances[0].InstanceId" --output text') do set NEW_INSTANCE=%%i

echo New instance: %NEW_INSTANCE%

REM Wait for running
echo Waiting for instance to start...
aws ec2 wait instance-running --instance-ids %NEW_INSTANCE%

REM Get IP
for /f %%i in ('aws ec2 describe-instances --instance-ids %NEW_INSTANCE% --query "Reservations[0].Instances[0].PublicIpAddress" --output text') do set NEW_IP=%%i

echo Instance IP: %NEW_IP%

REM Update DNS
echo Updating DNS...
(
echo {
echo   "Comment": "Update to working backend",
echo   "Changes": [
echo     {
echo       "Action": "UPSERT",
echo       "ResourceRecordSet": {
echo         "Name": "api.cooksmartapp.com",
echo         "Type": "A",
echo         "TTL": 300,
echo         "ResourceRecords": [
echo           {
echo             "Value": "%NEW_IP%"
echo           }
echo         ]
echo       }
echo     }
echo   ]
echo }
) > dns-update-new.json

aws route53 change-resource-record-sets --hosted-zone-id Z0980869VT72IDSPDPAX --change-batch file://dns-update-new.json

echo Waiting 10 minutes for setup to complete...
timeout /t 600 /nobreak

echo Testing endpoints...
curl http://%NEW_IP%/health
curl https://api.cooksmartapp.com/health

echo Setup complete!
echo Instance: %NEW_INSTANCE%
echo IP: %NEW_IP%

REM Cleanup
del user-data-script.sh dns-update-new.json

pause