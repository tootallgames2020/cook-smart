---
inclusion: manual
---

# Deployment Lessons Learned - Dec 23, 2025

## What We Discovered

### Real AWS Infrastructure
- **Backend Server**: 34.203.8.150 (i-05e0746da4f5f9da0) ✅
- **Database**: cook-smart-db-beta.cgfwigy2i9lk.us-east-1.rds.amazonaws.com ✅
- **AWS Account**: 976289921508
- **User**: kitchen-helper-deploy (legacy name)

### What Worked ✅

1. **AWS CLI Discovery**
   ```bash
   aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress,Tags[?Key=='Name'].Value|[0]]" --output table
   ```

2. **EC2 Restart via AWS CLI**
   ```bash
   aws ec2 stop-instances --instance-ids i-05e0746da4f5f9da0
   aws ec2 start-instances --instance-ids i-05e0746da4f5f9da0
   ```

3. **Backend Deployment Process**
   ```bash
   ssh -i ~/.ssh/cook-smart-key.pem ubuntu@34.203.8.150
   cd /home/ubuntu/cook-smart/backend/backend
   git pull origin fresh-project-migration
   npm run build
   pm2 restart cook-smart-backend
   ```

4. **TypeScript Error Fix**
   ```bash
   sed -i 's/notificationError.message/(notificationError as Error).message/g' src/services/NotificationService.ts
   ```

5. **Environment File Fix**
   ```bash
   cp .env.example .env
   sed -i 's/your-database-host/cook-smart-db-beta.cgfwigy2i9lk.us-east-1.rds.amazonaws.com/g' .env
   sed -i 's/your-db-user/cooksmartadmin/g' .env
   sed -i 's/your-db-password/CookSmart2024!/g' .env
   ```

6. **Contact Form Fix**
   - Removed Discord integration from contact route
   - Kept email-only functionality via Resend
   - Verified working: `{"success":true,"message":"Message sent successfully"}`

### What Didn't Work ❌

1. **Wrong IP Addresses in Scripts**
   - Old scripts used 3.237.38.24 (wrong)
   - Correct IP is 34.203.8.150

2. **Missing Build Step**
   - Backend needs `npm run build` to compile TypeScript
   - Can't run without `dist/server.js`

3. **Missing Environment File**
   - Server had `.env.example` but no `.env`
   - Database connection failed without proper credentials

4. **TypeScript Errors**
   - `notificationError.message` needed type casting
   - Blocked build until fixed

5. **Discord Integration in Contact Form**
   - Caused contact form failures
   - Removed Discord webhook from contact route only
   - Kept other Discord webhooks for system monitoring

### Scripts Created ✅

1. **scripts/deploy-backend.bat** - Working deployment script
2. **scripts/check-backend-status.bat** - Status checking
3. **scripts/restart-backend-aws.bat** - AWS EC2 restart
4. **scripts/clean-backend-deploy.bat** - Clean deployment with fixes

### Scripts Removed ❌

1. **scripts/deploy-now.bat** - Had wrong IP (3.237.38.24)
2. **scripts/restart-production.bat** - Had wrong IP
3. **scripts/discover-aws-setup.bat** - One-time use, no longer needed

## Key Takeaways

1. **Always verify infrastructure** - Don't trust old documentation
2. **Use AWS CLI to discover resources** - More reliable than guessing
3. **Check environment files** - Missing .env causes mysterious failures
4. **Build before deploy** - TypeScript needs compilation
5. **Test endpoints after deployment** - Verify functionality works
6. **Keep working scripts, delete broken ones** - Avoid confusion

## Emergency Procedures

### If Backend is Down
1. Check AWS console - is EC2 instance running?
2. Try SSH connection - `ssh -i ~/.ssh/cook-smart-key.pem ubuntu@34.203.8.150`
3. If SSH fails, restart EC2 via AWS CLI
4. Check PM2 status - `pm2 status`
5. Check logs - `pm2 logs cook-smart-backend --lines 20`

### If Contact Form Fails
1. Test API health - `curl https://api.cooksmartapp.com/health`
2. Test contact endpoint - `curl -X POST https://api.cooksmartapp.com/contact ...`
3. Check backend logs for errors
4. Verify Resend API key in environment

### If Database Connection Fails
1. Check RDS instance status in AWS console
2. Verify database credentials in `.env`
3. Test connection from backend server
4. Check security groups allow connection

---

**Last Updated**: December 23, 2025
**Status**: Contact form working, backend operational
**Next**: Monitor for any issues, clean up legacy AWS resources when safe
