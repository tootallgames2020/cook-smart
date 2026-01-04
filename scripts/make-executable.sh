#!/bin/bash
# make-executable.sh - Make deployment scripts executable

chmod +x /home/ubuntu/cook-smart/scripts/deploy-cook-smart-fresh.sh
chmod +x /home/ubuntu/cook-smart/scripts/setup-ssl-and-dns.sh
chmod +x /home/ubuntu/cook-smart/scripts/verify-deployment.sh
chmod +x /home/ubuntu/cook-smart/scripts/make-executable.sh

echo "✅ All deployment scripts are now executable"