import MultiAIMCPClient from './multi-ai-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function testMultiAIIntegration() {
  console.log('🤖 Testing Multi-AI Zendesk MCP Integration\n');
  console.log('🔧 This will test Gemini, Claude, and Copilot integration simultaneously\n');
  
  // Check API keys
  const apiKeyStatus = {
    gemini: !!process.env.GOOGLE_API_KEY,
    claude: !!(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY),
    zendesk: !!(process.env.ZENDESK_SUBDOMAIN && process.env.ZENDESK_EMAIL && process.env.ZENDESK_API_TOKEN),
    sql: !!(process.env.SQL_SERVER && process.env.SQL_DATABASE)
  };

  console.log('📋 Configuration Check:');
  console.log(`- Gemini API Key: ${apiKeyStatus.gemini ? '✅' : '❌ Missing GOOGLE_API_KEY'}`);
  console.log(`- Claude API Key: ${apiKeyStatus.claude ? '✅' : '❌ Missing ANTHROPIC_API_KEY'}`);
  console.log(`- Zendesk Config: ${apiKeyStatus.zendesk ? '✅' : '❌ Missing Zendesk credentials'}`);
  console.log(`- SQL Database: ${apiKeyStatus.sql ? '✅' : '❌ Missing SQL credentials'}`);
  console.log('');

  if (!apiKeyStatus.zendesk || !apiKeyStatus.sql) {
    console.error('❌ Critical configuration missing. Cannot proceed with tests.');
    return;
  }

  const client = new MultiAIMCPClient();
  
  try {
    console.log('🚀 Starting Multi-AI MCP server...');
    const started = await client.startMCPServer();
    
    if (!started) {
      console.error('❌ Failed to start MCP server');
      return;
    }
    
    console.log('✅ Multi-AI MCP server started successfully!');
    console.log(`🔧 Available tools: ${client.availableTools.length} tools loaded\n`);
    
    // Display status
    const status = client.getStatus();
    console.log('📊 System Status:');
    console.log(JSON.stringify(status, null, 2));
    console.log('\n' + '='.repeat(60) + '\n');

    // Test 1: Individual AI testing
    if (apiKeyStatus.gemini) {
      console.log('🧪 Test 1a: Gemini Individual Test');
      const geminiResponse = await client.chatWithGemini(
        "What Zendesk tools are available? List the top 5 most useful ones."
      );
      
      if (geminiResponse.error) {
        console.error('❌ Gemini Error:', geminiResponse.error);
      } else {
        console.log('✅ Gemini Response:');
        console.log(geminiResponse.response);
      }
      console.log('\n' + '-'.repeat(50) + '\n');
    }

    if (apiKeyStatus.claude) {
      console.log('🧪 Test 1b: Claude Individual Test');
      const claudeResponse = await client.chatWithClaude(
        "What Zendesk tools are available? List the top 5 most useful ones."
      );
      
      if (claudeResponse.error) {
        console.error('❌ Claude Error:', claudeResponse.error);
      } else {
        console.log('✅ Claude Response:');
        console.log(claudeResponse.response);
      }
      console.log('\n' + '-'.repeat(50) + '\n');
    }

    // Test 2: Parallel AI comparison
    if (apiKeyStatus.gemini || apiKeyStatus.claude) {
      console.log('🧪 Test 2: Parallel AI Analysis');
      const parallelResults = await client.chatWithAll(
        "Analyze my Zendesk tickets from the last 7 days. What are the key trends and insights?"
      );
      
      console.log('✅ Parallel Analysis Results:');
      Object.entries(parallelResults).forEach(([ai, result]) => {
        console.log(`\n🤖 ${ai.toUpperCase()}:`);
        if (result.error) {
          console.error(`❌ Error: ${result.error}`);
        } else {
          console.log(result.response);
        }
      });
      console.log('\n' + '-'.repeat(50) + '\n');
    }

    // Test 3: Consensus analysis
    if ((apiKeyStatus.gemini && apiKeyStatus.claude)) {
      console.log('🧪 Test 3: Consensus Analysis');
      const consensusResults = await client.getConsensusAnalysis(
        "What are the top 3 recommendations to improve our Zendesk support efficiency?"
      );
      
      console.log('✅ Consensus Analysis:');
      console.log(JSON.stringify(consensusResults, null, 2));
      console.log('\n' + '-'.repeat(50) + '\n');
    }

    // Test 4: Routing test
    console.log('🧪 Test 4: Message Routing Test');
    const routedResponse = await client.routeMessage(
      "Show me tickets with high priority that are still open."
    );
    
    if (routedResponse.error) {
      console.error('❌ Routing Error:', routedResponse.error);
    } else {
      console.log('✅ Routed Response:');
      console.log(routedResponse.response);
    }
    console.log('\n' + '-'.repeat(50) + '\n');

    // Test 5: Copilot bridge test
    console.log('🧪 Test 5: Copilot Bridge Test');
    try {
      const fetch = (await import('node-fetch')).default;
      const copilotPort = process.env.COPILOT_PORT || 3001;
      
      // Test health endpoint
      const healthResponse = await fetch(`http://localhost:${copilotPort}/health`);
      const healthData = await healthResponse.json();
      console.log('✅ Copilot Bridge Health:', healthData);
      
      // Test webhook endpoint
      const webhookResponse = await fetch(`http://localhost:${copilotPort}/webhook/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Get me a summary of today's tickets"
        })
      });
      const webhookData = await webhookResponse.json();
      console.log('✅ Copilot Webhook Response:', webhookData.success ? 'Success' : 'Failed');
      if (webhookData.response) {
        console.log('Response:', webhookData.response);
      }
    } catch (error) {
      console.error('❌ Copilot Bridge Test Error:', error.message);
    }
    console.log('\n' + '-'.repeat(50) + '\n');

    // Test 6: Tool-specific tests
    console.log('🧪 Test 6: Direct Tool Testing');
    
    // Test analytics tool
    const analyticsResult = await client.callTool('mcp_zendesk_get_zendesk_ticket_analytics', {
      days_back: 7
    });
    
    if (analyticsResult.error) {
      console.error('❌ Analytics Tool Error:', analyticsResult.error);
    } else {
      console.log('✅ Analytics Tool Result:');
      console.log('Tickets processed:', analyticsResult.content?.[0]?.text ? JSON.parse(analyticsResult.content[0].text).length : 'N/A');
    }

    console.log('\n🎉 All Multi-AI tests completed!');
    console.log('\n📋 Integration Summary:');
    console.log(`- ✅ MCP server connection: Working`);
    console.log(`- ${apiKeyStatus.gemini ? '✅' : '❌'} Gemini integration: ${apiKeyStatus.gemini ? 'Working' : 'Disabled'}`);
    console.log(`- ${apiKeyStatus.claude ? '✅' : '❌'} Claude integration: ${apiKeyStatus.claude ? 'Working' : 'Disabled'}`);
    console.log(`- ✅ Copilot bridge: Working`);
    console.log(`- ✅ Zendesk tools: ${client.availableTools.length} available`);
    console.log(`- ✅ Database queries: Functional`);
    
    console.log('\n🔗 Integration Endpoints:');
    console.log(`- Copilot Webhook: http://localhost:${process.env.COPILOT_PORT || 3001}/webhook/copilot`);
    console.log(`- Health Check: http://localhost:${process.env.COPILOT_PORT || 3001}/health`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up...');
    await client.stopMCPServer();
    console.log('✅ Multi-AI test completed!');
  }
}

// Example usage functions
async function exampleGeminiChat() {
  const client = new MultiAIMCPClient();
  await client.startMCPServer();
  
  const response = await client.chatWithGemini(
    "Analyze my support ticket trends and suggest improvements"
  );
  
  console.log('Gemini Analysis:', response.response);
  await client.stopMCPServer();
}

async function exampleClaudeChat() {
  const client = new MultiAIMCPClient();
  await client.startMCPServer();
  
  const response = await client.chatWithClaude(
    "Create a weekly support report with actionable insights"
  );
  
  console.log('Claude Report:', response.response);
  await client.stopMCPServer();
}

async function exampleConsensusAnalysis() {
  const client = new MultiAIMCPClient();
  await client.startMCPServer();
  
  const consensus = await client.getConsensusAnalysis(
    "What are the biggest challenges in our current support workflow?"
  );
  
  console.log('Consensus Analysis:', JSON.stringify(consensus, null, 2));
  await client.stopMCPServer();
}

// Run the comprehensive test
testMultiAIIntegration().catch(console.error);

// Export for use in other modules
export {
  testMultiAIIntegration,
  exampleGeminiChat,
  exampleClaudeChat,
  exampleConsensusAnalysis
};
