@echo off
echo 🔧 Fixing CloudFront Configuration...
echo.

echo This script will help configure CloudFront error pages to fix 403 errors.
echo.
echo The issue: CloudFront returns 403 when accessing /contact, /about, etc.
echo The solution: Configure CloudFront to serve /contact/index.html for /contact requests.
echo.
echo Manual steps needed in AWS Console:
echo 1. Go to CloudFront console
echo 2. Select distribution E31XPFYZVQELB6
echo 3. Go to Error Pages tab
echo 4. Create custom error page:
echo    - HTTP Error Code: 403
echo    - Error Caching Minimum TTL: 0
echo    - Customize Error Response: Yes
echo    - Response Page Path: /404.html
echo    - HTTP Response Code: 200
echo.
echo Alternative: Use CloudFront Functions to rewrite URLs
echo.
echo For now, testing if pages work with trailing slash:

curl -s -o nul -w "%%{http_code} - %%{url_effective}\n" https://cooksmartapp.com/contact/
curl -s -o nul -w "%%{http_code} - %%{url_effective}\n" https://cooksmartapp.com/about/
curl -s -o nul -w "%%{http_code} - %%{url_effective}\n" https://cooksmartapp.com/recipes/
curl -s -o nul -w "%%{http_code} - %%{url_effective}\n" https://cooksmartapp.com/faq/

echo.
echo If the above show 200, then the fix is to add trailing slashes to navigation links.
pause