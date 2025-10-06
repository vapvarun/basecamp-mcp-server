#!/usr/bin/env node

/**
 * Basecamp MCP Server - Entry Point
 * Handles initialization and starts the MCP server
 *
 * @author Varun Dubey (vapvarun) <varun@wbcomdesigns.com>
 * @company Wbcom Designs
 * @license GPL-2.0-or-later
 * @link https://github.com/vapvarun/basecamp-mcp-server
 */

import { BasecampMCPServer } from './server.js';
import { loadConfig } from './config.js';

async function main() {
  try {
    // Load configuration
    const config = loadConfig();

    // Initialize and start server
    const server = new BasecampMCPServer(config.accessToken, config.accountId);

    console.error('Starting Basecamp MCP Server...');
    console.error('Access Token:', config.accessToken ? '✓ Configured' : '✗ Missing');
    console.error('Account ID:', config.accountId || 'Will auto-detect');

    await server.run();
  } catch (error) {
    console.error('Failed to start Basecamp MCP Server:', error instanceof Error ? error.message : error);
    console.error('\nConfiguration options:');
    console.error('1. Set environment variables:');
    console.error('   export BASECAMP_ACCESS_TOKEN="your_token"');
    console.error('   export BASECAMP_ACCOUNT_ID="your_account_id" (optional)');
    console.error('\n2. Or create a config.json file in the project root:');
    console.error('   {');
    console.error('     "accessToken": "your_token",');
    console.error('     "accountId": "your_account_id"');
    console.error('   }');
    console.error('\nTo get your access token:');
    console.error('1. Create a Basecamp app at: https://launchpad.37signals.com/integrations');
    console.error('2. Use OAuth flow to get access token');
    process.exit(1);
  }
}

main();
