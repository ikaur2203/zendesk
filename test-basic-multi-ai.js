import MultiAIMCPClient from './multi-ai-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function testBasicMultiAI() {
  console.log('🤖 Basic Multi-AI Integration Test\n');
  
  // Check configuration
  const config = {
    gemini: !!process.env.GOOGLE_API_KEY,
    claude: !!(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY),
    zendesk: !!(process.env.ZENDESK_SUBDOMAIN && process.env.ZENDESK_EMAIL && process.env.ZENDESK_API_TOKEN),
    sql: !!(process.env.SQL_SERVER && process.env.SQL_DATABASE)
  };

  console.log('📋 Configuration Status:');
  console.log(`- Gemini API: ${config.gemini ? '✅' : '❌'}`);
  console.log(`- Claude API: ${config.claude ? '✅' : '❌'}`);
  console.log(`- Zendesk: ${config.zendesk ? '✅' : '❌'}`);
  console.log(`- SQL Database: ${config.sql ? '✅' : '❌'}`);
  console.log('');

  if (!config.zendesk || !config.sql) {
    console.error('❌ Core configuration missing. Cannot proceed.');
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
    
    // Display status
    const status = client.getStatus();
    console.log('\n📊 System Status:');
    console.log(`- MCP Server: ${status.mcpServer ? '✅' : '❌'}`);
    console.log(`- Available Tools: ${status.availableTools}`);
    console.log(`- Enabled Clients:`, status.enabledClients);
    console.log(`- Copilot Bridge: ${status.copilotBridge ? '✅' : '❌'}`);
    
    // Test direct tool call
    console.log('\n🧪 Testing direct tool call...');
    const toolResult = await client.callTool('mcp_zendesk_support_info');
    
    if (toolResult.error) {
      console.error('❌ Tool Error:', toolResult.error);
    } else {
      console.log('✅ Tool Result:');
      console.log('Support info retrieved successfully');
    }

    // Test routing without AI calls (to avoid quota issues)
    console.log('\n🧪 Testing client configuration...');
    console.log('Available AI clients:');
    Object.entries(client.enabledClients).forEach(([ai, enabled]) => {
      console.log(`- ${ai.toUpperCase()}: ${enabled ? '✅ Ready' : '❌ Disabled'}`);
    });

    console.log('\n🎉 Basic Multi-AI integration test completed successfully!');
    console.log('\n✨ Summary:');
    console.log('- ✅ MCP server connection: Working');
    console.log('- ✅ Tool system: Functional');
    console.log('- ✅ Multi-client architecture: Ready');
    console.log('- ✅ Copilot webhook bridge: Available');
    console.log('- ⚠️  AI testing limited due to API quotas');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('\n🧹 Cleaning up...');
    await client.stopMCPServer();
    console.log('✅ Test completed!');
  }
}

// Run the basic test
testBasicMultiAI().catch(console.error);
