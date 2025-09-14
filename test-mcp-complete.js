import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testMCPServer() {
  try {
    console.log('🚀 Starting MCP Server test...\n');
    
    // Create transport and client
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['src/index.js']
    });

    const client = new Client(
      {
        name: "zendesk-test-client",
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

    // List available tools
    const tools = await client.listTools();
    console.log(`✅ Found ${tools.tools.length} available tools\n`);

    // Test analytics tool
    console.log('🔍 Testing get_zendesk_ticket_analytics...');
    const analyticsResult = await client.callTool({
      name: "get_zendesk_ticket_analytics",
      arguments: { days_back: 7 }
    });
    
    console.log('📈 Analytics Result:');
    console.log(analyticsResult.content[0].text);
    console.log('\n' + '='.repeat(50) + '\n');

    // Test get tickets by criteria
    console.log('🔍 Testing get_tickets_by_criteria with status filter...');
    const ticketsResult = await client.callTool({
      name: "get_tickets_by_criteria",
      arguments: { 
        status: "open",
        limit: 3,
        days_back: 30
      }
    });
    
    console.log('🎯 Tickets Result:');
    console.log(ticketsResult.content[0].text);
    console.log('\n' + '='.repeat(50) + '\n');

    // Test get tickets by priority
    console.log('🔍 Testing get_tickets_by_criteria with priority filter...');
    const priorityResult = await client.callTool({
      name: "get_tickets_by_criteria",
      arguments: { 
        priority: "high",
        limit: 3,
        days_back: 30
      }
    });
    
    console.log('⚡ High Priority Tickets:');
    console.log(priorityResult.content[0].text);

    await client.close();
    console.log('\n✅ All tests completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testMCPServer();
