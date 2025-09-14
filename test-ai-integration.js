import MCPZendeskClient from './custom-client.js';

async function testAIIntegration() {
  console.log('🤖 Testing AI Integration with MCP Tools...\n');
  
  const client = new MCPZendeskClient();
  
  try {
    await client.startMCPServer();
    
    // Test 1: Simple query
    console.log('1. 🔍 Testing simple analytics query...');
    const simpleResult = await client.chatWithAI([
      {
        role: "user",
        content: "Get me ticket analytics for the last 3 days"
      }
    ]);
    
    if (simpleResult.response && !simpleResult.error) {
      console.log('✅ AI can call analytics tools');
      console.log('Sample response:', simpleResult.response.substring(0, 200) + '...');
    } else {
      console.log('❌ AI analytics failed:', simpleResult.error);
    }

    // Test 2: Complex query with multiple tools
    console.log('\n2. 🧠 Testing complex multi-tool query...');
    const complexResult = await client.chatWithAI([
      {
        role: "user", 
        content: "Show me the database schema for tickets table, then find the top 3 busiest groups in the last week"
      }
    ]);
    
    if (complexResult.response && !complexResult.error) {
      console.log('✅ AI can chain multiple tools');
      console.log('Sample response:', complexResult.response.substring(0, 200) + '...');
    } else {
      console.log('❌ AI multi-tool failed:', complexResult.error);
    }

    // Test 3: Direct tool access
    console.log('\n3. ⚡ Testing direct tool access...');
    const directResult = await client.getTicketAnalytics(1);
    
    if (directResult.content) {
      console.log('✅ Direct tool access working');
    } else {
      console.log('❌ Direct tool access failed');
    }

    console.log('\n🎉 AI Integration Test Complete! 🎉');

  } catch (error) {
    console.error('❌ AI Integration Test Failed:', error.message);
  } finally {
    await client.stopMCPServer();
  }
}

testAIIntegration();
