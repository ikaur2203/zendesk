// Test the fixed Claude client
import ClaudeMCPClient from './claude-client-fixed.js';

async function testClaudeFixed() {
  const client = new ClaudeMCPClient();
  
  try {
    console.log('🧪 Testing Fixed Claude MCP Client...\n');
    
    // Test connection
    const connectionOk = await client.testConnection();
    if (!connectionOk) {
      throw new Error('Connection test failed');
    }
    
    // Test a simple chat without tools
    console.log('\n💬 Testing basic chat...');
    const basicResponse = await client.chatWithClaude("Hello, can you tell me about Zendesk?", false);
    if (basicResponse.error) {
      console.log('Basic chat error:', basicResponse.error);
    } else {
      console.log('Basic response:', basicResponse.response ? basicResponse.response.substring(0, 200) + '...' : 'No response');
    }
    
    // Test chat with tools
    console.log('\n🔧 Testing chat with tools...');
    const toolResponse = await client.chatWithClaude("How many tickets do we have? Just give me the count, limit to 5 tickets in your query.", true);
    if (toolResponse.error) {
      console.log('Tool chat error:', toolResponse.error);
    } else {
      console.log('Tool response:', toolResponse.response || 'No response');
    }
    
    await client.stopMCPServer();
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await client.stopMCPServer();
  }
}

testClaudeFixed();