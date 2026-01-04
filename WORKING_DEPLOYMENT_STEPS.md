# Working Deployment Steps - Exact Process from December

## Current Setup
- **Instance**: i-0ad64147425a307ac
- **IP**: 3.238.250.151  
- **DNS**: api.cooksmartapp.com → 3.238.250.151
- **Status**: Clean Ubuntu 22.04, ready for manual setup

## The Problem We Solved
- **Root Cause**: User data scripts fail silently
- **Solution**: Manual SSH deployment (what worked in December)
- **Key Insight**: The working backend was deployed manually, not via automation

## Step 1: Fix SSH Key (Run on your local machine)

The SSH key has Windows line endings that need to be fixed:

```powershell
# Create properly formatted key
$content = Get-Content "C:\Users\toota\.ssh\cook-smart-key.pem" -Raw
$content = $content -replace "`r`n", "`n"
[System.IO.File]::WriteAllText("cook-smart-working.pem", $content, [System.Text.Encoding]::UTF8)

# Set correct permissions
icacls "cook-smart-working.pem" /inheritance:r /grant:r "toota:R"
```

## Step 2: Connect to Server

```bash
ssh -o StrictHostKeyChecking=no -i cook-smart-working.pem ubuntu@3.238.250.151
```

## Step 3: Install Dependencies (Run on server)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 and nginx
sudo npm install -g pm2
sudo apt-get install -y nginx

# Verify installations
node --version
npm --version
pm2 --version
```

## Step 4: Clone Repository

```bash
# Clone fresh code
git clone https://github.com/tootallgames2020/cook-smart.git
cd cook-smart
git checkout fresh-project-migration
git pull origin fresh-project-migration
```

## Step 5: Setup Backend Environment

```bash
cd backend
cp .env.example .env

# Edit environment file
nano .env
```

**Update these values in nano:**
```
DB_HOST=cook-smart-db-beta.cgfwigy2i9lk.us-east-1.rds.amazonaws.com
DB_USER=cooksmartadmin
DB_PASSWORD=CookSmart2024!
JWT_SECRET=cook-smart-jwt-secret-2024
FATSECRET_CLIENT_ID=your-fatsecret-client-id
FATSECRET_CLIENT_SECRET=your-fatsecret-client-secret
```

**Save in nano**: Ctrl+X, Y, Enter

## Step 6: Build and Start Backend

```bash
# Install dependencies
npm install

# Fix TypeScript error (from December lessons)
sed -i 's/notificationError.message/(notificationError as Error).message/g' src/services/NotificationService.ts

# Build TypeScript
npm run build

# Start with PM2
pm2 start dist/server.js --name cook-smart-backend
pm2 save
pm2 startup

# Test backend locally
curl http://localhost:3000/health
```

**Expected output**: `{"status":"OK","message":"Cook Smart API is running"...}`

## Step 7: Configure Nginx Proxy

```bash
# Create nginx configuration
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

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx

# Test proxy
curl http://localhost/health
```

## Step 8: Final Testing

```bash
# Test from server
curl http://localhost:3000/health
curl http://localhost/health

# Exit SSH
exit
```

## Step 9: Test from Your Computer

```bash
# Test API endpoints
curl http://3.238.250.151/health
curl https://api.cooksmartapp.com/health

# Test auth endpoint (should return JSON error)
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  https://api.cooksmartapp.com/api/v1/auth/login
```

**Expected Results:**
- Health: `{"status":"OK","message":"Cook Smart API is running"...}`
- Auth: `{"success":false,"message":"Invalid email or password"}` (JSON, not HTML)

## Step 10: Test Mobile App

Once both endpoints return JSON (not HTML errors), try logging into your mobile app!

---

**This is the EXACT process that worked in December. No user data scripts, no automation - just manual SSH deployment.**

**Current Status**: Ready for Step 1 (fix SSH key)