import { spawn } from 'child_process';
import { promises as fs } from 'fs';

async function runTest(testFile, testName) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Running ${testName}...`);
    console.log(`${'='.repeat(60)}`);
    
    const startTime = Date.now();
    
    const child = spawn('node', [testFile], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const status = code === 0 ? '✅ PASSED' : '❌ FAILED';
      console.log(`\n${status} ${testName} (${duration}ms)`);
      resolve({ name: testName, passed: code === 0, duration });
    });
    
    child.on('error', (error) => {
      console.error(`❌ Error running ${testName}:`, error.message);
      resolve({ name: testName, passed: false, duration: 0, error: error.message });
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive MCP Zendesk Server Test Suite...\n');
  
  const tests = [
    { file: 'health-check.js', name: 'Health Check' },
    { file: 'test-performance.js', name: 'Performance Test' },
    { file: 'test-mcp-integration.js', name: 'MCP Integration Test' }
    // Note: AI test requires valid API keys, so we'll make it optional
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      // Check if test file exists
      await fs.access(test.file);
      const result = await runTest(test.file, test.name);
      results.push(result);
    } catch (error) {
      console.log(`⚠️  Skipping ${test.name}: ${test.file} not found`);
      results.push({ name: test.name, passed: false, duration: 0, skipped: true });
    }
  }
  
  // Check for AI test
  try {
    await fs.access('test-ai-integration.js');
    console.log('\n🤖 AI Integration test available. Run separately if you have valid API keys:');
    console.log('   node test-ai-integration.js');
  } catch {
    console.log('\n💡 To test AI integration, ensure you have valid OpenAI/Azure API keys in .env');
  }
  
  // Final results
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed && !r.skipped).length;
  const failed = results.filter(r => !r.passed && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;
  
  results.forEach(result => {
    if (result.skipped) {
      console.log(`⏭️  ${result.name} - SKIPPED`);
    } else if (result.passed) {
      console.log(`✅ ${result.name} - PASSED (${result.duration}ms)`);
    } else {
      console.log(`❌ ${result.name} - FAILED${result.error ? ': ' + result.error : ''}`);
    }
  });
  
  console.log('\n📈 SUMMARY:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`📊 Total: ${results.length}`);
  
  if (failed === 0 && passed > 0) {
    console.log('\n🎉 ALL AVAILABLE TESTS PASSED! Your MCP server is working correctly! 🎉');
  } else if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  } else {
    console.log('\n❓ No tests were completed successfully.');
  }
  
  console.log('\n💡 Quick Test Commands:');
  console.log('  npm test          - Run this test suite');
  console.log('  node health-check.js - Quick health check');
  console.log('  node custom-client.js - Manual AI testing');
}

runAllTests();
