// Ultra-conservative server for Claude Desktop with minimal content
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { zendeskClient } from './zendesk-client.js';

const server = new McpServer({
  name: "Zendesk API (Claude Desktop)",
  version: "1.0.0",
  description: "Minimal Zendesk MCP Server optimized for Claude Desktop"
});

// Ultra-safe content formatter - ensures single text block only
function ultraSafeFormat(data) {
  try {
    let text;
    if (typeof data === 'string') {
      text = data;
    } else if (typeof data === 'object') {
      const jsonStr = JSON.stringify(data, null, 2);
      // Strict limit for Claude Desktop
      text = jsonStr.length > 10000 ? 
        jsonStr.substring(0, 9500) + '\n\n[Truncated for Claude Desktop compatibility]' : 
        jsonStr;
    } else {
      text = String(data);
    }
    
    // Always return exactly one text content block
    return [{ type: "text", text: text }];
  } catch (error) {
    return [{ type: "text", text: `Error: ${error.message}` }];
  }
}

// Minimal set of essential tools only
const essentialTools = [
  {
    name: "list_tickets_small",
    description: "List a small number of tickets (max 5) for Claude Desktop compatibility",
    schema: {
      per_page: { type: "number", description: "Number of tickets (max 5)", maximum: 5, default: 3 }
    },
    handler: async ({ per_page = 3 }) => {
      try {
        const result = await zendeskClient.listTickets({ per_page: Math.min(per_page, 5) });
        return { content: ultraSafeFormat(result) };
      } catch (error) {
        return { content: ultraSafeFormat({ error: error.message }), isError: true };
      }
    }
  },
  {
    name: "get_ticket_count",
    description: "Get total number of tickets (summary only)",
    schema: {},
    handler: async () => {
      try {
        const result = await zendeskClient.listTickets({ per_page: 1 });
        const count = result.count || 'Unknown';
        return { content: ultraSafeFormat({ total_tickets: count, summary: `You have ${count} tickets total` }) };
      } catch (error) {
        return { content: ultraSafeFormat({ error: error.message }), isError: true };
      }
    }
  },
  {
    name: "list_users_small",
    description: "List a small number of users (max 5)",
    schema: {
      per_page: { type: "number", description: "Number of users (max 5)", maximum: 5, default: 3 }
    },
    handler: async ({ per_page = 3 }) => {
      try {
        const result = await zendeskClient.listUsers({ per_page: Math.min(per_page, 5) });
        return { content: ultraSafeFormat(result) };
      } catch (error) {
        return { content: ultraSafeFormat({ error: error.message }), isError: true };
      }
    }
  }
];

// Register essential tools only
essentialTools.forEach(tool => {
  server.tool(tool.name, tool.schema, tool.handler, { description: tool.description });
});

export { server };