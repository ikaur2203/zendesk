import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testMCPIntegration() {
  console.log('🧪 Testing MCP Tools Integration...\n');
  
  try {
    // Create transport and client
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['src/index.js']
    });

    const client = new Client(
      {
        name: "integration-test-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    await client.connect(transport);
    console.log('✅ MCP server connected');

    // Test 1: List tools
    const tools = await client.listTools();
    console.log(`✅ Tools available: ${tools.tools.length}`);
    
    const toolNames = tools.tools.map(t => t.name);
    const expectedTools = [
      'get_zendesk_ticket_analytics',
      'get_tickets_by_criteria', 
      'get_database_schema',
      'execute_custom_sql'
    ];
    
    for (const tool of expectedTools) {
      if (toolNames.includes(tool)) {
        console.log(`  ✅ ${tool} - Available`);
      } else {
        console.log(`  ❌ ${tool} - Missing`);
      }
    }

    // Test 2: Analytics tool
    console.log('\n🔍 Testing analytics tool...');
    const analyticsResult = await client.callTool({
      name: "get_zendesk_ticket_analytics",
      arguments: { days_back: 1 }
    });
    
    if (analyticsResult.content[0].text.includes('Zendesk Ticket Analytics')) {
      console.log('✅ Analytics tool working');
    } else {
      console.log('❌ Analytics tool failed');
    }

    // Test 3: Search tool
    console.log('\n🔍 Testing search tool...');
    const searchResult = await client.callTool({
      name: "get_tickets_by_criteria",
      arguments: { limit: 1, days_back: 7 }
    });
    
    if (searchResult.content[0].text.includes('Found')) {
      console.log('✅ Search tool working');
    } else {
      console.log('❌ Search tool failed');
    }

    // Test 4: Custom SQL
    console.log('\n🔍 Testing custom SQL...');
    const sqlResult = await client.callTool({
      name: "execute_custom_sql",
      arguments: { 
        query: "SELECT COUNT(*) as total FROM zendesk.tbl_Ticket WHERE Created >= DATEADD(day, -1, GETDATE())" 
      }
    });
    
    if (sqlResult.content[0].text.includes('Query Results')) {
      console.log('✅ Custom SQL working');
    } else {
      console.log('❌ Custom SQL failed');
    }

    await client.close();
    console.log('\n🎉 MCP Integration Test Complete! 🎉');

  } catch (error) {
    console.error('❌ MCP Integration Test Failed:', error.message);
  }
}

testMCPIntegration();
