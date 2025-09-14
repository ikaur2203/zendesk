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
    name: "execute_stored_procedure",
    description: "Execute a stored procedure with parameters",
    schema: {
      procedure_name: z.string().describe("Name of the stored procedure to execute"),
      parameters: z.record(z.any()).optional().describe("Parameters for the stored procedure as key-value pairs")
    },
    handler: async ({ procedure_name, parameters = {} }) => {
      try {
        // Build the EXEC statement
        const paramKeys = Object.keys(parameters);
        let execStatement = `EXEC [${procedure_name}]`;
        
        if (paramKeys.length > 0) {
          const paramPlaceholders = paramKeys.map(key => `@${key}`).join(', ');
          execStatement += ` ${paramPlaceholders}`;
        }
        
        const results = await executeQuery(execStatement, parameters);
        return {
          content: [{ 
            type: "text", 
            text: `🔧 Stored Procedure Results:\n\n${JSON.stringify(results, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `❌ Error executing stored procedure: ${error.message}` }],
          isError: true
        };
      }
    }
  },

  {
    name: "get_database_schema",
    description: "Get database schema information including tables, views, and stored procedures",
    schema: {
      object_type: z.enum(["tables", "views", "procedures", "all"]).optional().describe("Type of database objects to retrieve")
    },
    handler: async ({ object_type = "all" }) => {
      try {
        let query = "";
        
        switch (object_type) {
          case "tables":
            query = `
              SELECT 
                TABLE_SCHEMA as schema_name,
                TABLE_NAME as table_name,
                TABLE_TYPE as table_type
              FROM INFORMATION_SCHEMA.TABLES
              WHERE TABLE_TYPE = 'BASE TABLE'
              ORDER BY TABLE_SCHEMA, TABLE_NAME
            `;
            break;
            
          case "views":
            query = `
              SELECT 
                TABLE_SCHEMA as schema_name,
                TABLE_NAME as view_name
              FROM INFORMATION_SCHEMA.VIEWS
              ORDER BY TABLE_SCHEMA, TABLE_NAME
            `;
            break;
            
          case "procedures":
            query = `
              SELECT 
                ROUTINE_SCHEMA as schema_name,
                ROUTINE_NAME as procedure_name,
                ROUTINE_TYPE as routine_type
              FROM INFORMATION_SCHEMA.ROUTINES
              WHERE ROUTINE_TYPE = 'PROCEDURE'
              ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME
            `;
            break;
            
          default: // "all"
            query = `
              SELECT 'Table' as object_type, TABLE_SCHEMA as schema_name, TABLE_NAME as object_name
              FROM INFORMATION_SCHEMA.TABLES
              WHERE TABLE_TYPE = 'BASE TABLE'
              UNION ALL
              SELECT 'View' as object_type, TABLE_SCHEMA as schema_name, TABLE_NAME as object_name
              FROM INFORMATION_SCHEMA.VIEWS
              UNION ALL
              SELECT 'Procedure' as object_type, ROUTINE_SCHEMA as schema_name, ROUTINE_NAME as object_name
              FROM INFORMATION_SCHEMA.ROUTINES
              WHERE ROUTINE_TYPE = 'PROCEDURE'
              ORDER BY object_type, schema_name, object_name
            `;
        }
        
        const results = await executeQuery(query);
        return {
          content: [{ 
            type: "text", 
            text: `📊 Database Schema (${object_type}):\n\n${JSON.stringify(results, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `❌ Error getting database schema: ${error.message}` }],
          isError: true
        };
      }
    }
  },

  {
    name: "get_table_columns",
    description: "Get column information for a specific table",
    schema: {
      table_name: z.string().describe("Name of the table"),
      schema_name: z.string().optional().describe("Schema name (optional)")
    },
    handler: async ({ table_name, schema_name = "dbo" }) => {
      try {
        const query = `
          SELECT 
            COLUMN_NAME as column_name,
            DATA_TYPE as data_type,
            IS_NULLABLE as is_nullable,
            COLUMN_DEFAULT as default_value,
            CHARACTER_MAXIMUM_LENGTH as max_length
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = @table_name
          AND TABLE_SCHEMA = @schema_name
          ORDER BY ORDINAL_POSITION
        `;
        
        const results = await executeQuery(query, { table_name, schema_name });
        return {
          content: [{ 
            type: "text", 
            text: `📋 Columns for ${schema_name}.${table_name}:\n\n${JSON.stringify(results, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `❌ Error getting table columns: ${error.message}` }],
          isError: true
        };
      }
    }
  },

  {
    name: "get_zendesk_ticket_analytics",
    description: "Get comprehensive analytics on Zendesk tickets",
    schema: {
      days_back: z.number().optional().describe("Number of days to look back (default: 30)")
    },
    handler: async ({ days_back = 30 }) => {
      try {
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
            WHERE t.Created >= DATEADD(day, -@days_back, GETDATE())
          ),
          GroupStats AS (
            SELECT 
              g.Name as group_name,
              COUNT(t.ZendeskId) as ticket_count,
              AVG(CASE WHEN s.StatusName IN ('Solved','Closed') AND t.Modified IS NOT NULL 
                       THEN DATEDIFF(hour, t.Created, t.Modified) END) as avg_resolution_hours
            FROM zendesk.tbl_Ticket t
            LEFT JOIN zendesk.tbl_groupandorg g ON t.GroupId = g.SourceId
            LEFT JOIN StatusLookup s ON t.StatusId = s.Id
            WHERE t.Created >= DATEADD(day, -@days_back, GETDATE())
            GROUP BY g.Name
          )
          SELECT 
            'Overall' as category,
            total_tickets,
            open_tickets,
            solved_tickets,
            pending_tickets,
            closed_tickets,
            new_tickets,
            onhold_tickets,
            urgent_tickets,
            high_priority_tickets,
            normal_priority_tickets,
            low_priority_tickets,
            avg_resolution_hours
          FROM TicketStats
          UNION ALL
          SELECT 
            CONCAT('Group: ', group_name) as category,
            ticket_count as total_tickets,
            NULL as open_tickets,
            NULL as solved_tickets,
            NULL as pending_tickets,
            NULL as closed_tickets,
            NULL as new_tickets,
            NULL as onhold_tickets,
            NULL as urgent_tickets,
            NULL as high_priority_tickets,
            NULL as normal_priority_tickets,
            NULL as low_priority_tickets,
            avg_resolution_hours
          FROM GroupStats
          WHERE group_name IS NOT NULL AND ticket_count > 0
        `;
        
        const results = await executeQuery(query, { days_back });
        return {
          content: [{ 
            type: "text", 
            text: `📈 Zendesk Ticket Analytics (Last ${days_back} days):\n\n${JSON.stringify(results, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `❌ Error getting ticket analytics: ${error.message}` }],
          isError: true
        };
      }
    }
  },

  {
    name: "get_tickets_by_criteria",
    description: "Get tickets based on various criteria with advanced filtering",
    schema: {
      status: z.string().optional().describe("Ticket status filter"),
      priority: z.string().optional().describe("Priority filter"),
      group_name: z.string().optional().describe("Group name filter"),
      organization_name: z.string().optional().describe("Organization name filter"),
      assignee_name: z.string().optional().describe("Assignee name filter"),
      days_back: z.number().optional().describe("Number of days to look back"),
      limit: z.number().optional().describe("Maximum number of results to return")
    },
    handler: async ({ status, priority, group_name, organization_name, assignee_name, days_back = 30, limit = 100 }) => {
      try {
        let whereConditions = ["t.Created >= DATEADD(day, -@days_back, GETDATE())"];
        const params = { days_back, limit };
        
        // Status filtering using lookup table names
        if (status) {
          const validStatuses = ['open', 'pending', 'on-hold', 'solved', 'closed', 'new'];
          const statusValue = status.toLowerCase();
          if (validStatuses.includes(statusValue)) {
            // Convert common variations
            let statusName = statusValue;
            if (statusValue === 'on-hold') statusName = 'On-hold';
            else statusName = statusValue.charAt(0).toUpperCase() + statusValue.slice(1);
            
            whereConditions.push("s.StatusName = @statusName");
            params.statusName = statusName;
          }
        }
        
        // Priority filtering using lookup table names
        if (priority) {
          const validPriorities = ['low', 'normal', 'high', 'urgent'];
          const priorityValue = priority.toLowerCase();
          if (validPriorities.includes(priorityValue)) {
            const priorityName = priorityValue.charAt(0).toUpperCase() + priorityValue.slice(1);
            whereConditions.push("p.PriorityName = @priorityName");
            params.priorityName = priorityName;
          }
        }
        
        if (group_name) {
          whereConditions.push("g.Name LIKE @group_name");
          params.group_name = `%${group_name}%`;
        }
        
        if (organization_name) {
          whereConditions.push("org.Name LIKE @organization_name");
          params.organization_name = `%${organization_name}%`;
        }
        
        if (assignee_name) {
          whereConditions.push("u.DisplayName LIKE @assignee_name");
          params.assignee_name = `%${assignee_name}%`;
        }
        
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
          )
          SELECT TOP (@limit)
            t.ZendeskId as id,
            t.Subject as subject,
            t.StatusId as status_id,
            ISNULL(s.StatusName, 'Unknown') as status_name,
            t.PriorityId as priority_id,
            ISNULL(p.PriorityName, 'Unknown') as priority_name,
            t.Created as created_at,
            t.Modified as updated_at,
            g.Name as group_name,
            org.Name as organization_name,
            u.DisplayName as assignee_name,
            req.DisplayName as requester_name
          FROM zendesk.tbl_Ticket t
          LEFT JOIN StatusLookup s ON t.StatusId = s.Id
          LEFT JOIN PriorityLookup p ON t.PriorityId = p.Id
          LEFT JOIN zendesk.tbl_groupandorg g ON t.GroupId = g.SourceId
          LEFT JOIN zendesk.tbl_groupandorg org ON t.OrganizationId = org.SourceId
          LEFT JOIN zendesk.tbl_User u ON t.AssigneeId = u.SourceId
          LEFT JOIN zendesk.tbl_User req ON t.RequesterId = req.SourceId
          WHERE ${whereConditions.join(' AND ')}
          ORDER BY t.Created DESC
        `;
        
        const results = await executeQuery(query, params);
        return {
          content: [{ 
            type: "text", 
            text: `🎯 Found ${results.length} tickets matching criteria:\n\n${JSON.stringify(results, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `❌ Error getting tickets by criteria: ${error.message}` }],
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
      parameters: z.record(z.any()).optional().describe("Optional parameters for the query")
    },
    handler: async ({ query, parameters = {} }) => {
      try {
        // Security check - prevent destructive operations
        const destructiveKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE'];
        const upperQuery = query.toUpperCase();
        
        for (const keyword of destructiveKeywords) {
          if (upperQuery.includes(keyword)) {
            return {
              content: [{ type: "text", text: `❌ Security: ${keyword} operations are not allowed through this tool` }],
              isError: true
            };
          }
        }
        
        const results = await executeQuery(query, parameters);
        return {
          content: [{ 
            type: "text", 
            text: `📊 Query Results:\n\n${JSON.stringify(results, null, 2)}`
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `❌ Error executing SQL query: ${error.message}` }],
          isError: true
        };
      }
    }
  }
];