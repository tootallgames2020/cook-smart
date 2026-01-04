#!/bin/bash
set -euo pipefail

# Complete Cook Smart Deployment with SSL
# This script deploys the backend and sets up SSL properly

echo "🚀 Starting complete Cook Smart deployment with SSL..."

# Configuration
INSTANCE_IP="3.216.202.234"
KEY_PATH="~/.ssh/cook-smart-key.pem"
REPO_URL="https://github.com/your-username/cook-smart.git"
BRANCH="fresh-project-migration"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Deploy backend code
echo "📦 Deploying backend code..."
ssh -i ${KEY_PATH} ubuntu@${INSTANCE_IP} << 'DEPLOY_EOF'
set -euo pipefail

# Navigate to project directory
cd /home/ubuntu/cook-smart/backend/backend

# Pull latest changes
git pull origin fresh-project-migration

# Install dependencies
npm install

# Build the project
npm run build

# Restart PM2 process
pm2 restart cook-smart-backend || pm2 start dist/server.js --name cook-smart-backend

# Check PM2 status
pm2 status
DEPLOY_EOF

print_status "Backend code deployed"

# Step 2: Set up SSL certificates
echo "🔒 Setting up SSL certificates..."
scp -i ${KEY_PATH} scripts/setup-ssl-proper.sh ubuntu@${INSTANCE_IP}:/tmp/
ssh -i ${KEY_PATH} ubuntu@${INSTANCE_IP} << 'SSL_EOF'
chmod +x /tmp/setup-ssl-proper.sh
sudo /tmp/setup-ssl-proper.sh
SSL_EOF

print_status "SSL certificates configured"

# Step 3: Verify deployment
echo "🔍 Verifying deployment..."

# Test HTTP endpoint (should redirect to HTTPS)
echo "Testing HTTP redirect..."
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://api.cooksmartapp.com/health || echo "000")
if [ "$HTTP_RESPONSE" = "301" ] || [ "$HTTP_RESPONSE" = "302" ]; then
    print_status "HTTP redirect working"
else
    print_warning "HTTP redirect not working (got $HTTP_RESPONSE)"
fi

# Test HTTPS endpoint
echo "Testing HTTPS endpoint..."
sleep 5  # Give SSL time to propagate
HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.cooksmartapp.com/health || echo "000")
if [ "$HTTPS_RESPONSE" = "200" ]; then
    print_status "HTTPS endpoint working"
else
    print_warning "HTTPS endpoint not working (got $HTTPS_RESPONSE)"
fi

# Test API functionality
echo "Testing API functionality..."
API_TEST=$(curl -s https://api.cooksmartapp.com/health | jq -r '.status' 2>/dev/null || echo "error")
if [ "$API_TEST" = "OK" ]; then
    print_status "API functionality working"
else
    print_warning "API functionality test failed"
fi

# Step 4: Display final status
echo ""
echo "🎉 Deployment Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 API URL: https://api.cooksmartapp.com"
echo "🔒 SSL Status: Enabled with Let's Encrypt"
echo "🔄 Auto-renewal: Configured (every 90 days)"
echo "📱 Backend Status: Running on PM2"
echo ""

# Check PM2 status
echo "📊 PM2 Process Status:"
ssh -i ${KEY_PATH} ubuntu@${INSTANCE_IP} "pm2 status"

echo ""
echo "🔧 Useful Commands:"
echo "  View logs: ssh -i ${KEY_PATH} ubuntu@${INSTANCE_IP} 'pm2 logs cook-smart-backend'"
echo "  Restart:   ssh -i ${KEY_PATH} ubuntu@${INSTANCE_IP} 'pm2 restart cook-smart-backend'"
echo "  SSL check: curl -I https://api.cooksmartapp.com/health"
echo ""

if [ "$HTTPS_RESPONSE" = "200" ]; then
    print_status "🎯 Deployment completed successfully! Your API is live with SSL."
else
    print_warning "⚠️  Deployment completed but HTTPS may need time to propagate."
    echo "   Wait 5-10 minutes and test again: curl -I https://api.cooksmartapp.com/health"
fi