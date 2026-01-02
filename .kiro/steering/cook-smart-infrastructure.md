---
inclusion: always
---

# Cook Smart Infrastructure & Deployment Guide

## CRITICAL: Read This First

This document contains vital infrastructure information. Always reference this before making deployment assumptions.

## Hosting & Deployment

### Website (cooksmartapp.com)
- **Hosting**: AWS (NOT Vercel, NOT Netlify)
- **Deployment**: Auto-deploy via GitHub push
- **Repository Branch**: `fresh-project-migration`
- **Process**: Push to GitHub → AWS auto-deploys (5-10 minutes)
- **Location**: `website/` folder
- **Framework**: Next.js 14 (App Router)
- **URL**: https://cooksmartapp.com

### Backend API (api.cooksmartapp.com)
- **Hosting**: AWS EC2 (34.203.8.150) - Instance ID: i-05e0746da4f5f9da0
- **Location**: `/home/ubuntu/cook-smart/backend/backend`
- **Process Manager**: PM2
- **Deployment**: SSH + manual deploy (VERIFIED WORKING)
- **SSH Key**: `~/.ssh/cook-smart-key.pem`
- **Restart Command**: `pm2 restart cook-smart-backend`
- **URL**: https://api.cooksmartapp.com
- **Status**: ✅ OPERATIONAL (as of Dec 23, 2025)

### Database
- **Type**: PostgreSQL 16
- **Hosting**: AWS RDS
- **Endpoint**: `cook-smart-db-beta.cgfwigy2i9lk.us-east-1.rds.amazonaws.com`
- **Port**: 5432
- **Database Name**: `cooksmartdb`
- **Access**: Via backend only (not publicly accessible)

### Mobile App
- **Framework**: React Native (NO Expo)
- **Platform**: Android (iOS planned)
- **Build Location**: `android/app/build/outputs/apk/release/`
- **Latest APK**: Keep only latest version, delete old ones

## Deployment Workflows

### Website Deployment
```bash
# 1. Make changes in website/ folder
# 2. Commit changes
git add website/
git commit -m "Update: description"

# 3. Push to trigger auto-deploy
git push origin fresh-project-migration

# 4. Wait 5-10 minutes for AWS deployment
# 5. Verify at https://cooksmartapp.com
```

### Backend Deployment
```bash
# VERIFIED WORKING METHOD (Dec 23, 2025)

# 1. SSH into server (IP confirmed: 34.203.8.150)
ssh -i ~/.ssh/cook-smart-key.pem ubuntu@34.203.8.150

# 2. Navigate to backend
cd /home/ubuntu/cook-smart/backend/backend

# 3. Pull latest changes
git pull origin fresh-project-migration

# 4. Fix TypeScript errors if needed
sed -i 's/notificationError.message/(notificationError as Error).message/g' src/services/NotificationService.ts

# 5. Build the project
npm run build

# 6. Restart with PM2
pm2 restart cook-smart-backend

# 7. Check logs
pm2 logs cook-smart-backend --lines 10

# 8. Exit SSH
exit
```

### Alternative: AWS EC2 Restart (if SSH fails)
```bash
# Stop instance
aws ec2 stop-instances --instance-ids i-05e0746da4f5f9da0

# Wait for stop
aws ec2 wait instance-stopped --instance-ids i-05e0746da4f5f9da0

# Start instance
aws ec2 start-instances --instance-ids i-05e0746da4f5f9da0

# Wait for start
aws ec2 wait instance-running --instance-ids i-05e0746da4f5f9da0
```

### Database Migrations
```bash
# Run from local machine or SSH into backend server
# Migrations located in: backend/migrations/

# Connect to database
psql -h cook-smart-db-beta.cgfwigy2i9lk.us-east-1.rds.amazonaws.com \
     -U cooksmartadmin \
     -d cooksmartdb

# Run migration file
\i backend/migrations/XXX_migration_name.sql
```

## API Configuration

### Development vs Production
- **Development**: Uses local server `http://192.168.12.196:3000`
- **Production**: Uses `https://api.cooksmartapp.com`
- **Config File**: `src/config/api.ts`
- **Rule**: Release builds MUST use production URL

### Environment Variables

**Backend (.env)**
```env
DB_HOST=cook-smart-db-beta.cgfwigy2i9lk.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=cooksmartdb
DB_USER=cooksmartadmin
DB_PASSWORD=[stored securely]
JWT_SECRET=[stored securely]
FATSECRET_CLIENT_ID=[stored securely]
FATSECRET_CLIENT_SECRET=[stored securely]
```

**Website (.env.local)**
```env
NEXT_PUBLIC_API_URL=https://api.cooksmartapp.com
NEXT_PUBLIC_SITE_URL=https://cooksmartapp.com
RESEND_API_KEY=[stored securely]
```

## Third-Party Services

### FatSecret API
- **Purpose**: Primary recipe provider (1M+ recipes)
- **Plan**: Premier (500,000 calls/month)
- **Cost**: FREE during beta
- **Usage**: All user recipe searches, trending recipes
- **Credentials**: Stored in backend .env

### AWS Services Used
- **EC2**: Backend server hosting
- **RDS**: PostgreSQL database
- **S3**: File storage (planned)
- **Route 53**: DNS management
- **Certificate Manager**: SSL certificates

### Email Service
- **Provider**: Resend
- **Purpose**: Contact form, notifications
- **Integration**: Website contact form

### Discord Community
- **Purpose**: User community, support, feedback
- **Invite Link**: https://discord.gg/btemMmWy2e
- **Cost**: FREE
- **Integration**: Website footer, contact page, mobile app home screen
- **Channels**: announcements, bug-reports, feature-ideas, general, recipe-sharing, help

## Budget & Cost Monitoring

### Current Budget
- **Emergency Budget**: $20/month (use only when necessary)
- **Priority**: Free tier and open-source solutions
- **Scaling**: Budget increases with user growth/revenue

### Cost Monitoring
- **CloudWatch Alarm**: Alerts at $15/month
- **Check Command**: `infrastructure/check-costs.bat`
- **Rule**: Verify cost implications before adding ANY service

## Repository Structure

```
cook-smart/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   └── server.ts    # Entry point
│   └── migrations/      # Database migrations
├── website/             # Next.js website
│   ├── app/            # Pages (App Router)
│   ├── components/     # React components
│   └── lib/            # Utilities
├── src/                # React Native mobile app
│   ├── components/
│   ├── screens/
│   └── config/
├── android/            # Android build files
├── infrastructure/     # AWS CloudFormation
└── .kiro/             # Kiro configuration
    └── steering/      # Project rules
```

## VERIFIED AWS INFRASTRUCTURE (Dec 23, 2025)

**Discovered via AWS CLI:**
- **AWS Account**: 976289921508
- **User**: kitchen-helper-deploy (legacy name, manages Cook Smart resources)
- **Region**: us-east-1

### Active Resources
- **Backend EC2**: i-05e0746da4f5f9da0 (34.203.8.150) - "cook-smart-backend" ✅
- **Database RDS**: cook-smart-db-beta.cgfwigy2i9lk.us-east-1.rds.amazonaws.com ✅
- **Route 53**: cooksmartapp.com hosted zone ✅
- **CloudFormation**: cook-smart-infrastructure-beta stack ✅

### Legacy Resources (Not Used)
- **Old EC2**: i-0fb0d2533ab325c06 (54.158.22.192) - "StreamGuard-AI-Bot-Separate"
- **Old Stack**: kitchen-helper-alb
- **Old Security Groups**: kitchen-helper-* (can be cleaned up later)

## Common Mistakes to Avoid

❌ **Don't assume Vercel** - Website is on AWS
❌ **Don't use Expo commands** - Pure React Native
❌ **Don't hardcode local IPs** - Use environment variables
❌ **Don't skip PM2 restart** - Backend won't update without it
❌ **Don't commit secrets** - Use .env files
❌ **Don't add paid services** - Check budget first
❌ **Don't use wrong IP addresses** - Use 34.203.8.150, not 3.237.38.24

## Quick Reference Commands

### Check Backend Status (WORKING)
```bash
ssh -i ~/.ssh/cook-smart-key.pem ubuntu@34.203.8.150 "pm2 status"
```

### View Backend Logs (WORKING)
```bash
ssh -i ~/.ssh/cook-smart-key.pem ubuntu@34.203.8.150 "pm2 logs cook-smart-backend --lines 50"
```

### Test API Endpoint (WORKING)
```bash
curl https://api.cooksmartapp.com/health
# Should return: {"status":"OK","message":"Cook Smart API is running"...}
```

### Test Contact Form (WORKING)
```bash
curl -X POST https://api.cooksmartapp.com/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Test message"}'
# Should return: {"success":true,"message":"Message sent successfully"}
```

### Build Android APK
```bash
cd android
gradlew assembleRelease
```

### Run Verification
```bash
node .kiro/verify-and-scan.js
```

## Emergency Contacts

- **Backend Server**: 34.203.8.150
- **Database**: cook-smart-db-beta.cgfwigy2i9lk.us-east-1.rds.amazonaws.com
- **Website**: https://cooksmartapp.com
- **API**: https://api.cooksmartapp.com
- **Support Email**: services.cooksmart@gmail.com

## Verification Checklist

Before any deployment:
- [ ] Run verification scan (`node .kiro/verify-and-scan.js`)
- [ ] All tests passing (0 errors)
- [ ] Environment variables correct
- [ ] API URLs point to production (for releases)
- [ ] No secrets in code
- [ ] Cost implications checked
- [ ] PM2 restart after backend changes
- [ ] Wait for AWS deployment after website changes

---

**Last Updated**: December 6, 2025
**Maintained By**: Project team
**Purpose**: Prevent deployment errors and infrastructure confusion

