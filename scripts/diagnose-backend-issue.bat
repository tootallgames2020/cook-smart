@echo off
echo 🔍 Backend Diagnostic - What's Actually Happening?
echo ==================================================

echo.
echo Step 1: Check if server is running
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=ps aux | grep node"

echo.
echo Step 2: Check PM2 processes
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=pm2 list"

echo.
echo Step 3: Check nginx status
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=systemctl status nginx"

echo.
echo Step 4: Check nginx configuration
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=nginx -t"

echo.
echo Step 5: Check if port 3000 is listening
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=netstat -tlnp | grep 3000"

echo.
echo Step 6: Check backend directory
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=ls -la /home/ubuntu/cook-smart/backend/backend/"

echo.
echo Step 7: Check if dist folder exists
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=ls -la /home/ubuntu/cook-smart/backend/backend/dist/"

echo.
echo Step 8: Check environment file
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=ls -la /home/ubuntu/cook-smart/backend/backend/.env"

echo.
echo Step 9: Test local connection
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=curl -s http://localhost:3000/health"

echo.
echo Step 10: Check nginx error logs
aws ssm send-command --instance-ids i-0e2c8623378f172c8 --document-name "AWS-RunShellScript" --parameters "commands=tail -20 /var/log/nginx/error.log"

echo.
echo ✅ Diagnostic complete! Check the output above to see what's wrong.