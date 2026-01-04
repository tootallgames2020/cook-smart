#!/bin/bash
set -e

# Log everything
exec > >(tee /var/log/user-data.log) 2>&1
echo "Starting Cook Smart Ubuntu setup at $(date)"

# Update system
echo "Updating system packages..."
apt update -y
apt upgrade -y

# Install SSM agent
echo "Installing SSM agent..."
snap install amazon-ssm-agent --classic
systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service
systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service

# Install Node.js 20 LTS
echo "Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2 globally
echo "Installing PM2..."
npm install -g pm2

# Install nginx
echo "Installing nginx..."
apt-get install -y nginx

# Clone repository
echo "Cloning Cook Smart repository..."
cd /home/ubuntu
git clone https://github.com/tootallgames2020/cook-smart.git
cd cook-smart
git checkout fresh-project-migration

# Set ownership
chown -R ubuntu:ubuntu /home/ubuntu/cook-smart

# Setup backend
echo "Setting up backend..."
cd /home/ubuntu/cook-smart/backend
cp .env.example .env

# Update .env with database credentials
sed -i 's/your-database-host/cook-smart-db-beta.cgfwigy2i9lk.us-east-1.rds.amazonaws.com/g' .env
sed -i 's/your-db-user/cooksmartadmin/g' .env
sed -i 's/your-db-password/CookSmart2024!/g' .env
sed -i 's/your-jwt-secret/cook-smart-jwt-secret-2024/g' .env

# Install dependencies and build
echo "Installing backend dependencies..."
sudo -u ubuntu npm install
echo "Building backend..."
sudo -u ubuntu npm run build

# Start backend with PM2
echo "Starting backend with PM2..."
sudo -u ubuntu pm2 start dist/server.js --name cook-smart-backend
sudo -u ubuntu pm2 save
sudo -u ubuntu pm2 startup

# Configure nginx
echo "Configuring nginx..."
cat > /etc/nginx/sites-available/cook-smart << 'EOF'
server {
    listen 80;
    server_name api.cooksmartapp.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable nginx site
ln -sf /etc/nginx/sites-available/cook-smart /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Test endpoints
echo "Testing endpoints..."
sleep 5
curl -f http://localhost:3000/health || echo "Backend health check failed"
curl -f http://localhost/health || echo "Nginx proxy health check failed"

echo "Cook Smart setup completed at $(date)"
echo "Backend should be running on port 3000"
echo "Nginx proxy should be serving on port 80"