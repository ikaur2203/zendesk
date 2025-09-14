// test-zendesk-only.js
// Test just the Zendesk API functionality without SQL database

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testZendeskOnly() {
  try {
    console.log('🚀 Testing Zendesk MCP Server (API only)...\n');
    
    // Create transport and client
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['src/index.js'],
      env: {
        ...process.env,
        // Only set Zendesk environment variables
        ZENDESK_SUBDOMAIN: process.env.ZENDESK_SUBDOMAIN,
        ZENDESK_EMAIL: process.env.ZENDESK_EMAIL,
        ZENDESK_API_TOKEN: process.env.ZENDESK_API_TOKEN,
        // Don't set SQL variables to avoid connection attempts
        SQL_SERVER: undefined,
        SQL_DATABASE: undefined,
        SQL_USER: undefined,
        SQL_PASSWORD: undefined
      }
    });

    const client = new Client(
      {
        name: "zendesk-api-test-client",
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
    console.log(`✅ Found ${tools.tools.length} available tools`);
    
    // Filter to show only Zendesk API tools (not SQL ones)
    const zendeskTools = tools.tools.filter(tool => 
      !tool.name.includes('sql') && 
      !tool.name.includes('database') && 
      !tool.name.includes('stored_procedure')
    );
    
    console.log('\n📋 Available Zendesk API Tools:');
    zendeskTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // Test basic Zendesk API calls
    console.log('\n🔍 Testing list_tickets...');
    try {
      const ticketsResult = await client.callTool({
        name: "list_tickets",
        arguments: { per_page: 5 }
      });
      
      console.log('✅ Tickets API working:');
      console.log(ticketsResult.content[0].text.substring(0, 500) + '...');
    } catch (error) {
      console.log('❌ Tickets API error:', error.message);
    }

    console.log('\n🔍 Testing list_users...');
    try {
      const usersResult = await client.callTool({
        name: "list_users",
        arguments: { per_page: 3 }
      });
      
      console.log('✅ Users API working:');
      console.log(usersResult.content[0].text.substring(0, 300) + '...');
    } catch (error) {
      console.log('❌ Users API error:', error.message);
    }

    console.log('\n🔍 Testing search...');
    try {
      const searchResult = await client.callTool({
        name: "search",
        arguments: { 
          query: "type:ticket",
          per_page: 3
        }
      });
      
      console.log('✅ Search API working:');
      console.log(searchResult.content[0].text.substring(0, 300) + '...');
    } catch (error) {
      console.log('❌ Search API error:', error.message);
    }

    await client.close();
    console.log('\n✅ Zendesk API tests completed!');
    console.log('\n💡 Once you fix the SQL firewall, all SQL tools will work too.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testZendeskOnly();