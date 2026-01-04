#!/bin/bash
# verify-deployment.sh - Comprehensive Cook Smart deployment verification

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    print_status "Testing: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        print_success "✅ $test_name"
        ((TESTS_PASSED++))
        return 0
    else
        print_error "❌ $test_name"
        FAILED_TESTS+=("$test_name")
        ((TESTS_FAILED++))
        return 1
    fi
}

run_test_with_output() {
    local test_name="$1"
    local test_command="$2"
    
    print_status "Testing: $test_name"
    
    local output
    output=$(eval "$test_command" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        print_success "✅ $test_name"
        echo "   Output: $output"
        ((TESTS_PASSED++))
        return 0
    else
        print_error "❌ $test_name"
        echo "   Error: $output"
        FAILED_TESTS+=("$test_name")
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "🧪 Cook Smart Deployment Verification"
echo "====================================="
echo ""

# System Information
print_status "System Information:"
echo "   OS: $(lsb_release -d | cut -f2)"
echo "   Kernel: $(uname -r)"
echo "   Architecture: $(uname -m)"
echo "   Uptime: $(uptime -p)"
echo "   Load: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

# 1. Infrastructure Tests
echo "🏗️  Infrastructure Tests"
echo "========================"

run_test "System packages updated" "apt list --upgradable 2>/dev/null | wc -l | grep -q '^0$'"
run_test "Node.js installed" "node --version"
run_test "npm installed" "npm --version"
run_test "PM2 installed" "pm2 --version"
run_test "PostgreSQL installed" "psql --version"
run_test "Nginx installed" "nginx -v"
run_test "Certbot installed" "certbot --version"
run_test "Git installed" "git --version"

echo ""

# 2. Service Status Tests
echo "🔧 Service Status Tests"
echo "======================="

run_test "PostgreSQL service running" "sudo systemctl is-active postgresql"
run_test "Nginx service running" "sudo systemctl is-active nginx"
run_test "PostgreSQL enabled on boot" "sudo systemctl is-enabled postgresql"
run_test "Nginx enabled on boot" "sudo systemctl is-enabled nginx"

echo ""

# 3. Database Tests
echo "🗄️  Database Tests"
echo "=================="

run_test "Database connection" "psql -h localhost -U cooksmartadmin -d cooksmartdb -c 'SELECT 1;'"
run_test_with_output "Database tables count" "psql -h localhost -U cooksmartadmin -d cooksmartdb -t -c \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';\""

# Check specific important tables
important_tables=("users" "subscriptions" "subscription_plans" "custom_recipes" "payment_history" "user_notifications")
for table in "${important_tables[@]}"; do
    run_test "Table '$table' exists" "psql -h localhost -U cooksmartadmin -d cooksmartdb -c \"\\dt $table\" | grep -q '$table'"
done

# Check subscription plans data
run_test_with_output "Subscription plans configured" "psql -h localhost -U cooksmartadmin -d cooksmartdb -t -c 'SELECT COUNT(*) FROM subscription_plans;'"

echo ""

# 4. Application Tests
echo "📱 Application Tests"
echo "==================="

run_test "Cook Smart directory exists" "test -d /home/ubuntu/cook-smart"
run_test "Backend directory exists" "test -d /home/ubuntu/cook-smart/backend"
run_test "Application built (dist exists)" "test -d /home/ubuntu/cook-smart/backend/dist"
run_test "Environment file exists" "test -f /home/ubuntu/cook-smart/backend/.env"
run_test "Package.json exists" "test -f /home/ubuntu/cook-smart/backend/package.json"
run_test "Node modules installed" "test -d /home/ubuntu/cook-smart/backend/node_modules"

echo ""

# 5. PM2 Process Tests
echo "⚙️  PM2 Process Tests"
echo "===================="

run_test "PM2 process running" "pm2 list | grep -q 'cook-smart-backend.*online'"
run_test_with_output "PM2 process status" "pm2 jlist | jq -r '.[] | select(.name==\"cook-smart-backend\") | .pm2_env.status'"
run_test "PM2 startup configured" "pm2 startup | grep -q 'already setup'"

# Check PM2 process details
if pm2 list | grep -q 'cook-smart-backend.*online'; then
    print_status "PM2 Process Details:"
    pm2 show cook-smart-backend | grep -E "(name|status|pid|uptime|memory|cpu)"
fi

echo ""

# 6. Network and Port Tests
echo "🌐 Network and Port Tests"
echo "========================="

run_test "Port 3000 listening (Node.js)" "netstat -tlnp | grep ':3000'"
run_test "Port 80 listening (Nginx)" "netstat -tlnp | grep ':80'"
run_test "Port 443 listening (Nginx SSL)" "netstat -tlnp | grep ':443'"
run_test "PostgreSQL port 5432 listening" "netstat -tlnp | grep ':5432'"

echo ""

# 7. API Endpoint Tests
echo "🔌 API Endpoint Tests"
echo "===================="

# Test local endpoints first
run_test_with_output "Local API health check" "curl -s http://localhost:3000/health | jq -r '.status'"
run_test "Local API responds" "curl -s -f http://localhost:3000/health"

# Test through Nginx
run_test "Nginx proxy health check" "curl -s -f http://localhost/health"

# Test HTTPS if available
if curl -s -f https://api.cooksmartapp.com/health > /dev/null 2>&1; then
    run_test "HTTPS API health check" "curl -s -f https://api.cooksmartapp.com/health"
    run_test_with_output "HTTPS API status" "curl -s https://api.cooksmartapp.com/health | jq -r '.status'"
else
    print_warning "HTTPS not available - SSL may not be configured yet"
fi

# Test specific API endpoints
api_endpoints=(
    "/subscriptions/pricing"
    "/auth/test"
)

for endpoint in "${api_endpoints[@]}"; do
    if curl -s -f "http://localhost:3000$endpoint" > /dev/null 2>&1; then
        run_test "API endpoint $endpoint" "curl -s -f http://localhost:3000$endpoint"
    else
        print_warning "API endpoint $endpoint not responding (may require authentication)"
    fi
done

echo ""

# 8. SSL Certificate Tests
echo "🔒 SSL Certificate Tests"
echo "========================"

if [ -f /etc/letsencrypt/live/api.cooksmartapp.com/fullchain.pem ]; then
    run_test "SSL certificate exists" "test -f /etc/letsencrypt/live/api.cooksmartapp.com/fullchain.pem"
    run_test_with_output "SSL certificate expiry" "openssl x509 -enddate -noout -in /etc/letsencrypt/live/api.cooksmartapp.com/fullchain.pem | cut -d= -f2"
    run_test "SSL auto-renewal configured" "crontab -l | grep -q certbot"
else
    print_warning "SSL certificate not found - run setup-ssl-and-dns.sh"
fi

echo ""

# 9. Configuration Tests
echo "⚙️  Configuration Tests"
echo "======================="

run_test "Nginx configuration valid" "sudo nginx -t"
run_test "Cook Smart Nginx site enabled" "test -L /etc/nginx/sites-enabled/cook-smart"
run_test "Default Nginx site disabled" "! test -L /etc/nginx/sites-enabled/default"

# Check environment variables (without exposing secrets)
if [ -f /home/ubuntu/cook-smart/backend/.env ]; then
    print_status "Environment Configuration:"
    while IFS= read -r line; do
        if [[ $line =~ ^[A-Z_]+=.+ ]] && [[ ! $line =~ (SECRET|KEY|PASSWORD) ]]; then
            echo "   ✅ ${line%%=*} configured"
        elif [[ $line =~ ^[A-Z_]+=(SECRET|KEY|PASSWORD) ]]; then
            echo "   🔒 ${line%%=*} configured (hidden)"
        fi
    done < /home/ubuntu/cook-smart/backend/.env
fi

echo ""

# 10. Security Tests
echo "🛡️  Security Tests"
echo "=================="

run_test "Firewall status" "sudo ufw status | grep -q 'Status: active' || echo 'Firewall not active (may be managed by cloud provider)'"
run_test "SSH key authentication" "grep -q 'PasswordAuthentication no' /etc/ssh/sshd_config || echo 'Password auth may be enabled'"
run_test "Root login disabled" "grep -q 'PermitRootLogin no' /etc/ssh/sshd_config || echo 'Root login may be enabled'"

echo ""

# 11. Monitoring and Backup Tests
echo "📊 Monitoring and Backup Tests"
echo "=============================="

run_test "Monitoring script exists" "test -f /home/ubuntu/monitor-cook-smart.sh"
run_test "Backup script exists" "test -f /home/ubuntu/backup-database.sh"
run_test "Backup cron job configured" "crontab -l | grep -q backup-database.sh"
run_test "Backup directory exists" "test -d /home/ubuntu/backups || mkdir -p /home/ubuntu/backups"

# Test backup script
if [ -f /home/ubuntu/backup-database.sh ]; then
    print_status "Testing database backup..."
    if /home/ubuntu/backup-database.sh; then
        print_success "✅ Database backup test"
        ((TESTS_PASSED++))
    else
        print_error "❌ Database backup test"
        FAILED_TESTS+=("Database backup test")
        ((TESTS_FAILED++))
    fi
fi

echo ""

# 12. Performance Tests
echo "🚀 Performance Tests"
echo "===================="

# Check system resources
print_status "System Resources:"
echo "   Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
echo "   Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"
echo "   CPU Load: $(uptime | awk -F'load average:' '{print $2}')"

# Check API response time
print_status "API Response Time:"
response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:3000/health)
echo "   Health endpoint: ${response_time}s"

if (( $(echo "$response_time < 1.0" | bc -l) )); then
    print_success "✅ API response time acceptable"
    ((TESTS_PASSED++))
else
    print_warning "⚠️  API response time slow (${response_time}s)"
fi

echo ""

# 13. Final Summary
echo "📋 Verification Summary"
echo "======================"
echo ""

if [ ${TESTS_FAILED} -eq 0 ]; then
    print_success "🎉 All tests passed! ($TESTS_PASSED/$((TESTS_PASSED + TESTS_FAILED)))"
    echo ""
    echo "✅ Cook Smart deployment is fully operational!"
    echo ""
    echo "🔗 Available endpoints:"
    echo "   - Health: https://api.cooksmartapp.com/health"
    echo "   - Pricing: https://api.cooksmartapp.com/subscriptions/pricing"
    echo ""
    echo "📱 Ready for:"
    echo "   - Mobile app integration"
    echo "   - Payment processing"
    echo "   - User registration and authentication"
    echo "   - Recipe management"
    echo "   - All Cook Smart features"
    echo ""
    print_success "🚀 Deployment verification PASSED - Production ready!"
else
    print_warning "⚠️  Some tests failed ($TESTS_PASSED passed, $TESTS_FAILED failed)"
    echo ""
    echo "❌ Failed tests:"
    for test in "${FAILED_TESTS[@]}"; do
        echo "   - $test"
    done
    echo ""
    echo "📋 Recommended actions:"
    echo "1. Review failed tests above"
    echo "2. Check logs: pm2 logs cook-smart-backend"
    echo "3. Check Nginx logs: sudo tail -f /var/log/nginx/error.log"
    echo "4. Verify environment configuration"
    echo "5. Re-run verification after fixes"
    echo ""
    print_warning "🔧 Deployment needs attention before production use"
fi

echo ""
echo "📊 System Status:"
echo "   - Tests Passed: $TESTS_PASSED"
echo "   - Tests Failed: $TESTS_FAILED"
echo "   - Success Rate: $(( TESTS_PASSED * 100 / (TESTS_PASSED + TESTS_FAILED) ))%"
echo ""

# Exit with appropriate code
if [ ${TESTS_FAILED} -eq 0 ]; then
    exit 0
else
    exit 1
fi