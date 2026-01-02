#!/bin/bash

# Fix Discord notifications by copying environment file to correct location
echo "🔧 Fixing Discord notifications environment configuration..."

# Copy the production environment file to the backend directory
cp secrets/.env.production backend/.env.secure

echo "✅ Environment file copied to backend/.env.secure"
echo "🚀 Now deploy the backend to apply the fix"

# Show the Discord webhook configuration
echo ""
echo "📋 Discord webhook configuration:"
grep "DISCORD_.*_WEBHOOK" secrets/.env.production