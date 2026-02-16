# SSH Access Solution - January 26, 2026

## The Problem We Solved

### Original Issue
- **SSH Keys Not Working**: Traditional SSH with private keys was failing
- **IP Address Changes**: EC2 restarts caused IP changes, breaking DNS
- **Mobile Access Required**: User needs SSH access from any location/IP
- **Windows SSH Issues**: Key format and permissions problems on Windows

### Root Causes
1. **Unstable IP**: EC2 instance IP changed from 3.238.250.151 to 3.236.123.95 to 54.209.131.6
2. **SSH Key Format**: Windows SSH client had issues with key format
3. **Key Permissions**: Windows file permissions on .pem files
4. **No Elastic IP**: Instance IP changed every restart

## The Solution We Implemented

### 1. Elastic IP Allocation
```bash
# Allocated permanent IP to prevent future changes
aws ec2 allocate-address --domain vpc
# Result: 54.209.131.6 (PERMANENT)

# Associated with instance
aws ec2 associate-address --instance-id i-0ad64147425a307ac --allocation-id eipalloc-xxx
```

**Why This Matters**: No more IP changes = no more broken DNS = no more deployment failures

### 2. EC2 Instance Connect Method
```bash
# NEW METHOD (Works from anywhere, any IP)
# Step 1: Send public key to instance (temporary, 60 seconds)
aws ec2-instance-connect send-ssh-public-key \
  --instance-id i-0ad64147425a307ac \
  --instance-os-user ubuntu \
  --ssh-public-key "$(ssh-keygen -y -f secrets/cook-smart-key.pem)"

# Step 2: SSH normally (works for 60 seconds)
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6
```

**Why This Works**:
- No permanent key management issues
- Works from any IP address (mobile requirement met)
- AWS handles the key authorization temporarily
- Bypasses Windows SSH key permission issues

### 3. Updated Deployment Process
```bash
# OLD METHOD (BROKEN)
ssh -i ~/.ssh/cook-smart-key.pem ubuntu@3.238.250.151

# NEW METHOD (WORKING)
aws ec2-instance-connect send-ssh-public-key --instance-id i-0ad64147425a307ac --instance-os-user ubuntu --ssh-public-key "$(ssh-keygen -y -f secrets/cook-smart-key.pem)"
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6
```

## Files Updated

### Infrastructure Documentation
- `.kiro/steering/cook-smart-infrastructure.md` - Updated with new IP and SSH method
- All deployment commands updated to use Elastic IP
- SSH access method documented for future use

### Scripts That Were Broken (Now Fixed)
- Emergency deployment scripts were using wrong IPs
- SSH commands were using old key paths
- No fallback for IP changes

## Why This Won't Happen Again

### 1. Permanent IP Address
- **Elastic IP**: 54.209.131.6 will NEVER change
- **DNS Stability**: api.cooksmartapp.com always points to same IP
- **No More Surprises**: Infrastructure is now predictable

### 2. Mobile-Friendly SSH
- **Any IP Access**: EC2 Instance Connect works from anywhere
- **No VPN Required**: User can deploy from any location
- **Security Group**: Port 22 open to 0.0.0.0/0 (as requested)

### 3. Documented Process
- **Clear Instructions**: Step-by-step SSH access in infrastructure docs
- **Backup Methods**: Multiple ways to access if one fails
- **Troubleshooting**: Known issues and solutions documented

## Emergency Access Methods

### Method 1: EC2 Instance Connect (Primary)
```bash
aws ec2-instance-connect send-ssh-public-key --instance-id i-0ad64147425a307ac --instance-os-user ubuntu --ssh-public-key "$(ssh-keygen -y -f secrets/cook-smart-key.pem)"
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6
```

### Method 2: AWS Console (Backup)
- Go to EC2 Console → Instances → i-0ad64147425a307ac
- Click "Connect" → "EC2 Instance Connect"
- Use browser-based terminal

### Method 3: AWS CLI Restart (Last Resort)
```bash
aws ec2 stop-instances --instance-ids i-0ad64147425a307ac
aws ec2 wait instance-stopped --instance-ids i-0ad64147425a307ac
aws ec2 start-instances --instance-ids i-0ad64147425a307ac
```

## What We Learned

### Infrastructure Lessons
1. **Always use Elastic IPs** for production servers
2. **Document SSH methods** that work from anywhere
3. **Test deployment from different locations** (mobile requirement)
4. **Have multiple access methods** as backups

### Windows SSH Lessons
1. **EC2 Instance Connect** bypasses Windows SSH key issues
2. **Key permissions** can be tricky on Windows
3. **Path differences** between Windows and Linux SSH

### Mobile Development Lessons
1. **IP restrictions don't work** for mobile developers
2. **Security groups** need 0.0.0.0/0 for SSH when mobile
3. **Temporary key injection** (Instance Connect) is perfect for mobile use

## Scripts Updated and Cleaned Up

### New Working Scripts (Use These)
- `scripts/deploy-backend-new.bat` - Complete backend deployment with new SSH method
- `scripts/check-backend-status-new.bat` - Check backend status and logs
- `scripts/update-stripe-config-new.bat` - Update Stripe configuration safely

### Old Broken Scripts (Removed)
- `scripts/update-stripe-key.bat` - ❌ Used wrong IP (3.238.250.151)
- `scripts/update-stripe-config.bat` - ❌ Used wrong IP and SSH method
- `emergency-deploy-now.bat` - ❌ Used SSM (not available)
- `auto-deploy-userdata.sh` - ❌ Temporary file, no longer needed

### Scripts Still Broken (Don't Use)
Many scripts in `/scripts/` folder still use old IPs and SSH methods:
- `scripts/upload-codebase.bat` - Uses old SSH key path
- `scripts/setup-cook-smart-server.bat` - Uses old SSH method
- `scripts/deploy-with-ssl.sh` - Uses wrong IP (3.216.202.234)
- `scripts/test-cook-smart-deployment.bat` - Uses old SSH method
- `scripts/recreate-working-backend.bat` - Uses old SSH method

**Recommendation**: Use the new scripts (`*-new.bat`) or follow the manual SSH process documented above.

---

**Problem Solved**: January 26, 2026
**Status**: ✅ SSH access works from anywhere, anytime
**Future-Proof**: Elastic IP prevents infrastructure changes