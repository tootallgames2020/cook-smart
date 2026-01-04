# Ubuntu Manual Setup Guide - Step by Step

## Prerequisites

- **Server**: Ubuntu 22.04 LTS at `3.237.41.103`
- **SSH Key**: `cook-smart-key.pem` (should be in your `.ssh` folder)
- **Time Required**: 10-15 minutes

## Step 1: Connect to Ubuntu Server

Open PowerShell or Command Prompt and run:

```bash
ssh -i ~/.ssh/cook-smart-key.pem ubuntu@3.237.41.103
```

**Expected Output**: You should see Ubuntu welcome message and get a prompt like `ubuntu@ip-xxx:~$`

**If SSH fails**: 
- Check if key file exists: `ls ~/.ssh/cook-smart-key.pem`
- Fix permissions if needed: `chmod 400 ~/.ssh/cook-smart-key.pem`

## Step 2: Update System and Install Node.js

Once connected to the server, run these commands:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS (compatible with Ubuntu 22.04)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**Expected Output**: 
- `node --version` should show `v20.x.x`
- `npm --version` should show `10.x.x` or similar

## Step 3: Install PM2 Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify PM2 installation
pm2 --version
```

**Expected Output**: PM2 version number (e.g., `5.3.0`)

## Step 4: Clone Fresh Code

```bash
# Clone the repository
git clone https://github.com/tootallgames2020/cook-smart.git

# Navigate to project
cd cook-smart

# Switch to the fresh branch
git checkout fresh-project-migration

# Verify we're on the right branch
git branch
```

**Expected Output**: Should show `* fresh-project-migration` (with asterisk)

## Step 5: Setup Backend Environment

```bash
# Navigate to backend directory
cd backend

# Copy environment template
cp .env.example .env

# Edit environment file with database credentials
nano .env
```

**In the nano editor**, update these lines:
```
DB_HOST=cook-smart-db-beta.cgfwigy2i9lk.us-east-1.rds.amazonaws.com
DB_USER=cooksmartadmin
DB_PASSWORD=CookSmart2024!
JWT_SECRET=cook-smart-jwt-secret-2024
```

**To save in nano**: Press `Ctrl+X`, then `Y`, then `Enter`

## Step 6: Install Dependencies and Build

```bash
# Install all npm dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Verify build completed
ls -la dist/
```

**Expected Output**: Should see `dist/` folder with `server.js` and other compiled files

## Step 7: Start Backend with PM2

```bash
# Start the backend server
pm2 start dist/server.js --name cook-smart-backend

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup

# Check PM2 status
pm2 status
```

**Expected Output**: Should show `cook-smart-backend` with status `online`

## Step 8: Test Backend Locally

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test auth endpoint (should return JSON error for invalid credentials)
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  http://localhost:3000/api/v1/auth/login
```

**Expected Output**: 
- Health: `{"status":"OK","message":"Cook Smart API is running"...}`
- Auth: `{"success":false,"message":"Invalid email or password"}`

## Step 9: Configure Nginx Proxy

```bash
# Create nginx configuration
sudo nano /etc/nginx/sites-available/cook-smart
```

**Paste this configuration**:
```nginx
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
```

**Save with**: `Ctrl+X`, `Y`, `Enter`

## Step 10: Enable Nginx Configuration

```bash
# Enable the site
sudo ln -sf /etc/nginx/sites-available/cook-smart /etc/nginx/sites-enabled/

# Remove default nginx page
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

**Expected Output**: `nginx -t` should show `syntax is ok` and `test is successful`

## Step 11: Final Testing

```bash
# Test local HTTP endpoint
curl http://localhost/health

# Exit SSH session
exit
```

## Step 12: Test from Your Computer

Back on your local machine, test the API:

```bash
# Test health endpoint
curl https://api.cooksmartapp.com/health

# Test auth endpoint
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  https://api.cooksmartapp.com/api/v1/auth/login
```

**Expected Output**: Both should return JSON responses (not HTML errors)

## Step 13: Test Mobile App

Now try logging into your mobile app - it should work!

## Troubleshooting

### If Node.js installation fails:
```bash
# Try alternative method
sudo apt install -y nodejs npm
node --version
```

### If backend won't start:
```bash
# Check logs
pm2 logs cook-smart-backend

# Check if port 3000 is in use
sudo netstat -tlnp | grep 3000
```

### If nginx gives errors:
```bash
# Check nginx status
sudo systemctl status nginx

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### If SSL is needed later:
```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.cooksmartapp.com
```

---

**Total Time**: 10-15 minutes
**Result**: Mobile app login should work with proper JSON responses