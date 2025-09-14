import { executeQuery } from './src/zendesk-sqlserver.js';
import dotenv from 'dotenv';

dotenv.config();

async function testAnalytics() {
  try {
    console.log('Testing analytics with updated lookup tables...');
    
    const query = `
      WITH StatusLookup AS (
        SELECT Id, Value, Title AS StatusName
        FROM slgreen.tbl_lookup 
        WHERE [Key] = '22407340' AND Active = 1
      ),
      PriorityLookup AS (
        SELECT Id, Value, Title AS PriorityName  
        FROM slgreen.tbl_lookup
        WHERE [Key] = '22407360' AND Active = 1
      ),
      TicketStats AS (
        SELECT 
          COUNT(*) as total_tickets,
          SUM(CASE WHEN s.StatusName = 'Open' THEN 1 ELSE 0 END) as open_tickets,
          SUM(CASE WHEN s.StatusName = 'Solved' THEN 1 ELSE 0 END) as solved_tickets,
          SUM(CASE WHEN s.StatusName = 'Pending' THEN 1 ELSE 0 END) as pending_tickets,
          SUM(CASE WHEN s.StatusName = 'Closed' THEN 1 ELSE 0 END) as closed_tickets,
          SUM(CASE WHEN s.StatusName = 'New' THEN 1 ELSE 0 END) as new_tickets,
          SUM(CASE WHEN s.StatusName = 'On-hold' THEN 1 ELSE 0 END) as onhold_tickets,
          SUM(CASE WHEN p.PriorityName = 'Urgent' THEN 1 ELSE 0 END) as urgent_tickets,
          SUM(CASE WHEN p.PriorityName = 'High' THEN 1 ELSE 0 END) as high_priority_tickets,
          SUM(CASE WHEN p.PriorityName = 'Normal' THEN 1 ELSE 0 END) as normal_priority_tickets,
          SUM(CASE WHEN p.PriorityName = 'Low' THEN 1 ELSE 0 END) as low_priority_tickets,
          AVG(CASE WHEN s.StatusName IN ('Solved','Closed') AND t.Modified IS NOT NULL 
                   THEN DATEDIFF(hour, t.Created, t.Modified) END) as avg_resolution_hours
        FROM zendesk.tbl_Ticket t
        LEFT JOIN StatusLookup s ON t.StatusId = s.Id
        LEFT JOIN PriorityLookup p ON t.PriorityId = p.Id
        WHERE t.Created >= DATEADD(day, -7, GETDATE())
      )
      SELECT * FROM TicketStats
    `;
    
    const result = await executeQuery(query);
    console.log('✅ Analytics Results (Last 7 days):');
    console.log(JSON.stringify(result, null, 2));
    
    // Test get tickets by criteria
    console.log('\n🔍 Testing ticket search with status filter...');
    
    const searchQuery = `
      WITH StatusLookup AS (
        SELECT Id, Value, Title AS StatusName
        FROM slgreen.tbl_lookup 
        WHERE [Key] = '22407340' AND Active = 1
      ),
      PriorityLookup AS (
        SELECT Id, Value, Title AS PriorityName  
        FROM slgreen.tbl_lookup
        WHERE [Key] = '22407360' AND Active = 1
      )
      SELECT TOP 5
        t.ZendeskId as id,
        t.Subject as subject,
        t.StatusId as status_id,
        ISNULL(s.StatusName, 'Unknown') as status_name,
        t.PriorityId as priority_id,
        ISNULL(p.PriorityName, 'Unknown') as priority_name,
        t.Created as created_at
      FROM zendesk.tbl_Ticket t
      LEFT JOIN StatusLookup s ON t.StatusId = s.Id
      LEFT JOIN PriorityLookup p ON t.PriorityId = p.Id
      WHERE s.StatusName = 'Open'
      ORDER BY t.Created DESC
    `;
    
    const searchResult = await executeQuery(searchQuery);
    console.log('✅ Sample Open Tickets:');
    console.log(JSON.stringify(searchResult, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAnalytics();
