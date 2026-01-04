#!/bin/bash
set -euo pipefail

# Proper SSL Setup for Amazon Linux 2
# This script installs Certbot and sets up SSL certificates

echo "🔒 Setting up SSL certificates for Cook Smart API..."

# Update system
sudo yum update -y

# Install EPEL repository (required for Certbot)
sudo yum install -y epel-release

# Install Certbot and Nginx plugin
sudo yum install -y certbot python3-certbot-nginx

# Verify Certbot installation
if ! command -v certbot &> /dev/null; then
    echo "❌ Certbot installation failed"
    exit 1
fi

echo "✅ Certbot installed successfully"

# Install Nginx if not already installed
if ! command -v nginx &> /dev/null; then
    sudo yum install -y nginx
    sudo systemctl enable nginx
fi

# Create Nginx configuration for Cook Smart API
sudo tee /etc/nginx/conf.d/cooksmartapi.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name api.cooksmartapp.com;
    
    # Allow Certbot to access .well-known directory
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other traffic to HTTPS (will be added after SSL setup)
    location / {
        return 301 https://$server_name$request_uri;
    }
}
EOF

# Remove default Nginx config that might conflict
sudo rm -f /etc/nginx/conf.d/default.conf

# Test Nginx configuration
sudo nginx -t

# Start/restart Nginx
sudo systemctl restart nginx

# Create web root directory for Certbot
sudo mkdir -p /var/www/html
sudo chown -R nginx:nginx /var/www/html

# Obtain SSL certificate
echo "🔐 Obtaining SSL certificate from Let's Encrypt..."
sudo certbot certonly \
    --webroot \
    --webroot-path=/var/www/html \
    --email services.cooksmart@gmail.com \
    --agree-tos \
    --no-eff-email \
    --domains api.cooksmartapp.com

# Check if certificate was obtained successfully
if [ ! -f "/etc/letsencrypt/live/api.cooksmartapp.com/fullchain.pem" ]; then
    echo "❌ SSL certificate generation failed"
    exit 1
fi

echo "✅ SSL certificate obtained successfully"

# Update Nginx configuration to use SSL and proxy to Node.js
sudo tee /etc/nginx/conf.d/cooksmartapi.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name api.cooksmartapp.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.cooksmartapp.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.cooksmartapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.cooksmartapp.com/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy to Node.js application
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
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Test Nginx configuration
sudo nginx -t

# Restart Nginx to apply SSL configuration
sudo systemctl restart nginx

# Set up automatic certificate renewal
echo "🔄 Setting up automatic certificate renewal..."

# Create renewal script
sudo tee /etc/cron.d/certbot-renew > /dev/null << 'EOF'
# Renew Let's Encrypt certificates twice daily
0 */12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

# Test renewal process (dry run)
sudo certbot renew --dry-run

echo "✅ SSL setup completed successfully!"
echo ""
echo "🔗 Your API is now available at: https://api.cooksmartapp.com"
echo "🔒 SSL certificate will auto-renew every 90 days"
echo ""
echo "Testing SSL connection..."
curl -I https://api.cooksmartapp.com/health || echo "⚠️  SSL test failed - may need DNS propagation time"
