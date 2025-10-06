# 🚀 Basecamp MCP Server - Quick Start

## ✅ Setup Complete!

Your Basecamp MCP Server is now installed and configured with your existing WordPress credentials.

### What's Been Done:

1. ✅ **Tokens Extracted** - Access tokens retrieved from WordPress database
2. ✅ **Server Built** - TypeScript compiled to JavaScript
3. ✅ **Claude Desktop Configured** - MCP server added to Claude Desktop
4. ✅ **Ready to Use** - All 40+ Basecamp tools are now available

## 🔄 Next Steps

### 1. Restart Claude Desktop

**Important:** You must restart Claude Desktop for the changes to take effect.

```bash
# Quit Claude Desktop completely, then restart it
```

### 2. Verify Installation

Open Claude Desktop and check if the Basecamp tools are available. You should see the hammer/wrench icon in the bottom right showing MCP tools are loaded.

### 3. Test It Out

Try these commands in Claude Desktop:

```
"Read this Basecamp card: https://3.basecamp.com/5798509/buckets/37557560/card_tables/cards/9010883489"

"List all my Basecamp projects"

"Create a card in project 37557560, column 7365382 titled 'Test from Claude'"
```

## 📍 Installation Paths

- **MCP Server:** `/Users/varundubey/Local Sites/reign-learndash/app/public/basecamp-mcp-server`
- **Built Files:** `/Users/varundubey/Local Sites/reign-learndash/app/public/basecamp-mcp-server/build`
- **Config File:** `/Users/varundubey/Local Sites/reign-learndash/app/public/basecamp-mcp-server/config.json`
- **Claude Config:** `~/Library/Application Support/Claude/claude_desktop_config.json`

## 🔧 Your Credentials

Your configuration is loaded from:

**Access Token:** Loaded from environment variable in Claude config
**Account ID:** `5798509`
**Token Expires:** 2025-10-14

## 🛠 Available Tools (40+)

### Reading & Commenting
- `basecamp_read` - Read cards/todos with comments
- `basecamp_comment` - Post comments

### Project Management
- `basecamp_list_projects` - List all projects
- `basecamp_get_project` - Get project details
- `basecamp_create_project` - Create new project
- `basecamp_update_project` - Update project
- `basecamp_trash_project` - Delete project

### Card Operations
- `basecamp_list_columns` - List columns
- `basecamp_list_cards` - List cards in column
- `basecamp_get_card` - Get card details
- `basecamp_create_card` - Create card
- `basecamp_update_card` - Update card
- `basecamp_move_card` - Move card to different column
- `basecamp_trash_card` - Delete card

### Card Steps
- `basecamp_list_steps` - List checklist items
- `basecamp_add_step` - Add checklist item
- `basecamp_complete_step` - Mark step done
- `basecamp_uncomplete_step` - Mark step not done

### People & Activity
- `basecamp_list_people` - List all people
- `basecamp_get_person` - Get person details
- `basecamp_get_events` - Get recent activity

### Search & Utility
- `basecamp_find_project` - Search projects
- `basecamp_parse_url` - Parse Basecamp URLs

## 📝 Usage Examples

### Example 1: Read a Card
```
User: "Read this Basecamp card with all comments:
       https://3.basecamp.com/5798509/buckets/37557560/card_tables/cards/9010883489"

Claude: [Uses basecamp_read tool]
        Here's the card information...
```

### Example 2: Create and Move a Card
```
User: "Create a card titled 'Fix bug in login' in project 37557560, column 7365382,
       then move it to the 'In Progress' column (7365383)"

Claude: [Uses basecamp_create_card and basecamp_move_card tools]
        Card created and moved successfully!
```

### Example 3: Post a Comment
```
User: "Post a comment to this card saying 'Working on this now'"

Claude: [Uses basecamp_comment tool]
        Comment posted!
```

## 🔄 Updating

If you make changes to the source code:

```bash
cd "/Users/varundubey/Local Sites/reign-learndash/app/public/basecamp-mcp-server"
npm run build
# Then restart Claude Desktop
```

## 🌍 Using from Terminal/CLI

You can also run the MCP server directly from any terminal:

```bash
# Set environment variables
export BASECAMP_ACCESS_TOKEN="your_token"
export BASECAMP_ACCOUNT_ID="5798509"

# Run the server
node "/Users/varundubey/Local Sites/reign-learndash/app/public/basecamp-mcp-server/build/index.js"
```

Or use the config file:

```bash
cd "/Users/varundubey/Local Sites/reign-learndash/app/public/basecamp-mcp-server"
node build/index.js
```

## 🐛 Troubleshooting

### Tools not showing in Claude
1. Make sure you **completely quit and restart Claude Desktop** (Cmd+Q, then reopen)
2. Check Claude Desktop logs for errors
3. Verify config file path is correct

### "Basecamp credentials not found"
- Check that config.json exists and contains the access token
- Or verify environment variables are set in Claude config

### API Errors
- Check if your access token has expired (expires: 2025-10-14)
- Verify you have proper permissions in Basecamp

### Server Crashes
Check Claude Desktop logs:
```bash
tail -f ~/Library/Logs/Claude/mcp*.log
```

## 📚 Documentation

- **README:** Full documentation in `README.md`
- **Conversion Guide:** See `CONVERSION_GUIDE.md` for WordPress → MCP mapping
- **Basecamp API:** https://github.com/basecamp/bc3-api

## 🎉 You're All Set!

Your Basecamp MCP server is ready to use. Just restart Claude Desktop and start managing your Basecamp projects with natural language!

---

**Need help?** Check the README.md or CONVERSION_GUIDE.md for detailed information.
