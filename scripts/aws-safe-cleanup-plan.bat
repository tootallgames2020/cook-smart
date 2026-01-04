@echo off
echo ========================================
echo AWS Safe Cleanup Plan Generator
echo ========================================
echo.
echo This script helps create a safe cleanup plan for Cook Smart resources
echo while preserving all other projects and shared resources.
echo.
echo IMPORTANT: Run this ONLY after completing:
echo 1. aws-resource-audit.bat
echo 2. aws-project-categorization.bat  
echo 3. aws-shared-resource-detection.bat
echo.

REM Check if AWS CLI is configured
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: AWS CLI not configured or not authenticated
    pause
    exit /b 1
)

echo ========================================
echo STEP 1: IDENTIFY COOK SMART RESOURCES
echo ========================================
echo.
echo Cook Smart EC2 instances (candidates for cleanup):
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,Tags[?Key=='Name'].Value|[0],State.Name,PublicIpAddress] | [?contains(to_lower([1]), 'cook') || contains(to_lower([1]), 'smart') || contains(to_lower([1]), 'kitchen') || contains(to_lower([1]), 'helper')]" --output table

echo.
echo Cook Smart Load Balancers (candidates for cleanup):
aws elbv2 describe-load-balancers --query "LoadBalancers[?contains(to_lower(LoadBalancerName), 'cook') || contains(to_lower(LoadBalancerName), 'smart') || contains(to_lower(LoadBalancerName), 'kitchen') || contains(to_lower(LoadBalancerName), 'helper')].[LoadBalancerName,LoadBalancerArn,State.Code]" --output table

echo.
echo Cook Smart RDS instances (candidates for cleanup):
aws rds describe-db-instances --query "DBInstances[?contains(to_lower(DBInstanceIdentifier), 'cook') || contains(to_lower(DBInstanceIdentifier), 'smart') || contains(to_lower(DBInstanceIdentifier), 'kitchen') || contains(to_lower(DBInstanceIdentifier), 'helper')].[DBInstanceIdentifier,DBInstanceStatus,Engine]" --output table

echo.
echo Cook Smart Security Groups (candidates for cleanup):
aws ec2 describe-security-groups --query "SecurityGroups[?contains(to_lower(GroupName), 'cook') || contains(to_lower(GroupName), 'smart') || contains(to_lower(GroupName), 'kitchen') || contains(to_lower(GroupName), 'helper')].[GroupName,GroupId,Description]" --output table

echo.
echo ========================================
echo STEP 2: VERIFY PROTECTED RESOURCES
echo ========================================
echo.
echo Nexus Discord Bot resources (MUST PRESERVE):
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,Tags[?Key=='Name'].Value|[0],State.Name] | [?contains(to_lower([1]), 'nexus')]" --output table

echo.
echo Stream Guard AI resources (MUST PRESERVE):
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,Tags[?Key=='Name'].Value|[0],State.Name] | [?contains(to_lower([1]), 'stream') || contains(to_lower([1]), 'guard')]" --output table

echo.
echo ========================================
echo STEP 3: DEPENDENCY CHECK
echo ========================================
echo.
echo Checking for dependencies that must be preserved...
echo.

REM Get Cook Smart instance IDs for dependency checking
echo Cook Smart instance dependencies:
for /f "tokens=1" %%i in ('aws ec2 describe-instances --query "Reservations[*].Instances[*].InstanceId | [?contains(to_lower(@), 'cook') || contains(to_lower(@), 'smart')]" --output text 2^>nul') do (
    echo.
    echo Instance: %%i
    echo Security Groups:
    aws ec2 describe-instances --instance-ids %%i --query "Reservations[*].Instances[*].SecurityGroups[*].[GroupName,GroupId]" --output table 2>nul
    echo Subnets:
    aws ec2 describe-instances --instance-ids %%i --query "Reservations[*].Instances[*].[SubnetId,VpcId]" --output table 2>nul
)

echo.
echo ========================================
echo STEP 4: GENERATE CLEANUP COMMANDS
echo ========================================
echo.
echo DANGER: The following commands will DELETE resources!
echo DO NOT RUN without manual verification!
echo.
echo Creating cleanup script: aws-cleanup-commands.bat
echo.

REM Create the cleanup commands file
echo @echo off > aws-cleanup-commands.bat
echo REM ======================================== >> aws-cleanup-commands.bat
echo REM AWS COOK SMART CLEANUP COMMANDS >> aws-cleanup-commands.bat
echo REM DANGER: THESE COMMANDS DELETE RESOURCES >> aws-cleanup-commands.bat
echo REM ======================================== >> aws-cleanup-commands.bat
echo. >> aws-cleanup-commands.bat
echo echo WARNING: This will DELETE Cook Smart AWS resources! >> aws-cleanup-commands.bat
echo echo Press Ctrl+C to cancel, or >> aws-cleanup-commands.bat
echo pause >> aws-cleanup-commands.bat
echo. >> aws-cleanup-commands.bat

REM Add EC2 termination commands
echo REM Terminate Cook Smart EC2 instances >> aws-cleanup-commands.bat
for /f "tokens=1" %%i in ('aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId] | [?contains(to_lower(@), 'cook') || contains(to_lower(@), 'smart') || contains(to_lower(@), 'kitchen') || contains(to_lower(@), 'helper')]" --output text 2^>nul') do (
    echo echo Terminating EC2 instance: %%i >> aws-cleanup-commands.bat
    echo aws ec2 terminate-instances --instance-ids %%i >> aws-cleanup-commands.bat
    echo echo Waiting for instance %%i to terminate... >> aws-cleanup-commands.bat
    echo aws ec2 wait instance-terminated --instance-ids %%i >> aws-cleanup-commands.bat
    echo. >> aws-cleanup-commands.bat
)

REM Add Load Balancer deletion commands
echo REM Delete Cook Smart Load Balancers >> aws-cleanup-commands.bat
for /f "tokens=2" %%i in ('aws elbv2 describe-load-balancers --query "LoadBalancers[?contains(to_lower(LoadBalancerName), 'cook') || contains(to_lower(LoadBalancerName), 'smart') || contains(to_lower(LoadBalancerName), 'kitchen') || contains(to_lower(LoadBalancerName), 'helper')].[LoadBalancerArn]" --output text 2^>nul') do (
    echo echo Deleting Load Balancer: %%i >> aws-cleanup-commands.bat
    echo aws elbv2 delete-load-balancer --load-balancer-arn %%i >> aws-cleanup-commands.bat
    echo. >> aws-cleanup-commands.bat
)

REM Add RDS deletion commands
echo REM Delete Cook Smart RDS instances >> aws-cleanup-commands.bat
for /f %%i in ('aws rds describe-db-instances --query "DBInstances[?contains(to_lower(DBInstanceIdentifier), 'cook') || contains(to_lower(DBInstanceIdentifier), 'smart') || contains(to_lower(DBInstanceIdentifier), 'kitchen') || contains(to_lower(DBInstanceIdentifier), 'helper')].DBInstanceIdentifier" --output text 2^>nul') do (
    echo echo Deleting RDS instance: %%i >> aws-cleanup-commands.bat
    echo aws rds delete-db-instance --db-instance-identifier %%i --skip-final-snapshot >> aws-cleanup-commands.bat
    echo. >> aws-cleanup-commands.bat
)

echo.
echo ========================================
echo CLEANUP PLAN GENERATED
echo ========================================
echo.
echo Generated file: aws-cleanup-commands.bat
echo.
echo CRITICAL SAFETY STEPS:
echo.
echo 1. MANUALLY REVIEW aws-cleanup-commands.bat before running
echo 2. VERIFY each resource is Cook Smart only (not shared)
echo 3. BACKUP any important data before deletion
echo 4. TEST that other projects still work after cleanup
echo.
echo RESOURCES TO PRESERVE (verify these are NOT in cleanup commands):
echo - Nexus Discord Bot resources
echo - Stream Guard AI resources  
echo - Working website resources
echo - Any shared VPCs, subnets, security groups
echo - Any shared IAM roles or policies
echo.
echo Only run aws-cleanup-commands.bat after manual verification!
echo.
pause