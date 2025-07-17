#!/usr/bin/env node

/**
 * Jira MCP Server Entry Point
 * Main entry point for the Jira Model Context Protocol server
 */

import { createJiraMcpServer } from './JiraMcpServer.js';
import pkg from '../package.json' with { type: 'json' };

function showHelp() {
  console.log(`
Jira MCP Server v1.0.0

A Model Context Protocol server for Jira integration.

Usage:
  jira-mcp                  Start the MCP server
  jira-mcp --help          Show this help message
  jira-mcp --version       Show version information

Environment Variables:
  JIRA_HOST               Jira instance hostname (required)
  JIRA_PROTOCOL           Protocol (http/https, default: https)
  JIRA_API_VERSION        API version (default: 2)
  
  Authentication (choose one):
  JIRA_USERNAME           Username (recommended)
  JIRA_PASSWORD           Password (recommended)
  
  Alternative - API Token:
  JIRA_EMAIL              Email for token auth
  JIRA_API_TOKEN          API token for authentication

For detailed setup instructions, see: https://github.com/your-repo/jira-mcp

Examples:
  # Check configuration
  npm run verify-config

  # Start server
  jira-mcp

  # Use with MCP clients
  Add to your MCP client config:
  {
    "command": "npx",
    "args": ["jira-mcp"],
    "env": { ... }
  }
`);
}

function showVersion() {
  console.log(`jira-mcp v${pkg.version}`);
}

async function main() {
  // Handle command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  if (args.includes('--version') || args.includes('-v')) {
    showVersion();
    return;
  }
  try {
    const server = await createJiraMcpServer();
    await server.start();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.error('\nReceived SIGINT, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('\nReceived SIGTERM, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start Jira MCP Server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 