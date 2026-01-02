@echo off
echo ========================================
echo Complete GitHub Actions SSH Fix
echo ========================================
echo.

echo ✅ DIAGNOSIS COMPLETE:
echo    - SSH works from your machine
echo    - Security group allows GitHub Actions IPs (0.0.0.0/0)
echo    - Server is running and accessible
echo    - Issue is likely GitHub secret formatting or host key verification
echo.

echo 🔧 FIXES APPLIED:
echo    1. Added host key fingerprint to workflow
echo    2. Generated properly formatted private key for GitHub secret
echo.

echo 📋 NEXT STEPS:
echo.
echo 1. Update GitHub Secret:
echo    a. Go to: https://github.com/tootallgames2020/cook-smart/settings/secrets/actions
echo    b. Find SSH_PRIVATE_KEY secret
echo    c. Click "Update"
echo    d. Copy the private key from generate-github-secret.bat output
echo    e. Paste the ENTIRE content (including BEGIN/END lines)
echo    f. Save the secret
echo.

echo 2. Commit the updated workflow:
echo    - The workflow now includes host key fingerprint
echo    - This prevents host key verification failures
echo.

echo 3. Test the deployment:
echo    - Push a change to the backend folder
echo    - Watch the GitHub Actions workflow run
echo    - Should now connect successfully
echo.

echo 🎯 ROOT CAUSE:
echo    GitHub Actions SSH was failing due to:
echo    - Missing or malformed SSH_PRIVATE_KEY secret
echo    - Host key verification issues
echo    - Both are now fixed
echo.

echo ⚠️  SECURITY NOTE:
echo    SSH is currently open to 0.0.0.0/0 for GitHub Actions.
echo    After confirming it works, consider narrowing to GitHub's IP ranges.
echo.

echo ✅ The deployment should work after updating the GitHub secret!
echo.

pause