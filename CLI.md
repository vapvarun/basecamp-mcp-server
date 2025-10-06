# Basecamp MCP CLI

Direct command-line interface to use the Basecamp MCP server capabilities.

## Usage

### Get Cards Assigned to a User

```bash
node build/cli.js get-cards "<project-search>" "<user-name>"
```

**Examples:**

```bash
# Get all cards assigned to Varun in BuddyPress projects
node build/cli.js get-cards "buddypress" "Varun"

# Get cards from a specific project
node build/cli.js get-cards "User Todo List" "John"

# Search across all projects (partial name matching)
node build/cli.js get-cards "plugin" "Varun"
```

## How It Works

1. **Searches Projects**: Fuzzy matches project names across paginated results
2. **Indexes Projects**: Automatically caches matching projects with their columns
3. **Fetches Cards**: Retrieves cards from all columns in matching projects
4. **Filters by Assignee**: Shows only cards assigned to the specified user

## Features

- 🔍 Fuzzy project name search
- 📦 Automatic project indexing for faster subsequent lookups
- 👥 User name or email matching
- 📊 Shows card details: title, ID, URL, due date, co-assignees
- ⚡ Efficient pagination (checks up to 500 projects)

## Output Example

```
🔍 Searching for project: "buddypress"
👤 Looking for cards assigned to: Varun

✅ Found user: Varun Dubey (ID: 45998296)

📦 Searching projects...

   Found 2 match(es) on page 1
   Checked 15 projects

✅ Found 2 matching project(s):

📋 Project: BuddyPress Post From Anywhere (ID: 43067220)
   Found 1 card table(s)

   📊 Card Table: Card Table
      Columns: 10

      🔹 Column: In Development (2 card(s))
         • Implement post attachment support
           ID: 9012345678
           URL: https://3.basecamp.com/5798509/buckets/43067220/card_tables/cards/9012345678
           Due: 2025-10-15
           Assignees: Varun Dubey, John Smith

✅ Total cards assigned to Varun Dubey: 2
```

## Configuration

Requires `config.json` with:
- `accessToken`: Your Basecamp API access token
- `accountId`: Your Basecamp account ID

## Integration with MCP Server

This CLI uses the same API client and IndexManager as the full MCP server, ensuring consistent behavior across both interfaces.
