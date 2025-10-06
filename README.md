# Basecamp MCP Server

[![License: GPL v2](https://img.shields.io/badge/License-GPL%20v2-blue.svg)](https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-0.5.0-purple)](https://github.com/modelcontextprotocol)

A Model Context Protocol (MCP) server for complete Basecamp automation. This server allows AI assistants like Claude to interact with Basecamp projects, cards, todos, comments, and more.

**Author:** [Varun Dubey (vapvarun)](https://github.com/vapvarun) | **Company:** [Wbcom Designs](https://wbcomdesigns.com)

## ⚠️ Important: Setup Required

**If you cloned this from GitHub**, you need to create your `config.json` file:

```bash
# 1. Copy the example config
cp config.example.json config.json

# 2. Edit config.json and add your Basecamp credentials
# (See "Getting Basecamp Credentials" section below)
```

**Note:** `config.json` is gitignored and will never be committed to keep your credentials safe.

## Features

✅ **Complete Basecamp API Coverage**
- Read and comment on cards/todos
- Create, update, move, and trash cards
- Manage projects, columns, and steps
- Handle todos and checklists
- List and manage people
- Track events and activity

✅ **40+ MCP Tools Available**
- All WordPress WP-CLI commands converted to MCP tools
- Full CRUD operations for all Basecamp resources
- Search and utility functions

✅ **Smart Features**
- Auto-detect account ID
- Extract images from comments
- Parse Basecamp URLs
- Fuzzy project search

## Installation

### 1. Install Dependencies

```bash
cd basecamp-mcp-server
npm install
```

### 2. Build the Server

```bash
npm run build
```

### 3. Configure Basecamp Authentication

You have two options:

#### Option A: Environment Variables (Recommended)

```bash
export BASECAMP_ACCESS_TOKEN="your_access_token_here"
export BASECAMP_ACCOUNT_ID="your_account_id"  # Optional, will auto-detect
```

#### Option B: Config File

Create a `config.json` file in the project root:

```json
{
  "accessToken": "your_access_token_here",
  "accountId": "your_account_id"
}
```

**Note:** Use `config.example.json` as a template. Never commit `config.json` to version control.

## Getting Basecamp Credentials

### Step 1: Create a Basecamp App

1. Go to [Basecamp Integrations](https://launchpad.37signals.com/integrations)
2. Click "Register a new app"
3. Fill in the details:
   - **Name:** Your app name (e.g., "My MCP Server")
   - **Company:** Your company/name
   - **Website:** Your website URL
   - **Redirect URI:** `http://localhost:3000/callback` (or your callback URL)

### Step 2: Get OAuth Credentials

From your app page, note down:
- **Client ID**
- **Client Secret**

### Step 3: Get Access Token

You can use the included WordPress plugin to get an access token via OAuth, or implement your own OAuth flow:

```typescript
import { BasecampAPI } from './src/basecamp-api.js';

// 1. Get authorization URL
const authUrl = BasecampAPI.getOAuthUrl(clientId, redirectUri);
// Direct user to this URL

// 2. Exchange code for token (after OAuth redirect)
const tokens = await BasecampAPI.exchangeAuthCode(
  clientId,
  clientSecret,
  redirectUri,
  code
);

console.log(tokens.access_token); // Use this in your config
```

## Using with Claude Desktop

### 1. Add to Claude Desktop Config

Edit your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add the server:

```json
{
  "mcpServers": {
    "basecamp": {
      "command": "node",
      "args": ["/absolute/path/to/basecamp-mcp-server/build/index.js"],
      "env": {
        "BASECAMP_ACCESS_TOKEN": "your_access_token_here",
        "BASECAMP_ACCOUNT_ID": "your_account_id"
      }
    }
  }
}
```

### 2. Restart Claude Desktop

The Basecamp tools will now be available in Claude.

## Available Tools

### Reading & Commenting

- `basecamp_read` - Read card/todo with comments and images
- `basecamp_comment` - Post a comment to any card/todo

### Project Management

- `basecamp_list_projects` - List all projects
- `basecamp_get_project` - Get project details
- `basecamp_create_project` - Create a new project
- `basecamp_update_project` - Update project
- `basecamp_trash_project` - Delete project

### Card Operations

- `basecamp_list_columns` - List columns in a card table
- `basecamp_list_cards` - List cards in a column
- `basecamp_get_card` - Get card details
- `basecamp_create_card` - Create a new card
- `basecamp_update_card` - Update card details
- `basecamp_move_card` - Move card to different column
- `basecamp_trash_card` - Delete card

### Card Steps (Checklists)

- `basecamp_list_steps` - List steps on a card
- `basecamp_add_step` - Add a new step
- `basecamp_complete_step` - Mark step as done
- `basecamp_uncomplete_step` - Mark step as not done

### Todos

- `basecamp_get_todo` - Get todo details
- `basecamp_create_todo` - Create a new todo
- `basecamp_complete_todo` - Complete todo
- `basecamp_uncomplete_todo` - Uncomplete todo

### People

- `basecamp_list_people` - List all people
- `basecamp_get_person` - Get person details

### Events & Activity

- `basecamp_get_events` - Get recent activity

### Search & Utility

- `basecamp_find_project` - Search projects by name
- `basecamp_parse_url` - Parse Basecamp URL to extract IDs

## Usage Examples

### Example 1: Read a Card with Comments

```typescript
// In Claude Desktop, you can simply ask:
// "Read this Basecamp card: https://3.basecamp.com/5798509/buckets/37594834/card_tables/cards/9010883489"

// The tool will be called automatically:
{
  "tool": "basecamp_read",
  "arguments": {
    "url": "https://3.basecamp.com/5798509/buckets/37594834/card_tables/cards/9010883489",
    "include_comments": true,
    "include_images": true
  }
}
```

### Example 2: Create a Card

```typescript
// "Create a card in project 37594834, column 7389123 titled 'New Feature' with description 'Implement OAuth'"

{
  "tool": "basecamp_create_card",
  "arguments": {
    "project_id": "37594834",
    "column_id": "7389123",
    "title": "New Feature",
    "content": "Implement OAuth authentication",
    "due_on": "2024-12-31"
  }
}
```

### Example 3: Move Card to Different Column

```typescript
// "Move card 9010883489 to the Done column (column 7389456)"

{
  "tool": "basecamp_move_card",
  "arguments": {
    "project_id": "37594834",
    "card_id": "9010883489",
    "to_column": "7389456"
  }
}
```

### Example 4: Post a Comment

```typescript
// "Post a comment to this card saying 'Work completed!'"

{
  "tool": "basecamp_comment",
  "arguments": {
    "url": "https://3.basecamp.com/5798509/buckets/37594834/card_tables/cards/9010883489",
    "comment": "Work completed! ✅"
  }
}
```

## Development

### Run in Development Mode

```bash
npm run dev  # Watch mode - rebuilds on changes
```

### Test the Server

```bash
# Build first
npm run build

# Run directly
node build/index.js

# Or with explicit config
BASECAMP_ACCESS_TOKEN="your_token" node build/index.js
```

### Debug with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Project Structure

```
basecamp-mcp-server/
├── src/
│   ├── index.ts           # Entry point
│   ├── server.ts          # Main MCP server implementation
│   ├── basecamp-api.ts    # Basecamp API client
│   ├── tools.ts           # MCP tool definitions
│   └── config.ts          # Configuration loader
├── build/                 # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── config.example.json    # Example config
└── README.md
```

## Architecture

### From WordPress Plugin to MCP Server

The conversion maps WordPress/PHP concepts to MCP/TypeScript:

| WordPress Plugin | MCP Server |
|-----------------|------------|
| WP-CLI Commands | MCP Tools |
| PHP Classes | TypeScript Classes |
| WordPress Options | Config File / Env Vars |
| AJAX Endpoints | Tool Handlers |
| wp_remote_* | fetch API |

### Key Components

1. **BasecampAPI** (`basecamp-api.ts`)
   - Complete Basecamp API v3 client
   - Ported from PHP `class-basecamp-api.php`
   - Handles OAuth and all API endpoints

2. **BasecampMCPServer** (`server.ts`)
   - Implements MCP protocol
   - Routes tool calls to API methods
   - Handles responses and errors

3. **Tools** (`tools.ts`)
   - Defines all available MCP tools
   - Based on WP-CLI command structure
   - Includes input schemas and descriptions

4. **Config** (`config.ts`)
   - Loads credentials from env or file
   - Handles configuration management

## Troubleshooting

### "Basecamp credentials not found"

Make sure you've set either:
- Environment variables (`BASECAMP_ACCESS_TOKEN`)
- Or created a `config.json` file

### "Failed to refresh expired token"

Your access token has expired. Get a new one via OAuth or use a refresh token.

### "Invalid Basecamp URL"

Make sure the URL format is correct:
- Cards: `https://3.basecamp.com/{account}/buckets/{project}/card_tables/cards/{card_id}`
- Todos: `https://3.basecamp.com/{account}/buckets/{project}/todos/{todo_id}`

### Tools not appearing in Claude

1. Check Claude Desktop config file path is correct
2. Ensure the `command` path points to `build/index.js`
3. Restart Claude Desktop completely
4. Check Claude Desktop logs for errors

## API Reference

Full Basecamp API documentation: [https://github.com/basecamp/bc3-api](https://github.com/basecamp/bc3-api)

## Contributing

This MCP server is converted from the Basecamp Pro Automation Suite WordPress plugin. To contribute:

1. Make changes in the appropriate files
2. Build: `npm run build`
3. Test with MCP Inspector
4. Submit a pull request

## License

GPL v2 or later (same as the original WordPress plugin)

## Credits & Author

**Created by:** [Varun Dubey (vapvarun)](https://github.com/vapvarun)
**Company:** [Wbcom Designs](https://wbcomdesigns.com)
**Email:** varun@wbcomdesigns.com

### Acknowledgments

- **Basecamp API:** [Basecamp 3 API by 37signals](https://github.com/basecamp/bc3-api)
- **MCP Protocol:** [Model Context Protocol by Anthropic](https://github.com/modelcontextprotocol)

## Support

For issues related to:
- **MCP Server:** [Open an issue on GitHub](https://github.com/vapvarun/basecamp-mcp-server/issues)
- **Basecamp API:** Check [Basecamp API documentation](https://github.com/basecamp/bc3-api)
- **Claude Desktop:** Check [Anthropic MCP documentation](https://github.com/modelcontextprotocol)

### Professional Support

For professional support, custom development, or enterprise solutions:
- **Website:** [https://wbcomdesigns.com](https://wbcomdesigns.com)
- **Email:** varun@wbcomdesigns.com

## Related Projects

- [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol)
- [Basecamp API](https://github.com/basecamp/bc3-api)
- [Anthropic Claude](https://www.anthropic.com/claude)

---

**Made with ❤️ by [Varun Dubey](https://github.com/vapvarun) at [Wbcom Designs](https://wbcomdesigns.com)**
