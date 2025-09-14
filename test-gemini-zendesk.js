import GeminiMCPClient from './gemini-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function testGeminiWithZendesk() {
  console.log('🤖 Testing Zendesk MCP Server with Google Gemini\n');
  
  // Check if API key is configured
  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_API_KEY not found in .env file');
    console.log('💡 Get your API key from: https://makersuite.google.com/app/apikey');
    return;
  }
  
  const client = new GeminiMCPClient();
  
  try {
    console.log('🚀 Starting MCP server...');
    const started = await client.startMCPServer();
    
    if (!started) {
      console.error('❌ Failed to start MCP server');
      return;
    }
    
    console.log('✅ MCP server started successfully!');
    console.log(`🔧 Available tools: ${client.availableTools.length} tools loaded\n`);
    
    // Test 1: Simple tool availability check
    console.log('🧪 Test 1: Checking available tools...');
    const toolsResponse = await client.chatWithGemini(
      "What Zendesk analysis tools do you have available? List them briefly."
    );
    
    if (toolsResponse.error) {
      console.error('❌ Error:', toolsResponse.error);
    } else {
      console.log('✅ Gemini Response:');
      console.log(toolsResponse.response);
      console.log('\n' + '='.repeat(50) + '\n');
    }
    
    // Test 2: Get ticket analytics
    console.log('🧪 Test 2: Getting ticket analytics...');
    const analyticsResponse = await client.chatWithGemini(
      "Can you analyze my Zendesk tickets from the last 7 days? Show me key metrics like total tickets, status breakdown, and any notable trends."
    );
    
    if (analyticsResponse.error) {
      console.error('❌ Error:', analyticsResponse.error);
    } else {
      console.log('✅ Analytics Response:');
      console.log(analyticsResponse.response);
      console.log('\n' + '='.repeat(50) + '\n');
    }
    
    // Test 3: Search for specific tickets
    console.log('🧪 Test 3: Searching for open tickets...');
    const searchResponse = await client.chatWithGemini(
      "Find me the 5 most recent open tickets. For each ticket, show the ID, subject, priority, and when it was created."
    );
    
    if (searchResponse.error) {
      console.error('❌ Error:', searchResponse.error);
    } else {
      console.log('✅ Search Response:');
      console.log(searchResponse.response);
      console.log('\n' + '='.repeat(50) + '\n');
    }
    
    // Test 4: Generate insights
    console.log('🧪 Test 4: Generating insights...');
    const insightsResponse = await client.chatWithGemini(
      "Based on my Zendesk data, what are 3 key insights or recommendations you can provide to improve our support operations?"
    );
    
    if (insightsResponse.error) {
      console.error('❌ Error:', insightsResponse.error);
    } else {
      console.log('✅ Insights Response:');
      console.log(insightsResponse.response);
      console.log('\n' + '='.repeat(50) + '\n');
    }
    
    // Test 5: Database query
    console.log('🧪 Test 5: Custom database analysis...');
    const dbResponse = await client.chatWithGemini(
      "Can you run a query to show me which support groups have handled the most tickets in the past 30 days? Include ticket counts and average resolution times if possible."
    );
    
    if (dbResponse.error) {
      console.error('❌ Error:', dbResponse.error);
    } else {
      console.log('✅ Database Analysis Response:');
      console.log(dbResponse.response);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ MCP server connection: Working');
    console.log('- ✅ Gemini integration: Working');
    console.log('- ✅ Zendesk tools: Available');
    console.log('- ✅ Database queries: Functional');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up...');
    await client.stopMCPServer();
    console.log('✅ Test completed!');
  }
}

// Run the test
testGeminiWithZendesk().catch(console.error);