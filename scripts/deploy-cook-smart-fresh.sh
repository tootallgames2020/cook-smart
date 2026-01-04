#!/bin/bash
# deploy-cook-smart-fresh.sh - Fresh Cook Smart deployment script
# This script sets up a complete Cook Smart backend on a fresh Ubuntu server

set -e

echo "🚀 Starting Fresh Cook Smart Deployment..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if running as ubuntu user
if [ "$USER" != "ubuntu" ]; then
    print_error "This script should be run as the ubuntu user"
    exit 1
fi

print_status "Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated successfully"

print_status "Step 2: Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node_version=$(node --version)
npm_version=$(npm --version)
print_success "Node.js installed: $node_version, npm: $npm_version"

print_status "Step 3: Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib
print_success "PostgreSQL installed"

print_status "Step 4: Installing Nginx and SSL tools..."
sudo apt install -y nginx certbot python3-certbot-nginx
print_success "Nginx and SSL tools installed"

print_status "Step 5: Installing additional tools..."
sudo apt install -y git curl jq htop
sudo npm install -g pm2
print_success "Additional tools installed"

print_status "Step 6: Configuring PostgreSQL..."
# Create database user and database
sudo -u postgres createuser cooksmartadmin 2>/dev/null || print_warning "User cooksmartadmin already exists"
sudo -u postgres createdb cooksmartdb 2>/dev/null || print_warning "Database cooksmartdb already exists"
sudo -u postgres psql -c "ALTER USER cooksmartadmin WITH PASSWORD 'CookSmart2024!';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE cooksmartdb TO cooksmartadmin;"

# Configure PostgreSQL for local connections
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/*/main/postgresql.conf
echo "local   cooksmartdb   cooksmartadmin   md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf

sudo systemctl restart postgresql
sudo systemctl enable postgresql

# Test database connection
if psql -h localhost -U cooksmartadmin -d cooksmartdb -c "SELECT 1;" >/dev/null 2>&1; then
    print_success "PostgreSQL configured and connection tested"
else
    print_error "PostgreSQL connection test failed"
    exit 1
fi

print_status "Step 7: Cloning Cook Smart repository..."
cd /home/ubuntu
if [ -d "cook-smart" ]; then
    print_warning "cook-smart directory exists, updating..."
    cd cook-smart
    git pull origin main || git pull origin master || git pull
else
    print_warning "Repository URL needed - please clone manually:"
    print_warning "git clone https://github.com/your-username/cook-smart.git"
    print_warning "Then run this script again"
    exit 1
fi

print_status "Step 8: Installing application dependencies..."
cd /home/ubuntu/cook-smart/backend
npm install
print_success "Dependencies installed"

print_status "Step 9: Building application..."
npm run build
if [ -d "dist" ]; then
    print_success "Application built successfully"
else
    print_error "Build failed - dist directory not found"
    exit 1
fi

print_status "Step 10: Setting up environment file..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_warning "Created .env from .env.example - PLEASE EDIT WITH PRODUCTION VALUES"
    else
        print_warning "Creating basic .env file - PLEASE EDIT WITH PRODUCTION VALUES"
        cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cooksmartdb
DB_USER=cooksmartadmin
DB_PASSWORD=CookSmart2024!

# JWT Configuration
JWT_SECRET=your-production-jwt-secret-change-this

# FatSecret API
FATSECRET_CLIENT_ID=your-fatsecret-client-id
FATSECRET_CLIENT_SECRET=your-fatsecret-client-secret

# Stripe Configuration
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Application URLs
APP_URL=https://cooksmartapp.com
API_URL=https://api.cooksmartapp.com

# Email Service
RESEND_API_KEY=your-resend-api-key

# Server Configuration
PORT=3000
NODE_ENV=production
EOF
    fi
else
    print_warning ".env file already exists - please verify configuration"
fi

print_status "Step 11: Running database migrations..."
print_warning "Make sure to edit .env file with correct values before running migrations"
read -p "Have you configured the .env file with production values? (y/N): " confirm
if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
    if [ -f "migrations/000_complete_database_setup.sql" ]; then
        psql -h localhost -U cooksmartadmin -d cooksmartdb -f migrations/000_complete_database_setup.sql
        print_success "Base database migration completed"
    fi
    
    if [ -f "migrations/001_insert_special_users.sql" ]; then
        psql -h localhost -U cooksmartadmin -d cooksmartdb -f migrations/001_insert_special_users.sql
        print_success "Special users migration completed"
    fi
    
    if [ -f "migrations/002_custom_recipes_and_payments.sql" ]; then
        psql -h localhost -U cooksmartadmin -d cooksmartdb -f migrations/002_custom_recipes_and_payments.sql
        print_success "Custom recipes and payments migration completed"
    fi
    
    # Verify tables were created
    table_count=$(psql -h localhost -U cooksmartadmin -d cooksmartdb -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    print_success "Database setup complete - $table_count tables created"
else
    print_warning "Skipping database migrations - run them manually after configuring .env"
fi

print_status "Step 12: Starting application with PM2..."
pm2 delete cook-smart-backend 2>/dev/null || true
pm2 start dist/server.js --name cook-smart-backend
pm2 startup
pm2 save
print_success "Application started with PM2"

print_status "Step 13: Configuring Nginx..."
sudo tee /etc/nginx/sites-available/cook-smart > /dev/null << 'EOF'
server {
    listen 80;
    server_name api.cooksmartapp.com;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # API proxy
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
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Health check endpoint (no logging)
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    # Rate limiting for API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site and remove default
sudo ln -sf /etc/nginx/sites-available/cook-smart /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
if sudo nginx -t; then
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    print_success "Nginx configured and started"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

print_status "Step 14: Setting up monitoring and backup scripts..."

# Create monitoring script
cat > /home/ubuntu/monitor-cook-smart.sh << 'EOF'
#!/bin/bash
# Cook Smart monitoring script

echo "=== Cook Smart Status Check - $(date) ==="

# Check PM2 status
echo "PM2 Status:"
pm2 status

# Check Nginx status
echo -e "\nNginx Status:"
sudo systemctl is-active nginx

# Check PostgreSQL status
echo -e "\nPostgreSQL Status:"
sudo systemctl is-active postgresql

# Check API health
echo -e "\nAPI Health Check:"
if curl -s -f http://localhost:3000/health > /dev/null; then
    echo "✅ API is responding"
else
    echo "❌ API is not responding"
fi

# Check disk space
echo -e "\nDisk Usage:"
df -h / | tail -1

# Check memory usage
echo -e "\nMemory Usage:"
free -h | grep Mem

echo "=== Status Check Complete ==="
EOF

chmod +x /home/ubuntu/monitor-cook-smart.sh

# Create backup script
cat > /home/ubuntu/backup-database.sh << 'EOF'
#!/bin/bash
# Cook Smart database backup script

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="cooksmartdb_backup_$DATE.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
if pg_dump -h localhost -U cooksmartadmin cooksmartdb > "$BACKUP_DIR/$BACKUP_FILE"; then
    # Compress backup
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    
    # Keep only last 7 days of backups
    find $BACKUP_DIR -name "cooksmartdb_backup_*.sql.gz" -mtime +7 -delete
    
    echo "✅ Database backup completed: $BACKUP_FILE.gz"
else
    echo "❌ Database backup failed"
    exit 1
fi
EOF

chmod +x /home/ubuntu/backup-database.sh

# Set up daily backup cron job
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup-database.sh >> /home/ubuntu/backup.log 2>&1") | crontab -

print_success "Monitoring and backup scripts created"

print_status "Step 15: Final verification..."

# Wait a moment for services to start
sleep 5

# Check if PM2 process is running
if pm2 list | grep -q "cook-smart-backend.*online"; then
    print_success "PM2 process is running"
else
    print_error "PM2 process is not running properly"
    pm2 logs cook-smart-backend --lines 20
fi

# Check if API is responding locally
if curl -s -f http://localhost:3000/health > /dev/null; then
    print_success "API is responding on localhost:3000"
else
    print_warning "API is not responding on localhost:3000"
fi

# Check if Nginx is proxying correctly
if curl -s -f http://localhost/health > /dev/null; then
    print_success "Nginx proxy is working"
else
    print_warning "Nginx proxy may not be working correctly"
fi

echo ""
echo "================================================"
print_success "🎉 Cook Smart deployment completed!"
echo "================================================"
echo ""
echo "📋 Next Steps:"
echo "1. 🔧 Edit /home/ubuntu/cook-smart/backend/.env with production secrets"
echo "2. 🔒 Configure SSL: sudo certbot --nginx -d api.cooksmartapp.com"
echo "3. 🌐 Update Route 53 DNS to point api.cooksmartapp.com to this server"
echo "4. 🧪 Test API endpoints:"
echo "   - Health: curl http://localhost/health"
echo "   - Pricing: curl http://localhost/subscriptions/pricing"
echo "5. 📊 Monitor with: ./monitor-cook-smart.sh"
echo "6. 💾 Test backup with: ./backup-database.sh"
echo ""
echo "🔧 Configuration files:"
echo "   - Application: /home/ubuntu/cook-smart/backend/.env"
echo "   - Nginx: /etc/nginx/sites-available/cook-smart"
echo "   - PM2: pm2 status"
echo ""
echo "📱 Important URLs:"
echo "   - API Health: http://$(curl -s ifconfig.me)/health"
echo "   - API Docs: http://$(curl -s ifconfig.me)/api-docs (if configured)"
echo ""
print_warning "⚠️  Remember to:"
print_warning "   - Configure all API keys in .env file"
print_warning "   - Set up SSL certificate with certbot"
print_warning "   - Update DNS records"
print_warning "   - Test all payment flows"
echo ""
print_success "🚀 Cook Smart is ready for production!"