@echo off
echo Creating new Ubuntu instance with SSM agent and Node.js setup...

REM Create user data script for Ubuntu with SSM agent
echo Creating user data script...
echo #!/bin/bash > temp-userdata.sh
echo sudo apt update -y >> temp-userdata.sh
echo sudo snap install amazon-ssm-agent --classic >> temp-userdata.sh
echo sudo systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service >> temp-userdata.sh
echo sudo systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service >> temp-userdata.sh
echo curl -fsSL https://deb.nodesource.com/setup_20.x ^| sudo -E bash - >> temp-userdata.sh
echo sudo apt-get install -y nodejs >> temp-userdata.sh
echo sudo npm install -g pm2 >> temp-userdata.sh
echo git clone https://github.com/tootallgames2020/cook-smart.git /home/ubuntu/cook-smart >> temp-userdata.sh
echo cd /home/ubuntu/cook-smart >> temp-userdata.sh
echo git checkout fresh-project-migration >> temp-userdata.sh
echo chown -R ubuntu:ubuntu /home/ubuntu/cook-smart >> temp-userdata.sh

REM Encode user data to base64
certutil -encode temp-userdata.sh temp-userdata-b64.txt >nul
for /f "skip=1 delims=" %%i in (temp-userdata-b64.txt) do if "%%i" neq "-----END CERTIFICATE-----" set "userdata=!userdata!%%i"

REM Create new instance with SSM-enabled IAM role
echo Creating Ubuntu instance with SSM support...
aws ec2 run-instances ^
  --image-id ami-0030e4319cbf4dbf2 ^
  --instance-type t3.small ^
  --key-name cook-smart-key ^
  --security-group-ids sg-0b72c335d79282f46 ^
  --subnet-id subnet-099358dc4a94a775b ^
  --iam-instance-profile Name=EC2-SSM-Role ^
  --user-data file://temp-userdata.sh ^
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=cook-smart-backend-ubuntu-final}]" ^
  --query "Instances[0].InstanceId" ^
  --output text > new-instance-id.txt

set /p NEW_INSTANCE_ID=<new-instance-id.txt
echo New instance created: %NEW_INSTANCE_ID%

REM Wait for instance to be running
echo Waiting for instance to start...
aws ec2 wait instance-running --instance-ids %NEW_INSTANCE_ID%

REM Get public IP
aws ec2 describe-instances --instance-ids %NEW_INSTANCE_ID% --query "Reservations[0].Instances[0].PublicIpAddress" --output text > new-instance-ip.txt
set /p NEW_INSTANCE_IP=<new-instance-ip.txt
echo Instance IP: %NEW_INSTANCE_IP%

REM Update DNS to point to new instance
echo Updating DNS to point to new instance...
aws route53 change-resource-record-sets ^
  --hosted-zone-id Z0980869VT72IDSPDPAX ^
  --change-batch "{\"Comment\":\"Update API to new Ubuntu server\",\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"api.cooksmartapp.com\",\"Type\":\"A\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"%NEW_INSTANCE_IP%\"}]}}]}"

echo Waiting 2 minutes for SSM agent to initialize...
timeout /t 120 /nobreak

echo Testing SSM connection...
aws ssm start-session --target %NEW_INSTANCE_ID%

REM Cleanup temp files
del temp-userdata.sh temp-userdata-b64.txt new-instance-id.txt new-instance-ip.txt

echo Setup complete! Instance ID: %NEW_INSTANCE_ID%
echo IP Address: %NEW_INSTANCE_IP%