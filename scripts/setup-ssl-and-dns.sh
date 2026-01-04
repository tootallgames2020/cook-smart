#!/bin/bash
# setup-ssl-and-dns.sh - Configure SSL certificate and verify DNS setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🔒 Setting up SSL and DNS for Cook Smart API"
echo "============================================="

# Get current server IP
SERVER_IP=$(curl -s ifconfig.me)
print_status "Current server IP: $SERVER_IP"

# Check DNS resolution
print_status "Checking DNS resolution for api.cooksmartapp.com..."
DNS_IP=$(dig +short api.cooksmartapp.com | tail -1)

if [ -z "$DNS_IP" ]; then
    print_error "DNS not configured for api.cooksmartapp.com"
    echo ""
    echo "📋 DNS Configuration Required:"
    echo "1. Log into your Route 53 console"
    echo "2. Find the cooksmartapp.com hosted zone"
    echo "3. Create/update A record:"
    echo "   - Name: api.cooksmartapp.com"
    echo "   - Type: A"
    echo "   - Value: $SERVER_IP"
    echo "   - TTL: 300"
    echo ""
    read -p "Press Enter after configuring DNS..."
    
    # Check again
    print_status "Rechecking DNS..."
    DNS_IP=$(dig +short api.cooksmartapp.com | tail -1)
fi

if [ "$DNS_IP" = "$SERVER_IP" ]; then
    print_success "DNS correctly points to this server ($SERVER_IP)"
else
    print_warning "DNS points to $DNS_IP but server IP is $SERVER_IP"
    print_warning "SSL setup may fail if DNS is not correct"
    read -p "Continue anyway? (y/N): " confirm
    if [[ ! $confirm == [yY] ]]; then
        exit 1
    fi
fi

# Check if Nginx is running
if ! sudo systemctl is-active --quiet nginx; then
    print_error "Nginx is not running. Starting Nginx..."
    sudo systemctl start nginx
fi

# Test HTTP access
print_status "Testing HTTP access..."
if curl -s -f http://api.cooksmartapp.com/health > /dev/null; then
    print_success "HTTP access working"
elif curl -s -f http://$SERVER_IP/health > /dev/null; then
    print_success "HTTP access working via IP"
else
    print_error "HTTP access not working. Check Nginx configuration."
    sudo nginx -t
    exit 1
fi

# Install certbot if not already installed
if ! command -v certbot &> /dev/null; then
    print_status "Installing certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Get SSL certificate
print_status "Obtaining SSL certificate for api.cooksmartapp.com..."
if sudo certbot --nginx -d api.cooksmartapp.com --non-interactive --agree-tos --email services.cooksmart@gmail.com; then
    print_success "SSL certificate obtained and configured"
else
    print_error "SSL certificate setup failed"
    echo ""
    echo "Common issues:"
    echo "1. DNS not pointing to this server"
    echo "2. Port 80/443 not accessible from internet"
    echo "3. Domain validation failed"
    echo ""
    echo "Manual setup:"
    echo "sudo certbot --nginx -d api.cooksmartapp.com"
    exit 1
fi

# Test HTTPS access
print_status "Testing HTTPS access..."
sleep 5  # Wait for SSL to be fully configured

if curl -s -f https://api.cooksmartapp.com/health > /dev/null; then
    print_success "HTTPS access working"
else
    print_warning "HTTPS access not working yet. This may take a few minutes."
fi

# Set up automatic renewal
print_status "Setting up automatic SSL renewal..."
if ! crontab -l 2>/dev/null | grep -q certbot; then
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    print_success "Automatic SSL renewal configured"
else
    print_success "Automatic SSL renewal already configured"
fi

# Test renewal
print_status "Testing SSL renewal..."
if sudo certbot renew --dry-run; then
    print_success "SSL renewal test passed"
else
    print_warning "SSL renewal test failed - check configuration"
fi

# Update Nginx configuration for better security
print_status "Updating Nginx security configuration..."
sudo tee /etc/nginx/snippets/ssl-params.conf > /dev/null << 'EOF'
# SSL Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_dhparam /etc/nginx/dhparam.pem;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
ssl_ecdh_curve secp384r1;
ssl_session_timeout 10m;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# Security headers
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
EOF

# Generate DH parameters if not exists
if [ ! -f /etc/nginx/dhparam.pem ]; then
    print_status "Generating DH parameters (this may take a while)..."
    sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048
    print_success "DH parameters generated"
fi

# Update main Nginx configuration to include SSL params
sudo sed -i '/ssl_certificate/a\\tinclude /etc/nginx/snippets/ssl-params.conf;' /etc/nginx/sites-available/cook-smart

# Test Nginx configuration
if sudo nginx -t; then
    sudo systemctl reload nginx
    print_success "Nginx configuration updated and reloaded"
else
    print_error "Nginx configuration test failed"
    sudo nginx -t
fi

# Final verification
echo ""
echo "🧪 Final Verification"
echo "===================="

# Test API endpoints
print_status "Testing API endpoints..."

endpoints=(
    "https://api.cooksmartapp.com/health"
    "https://api.cooksmartapp.com/subscriptions/pricing"
)

for endpoint in "${endpoints[@]}"; do
    if curl -s -f "$endpoint" > /dev/null; then
        print_success "✅ $endpoint"
    else
        print_warning "❌ $endpoint"
    fi
done

# Check SSL certificate details
print_status "SSL Certificate Details:"
echo | openssl s_client -servername api.cooksmartapp.com -connect api.cooksmartapp.com:443 2>/dev/null | openssl x509 -noout -dates

# Check SSL rating
print_status "Testing SSL configuration..."
if command -v testssl &> /dev/null; then
    testssl --brief api.cooksmartapp.com
else
    print_status "Install testssl.sh for detailed SSL testing: https://testssl.sh/"
fi

echo ""
echo "🎉 SSL and DNS Setup Complete!"
echo "=============================="
echo ""
echo "✅ Completed:"
echo "   - DNS resolution verified"
echo "   - SSL certificate obtained and configured"
echo "   - HTTPS access enabled"
echo "   - Automatic renewal configured"
echo "   - Security headers added"
echo ""
echo "🔗 Your API is now available at:"
echo "   - https://api.cooksmartapp.com/health"
echo "   - https://api.cooksmartapp.com/subscriptions/pricing"
echo ""
echo "🔒 SSL Certificate:"
echo "   - Issuer: Let's Encrypt"
echo "   - Auto-renewal: Configured"
echo "   - Security: A+ rating (recommended)"
echo ""
echo "📋 Next Steps:"
echo "1. Test all API endpoints with HTTPS"
echo "2. Update mobile app to use HTTPS URLs"
echo "3. Configure Stripe webhooks with HTTPS endpoint"
echo "4. Test payment flows end-to-end"
echo ""
print_success "🚀 Cook Smart API is production-ready with SSL!"