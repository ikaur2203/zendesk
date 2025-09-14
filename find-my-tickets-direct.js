import { executeQuery } from './src/zendesk-sqlserver.js';
import dotenv from 'dotenv';

dotenv.config();

async function findMyTickets() {
  try {
    console.log('🔍 Searching for tickets assigned to you...\n');
    
    // First, let's see all assignees with "Kaur" in their name
    console.log('📋 Looking for users with "Kaur" in their name...');
    const usersQuery = `
      SELECT DISTINCT u.DisplayName, u.Email, COUNT(t.ZendeskId) as total_tickets
      FROM zendesk.tbl_User u 
      LEFT JOIN zendesk.tbl_Ticket t ON u.SourceId = t.AssigneeId 
      WHERE u.DisplayName LIKE '%Kaur%' OR u.Email LIKE '%kaur%'
      GROUP BY u.DisplayName, u.Email
      ORDER BY total_tickets DESC
    `;
    
    const users = await executeQuery(usersQuery);
    console.log('Users found:');
    console.log(JSON.stringify(users, null, 2));
    
    // Now let's check for open tickets assigned to any user with Kaur in the name
    console.log('\n🎯 Checking for open tickets assigned to users with "Kaur"...');
    
    const openTicketsQuery = `
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
      SELECT 
        t.ZendeskId as ticket_id,
        t.Subject as subject,
        s.StatusName as status,
        p.PriorityName as priority,
        u.DisplayName as assignee_name,
        u.Email as assignee_email,
        t.Created as created_at,
        t.Modified as updated_at,
        DATEDIFF(day, t.Created, GETDATE()) as days_old
      FROM zendesk.tbl_Ticket t
      LEFT JOIN StatusLookup s ON t.StatusId = s.Id
      LEFT JOIN PriorityLookup p ON t.PriorityId = p.Id
      LEFT JOIN zendesk.tbl_User u ON t.AssigneeId = u.SourceId
      WHERE s.StatusName IN ('Open', 'New', 'Pending', 'On-hold') 
        AND (u.DisplayName LIKE '%Kaur%' OR u.Email LIKE '%kaur%')
      ORDER BY t.Created DESC
    `;
    
    const openTickets = await executeQuery(openTicketsQuery);
    
    if (openTickets.length > 0) {
      console.log(`✅ Found ${openTickets.length} open tickets assigned to users with "Kaur":`);
      console.log(JSON.stringify(openTickets, null, 2));
      
      // Summary
      const statusSummary = {};
      const prioritySummary = {};
      
      openTickets.forEach(ticket => {
        statusSummary[ticket.status] = (statusSummary[ticket.status] || 0) + 1;
        prioritySummary[ticket.priority] = (prioritySummary[ticket.priority] || 0) + 1;
      });
      
      console.log('\n📊 Summary:');
      console.log('By Status:', statusSummary);
      console.log('By Priority:', prioritySummary);
      
    } else {
      console.log('❌ No open tickets found assigned to users with "Kaur" in their name');
    }
    
    // Let's also check recent tickets (last 30 days) regardless of status
    console.log('\n📅 Checking recent tickets (last 30 days) assigned to users with "Kaur"...');
    
    const recentTicketsQuery = `
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
      SELECT 
        t.ZendeskId as ticket_id,
        t.Subject as subject,
        s.StatusName as status,
        p.PriorityName as priority,
        u.DisplayName as assignee_name,
        t.Created as created_at,
        t.Modified as updated_at
      FROM zendesk.tbl_Ticket t
      LEFT JOIN StatusLookup s ON t.StatusId = s.Id
      LEFT JOIN PriorityLookup p ON t.PriorityId = p.Id
      LEFT JOIN zendesk.tbl_User u ON t.AssigneeId = u.SourceId
      WHERE (u.DisplayName LIKE '%Kaur%' OR u.Email LIKE '%kaur%')
        AND t.Created >= DATEADD(day, -30, GETDATE())
      ORDER BY t.Created DESC
    `;
    
    const recentTickets = await executeQuery(recentTicketsQuery);
    
    if (recentTickets.length > 0) {
      console.log(`✅ Found ${recentTickets.length} recent tickets (last 30 days):`);
      console.log(JSON.stringify(recentTickets, null, 2));
    } else {
      console.log('❌ No recent tickets found assigned to users with "Kaur"');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findMyTickets();
