// Quick test for the highest_ticket_category tool specifically
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testHighestTicketCategory() {
  try {
    console.log('🧪 Testing highest_ticket_category tool specifically...\n');
    
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['src/index.js'],
      env: {
        ...process.env,
        ZENDESK_SUBDOMAIN: process.env.ZENDESK_SUBDOMAIN,
        ZENDESK_EMAIL: process.env.ZENDESK_EMAIL,
        ZENDESK_API_TOKEN: process.env.ZENDESK_API_TOKEN,
      }
    });

    const client = new Client(
      {
        name: "highest-category-test-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    await client.connect(transport);
    console.log('✅ Connected to MCP server');

    // Test the highest_ticket_category tool specifically
    console.log('\n🔍 Testing highest_ticket_category tool...');
    try {
      const result = await client.callTool({
        name: "highest_ticket_category",
        arguments: {}
      });
      
      console.log('✅ highest_ticket_category tool working:');
      console.log(result.content[0].text);
      if (result.content[1]) {
        console.log(result.content[1].text);
      }
    } catch (error) {
      console.log('❌ highest_ticket_category tool error:', error.message);
    }

    await client.close();
    console.log('\n✅ Test completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testHighestTicketCategory();