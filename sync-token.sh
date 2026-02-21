#!/bin/bash
# Basecamp Token Sync Script
# Reads token from WordPress and updates MCP configs
#
# Usage: ./sync-token.sh
# Run this after refreshing token in WordPress admin

WP_PATH="/Users/varundubey/Local Sites/reign-release/app/public"
MCP_CONFIG="/Users/varundubey/.mcp-servers/basecamp-mcp-server/config.json"
CLAUDE_CONFIG="/Users/varundubey/Library/Application Support/Claude/claude_desktop_config.json"
CLAUDE_JSON="/Users/varundubey/.claude.json"

echo "=== Basecamp Token Sync ==="
echo ""

# Get tokens from WordPress
echo "1. Reading tokens from WordPress..."
TOKENS=$(cd "$WP_PATH" && wp eval '
$data = get_option("bcr_token_data");
if ($data) {
    echo json_encode([
        "accessToken" => $data["access_token"],
        "refreshToken" => $data["refresh_token"]
    ]);
}
' 2>/dev/null)

if [ -z "$TOKENS" ] || [ "$TOKENS" == "null" ]; then
    echo "   ERROR: Could not read tokens from WordPress"
    echo "   Make sure you've connected Basecamp in WordPress admin first"
    exit 1
fi

ACCESS_TOKEN=$(echo "$TOKENS" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "$TOKENS" | jq -r '.refreshToken')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
    echo "   ERROR: Access token is empty"
    exit 1
fi

echo "   Access Token: ${ACCESS_TOKEN:0:50}..."
echo "   Refresh Token: ${REFRESH_TOKEN:0:50}..."
echo ""

# Update MCP server config.json
echo "2. Updating MCP server config.json..."
jq --arg at "$ACCESS_TOKEN" --arg rt "$REFRESH_TOKEN" \
   '.accessToken = $at | .refreshToken = $rt' \
   "$MCP_CONFIG" > "${MCP_CONFIG}.tmp" && mv "${MCP_CONFIG}.tmp" "$MCP_CONFIG"
echo "   Updated: $MCP_CONFIG"
echo ""

# Update Claude desktop config
echo "3. Updating Claude desktop config..."
jq --arg at "$ACCESS_TOKEN" --arg rt "$REFRESH_TOKEN" \
   '.mcpServers.basecamp.env.BASECAMP_ACCESS_TOKEN = $at | .mcpServers.basecamp.env.BASECAMP_REFRESH_TOKEN = $rt' \
   "$CLAUDE_CONFIG" > "${CLAUDE_CONFIG}.tmp" && mv "${CLAUDE_CONFIG}.tmp" "$CLAUDE_CONFIG"
echo "   Updated: $CLAUDE_CONFIG"
echo ""

# Update Claude Code CLI config (.claude.json)
echo "4. Updating Claude Code CLI config..."
if [ -f "$CLAUDE_JSON" ]; then
    jq --arg at "$ACCESS_TOKEN" --arg rt "$REFRESH_TOKEN" \
       '.mcpServers.basecamp.env.BASECAMP_ACCESS_TOKEN = $at | .mcpServers.basecamp.env.BASECAMP_REFRESH_TOKEN = $rt' \
       "$CLAUDE_JSON" > "${CLAUDE_JSON}.tmp" && mv "${CLAUDE_JSON}.tmp" "$CLAUDE_JSON"
    echo "   Updated: $CLAUDE_JSON"
else
    echo "   Skipped: $CLAUDE_JSON (file not found)"
fi
echo ""

echo "=== DONE ==="
echo ""
echo "IMPORTANT: Restart Claude Code to use the new token!"
echo ""
