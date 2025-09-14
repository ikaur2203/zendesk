import MCPZendeskClient from './custom-client.js';

async function checkMyTickets() {
  const client = new MCPZendeskClient();
  
  try {
    console.log('🚀 Starting MCP server to check your tickets...\n');
    await client.startMCPServer();
    
    // Let's first check what assignee names are available
    console.log('📋 Getting list of assignees...');
    const assigneesQuery = `
      SELECT DISTINCT u.DisplayName, COUNT(t.ZendeskId) as ticket_count
      FROM zendesk.tbl_User u 
      INNER JOIN zendesk.tbl_Ticket t ON u.SourceId = t.AssigneeId 
      WHERE u.DisplayName IS NOT NULL 
      GROUP BY u.DisplayName 
      ORDER BY u.DisplayName
    `;
    
    const assigneesResult = await client.callTool('execute_custom_sql', {
      query: assigneesQuery
    });
    
    console.log('Available assignees:');
    console.log(assigneesResult.content[0].text);
    
    // Check for tickets assigned to names that might be yours
    // Looking for names that might match "IKaur" or variations
    const possibleNames = ['IKaur', 'I Kaur', 'Kaur', 'Inderjit', 'Inderjit Kaur'];
    
    console.log('\n🔍 Searching for your tickets...');
    
    for (const name of possibleNames) {
      console.log(`\nChecking tickets assigned to "${name}"...`);
      
      const myTicketsResult = await client.searchTickets({
        assignee_name: name,
        days_back: 90, // Check last 90 days
        limit: 20
      });
      
      if (myTicketsResult.content && myTicketsResult.content[0].text.includes('Found')) {
        console.log(`✅ Found tickets for "${name}":`);
        console.log(myTicketsResult.content[0].text);
      } else {
        console.log(`❌ No tickets found for "${name}"`);
      }
    }
    
    // Let's also check for open tickets specifically
    console.log('\n🎯 Checking for open tickets assigned to any variation of your name...');
    
    const openTicketsQuery = `
      WITH StatusLookup AS (
        SELECT Id, Value, Title AS StatusName
        FROM slgreen.tbl_lookup 
        WHERE [Key] = '22407340' AND Active = 1
      )
      SELECT TOP 20
        t.ZendeskId as id,
        t.Subject as subject,
        s.StatusName as status,
        u.DisplayName as assignee,
        t.Created as created_at,
        t.Modified as updated_at
      FROM zendesk.tbl_Ticket t
      LEFT JOIN StatusLookup s ON t.StatusId = s.Id
      LEFT JOIN zendesk.tbl_User u ON t.AssigneeId = u.SourceId
      WHERE s.StatusName IN ('Open', 'New', 'Pending') 
        AND u.DisplayName LIKE '%Kaur%'
      ORDER BY t.Created DESC
    `;
    
    const openTicketsResult = await client.callTool('execute_custom_sql', {
      query: openTicketsQuery
    });
    
    console.log('\n📊 Open tickets with "Kaur" in assignee name:');
    console.log(openTicketsResult.content[0].text);
    
  } catch (error) {
    console.error('❌ Error checking tickets:', error);
  } finally {
    await client.stopMCPServer();
  }
}

checkMyTickets();
