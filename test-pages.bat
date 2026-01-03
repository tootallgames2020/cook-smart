@echo off
echo 🧪 Testing website pages...
echo.

echo Testing main pages:
curl -s -o nul -w "%%{http_code} - %%{url_effective}\n" https://cooksmartapp.com/
curl -s -o nul -w "%%{http_code} - %%{url_effective}\n" https://cooksmartapp.com/contact
curl -s -o nul -w "%%{http_code} - %%{url_effective}\n" https://cooksmartapp.com/about
curl -s -o nul -w "%%{http_code} - %%{url_effective}\n" https://cooksmartapp.com/recipes
curl -s -o nul -w "%%{http_code} - %%{url_effective}\n" https://cooksmartapp.com/faq

echo.
echo ✅ 200 = Success
echo ❌ 403 = Access Denied (CloudFront error)
echo ❌ 404 = Not Found
echo.
pause