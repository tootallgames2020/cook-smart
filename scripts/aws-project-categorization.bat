@echo off
echo ========================================
echo AWS Project Categorization
echo ========================================
echo.
echo This script categorizes resources by project tags to identify:
echo - Cook Smart resources (for potential cleanup)
echo - Nexus Discord Bot resources (PRESERVE)
echo - Stream Guard AI resources (PRESERVE)
echo - Untagged resources (INVESTIGATE)
echo.

REM Check if AWS CLI is configured
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: AWS CLI not configured or not authenticated
    pause
    exit /b 1
)

echo ========================================
echo COOK SMART RESOURCES
echo ========================================
echo.
echo Resources tagged with Project=CookSmart:
aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=CookSmart --query "ResourceTagMappingList[*].[ResourceARN,Tags[?Key=='Name'].Value|[0]]" --output table

echo.
echo Resources with 'cook' or 'smart' in name (case insensitive):
echo.
echo EC2 Instances:
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,Tags[?Key=='Name'].Value|[0],State.Name] | [?contains(to_lower([1]), 'cook') || contains(to_lower([1]), 'smart')]" --output table

echo.
echo Load Balancers:
aws elbv2 describe-load-balancers --query "LoadBalancers[?contains(to_lower(LoadBalancerName), 'cook') || contains(to_lower(LoadBalancerName), 'smart')].[LoadBalancerName,State.Code]" --output table

echo.
echo RDS Instances:
aws rds describe-db-instances --query "DBInstances[?contains(to_lower(DBInstanceIdentifier), 'cook') || contains(to_lower(DBInstanceIdentifier), 'smart')].[DBInstanceIdentifier,DBInstanceStatus]" --output table

echo.
echo ========================================
echo NEXUS DISCORD BOT RESOURCES
echo ========================================
echo.
echo Resources tagged with Project=NexusBot:
aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=NexusBot --query "ResourceTagMappingList[*].[ResourceARN,Tags[?Key=='Name'].Value|[0]]" --output table

echo.
echo Resources with 'nexus' in name (case insensitive):
echo.
echo EC2 Instances:
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,Tags[?Key=='Name'].Value|[0],State.Name] | [?contains(to_lower([1]), 'nexus')]" --output table

echo.
echo Load Balancers:
aws elbv2 describe-load-balancers --query "LoadBalancers[?contains(to_lower(LoadBalancerName), 'nexus')].[LoadBalancerName,State.Code]" --output table

echo.
echo ========================================
echo STREAM GUARD AI RESOURCES
echo ========================================
echo.
echo Resources tagged with Project=StreamGuard:
aws resourcegroupstaggingapi get-resources --tag-filters Key=Project,Values=StreamGuard --query "ResourceTagMappingList[*].[ResourceARN,Tags[?Key=='Name'].Value|[0]]" --output table

echo.
echo Resources with 'stream' or 'guard' in name (case insensitive):
echo.
echo EC2 Instances:
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,Tags[?Key=='Name'].Value|[0],State.Name] | [?contains(to_lower([1]), 'stream') || contains(to_lower([1]), 'guard')]" --output table

echo.
echo Load Balancers:
aws elbv2 describe-load-balancers --query "LoadBalancers[?contains(to_lower(LoadBalancerName), 'stream') || contains(to_lower(LoadBalancerName), 'guard')].[LoadBalancerName,State.Code]" --output table

echo.
echo ========================================
echo KITCHEN HELPER / LEGACY RESOURCES
echo ========================================
echo.
echo Resources with 'kitchen' or 'helper' in name (legacy Cook Smart):
echo.
echo EC2 Instances:
aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,Tags[?Key=='Name'].Value|[0],State.Name] | [?contains(to_lower([1]), 'kitchen') || contains(to_lower([1]), 'helper')]" --output table

echo.
echo Load Balancers:
aws elbv2 describe-load-balancers --query "LoadBalancers[?contains(to_lower(LoadBalancerName), 'kitchen') || contains(to_lower(LoadBalancerName), 'helper')].[LoadBalancerName,State.Code]" --output table

echo.
echo Security Groups:
aws ec2 describe-security-groups --query "SecurityGroups[?contains(to_lower(GroupName), 'kitchen') || contains(to_lower(GroupName), 'helper')].[GroupName,GroupId,Description]" --output table

echo.
echo ========================================
echo UNTAGGED RESOURCES (INVESTIGATE)
echo ========================================
echo.
echo Resources without Project tags (need investigation):
aws resourcegroupstaggingapi get-resources --query "ResourceTagMappingList[?!Tags[?Key=='Project']].[ResourceARN] | [0:20]" --output table

echo.
echo ========================================
echo CATEGORIZATION COMPLETE
echo ========================================
echo.
echo Next steps:
echo 1. Review the categorized resources above
echo 2. Identify any Cook Smart resources that need cleanup
echo 3. Verify that Nexus and Stream Guard resources are properly identified
echo 4. Run aws-shared-resource-detection.bat to check for shared resources
echo.
pause