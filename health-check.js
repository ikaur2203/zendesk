import { executeQuery } from './src/zendesk-sqlserver.js';
import dotenv from 'dotenv';

dotenv.config();

async function healthCheck() {
  console.log('🏥 Running MCP Zendesk Server Health Check...\n');
  
  const tests = [];
  
  try {
    // Test 1: Database Connection
    console.log('1. 🔌 Testing database connection...');
    const dbTest = await executeQuery('SELECT COUNT(*) as count FROM zendesk.tbl_Ticket');
    tests.push({ test: 'Database Connection', status: '✅ PASS', details: `${dbTest[0].count} tickets found` });
    
    // Test 2: Lookup Tables
    console.log('2. 📋 Testing lookup tables...');
    const lookupTest = await executeQuery('SELECT COUNT(*) as count FROM slgreen.tbl_lookup WHERE Active = 1');
    tests.push({ test: 'Lookup Tables', status: '✅ PASS', details: `${lookupTest[0].count} active lookup entries` });
    
    // Test 3: Status Resolution
    console.log('3. 🔄 Testing status resolution...');
    const statusTest = await executeQuery(`
      SELECT s.StatusName, COUNT(*) as count 
      FROM zendesk.tbl_Ticket t
      INNER JOIN (SELECT Id, Title AS StatusName FROM slgreen.tbl_lookup WHERE [Key] = '22407340') s 
        ON t.StatusId = s.Id
      GROUP BY s.StatusName
      ORDER BY count DESC
    `);
    tests.push({ test: 'Status Resolution', status: '✅ PASS', details: `${statusTest.length} status types resolved` });
    
    // Test 4: Priority Resolution
    console.log('4. ⚡ Testing priority resolution...');
    const priorityTest = await executeQuery(`
      SELECT p.PriorityName, COUNT(*) as count 
      FROM zendesk.tbl_Ticket t
      INNER JOIN (SELECT Id, Title AS PriorityName FROM slgreen.tbl_lookup WHERE [Key] = '22407360') p 
        ON t.PriorityId = p.Id
      GROUP BY p.PriorityName
      ORDER BY count DESC
    `);
    tests.push({ test: 'Priority Resolution', status: '✅ PASS', details: `${priorityTest.length} priority types resolved` });
    
    // Test 5: User/Group Joins
    console.log('5. 👥 Testing user and group joins...');
    const joinTest = await executeQuery(`
      SELECT 
        COUNT(DISTINCT t.ZendeskId) as tickets,
        COUNT(DISTINCT u.DisplayName) as assignees,
        COUNT(DISTINCT g.Name) as groups
      FROM zendesk.tbl_Ticket t
      LEFT JOIN zendesk.tbl_User u ON t.AssigneeId = u.SourceId
      LEFT JOIN zendesk.tbl_groupandorg g ON t.GroupId = g.SourceId
      WHERE t.Created >= DATEADD(day, -7, GETDATE())
    `);
    tests.push({ 
      test: 'User/Group Joins', 
      status: '✅ PASS', 
      details: `${joinTest[0].tickets} tickets, ${joinTest[0].assignees} assignees, ${joinTest[0].groups} groups (last 7 days)` 
    });
    
    // Test 6: Recent Activity
    console.log('6. 📊 Testing recent activity...');
    const activityTest = await executeQuery(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN Created >= DATEADD(day, -1, GETDATE()) THEN 1 ELSE 0 END) as last_24h,
        SUM(CASE WHEN Created >= DATEADD(day, -7, GETDATE()) THEN 1 ELSE 0 END) as last_7d
      FROM zendesk.tbl_Ticket
    `);
    tests.push({ 
      test: 'Recent Activity', 
      status: '✅ PASS', 
      details: `${activityTest[0].last_24h} tickets (24h), ${activityTest[0].last_7d} tickets (7d), ${activityTest[0].total_tickets} total` 
    });
    
  } catch (error) {
    tests.push({ test: 'Health Check', status: '❌ FAIL', details: error.message });
  }
  
  // Results
  console.log('\n📋 HEALTH CHECK RESULTS:');
  console.log('=' * 50);
  tests.forEach(test => {
    console.log(`${test.status} ${test.test}: ${test.details}`);
  });
  
  const passCount = tests.filter(t => t.status.includes('✅')).length;
  console.log(`\n🎯 OVERALL: ${passCount}/${tests.length} tests passed`);
  
  if (passCount === tests.length) {
    console.log('🎉 ALL SYSTEMS GO! Your MCP server is healthy! 🎉');
  } else {
    console.log('⚠️ Some issues detected. Check the failing tests above.');
  }
}

healthCheck();
