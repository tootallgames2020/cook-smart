@echo off
echo Deploying AWS Amplify Infrastructure...
echo.

echo Step 1: Deploying CloudFormation stack...
aws cloudformation deploy ^
    --template-file infrastructure\amplify-setup.yml ^
    --stack-name cook-smart-website ^
    --capabilities CAPABILITY_IAM

if %errorlevel% neq 0 (
    echo Infrastructure deployment failed!
    echo.
    echo This might be because:
    echo 1. AWS CLI is not configured
    echo 2. You don't have the necessary permissions
    echo 3. The stack already exists
    echo.
    echo Try running: aws sts get-caller-identity
    echo to verify your AWS credentials are working.
    pause
    exit /b 1
)

echo.
echo Infrastructure deployed successfully!
echo.

echo Step 2: Getting deployment information...
echo Getting Amplify App ID...
aws cloudformation describe-stacks --stack-name cook-smart-website --query "Stacks[0].Outputs[?OutputKey=='AmplifyAppId'].OutputValue" --output text

echo.
echo Deployment Complete!
echo.
echo Next Steps:
echo 1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/
echo 2. Find your "cook-smart-website" app
echo 3. Connect your GitHub repository
echo 4. Choose "fresh-project-migration" branch
echo 5. Deploy!
echo.

pause