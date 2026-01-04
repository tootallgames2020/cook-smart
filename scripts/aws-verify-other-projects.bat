@echo off
echo ========================================
echo AWS Other Projects Verification
echo ========================================
echo.
echo This script verifies that Nexus Discord Bot and Stream Guard AI
echo are still functioning properly after any AWS changes.
echo.
echo Run this script:
echo - BEFORE cleanup (to establish baseline)
echo - AFTER cleanup (to verify no impact)
echo.

REM Check if AWS CLI is configured
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: AWS CLI not configured or not authenticated
    pause
    exit /b 1
)

echo ========================================
echo NEXUS DISCORD BOT VERIFICATION
echo ========================================
echo.
echo Nexus Discord Bot EC2 instances:
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,Tags[?Key=='Name'].Value|[0],State.Name,PublicIpAddress,PrivateIpAddress] | [?contains(to_lower([1]), 'nexus')]" --output table

echo.
echo Nexus Discord Bot instance health:
for /f "tokens=1" %%i in ('aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId] | [?contains(to_lower(@), 'nexus')]" --output text 2^>nul') do (
    echo.
    echo Instance: %%i
    echo Status Checks:
    aws ec2 describe-instance-status --instance-ids %%i --query "InstanceStatuses[*].[InstanceState.Name,SystemStatus.Status,InstanceStatus.Status]" --output table 2>nul
    echo Security Groups:
    aws ec2 describe-instances --instance-ids %%i --query "Reservations[*].Instances[*].SecurityGroups[*].[GroupName,GroupId]" --output table 2>nul
)

echo.
echo ========================================
echo STREAM GUARD AI VERIFICATION
echo ========================================
echo.
echo Stream Guard AI EC2 instances:
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,Tags[?Key=='Name'].Value|[0],State.Name,PublicIpAddress,PrivateIpAddress] | [?contains(to_lower([1]), 'stream') || contains(to_lower([1]), 'guard')]" --output table

echo.
echo Stream Guard AI instance health:
for /f "tokens=1" %%i in ('aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId] | [?contains(to_lower(@), 'stream') || contains(to_lower(@), 'guard')]" --output text 2^>nul') do (
    echo.
    echo Instance: %%i
    echo Status Checks:
    aws ec2 describe-instance-status --instance-ids %%i --query "InstanceStatuses[*].[InstanceState.Name,SystemStatus.Status,InstanceStatus.Status]" --output table 2>nul
    echo Security Groups:
    aws ec2 describe-instances --instance-ids %%i --query "Reservations[*].Instances[*].SecurityGroups[*].[GroupName,GroupId]" --output table 2>nul
)

echo.
echo ========================================
echo WEBSITE VERIFICATION
echo ========================================
echo.
echo Checking Route 53 hosted zones for website:
aws route53 list-hosted-zones --query "HostedZones[*].[Name,Id,ResourceRecordSetCount]" --output table

echo.
echo Checking DNS records:
for /f "tokens=2" %%i in ('aws route53 list-hosted-zones --query "HostedZones[*].Id" --output text') do (
    echo.
    echo Hosted Zone: %%i
    aws route53 list-resource-record-sets --hosted-zone-id %%i --query "ResourceRecordSets[?Type=='A' || Type=='CNAME'].[Name,Type,ResourceRecords[0].Value]" --output table 2>nul
)

echo.
echo ========================================
echo LOAD BALANCER VERIFICATION
echo ========================================
echo.
echo All active load balancers (should include non-Cook Smart ones):
aws elbv2 describe-load-balancers --query "LoadBalancers[?State.Code=='active'].[LoadBalancerName,DNSName,State.Code]" --output table

echo.
echo Load balancer target health:
for /f "tokens=1" %%i in ('aws elbv2 describe-target-groups --query "TargetGroups[*].TargetGroupArn" --output text') do (
    echo.
    echo Target Group: %%i
    aws elbv2 describe-target-health --target-group-arn %%i --query "TargetHealthDescriptions[*].[Target.Id,TargetHealth.State,TargetHealth.Description]" --output table 2>nul
)

echo.
echo ========================================
echo RDS DATABASE VERIFICATION
echo ========================================
echo.
echo All RDS instances (should include non-Cook Smart ones):
aws rds describe-db-instances --query "DBInstances[?DBInstanceStatus=='available'].[DBInstanceIdentifier,Engine,Endpoint.Address,DBInstanceStatus]" --output table

echo.
echo ========================================
echo SECURITY GROUP VERIFICATION
echo ========================================
echo.
echo Security groups still in use (should include non-Cook Smart ones):
aws ec2 describe-security-groups --query "SecurityGroups[*].[GroupName,GroupId,Description] | [?![1] || ![2]]" --output table

echo.
echo ========================================
echo NETWORK CONNECTIVITY TEST
echo ========================================
echo.
echo Testing connectivity to known working services...
echo.

REM Test website connectivity if we know the domain
echo Testing website connectivity (if domain is known):
echo You may need to manually test your website URL here
echo.

REM Test if we can reach other project instances
echo Testing EC2 instance connectivity:
for /f "tokens=4" %%i in ('aws ec2 describe-instances --query "Reservations[*].Instances[*].[PublicIpAddress] | [?contains(to_lower(@), 'nexus') || contains(to_lower(@), 'stream') || contains(to_lower(@), 'guard')]" --output text 2^>nul') do (
    if not "%%i"=="None" (
        echo Testing connectivity to %%i:
        ping -n 2 %%i
        echo.
    )
)

echo.
echo ========================================
echo VERIFICATION COMPLETE
echo ========================================
echo.
echo MANUAL VERIFICATION REQUIRED:
echo.
echo 1. Check that Nexus Discord Bot is responding to commands
echo 2. Verify Stream Guard AI is processing streams correctly  
echo 3. Test that the website loads properly at its domain
echo 4. Confirm all expected services are still running
echo.
echo If any services are not working:
echo - STOP any cleanup operations immediately
echo - Investigate which resources were affected
echo - Restore from backups if necessary
echo.
echo Only proceed with further cleanup if ALL other projects are working!
echo.
pause