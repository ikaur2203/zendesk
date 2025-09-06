#!/usr/bin/env node
    /*import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
    import { server } from './server.js';
    import dotenv from 'dotenv';

    // Load environment variables
    dotenv.config();

    console.log('Starting Zendesk API MCP server...');

    // Removed emojis from logs to ensure JSON compatibility
    console.log('Environment variables loaded successfully');
    console.log(`Connecting to: ${process.env.ZENDESK_SUBDOMAIN}.zendesk.com`);

    console.log('Starting Zendesk API MCP server...');

    // Start the server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.log('Zendesk MCP server is running!');*/

 // Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from root directory
dotenv.config({ path: join(__dirname, '..', '.env') });

// Verify all required environment variables are present
const requiredEnvVars = ['ZENDESK_SUBDOMAIN', 'ZENDESK_EMAIL', 'ZENDESK_API_TOKEN'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    process.exit(1);
}

console.log('✅ Environment variables loaded successfully');
console.log(`📡 Connecting to: ${process.env.ZENDESK_SUBDOMAIN}.zendesk.com`);

// Now import everything else after env vars are loaded
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { server } from './server.js';

console.log('🚀 Starting Zendesk API MCP server...');

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);

console.log('✨ Zendesk MCP server is running!'); 
