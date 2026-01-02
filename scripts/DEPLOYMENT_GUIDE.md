# Cook Smart Deployment Guide

## Quick Start for Kiro

### 🚀 Normal Deployment (Most Common)
```bash
# Deploy both backend and website
scripts\deploy-all.bat

# Deploy only backend
scripts\deploy-backend-improved.bat

# Deploy only website  
scripts\deploy-website-improved.bat
```

### 📊 Check Status
```bash
# Check if everything is working
scripts\check-status-complete.bat
```

### 🚨 Emergency Deployment
```bash
# Only use for critical fixes
scripts\emergency-deploy.bat
```

## What Each Script Does

### `deploy-all.bat` ⭐ **RECOMMENDED**
- Deploys both backend and website
- Includes verification steps
- Shows clear status messages
- Best for most deployments

### `deploy-backend-improved.bat`
- Updates the API server (34.203.8.150)
- Pulls latest code from `fresh-project-migration` branch
- Restarts the PM2 service
- Tests the API health

### `deploy-website-improved.bat`
- Deploys the website via AWS Amplify
- Updates cooksmartapp.com
- Takes 3-5 minutes to complete
- Shows deployment progress

### `check-status-complete.bat`
- Checks if backend API is responding
- Shows website deployment status
- Displays server health info
- Use this to verify deployments

### `emergency-deploy.bat`
- Force deploys everything (use carefully!)
- Cleans up any conflicts
- Only for critical fixes

## Prerequisites

Make sure you have:
- ✅ SSH key at `c:\Users\toota\.ssh\cook-smart-key.pem`
- ✅ AWS CLI configured with proper credentials
- ✅ Internet connection

## Troubleshooting

### Backend Issues
- If backend deployment fails, try `emergency-deploy.bat`
- Check server logs: `ssh -i "c:\Users\toota\.ssh\cook-smart-key.pem" ubuntu@34.203.8.150 "pm2 logs cook-smart-backend"`

### Website Issues
- Website takes 3-5 minutes to deploy
- Check AWS Amplify console for detailed logs
- If stuck, try `emergency-deploy.bat`

### Common Problems
1. **SSH Permission Denied**: Check if SSH key exists and has correct permissions
2. **AWS CLI Not Found**: Install AWS CLI and configure credentials
3. **Deployment Stuck**: Use `emergency-deploy.bat` to force restart

## URLs After Deployment
- 🔗 **API**: https://api.cooksmartapp.com
- 🔗 **Website**: https://cooksmartapp.com
- 📊 **Health Check**: https://api.cooksmartapp.com/health

## Need Help?
1. Run `check-status-complete.bat` first
2. Try `deploy-all.bat` for normal issues
3. Use `emergency-deploy.bat` only for critical problems
4. Contact the team if scripts fail consistently

---
*Last updated: January 2025*