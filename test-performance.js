import { executeQuery } from './src/zendesk-sqlserver.js';
import dotenv from 'dotenv';

dotenv.config();

async function performanceTest() {
  console.log('⚡ Running Performance Tests...\n');
  
  const tests = [
    {
      name: 'Simple Count Query',
      query: 'SELECT COUNT(*) as count FROM zendesk.tbl_Ticket'
    },
    {
      name: 'Analytics Query (7 days)',
      query: `
        WITH StatusLookup AS (
          SELECT Id, Title AS StatusName FROM slgreen.tbl_lookup WHERE [Key] = '22407340' AND Active = 1
        )
        SELECT COUNT(*) as total, s.StatusName
        FROM zendesk.tbl_Ticket t
        LEFT JOIN StatusLookup s ON t.StatusId = s.Id
        WHERE t.Created >= DATEADD(day, -7, GETDATE())
        GROUP BY s.StatusName
      `
    },
    {
      name: 'Complex Join Query',
      query: `
        SELECT TOP 10
          t.ZendeskId, t.Subject, s.StatusName, p.PriorityName, u.DisplayName, g.Name
        FROM zendesk.tbl_Ticket t
        LEFT JOIN (SELECT Id, Title AS StatusName FROM slgreen.tbl_lookup WHERE [Key] = '22407340') s ON t.StatusId = s.Id
        LEFT JOIN (SELECT Id, Title AS PriorityName FROM slgreen.tbl_lookup WHERE [Key] = '22407360') p ON t.PriorityId = p.Id
        LEFT JOIN zendesk.tbl_User u ON t.AssigneeId = u.SourceId
        LEFT JOIN zendesk.tbl_groupandorg g ON t.GroupId = g.SourceId
        WHERE t.Created >= DATEADD(day, -1, GETDATE())
        ORDER BY t.Created DESC
      `
    }
  ];

  for (const test of tests) {
    console.log(`🔍 Testing: ${test.name}`);
    
    const startTime = Date.now();
    
    try {
      const result = await executeQuery(test.query);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ ${test.name}: ${duration}ms (${result.length} rows)`);
      
      if (duration > 5000) {
        console.log(`⚠️  Slow query detected: ${duration}ms`);
      }
      
    } catch (error) {
      console.log(`❌ ${test.name}: Failed - ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('⚡ Performance Test Complete!');
}

performanceTest();
