@echo off
echo ========================================
echo Test GitHub Actions SSH Configuration
echo ========================================
echo.

echo 1. Testing SSH connection with verbose output...
echo    This will show exactly what's happening during SSH handshake
echo.

ssh -vvv -o ConnectTimeout=30 -o StrictHostKeyChecking=no -i "%USERPROFILE%\.ssh\cook-smart-key.pem" ubuntu@34.203.8.150 "echo 'SSH test successful'; uptime"

echo.
echo 2. Checking if the server accepts connections from different IPs...
echo    (GitHub Actions comes from different IPs than your home)
echo.

echo 3. Testing host key fingerprint...
ssh-keyscan -H 34.203.8.150

echo.
echo 4. Checking authorized_keys on server...
ssh -i "%USERPROFILE%\.ssh\cook-smart-key.pem" ubuntu@34.203.8.150 "echo 'Checking authorized_keys:'; wc -l ~/.ssh/authorized_keys; tail -1 ~/.ssh/authorized_keys"

echo.
echo ========================================
echo GITHUB ACTIONS TROUBLESHOOTING STEPS:
echo ========================================
echo.
echo 1. Verify SSH_PRIVATE_KEY secret in GitHub:
echo    - Go to GitHub repo → Settings → Secrets
echo    - Check SSH_PRIVATE_KEY exists and is complete
echo    - Should start with -----BEGIN OPENSSH PRIVATE KEY-----
echo    - Should end with -----END OPENSSH PRIVATE KEY-----
echo.
echo 2. The private key should match this public key on server:
ssh -i "%USERPROFILE%\.ssh\cook-smart-key.pem" ubuntu@34.203.8.150 "cat ~/.ssh/authorized_keys | tail -1"
echo.
echo 3. If SSH_PRIVATE_KEY is wrong, regenerate it:
echo    - Copy the ENTIRE private key file content
echo    - Include all newlines and formatting
echo    - Update the GitHub secret
echo.

pause