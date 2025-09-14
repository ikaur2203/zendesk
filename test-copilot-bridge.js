import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Testing Copilot Bridge Dependencies...');

try {
  console.log('✅ Imports successful');
  
  // Test Express
  const app = express();
  console.log('✅ Express initialized');
  
  // Test environment variables
  console.log('🔍 Environment check:');
  console.log('  ZENDESK_SUBDOMAIN:', process.env.ZENDESK_SUBDOMAIN ? '✅ Set' : '❌ Missing');
  console.log('  SQL_SERVER:', process.env.SQL_SERVER ? '✅ Set' : '❌ Missing');
  
  // Test simple MCP client creation
  const client = new Client({
    name: "test-client",
    version: "1.0.0"
  }, {
    capabilities: { tools: {} }
  });
  console.log('✅ MCP Client created');
  
  console.log('\n🎉 All dependencies are working!');
  console.log('\nTrying to start the actual bridge...\n');
  
  // Now import and run the actual bridge
  const { default: CopilotMCPBridge } = await import('./copilot-bridge.js');
  
} catch (error) {
  console.error('❌ Error in copilot-bridge dependencies:', error);
  console.error('Stack trace:', error.stack);
}
