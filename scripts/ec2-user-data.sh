#!/bin/bash

# Cook Smart EC2 User Data Script
# This script runs when the EC2 instance first boots up
# It installs all necessary software and prepares the server

set -e

# Update system
apt-get update -y
apt-get upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PostgreSQL
apt-get install -y postgresql postgresql-contrib

# Install PM2 globally
npm install -g pm2

# Install Nginx
apt-get install -y nginx

# Install Git
apt-get install -y git

# Install certbot for SSL
apt-get install -y certbot python3-certbot-nginx

# Create cook-smart user
useradd -m -s /bin/bash cook-smart
usermod -aG sudo cook-smart

# Set up PostgreSQL
sudo -u postgres createuser --createdb cook-smart
sudo -u postgres createdb cooksmartdb -O cook-smart
sudo -u postgres psql -c "ALTER USER \"cook-smart\" PASSWORD 'CookSmart2024!';"

# Configure PostgreSQL to allow local connections
echo "local   all             cook-smart                              md5" >> /etc/postgresql/*/main/pg_hba.conf
systemctl restart postgresql

# Create application directory
mkdir -p /home/cook-smart/app
chown cook-smart:cook-smart /home/cook-smart/app

# Configure Nginx
cat > /etc/nginx/sites-available/cook-smart << 'EOF'
server {
    listen 80;
    server_name api.cooksmartapp.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/cook-smart /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# Create startup script for the application
cat > /home/cook-smart/start-app.sh << 'EOF'
#!/bin/bash
cd /home/cook-smart/app/backend
npm install
npm run build
pm2 start dist/server.js --name cook-smart-backend
pm2 save
pm2 startup
EOF

chmod +x /home/cook-smart/start-app.sh
chown cook-smart:cook-smart /home/cook-smart/start-app.sh

# Create environment file template
cat > /home/cook-smart/.env.template << 'EOF'
# Cook Smart Backend Environment Configuration

# Server Configuration
NODE_ENV=production
PORT=3000
APP_URL=https://cooksmartapp.com
API_URL=https://api.cooksmartapp.com

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cooksmartdb
DB_USER=cook-smart
DB_PASSWORD=CookSmart2024!

# JWT Configuration
JWT_SECRET=cook-smart-jwt-secret-production-2024-secure-key
JWT_EXPIRES_IN=90d

# FatSecret API Configuration
FATSECRET_CLIENT_ID=your-fatsecret-client-id
FATSECRET_CLIENT_SECRET=your-fatsecret-client-secret
FATSECRET_BASE_URL=https://platform.fatsecret.com/rest/server.api

# Email Configuration (Resend)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=Cook Smart <noreply@cooksmartapp.com>

# Discord Webhooks (Optional)
DISCORD_WEBHOOK_URL=your-discord-webhook-url
DISCORD_ERROR_WEBHOOK_URL=your-discord-error-webhook-url

# Feature Flags
ENABLE_CACHING=true
ENABLE_RATE_LIMITING=true
ENABLE_CORS=true
ENABLE_COMPRESSION=true

# Logging
LOG_LEVEL=info
EOF

chown cook-smart:cook-smart /home/cook-smart/.env.template

# Install AWS CLI for future management
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip

# Set up log rotation
cat > /etc/logrotate.d/cook-smart << 'EOF'
/home/cook-smart/.pm2/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 0644 cook-smart cook-smart
    postrotate
        sudo -u cook-smart pm2 reloadLogs
    endscript
}
EOF

# Create deployment script
cat > /home/cook-smart/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "Starting Cook Smart deployment..."

# Navigate to app directory
cd /home/cook-smart/app

# Check if codebase was uploaded
if [ ! -f "package.json" ] && [ ! -d "backend" ]; then
    echo "ERROR: Cook Smart codebase not found!"
    echo "Please upload the codebase first using the upload script"
    echo "Run: ./upload-codebase.sh from your local machine"
    exit 1
fi

# Install backend dependencies
cd backend
echo "Installing dependencies..."
npm install

# Build the application
echo "Building application..."
npm run build

# Run database migrations
echo "Setting up database..."
PGPASSWORD=CookSmart2024! psql -h localhost -U cook-smart -d cooksmartdb -f migrations/000_complete_database_setup.sql
PGPASSWORD=CookSmart2024! psql -h localhost -U cook-smart -d cooksmartdb -f migrations/001_insert_special_users.sql

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating environment file from template..."
    cp /home/cook-smart/.env.template .env
    echo "IMPORTANT: Edit .env file with your actual credentials!"
fi

# Restart PM2 process
echo "Restarting application..."
pm2 delete cook-smart-backend 2>/dev/null || true
pm2 start dist/server.js --name cook-smart-backend
pm2 save

echo "Deployment complete!"
echo "Application is running on port 3000"
echo "Nginx is proxying requests from port 80"
echo ""
echo "Next steps:"
echo "1. Edit /home/cook-smart/app/backend/.env with your FatSecret credentials"
echo "2. Run: pm2 restart cook-smart-backend"
echo "3. Set up SSL: sudo certbot --nginx -d api.cooksmartapp.com"
EOF

chmod +x /home/cook-smart/deploy.sh
chown cook-smart:cook-smart /home/cook-smart/deploy.sh

# Enable services
systemctl enable postgresql
systemctl enable nginx
systemctl enable pm2-cook-smart 2>/dev/null || true

# Create status check script
cat > /home/cook-smart/status.sh << 'EOF'
#!/bin/bash
echo "=== Cook Smart Server Status ==="
echo ""
echo "System Status:"
systemctl is-active postgresql nginx
echo ""
echo "PM2 Status:"
pm2 status
echo ""
echo "Disk Usage:"
df -h /
echo ""
echo "Memory Usage:"
free -h
echo ""
echo "Recent Logs:"
pm2 logs cook-smart-backend --lines 10 --nostream
EOF

chmod +x /home/cook-smart/status.sh
chown cook-smart:cook-smart /home/cook-smart/status.sh

# Final setup message
cat > /home/cook-smart/README.txt << 'EOF'
Cook Smart Server Setup Complete!

Your server is ready for deployment. Here's what was installed:
- Node.js 18.x
- PostgreSQL database (cooksmartdb)
- PM2 process manager
- Nginx reverse proxy
- SSL certificate support (certbot)

Next Steps:
1. SSH into the server: ssh -i ~/.ssh/cook-smart-key.pem ubuntu@YOUR_IP
2. Switch to cook-smart user: sudo su - cook-smart
3. Run deployment: ./deploy.sh
4. Edit environment file: nano app/backend/.env
5. Restart application: pm2 restart cook-smart-backend
6. Set up SSL: sudo certbot --nginx -d api.cooksmartapp.com

Useful Commands:
- Check status: ./status.sh
- View logs: pm2 logs cook-smart-backend
- Restart app: pm2 restart cook-smart-backend
- Deploy updates: ./deploy.sh

The application will be available at:
- HTTP: http://api.cooksmartapp.com
- HTTPS: https://api.cooksmartapp.com (after SSL setup)
EOF

chown cook-smart:cook-smart /home/cook-smart/README.txt

echo "EC2 User Data script completed successfully!"