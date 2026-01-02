@echo off
echo ========================================
echo Fix GitHub Actions SSH Access
echo ========================================
echo.

echo 1. Checking current security group rules...
aws ec2 describe-security-groups --group-ids sg-0b3416f8fffabaca8 --query "SecurityGroups[0].IpPermissions[?FromPort==`22`]" --output table

echo.
echo 2. Current SSH rules for port 22 shown above.
echo.

echo 3. Adding GitHub Actions IP ranges for SSH access...
echo    This will allow GitHub Actions runners to SSH to your server.
echo.

REM GitHub Actions uses dynamic IP ranges, so we'll add a broad range
REM In production, you'd want to be more specific with GitHub's published IP ranges

echo Adding rule for GitHub Actions (0.0.0.0/0 - will narrow down later)...
aws ec2 authorize-security-group-ingress --group-id sg-0b3416f8fffabaca8 --protocol tcp --port 22 --cidr 0.0.0.0/0 --description "GitHub Actions SSH Access"

if %ERRORLEVEL% EQU 0 (
    echo ✅ Successfully added SSH rule for GitHub Actions
) else (
    echo ⚠️  Rule may already exist or there was an error
)

echo.
echo 4. Verifying updated rules...
aws ec2 describe-security-groups --group-ids sg-0b3416f8fffabaca8 --query "SecurityGroups[0].IpPermissions[?FromPort==`22`]" --output table

echo.
echo 🚨 SECURITY WARNING:
echo    We opened SSH to 0.0.0.0/0 for GitHub Actions.
echo    After testing, you should narrow this down to GitHub's specific IP ranges.
echo.
echo ✅ GitHub Actions should now be able to SSH to your server.
echo    Re-run your deployment workflow to test.
echo.

pause