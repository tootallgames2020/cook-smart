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
- **Hosting**: AWS EC2 (54.209.131.6 - ELASTIC IP) - Instance ID: i-0ad64147425a307ac
- **Location**: `/home/ubuntu/cook-smart/backend`
- **Process Manager**: PM2
- **Deployment**: SSH + manual deploy (VERIFIED WORKING)
- **SSH Key**: `secrets/cook-smart-key.pem` (use EC2 Instance Connect for access)
- **Restart Command**: `pm2 restart cook-smart-backend`
- **URL**: https://api.cooksmartapp.com
- **Status**: ✅ OPERATIONAL (as of Jan 26, 2026)



### Database
- **Type**: PostgreSQL 16
- **Hosting**: Local on EC2 instance (NOT RDS)
- **Host**: localhost (on EC2 instance)
- **Port**: 5432
- **Database Name**: `cooksmartdb`
- **User**: `cookuser`
- **Access**: Via backend only (local to EC2)

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
# VERIFIED WORKING METHOD (Jan 26, 2026)

# 1. Enable SSH access via EC2 Instance Connect
aws ec2-instance-connect send-ssh-public-key --instance-id i-0ad64147425a307ac --instance-os-user ubuntu --ssh-public-key "$(ssh-keygen -y -f secrets/cook-smart-key.pem)"

# 2. SSH into server (ELASTIC IP: 54.209.131.6)
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6

# 3. Navigate to backend
cd /home/ubuntu/cook-smart/backend

# 4. Pull latest changes
git pull origin fresh-project-migration

# 5. Build the project
npm run build

# 6. Restart with PM2
pm2 restart cook-smart-backend || pm2 start dist/server.js --name cook-smart-backend

# 7. Check logs
pm2 logs cook-smart-backend --lines 10

# 8. Exit SSH
exit
```

### Alternative: AWS EC2 Restart (if SSH fails)
```bash
# Stop instance
aws ec2 stop-instances --instance-ids i-0ad64147425a307ac

# Wait for stop
aws ec2 wait instance-stopped --instance-ids i-0ad64147425a307ac

# Start instance
aws ec2 start-instances --instance-ids i-0ad64147425a307ac

# Wait for start
aws ec2 wait instance-running --instance-ids i-0ad64147425a307ac
```

### Database Migrations
```bash
# Run from SSH into backend server
# Migrations located in: backend/migrations/

# Enable SSH access first
aws ec2-instance-connect send-ssh-public-key --instance-id i-0ad64147425a307ac --instance-os-user ubuntu --ssh-public-key "$(ssh-keygen -y -f secrets/cook-smart-key.pem)"

# SSH into server (ELASTIC IP: 54.209.131.6)
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6

# Connect to local database
PGPASSWORD='CookSmart2024!' psql -h localhost -U cookuser -d cooksmartdb

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
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cooksmartdb
DB_USER=cookuser
DB_PASSWORD=CookSmart2024!
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
- **EC2**: Backend server hosting with local PostgreSQL
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

## VERIFIED AWS INFRASTRUCTURE (Jan 5, 2026)

**Discovered via AWS CLI:**
- **AWS Account**: 976289921508
- **User**: kitchen-helper-deploy (legacy name, manages Cook Smart resources)
- **Region**: us-east-1

### Active Resources
- **Backend EC2**: i-0ad64147425a307ac (54.209.131.6 - ELASTIC IP) - "cook-smart-backend" ✅
- **Database**: Local PostgreSQL on EC2 instance ✅
- **Route 53**: cooksmartapp.com hosted zone ✅

### Legacy Resources (Cleaned Up)
- **Old EC2**: i-0e1b438399093659d - TERMINATED ✅

## Common Mistakes to Avoid

❌ **Don't assume Vercel** - Website is on AWS
❌ **Don't use Expo commands** - Pure React Native
❌ **Don't hardcode local IPs** - Use environment variables
❌ **Don't skip PM2 restart** - Backend won't update without it
❌ **Don't commit secrets** - Use .env files
❌ **Don't add paid services** - Check budget first
❌ **Don't use wrong IP addresses** - Use 54.209.131.6 (ELASTIC IP), not old IPs
❌ **Don't use old SSH methods** - Use EC2 Instance Connect, not direct SSH
❌ **Don't use old scripts** - Many scripts in /scripts folder are obsolete (see SSH_ACCESS_SOLUTION.md)

## Quick Reference Commands

### Check Backend Status (WORKING)
```bash
# Enable SSH access first
aws ec2-instance-connect send-ssh-public-key --instance-id i-0ad64147425a307ac --instance-os-user ubuntu --ssh-public-key "$(ssh-keygen -y -f secrets/cook-smart-key.pem)"

# Check status
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "pm2 status"
```

### View Backend Logs (WORKING)
```bash
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "pm2 logs cook-smart-backend --lines 50"
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

- **Backend Server**: 54.209.131.6 (ELASTIC IP - PERMANENT)
- **Database**: Local PostgreSQL on EC2 instance
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

**Last Updated**: January 26, 2026
**Maintained By**: Project team
**Purpose**: Prevent deployment errors and infrastructure confusion

## DEPLOYMENT SUCCESS SUMMARY (Jan 26, 2026)

✅ **CRITICAL ISSUE RESOLVED**: Backend deployment completed successfully
✅ **Infrastructure Fixed**: Allocated Elastic IP (54.209.131.6) - no more IP changes
✅ **SSH Access**: Working via EC2 Instance Connect from any location
✅ **Payment Features**: New payment methods and billing history endpoints deployed
✅ **API Status**: All endpoints operational including `/api/v1/payments/*`
✅ **Database**: Connected and operational
✅ **Google Play Ready**: Stable infrastructure for production launch

## SSH & Script Changes Made

### The Problem We Solved
- **IP Instability**: EC2 restarts changed IP addresses, breaking DNS and deployments
- **SSH Key Issues**: Windows SSH client had permission and format problems
- **Mobile Access**: User needed SSH access from any IP/location
- **Broken Scripts**: Many deployment scripts used wrong IPs and SSH methods

### The Solution Implemented
- **Elastic IP**: 54.209.131.6 (PERMANENT - will never change again)
- **EC2 Instance Connect**: Bypasses SSH key issues, works from any IP
- **New Scripts**: Created working deployment scripts with correct methods
- **Documentation**: Updated all infrastructure docs with new procedures

### Scripts Status
- ✅ **New Working Scripts**: `deploy-backend-new.bat`, `check-backend-status-new.bat`, `update-stripe-config-new.bat`
- ❌ **Old Broken Scripts**: Removed scripts with wrong IPs and SSH methods
- ⚠️ **Legacy Scripts**: Many scripts in `/scripts/` folder still broken (don't use)

### Why This Won't Happen Again
1. **Permanent IP**: Elastic IP 54.209.131.6 will never change
2. **Mobile SSH**: EC2 Instance Connect works from anywhere
3. **Documented Process**: Clear instructions in infrastructure docs
4. **Working Scripts**: New scripts use correct IP and SSH method

