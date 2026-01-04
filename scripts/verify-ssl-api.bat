@echo off
echo 🔍 Verifying SSL API Before APK Build
echo =====================================

echo.
echo 🌐 Testing HTTPS API Endpoint...
curl -s -o nul -w "HTTP Status: %%{http_code} | Response Time: %%{time_total}s\n" https://api.cooksmartapp.com/health

echo.
echo 🔒 Testing SSL Certificate...
curl -I https://api.cooksmartapp.com/health | findstr "HTTP\|Server\|Strict-Transport-Security"

echo.
echo 🔄 Testing HTTP Redirect...
curl -s -o nul -w "HTTP Status: %%{http_code} (should be 301)\n" http://api.cooksmartapp.com/health

echo.
echo 📡 Testing API Response...
curl -s https://api.cooksmartapp.com/health

echo.
echo.
echo ✅ If all tests show 200 OK and valid JSON, the API is ready!
echo 🚀 You can now build the APK with: scripts\build-ssl-apk.bat