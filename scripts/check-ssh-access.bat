@echo off
echo ========================================
echo Check SSH Access Configuration
echo ========================================
echo.

echo 1. Checking EC2 instance status...
aws ec2 describe-instances --instance-ids i-05e0746da4f5f9da0 --query "Reservations[0].Instances[0].[InstanceId,State.Name,PublicIpAddress]" --output table

echo.
echo 2. Checking security group rules for SSH (port 22)...
aws ec2 describe-security-groups --group-ids sg-0b3416f8fffabaca8 --query "SecurityGroups[0].IpPermissions[?FromPort==22]" --output table

echo.
echo 3. Testing SSH connectivity from this machine...
echo    (This will timeout if SSH is not accessible)
echo.

timeout /t 3 /nobreak > nul
ssh -o ConnectTimeout=10 -o BatchMode=yes -i "%USERPROFILE%\.ssh\cook-smart-key.pem" ubuntu@34.203.8.150 "echo 'SSH connection successful'"

if %ERRORLEVEL% EQU 0 (
    echo ✅ SSH connection successful from this machine
) else (
    echo ❌ SSH connection failed from this machine
    echo    This could be due to:
    echo    - Security group blocking your IP
    echo    - SSH key issues
    echo    - Server not responding
)

echo.
echo 4. GitHub Actions IP ranges that need SSH access:
echo    GitHub Actions runners use dynamic IPs from these ranges:
echo    - 140.82.112.0/20
echo    - 142.250.0.0/15  
echo    - 143.55.64.0/20
echo    - And others... (GitHub publishes full list)
echo.
echo    Current security group needs to allow these ranges on port 22.
echo.

pause