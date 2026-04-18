#!/bin/bash

# Basecamp Token Refresh Script
# This script automatically refreshes the Basecamp access token

CONFIG_FILE="/Users/varundubey/basecamp-mcp-server/config.json"

# Read current config
CLIENT_ID=$(jq -r '.clientId' "$CONFIG_FILE")
CLIENT_SECRET=$(jq -r '.clientSecret' "$CONFIG_FILE")
REFRESH_TOKEN=$(jq -r '.refreshToken' "$CONFIG_FILE")
ACCOUNT_ID=$(jq -r '.accountId' "$CONFIG_FILE")

if [ -z "$REFRESH_TOKEN" ] || [ "$REFRESH_TOKEN" = "null" ] || [ "$REFRESH_TOKEN" = "" ]; then
    echo "❌ No refresh token found. Please use the WordPress OAuth helper plugin to get a refresh token."
    exit 1
fi

echo "🔄 Refreshing Basecamp access token..."

# Request new token
RESPONSE=$(curl -s -X POST "https://launchpad.37signals.com/authorization/token" \
    -d "type=refresh" \
    -d "refresh_token=$REFRESH_TOKEN" \
    -d "client_id=$CLIENT_ID" \
    -d "client_secret=$CLIENT_SECRET")

# Extract new access token
NEW_ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')

if [ -z "$NEW_ACCESS_TOKEN" ] || [ "$NEW_ACCESS_TOKEN" = "null" ]; then
    echo "❌ Failed to refresh token. Response:"
    echo "$RESPONSE" | jq '.'
    exit 1
fi

# Update config.json
jq --arg token "$NEW_ACCESS_TOKEN" '.accessToken = $token' "$CONFIG_FILE" > "$CONFIG_FILE.tmp"
mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

# Update Claude Desktop config
CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
if [ -f "$CLAUDE_CONFIG" ]; then
    echo "✅ Updated config.json"
else
    echo "⚠️  Claude Desktop config not found"
fi

echo "✅ Basecamp access token refreshed successfully!"
echo "🔄 Please restart Claude Desktop for changes to take effect"
