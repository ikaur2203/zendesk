import { z } from 'zod';
import { executeQuery } from '../zendesk-sqlserver.js';
import { syncZendeskTicketsToDatabase, getZendeskTickets, getITTickets } from '../zendesk-sqlclient.js';

export const sqlTools = [
  {
    name: "sync_tickets_to_database",
    description: "Sync all Zendesk tickets to SQL Server database",
    schema: {},
    handler: async () => {
      try {
        await syncZendeskTicketsToDatabase();
        return {
          content: [{ 
            type: "text", 
            text: "✅ Successfully synced Zendesk tickets to database!"
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `❌ Error syncing tickets: ${error.message}` }],
          isError: true
        };
      }
    }
  },
  {
    name: "get_tickets_from_database",
    description: "Get all Zendesk tickets from SQL Server database",
    schema: {},
    handler: async () => {
      try {
        const tickets = await getZendeskTickets();
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(tickets, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `❌ Error getting tickets from database: ${error.message}` }],
          isError: true
        };
      }
    }
  },
  {
    name: "get_it_tickets",
    description: "Get IT-related tickets from SQL Server database",
    schema: {},
    handler: async () => {
      try {
        const tickets = await getITTickets();
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(tickets, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `❌ Error getting IT tickets: ${error.message}` }],
          isError: true
        };
      }
    }
  },
  {
    name: "execute_custom_sql",
    description: "Execute a custom SQL query on the Zendesk database",
    schema: {
      query: z.string().describe("SQL query to execute"),
      params: z.object({}).optional().describe("Optional parameters for the query")
    },
    handler: async ({ query, params = {} }) => {
      try {
        const results = await executeQuery(query, params);
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(results, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `❌ Error executing SQL query: ${error.message}` }],
          isError: true
        };
      }
    }
  },
  {
    name: "get_ticket_statistics",
    description: "Get ticket statistics from SQL Server database",
    schema: {},
    handler: async () => {
      try {
        const query = `
          SELECT 
            COUNT(*) as total_tickets,
            COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
            COUNT(CASE WHEN status = 'solved' THEN 1 END) as solved_tickets,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tickets,
            COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_tickets,
            COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_tickets
          FROM Tickets
        `;
        
        const stats = await executeQuery(query);
        return {
          content: [{ 
            type: "text", 
            text: `📊 Ticket Statistics:\n\n${JSON.stringify(stats[0], null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `❌ Error getting ticket statistics: ${error.message}` }],
          isError: true
        };
      }
    }
  },
  {
    name: "get_tickets_by_organization",
    description: "Get tickets filtered by organization name",
    schema: {
      organization_name: z.string().describe("Organization name to filter by")
    },
    handler: async ({ organization_name }) => {
      try {
        const query = `
          SELECT t.*, o.name as organization_name 
          FROM Tickets t
          JOIN Organizations o ON t.organization_id = o.id
          WHERE o.name LIKE @org_name
          ORDER BY t.created_at DESC
        `;
        
        const params = { org_name: `%${organization_name}%` };
        const tickets = await executeQuery(query, params);
        
        return {
          content: [{ 
            type: "text", 
            text: `🎯 Found ${tickets.length} tickets for organization "${organization_name}":\n\n${JSON.stringify(tickets, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `❌ Error getting tickets by organization: ${error.message}` }],
          isError: true
        };
      }
    }
  }
];