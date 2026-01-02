@echo off
echo ========================================
echo Generate GitHub Actions SSH Secret
echo ========================================
echo.

echo 1. Displaying your private key for GitHub secret...
echo    Copy the ENTIRE output below (including BEGIN/END lines)
echo.
echo ========================================
echo COPY THIS ENTIRE BLOCK TO GITHUB SECRET:
echo ========================================

type "%USERPROFILE%\.ssh\cook-smart-key.pem"

echo ========================================
echo END OF SECRET CONTENT
echo ========================================
echo.

echo 2. Steps to update GitHub secret:
echo    a. Go to: https://github.com/tootallgames2020/cook-smart/settings/secrets/actions
echo    b. Find SSH_PRIVATE_KEY secret
echo    c. Click "Update" 
echo    d. Paste the ENTIRE content above (including BEGIN/END lines)
echo    e. Save the secret
echo.

echo 3. Host key for GitHub Actions (add to workflow if needed):
echo    Host key fingerprint: SHA256:D4L0hbuuP8a1vnSCWq3+h87Xh8/GrVBGh9b8810/D2o
echo.

echo 4. After updating the secret, re-run your GitHub Actions workflow.
echo.

pause