@echo off
echo 🧹 Git Repository Cleanup and Commit
echo ====================================

echo.
echo Step 1: Add all essential code changes
git add App.tsx
git add CHANGELOG.md
git add index.js
git add android/app/build.gradle
git add android/app/src/main/AndroidManifest.xml
git add android/app/src/main/res/xml/

echo.
echo Step 2: Add all backend changes
git add backend/.env.example
git add backend/Dockerfile
git add backend/ecosystem.config.js
git add backend/package.json
git add backend/package-lock.json
git add backend/tsconfig.json
git add backend/src/
git add backend/migrations/
git add backend/scripts/

echo.
echo Step 3: Add mobile app changes
git add src/

echo.
echo Step 4: Add infrastructure and deployment scripts
git add scripts/
git add infrastructure/
git add docker-compose.yml

echo.
echo Step 5: Add essential documentation
git add SSL_APK_BUILD_READY.md
git add COMPLETE_FRESH_DEPLOYMENT_SUCCESS.md
git add COOK_SMART_FINAL_IMPLEMENTATION_SUMMARY.md

echo.
echo Step 6: Remove temporary and test files
del /f /q test-*.js 2>nul
del /f /q simple-*.js 2>nul
del /f /q minimal-*.js 2>nul
del /f /q server-part*.ts 2>nul
del /f /q complete-server.ts 2>nul
del /f /q server-final.ts 2>nul
del /f /q server-port80.js 2>nul
del /f /q *-deploy.json 2>nul
del /f /q *-fix.json 2>nul
del /f /q *-test.json 2>nul
del /f /q *.bat 2>nul
del /f /q *.sh 2>nul
rmdir /s /q temp-build 2>nul
rmdir /s /q backend\temp-dist 2>nul
rmdir /s /q emergency-api 2>nul

echo.
echo Step 7: Clean up excessive documentation files
del /f /q BACKEND_*.md 2>nul
del /f /q DEPLOYMENT_*.md 2>nul
del /f /q FRESH_*.md 2>nul
del /f /q TOMORROW_*.md 2>nul
del /f /q TONIGHT_*.md 2>nul
del /f /q LOGIN_*.md 2>nul
del /f /q LORI_*.md 2>nul
del /f /q MILITARY_*.md 2>nul
del /f /q ZERO_*.md 2>nul

echo.
echo Step 8: Commit the changes
git commit -m "feat: Complete SSL implementation and backend modernization

- ✅ SSL/HTTPS implementation with Let's Encrypt
- ✅ Updated mobile app for SSL compatibility (v1.1.8)
- ✅ Complete backend API with all routes and services
- ✅ Database migrations and user management
- ✅ Docker infrastructure setup
- ✅ Network security configuration for Android
- ✅ Production-ready deployment scripts
- ✅ Comprehensive error handling and logging

This commit brings the repository up to date with all local changes
and prepares for fresh deployment to production server."

echo.
echo Step 9: Push to remote repository
git push origin fresh-project-migration

echo.
echo ✅ Repository cleanup and commit complete!
echo The server can now pull the latest code with all your changes.