# Manual Backend Deployment - Step by Step

## Current Status
- **Instance**: i-0bb4f3613cb2083ff (3.226.251.225)
- **DNS**: api.cooksmartapp.com points to this IP
- **Issue**: Backend not running, user data script likely failed

## Option 1: Wait and Retry (Recommended)

The user data script might still be running. Let's wait another 10 minutes and test again:

```bash
# Test in 10 minutes:
curl http://3.226.251.225/health
curl https://api.cooksmartapp.com/health
```

## Option 2: Manual SSH Setup (If Option 1 Fails)

If the automated setup fails, we'll need to connect manually. Here's the step-by-step process:

### Step 1: Fix SSH Key (Run on your local machine)

```powershell
# Create a new key file with proper format
$content = Get-Content "C:\Users\toota\.ssh\cook-smart-key.pem" -Raw
$content = $content -replace "`r`n", "`n"
$content | Out-File -FilePath "cook-smart-ubuntu.pem" -Encoding ASCII -NoNewline

# Set correct permissions
icacls "cook-smart-ubuntu.pem" /inheritance:r /grant:r "$env:USERNAME:R"
```

### Step 2: Connect to Server

```bash
ssh -o StrictHostKeyChecking=no -i cook-smart-ubuntu.pem ubuntu@3.226.251.225
```

### Step 3: Manual Backend Setup (Run on server)

```bash
# Check what's already installed
node --version
npm --version
pm2 --version

# If Node.js not installed:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Clone repository if not exists
if [ ! -d "/home/ubuntu/cook-smart" ]; then
    git clone https://github.com/tootallgames2020/cook-smart.git
    cd cook-smart
    git checkout fresh-project-migration
else
    cd cook-smart
    git pull origin fresh-project-migration
fi

# Setup backend
cd backend
cp .env.example .env

# Edit .env file
nano .env
# Update these values:
# DB_HOST=cook-smart-db-beta.cgfwigy2i9lk.us-east-1.rds.amazonaws.com
# DB_USER=cooksmartadmin  
# DB_PASSWORD=CookSmart2024!
# JWT_SECRET=cook-smart-jwt-secret-2024

# Install and build
npm install
npm run build

# Start with PM2
pm2 start dist/server.js --name cook-smart-backend
pm2 save
pm2 startup

# Test backend
curl http://localhost:3000/health
```

### Step 4: Configure Nginx (Run on server)

```bash
# Create nginx config
sudo tee /etc/nginx/sites-available/cook-smart << 'EOF'
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

# Enable site
sudo ln -sf /etc/nginx/sites-available/cook-smart /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Test proxy
curl http://localhost/health
```

## Option 3: Create New Instance with Working Setup

If both options fail, we can create a new instance with a corrected setup script.

## Testing Commands

Once setup is complete, test these:

```bash
# Local tests (on server)
curl http://localhost:3000/health
curl http://localhost/health

# Remote tests (from your computer)
curl http://3.226.251.225/health
curl https://api.cooksmartapp.com/health

# Auth test
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  https://api.cooksmartapp.com/api/v1/auth/login
```

## Expected Results

- Health endpoint: `{"status":"OK","message":"Cook Smart API is running"...}`
- Auth endpoint: `{"success":false,"message":"Invalid email or password"}` (JSON response, not HTML)

## Next Steps After Backend Works

1. Test mobile app login
2. Verify all API endpoints work
3. Setup SSL certificate (if needed)
4. Build new APK with working backend

---

**Current Instance**: i-0bb4f3613cb2083ff (3.226.251.225)
**Status**: Waiting for automated setup or manual intervention needed