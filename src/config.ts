/**
 * Configuration Management for Basecamp MCP Server
 * Handles loading credentials from environment or config file
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BasecampConfig {
  accessToken: string;
  accountId?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

/**
 * Load configuration from environment variables or config file
 */
export function loadConfig(): BasecampConfig {
  // First, try environment variables
  const accessToken = process.env.BASECAMP_ACCESS_TOKEN;
  const accountId = process.env.BASECAMP_ACCOUNT_ID;
  const refreshToken = process.env.BASECAMP_REFRESH_TOKEN;
  const clientId = process.env.BASECAMP_CLIENT_ID;
  const clientSecret = process.env.BASECAMP_CLIENT_SECRET;

  if (accessToken) {
    return {
      accessToken,
      accountId,
      refreshToken,
      clientId,
      clientSecret,
    };
  }

  // Try to load from config file
  const configPath = path.join(__dirname, '..', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const configData = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData);

      if (config.accessToken) {
        return config;
      }
    } catch (error) {
      console.error('Error reading config file:', error);
    }
  }

  // No valid config found
  throw new Error(
    'Basecamp credentials not found. Please set BASECAMP_ACCESS_TOKEN environment variable or create a config.json file.'
  );
}

/**
 * Save configuration to config file
 */
export function saveConfig(config: BasecampConfig): void {
  const configPath = path.join(__dirname, '..', 'config.json');

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.error('Configuration saved to config.json');
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
}

/**
 * Create a sample config file
 */
export function createSampleConfig(): void {
  const configPath = path.join(__dirname, '..', 'config.example.json');
  const sampleConfig = {
    accessToken: 'YOUR_BASECAMP_ACCESS_TOKEN',
    accountId: 'YOUR_BASECAMP_ACCOUNT_ID (optional)',
    refreshToken: 'YOUR_REFRESH_TOKEN (optional)',
    clientId: 'YOUR_CLIENT_ID (optional, for OAuth)',
    clientSecret: 'YOUR_CLIENT_SECRET (optional, for OAuth)',
  };

  fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2));
  console.error('Sample configuration created at config.example.json');
}
