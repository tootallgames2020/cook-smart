@echo off
echo ========================================
echo AWS Shared Resource Detection
echo ========================================
echo.
echo This script identifies resources that may be shared between projects.
echo CRITICAL: These resources must NOT be deleted during Cook Smart cleanup.
echo.

REM Check if AWS CLI is configured
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: AWS CLI not configured or not authenticated
    pause
    exit /b 1
)

echo ========================================
echo 1. EC2 INSTANCES - SHARED DETECTION
echo ========================================
echo.
echo Checking for EC2 instances that might run multiple applications...
echo.
echo All running EC2 instances with their security groups:
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --query "Reservations[*].Instances[*].[InstanceId,Tags[?Key=='Name'].Value|[0],SecurityGroups[*].GroupName,PublicIpAddress]" --output table

echo.
echo ========================================
echo 2. LOAD BALANCER TARGET GROUPS
echo ========================================
echo.
echo Checking load balancer target groups for shared targets...
echo.
echo All target groups and their targets:
aws elbv2 describe-target-groups --query "TargetGroups[*].[TargetGroupName,LoadBalancerArns[0],TargetType,Port]" --output table

echo.
echo Target health for all target groups:
for /f "tokens=1" %%i in ('aws elbv2 describe-target-groups --query "TargetGroups[*].TargetGroupArn" --output text') do (
    echo.
    echo Target Group: %%i
    aws elbv2 describe-target-health --target-group-arn %%i --query "TargetHealthDescriptions[*].[Target.Id,TargetHealth.State]" --output table 2>nul
)

echo.
echo ========================================
echo 3. RDS DATABASE CONNECTIONS
echo ========================================
echo.
echo Checking RDS databases for multiple users/schemas...
echo.
echo All RDS instances with their security groups:
aws rds describe-db-instances --query "DBInstances[*].[DBInstanceIdentifier,VpcSecurityGroups[*].VpcSecurityGroupId,DBSubnetGroup.VpcId,Endpoint.Address]" --output table

echo.
echo ========================================
echo 4. SECURITY GROUP DEPENDENCIES
echo ========================================
echo.
echo Checking security group references (ingress rules)...
echo.
echo Security groups that reference other security groups:
aws ec2 describe-security-groups --query "SecurityGroups[?IpPermissions[?UserIdGroupPairs]].[GroupName,GroupId,IpPermissions[?UserIdGroupPairs].UserIdGroupPairs[*].GroupId]" --output table

echo.
echo ========================================
echo 5. VPC AND SUBNET SHARING
echo ========================================
echo.
echo Checking VPC and subnet usage across resources...
echo.
echo All VPCs:
aws ec2 describe-vpcs --query "Vpcs[*].[VpcId,Tags[?Key=='Name'].Value|[0],State,CidrBlock]" --output table

echo.
echo Subnet usage by EC2 instances:
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,Tags[?Key=='Name'].Value|[0],SubnetId,VpcId]" --output table

echo.
echo ========================================
echo 6. IAM ROLE USAGE
echo ========================================
echo.
echo Checking IAM roles that might be shared...
echo.
echo IAM roles attached to EC2 instances:
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,Tags[?Key=='Name'].Value|[0],IamInstanceProfile.Arn]" --output table

echo.
echo ========================================
echo 7. S3 BUCKET ACCESS PATTERNS
echo ========================================
echo.
echo Checking S3 bucket policies for cross-project access...
echo.
echo All S3 buckets:
aws s3api list-buckets --query "Buckets[*].Name" --output text

echo.
echo Checking bucket policies (this may take a moment)...
for /f %%i in ('aws s3api list-buckets --query "Buckets[*].Name" --output text') do (
    echo.
    echo Bucket: %%i
    aws s3api get-bucket-policy --bucket %%i --query "Policy" --output text 2>nul || echo "No bucket policy or access denied"
)

echo.
echo ========================================
echo 8. ROUTE 53 DOMAIN SHARING
echo ========================================
echo.
echo Checking Route 53 hosted zones and records...
echo.
echo All hosted zones:
aws route53 list-hosted-zones --query "HostedZones[*].[Name,Id]" --output table

echo.
echo DNS records in each hosted zone:
for /f "tokens=2" %%i in ('aws route53 list-hosted-zones --query "HostedZones[*].Id" --output text') do (
    echo.
    echo Hosted Zone: %%i
    aws route53 list-resource-record-sets --hosted-zone-id %%i --query "ResourceRecordSets[?Type=='A' || Type=='CNAME'].[Name,Type,ResourceRecords[0].Value]" --output table 2>nul
)

echo.
echo ========================================
echo SHARED RESOURCE DETECTION COMPLETE
echo ========================================
echo.
echo CRITICAL ANALYSIS REQUIRED:
echo.
echo 1. Review EC2 instances - any running multiple applications?
echo 2. Check load balancer targets - any shared between projects?
echo 3. Examine RDS databases - any with multiple project schemas?
echo 4. Verify security group dependencies - any cross-project references?
echo 5. Check VPC/subnet sharing - any resources in same network?
echo 6. Review IAM roles - any shared service roles?
echo 7. Examine S3 bucket policies - any cross-project access?
echo 8. Check DNS records - any domains serving multiple projects?
echo.
echo BEFORE ANY CLEANUP:
echo - Identify ALL shared resources from the output above
echo - Document which resources are shared and why
echo - Create a safe cleanup plan that preserves shared resources
echo.
pause