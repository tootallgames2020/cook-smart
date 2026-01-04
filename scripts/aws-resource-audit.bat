@echo off
echo ========================================
echo AWS Resource Audit - Multi-Project Safe
echo ========================================
echo.
echo This script will audit ALL AWS resources to identify:
echo - Cook Smart resources (for cleanup)
echo - Nexus Discord Bot resources (PRESERVE)
echo - Stream Guard AI resources (PRESERVE)
echo - Working Website resources (PRESERVE)
echo - Shared resources (PRESERVE)
echo.

REM Check if AWS CLI is configured
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: AWS CLI not configured or not authenticated
    echo Please run: aws configure
    pause
    exit /b 1
)

echo Current AWS Account:
aws sts get-caller-identity --query "Account" --output text
echo.

echo ========================================
echo 1. EC2 INSTANCES AUDIT
echo ========================================
echo.
echo All EC2 Instances with Name and Project tags:
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,Tags[?Key=='Name'].Value|[0],Tags[?Key=='Project'].Value|[0],State.Name,PublicIpAddress,PrivateIpAddress]" --output table

echo.
echo ========================================
echo 2. LOAD BALANCERS AUDIT
echo ========================================
echo.
echo All Application Load Balancers:
aws elbv2 describe-load-balancers --query "LoadBalancers[*].[LoadBalancerName,LoadBalancerArn,State.Code,Type,Scheme]" --output table

echo.
echo ========================================
echo 3. RDS DATABASES AUDIT
echo ========================================
echo.
echo All RDS Database Instances:
aws rds describe-db-instances --query "DBInstances[*].[DBInstanceIdentifier,DBInstanceStatus,Engine,DBInstanceClass,Endpoint.Address]" --output table

echo.
echo ========================================
echo 4. LAMBDA FUNCTIONS AUDIT
echo ========================================
echo.
echo All Lambda Functions:
aws lambda list-functions --query "Functions[*].[FunctionName,Runtime,LastModified,Description]" --output table

echo.
echo ========================================
echo 5. S3 BUCKETS AUDIT
echo ========================================
echo.
echo All S3 Buckets:
aws s3api list-buckets --query "Buckets[*].[Name,CreationDate]" --output table

echo.
echo ========================================
echo 6. SECURITY GROUPS AUDIT
echo ========================================
echo.
echo All Security Groups:
aws ec2 describe-security-groups --query "SecurityGroups[*].[GroupName,GroupId,Description,VpcId]" --output table

echo.
echo ========================================
echo 7. IAM ROLES AUDIT
echo ========================================
echo.
echo All IAM Roles:
aws iam list-roles --query "Roles[*].[RoleName,CreateDate,Description]" --output table

echo.
echo ========================================
echo 8. ROUTE 53 HOSTED ZONES AUDIT
echo ========================================
echo.
echo All Route 53 Hosted Zones:
aws route53 list-hosted-zones --query "HostedZones[*].[Name,Id,ResourceRecordSetCount]" --output table

echo.
echo ========================================
echo AUDIT COMPLETE
echo ========================================
echo.
echo Next steps:
echo 1. Review the output above to identify Cook Smart resources
echo 2. Run aws-project-categorization.bat to categorize resources by project
echo 3. Run aws-shared-resource-detection.bat to find shared resources
echo.
pause