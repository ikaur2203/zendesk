// Test the Claude Desktop optimized server
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testClaudeDesktopServer() {
  try {
    console.log('🧪 Testing Claude Desktop Optimized Server...\n');
    
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['src/index-claude-desktop.js'],
      env: {
        ...process.env,
        ZENDESK_SUBDOMAIN: process.env.ZENDESK_SUBDOMAIN,
        ZENDESK_EMAIL: process.env.ZENDESK_EMAIL,
        ZENDESK_API_TOKEN: process.env.ZENDESK_API_TOKEN,
      }
    });

    const client = new Client(
      {
        name: "claude-desktop-test-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    await client.connect(transport);
    console.log('✅ Connected to Claude Desktop optimized server');

    // List available tools
    const tools = await client.listTools();
    console.log(`✅ Found ${tools.tools.length} available tools`);

    // Test a small query that shouldn't trigger content block issues
    console.log('\n🔍 Testing small ticket query...');
    const ticketsResult = await client.callTool({
      name: "list_tickets",
      arguments: { per_page: 3 }
    });
    
    console.log('✅ Small query working - content format:');
    console.log('- Content type:', typeof ticketsResult.content);
    console.log('- Content array length:', Array.isArray(ticketsResult.content) ? ticketsResult.content.length : 'Not array');
    console.log('- First item type:', ticketsResult.content[0]?.type);
    console.log('- Text length:', ticketsResult.content[0]?.text?.length);

    await client.close();
    console.log('\n✅ Claude Desktop server test completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testClaudeDesktopServer();