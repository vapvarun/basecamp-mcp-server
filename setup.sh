#!/bin/bash

# Basecamp MCP Server - Quick Setup Script

echo "🚀 Basecamp MCP Server Setup"
echo "============================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Build the project
echo ""
echo "🔨 Building TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"

# Check for config
echo ""
if [ ! -f "config.json" ]; then
    echo "⚠️  No config.json found"
    echo ""
    echo "📝 Please create a config.json file with your Basecamp credentials:"
    echo ""
    echo "   cp config.example.json config.json"
    echo ""
    echo "   Then edit config.json and add your access token."
    echo ""
    echo "   OR set environment variables:"
    echo "   export BASECAMP_ACCESS_TOKEN=\"your_token\""
    echo "   export BASECAMP_ACCOUNT_ID=\"your_account_id\""
else
    echo "✅ config.json found"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your Basecamp credentials (see above)"
echo "2. Add to Claude Desktop config:"
echo ""
echo '   {
     "mcpServers": {
       "basecamp": {
         "command": "node",
         "args": ["'$(pwd)'/build/index.js"],
         "env": {
           "BASECAMP_ACCESS_TOKEN": "your_token"
         }
       }
     }
   }'
echo ""
echo "3. Restart Claude Desktop"
echo ""
echo "📚 See README.md for detailed instructions"
