import MCPZendeskClient from './custom-client.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testClient() {
  const client = new MCPZendeskClient();
  
  try {
    console.log('🚀 Testing MCP Zendesk Client...');
    
    // Set the MCP server path
    process.env.MCP_SERVER_PATH = __dirname;
    
    // Start the MCP server
    console.log('📡 Starting MCP server...');
    const started = await client.startMCPServer();
    
    if (!started) {
      console.error('❌ Failed to start MCP server');
      return;
    }
    
    console.log('✅ MCP server started successfully!');
    console.log('🔧 Available tools:', client.availableTools.map(t => t.name).join(', '));
    
    // Test a simple tool call
    console.log('🧪 Testing ticket analytics...');
    const analytics = await client.getTicketAnalytics(7);
    console.log('📊 Analytics result:', analytics);
    
    // Test database schema
    console.log('🧪 Testing database schema...');
    const schema = await client.getDatabaseSchema('tables');
    console.log('🗃️ Schema result (first 3 items):', JSON.stringify(schema.content?.[0]?.text?.substring(0, 300), null, 2));
    
    // Test a search
    console.log('🧪 Testing ticket search...');
    const searchResult = await client.searchTickets({ 
      status: 'closed', 
      days_back: 7,
      limit: 5 
    });
    console.log('🔍 Search result:', JSON.stringify(searchResult.content?.[0]?.text?.substring(0, 300), null, 2));
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    // Clean up
    console.log('🧹 Cleaning up...');
    await client.stopMCPServer();
    console.log('✅ Test completed!');
  }
}

testClient().catch(console.error);
