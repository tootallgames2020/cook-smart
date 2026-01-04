@echo off
echo ========================================
echo AWS Project Categorization - Simple
echo ========================================
echo.
echo Based on the audit results, let me categorize the resources we found:
echo.

echo ========================================
echo COOK SMART RESOURCES (for cleanup)
echo ========================================
echo.
echo EC2 Instances:
echo - i-0b20061cb3393b112 (cook-smart-ubuntu-backend) - COOK SMART
echo.
echo Load Balancers:
echo - cook-smart-api-alb - COOK SMART
echo.
echo RDS Databases:
echo - cook-smart-db-beta - COOK SMART
echo.
echo S3 Buckets:
echo - cook-smart-deployments-temp - COOK SMART
echo - cooksmartapp-website - COOK SMART (but may be the working website!)
echo.
echo Security Groups:
echo - kitchen-helper-alb-ALBSecurityGroup-w14FPr7XxjWD - LEGACY COOK SMART
echo - kitchen-helper-sg - LEGACY COOK SMART
echo.
echo Route 53:
echo - cooksmartapp.com - COOK SMART (but this is the working website domain!)
echo.

echo ========================================
echo NEXUS DISCORD BOT RESOURCES (PRESERVE)
echo ========================================
echo.
echo S3 Buckets:
echo - nexusbot-legal-20251215021631 - NEXUS BOT
echo - nexusbot-official - NEXUS BOT
echo.
echo Security Groups:
echo - nexus-bot-sg - NEXUS BOT
echo.

echo ========================================
echo STREAM GUARD AI RESOURCES (PRESERVE)
echo ========================================
echo.
echo Security Groups:
echo - streamguard-ai-sg - STREAM GUARD AI
echo - streamguard-ai-bot-sg - STREAM GUARD AI
echo.

echo ========================================
echo SHARED/UNKNOWN RESOURCES (INVESTIGATE)
echo ========================================
echo.
echo Security Groups:
echo - default - DEFAULT VPC (shared)
echo - launch-wizard-1 - UNKNOWN (investigate)
echo.

echo ========================================
echo CRITICAL ANALYSIS
echo ========================================
echo.
echo COOK SMART RESOURCES TO CLEAN UP:
echo ✓ EC2: i-0b20061cb3393b112 (cook-smart-ubuntu-backend)
echo ✓ ALB: cook-smart-api-alb
echo ✓ RDS: cook-smart-db-beta
echo ✓ S3: cook-smart-deployments-temp
echo ✓ Security Groups: kitchen-helper-* (legacy)
echo.
echo CRITICAL - DO NOT DELETE:
echo ❌ S3: cooksmartapp-website (this might be your working website!)
echo ❌ Route 53: cooksmartapp.com (this is your working website domain!)
echo ❌ All Nexus Bot resources
echo ❌ All Stream Guard AI resources
echo.
echo INVESTIGATION NEEDED:
echo ? Security Group: launch-wizard-1 (what uses this?)
echo.
pause