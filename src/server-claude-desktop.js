import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { zendeskClient } from './zendesk-client.js';
import { ticketsTools } from './tools/tickets.js';
import { usersTools } from './tools/users.js';
import { organizationsTools } from './tools/organizations.js';
import { groupsTools } from './tools/groups.js';
import { macrosTools } from './tools/macros.js';
import { viewsTools } from './tools/views.js';
import { triggersTools } from './tools/triggers.js';
import { automationsTools } from './tools/automations.js';
import { searchTools } from './tools/search.js';
import { helpCenterTools } from './tools/help-center.js';
import { supportTools } from './tools/support.js';
import { talkTools } from './tools/talk.js';
import { chatTools } from './tools/chat.js';
import { ticketsTools as customFieldsTools } from './tools/customfields.js';
import { highestTicketCategoryTool } from './tools/highest-ticket-category.js';
/* import { sqlTools } from './tools/sqltools.js'; // Add this import when SQL is ready */

// Create an MCP server for Zendesk API
const server = new McpServer({
  name: "Zendesk API",
  version: "1.0.0",
  description: "MCP Server for interacting with the Zendesk API"
});

// Helper function to ensure consistent content format for Claude Desktop
function formatContent(data) {
  try {
    // Ensure we always return an array of content objects
    if (!data) {
      return [{ type: "text", text: "No data available" }];
    }
    
    // If it's already a proper content array, validate and return
    if (Array.isArray(data) && data.every(item => item.type && item.text)) {
      return data;
    }
    
    // Convert various data formats to consistent content format
    let textContent;
    if (typeof data === 'string') {
      textContent = data;
    } else if (typeof data === 'object') {
      // Limit large JSON responses to prevent token overflow
      const jsonString = JSON.stringify(data, null, 2);
      if (jsonString.length > 50000) { // Limit to ~50KB
        const truncated = jsonString.substring(0, 47000);
        const lastNewline = truncated.lastIndexOf('\n');
        textContent = truncated.substring(0, lastNewline) + '\n\n... [Response truncated due to size]';
      } else {
        textContent = jsonString;
      }
    } else {
      textContent = String(data);
    }
    
    return [{ type: "text", text: textContent }];
  } catch (error) {
    return [{ type: "text", text: `Error formatting content: ${error.message}` }];
  }
}

// Wrapper function to ensure all tool handlers return consistent format
function wrapToolHandler(originalHandler) {
  return async (...args) => {
    try {
      const result = await originalHandler(...args);
      
      // Ensure consistent response format
      if (result && result.content) {
        return {
          content: formatContent(result.content),
          isError: result.isError || false
        };
      }
      
      // If result doesn't have content property, wrap it
      return {
        content: formatContent(result),
        isError: false
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Tool execution error: ${error.message}` }],
        isError: true
      };
    }
  };
}

// Register all tools (Zendesk API only - no SQL tools)
const allTools = [
  ...ticketsTools,
  ...usersTools,
  ...organizationsTools,
  ...groupsTools,
  ...macrosTools,
  ...viewsTools,
  ...triggersTools,
  ...automationsTools,
  ...searchTools,
  ...helpCenterTools,
  ...supportTools,
  ...talkTools,
  ...chatTools,
  ...customFieldsTools,
  highestTicketCategoryTool
  /* ...sqlTools, // Add SQL tools here when database is ready */
];

// Register each tool with the server using wrapped handlers
allTools.forEach(tool => {
  server.tool(
    tool.name,
    tool.schema,
    wrapToolHandler(tool.handler),
    { description: tool.description || `Tool: ${tool.name}` }
  );
});

// Add a resource for Zendesk API documentation
server.resource(
  "documentation",
  new ResourceTemplate("zendesk://docs/{section}", { list: undefined }),
  async (uri, { section }) => {
    const docs = {
      "tickets": "Tickets API allows you to create, modify, and manage support tickets.\nEndpoints: GET /api/v2/tickets, POST /api/v2/tickets, etc.",
      "users": "Users API allows you to create, modify, and manage end users and agents.\nEndpoints: GET /api/v2/users, POST /api/v2/users, etc.",
      "organizations": "Organizations API allows you to create and manage organizations.\nEndpoints: GET /api/v2/organizations, POST /api/v2/organizations, etc.",
      "groups": "Groups API allows you to create and manage agent groups.\nEndpoints: GET /api/v2/groups, POST /api/v2/groups, etc.",
      "macros": "Macros API allows you to create and manage macros for ticket actions.\nEndpoints: GET /api/v2/macros, POST /api/v2/macros, etc.",
      "views": "Views API allows you to create and manage views for filtering tickets.\nEndpoints: GET /api/v2/views, POST /api/v2/views, etc.",
      "triggers": "Triggers API allows you to create and manage triggers for automation.\nEndpoints: GET /api/v2/triggers, POST /api/v2/triggers, etc.",
      "automations": "Automations API allows you to create and manage time-based automations.\nEndpoints: GET /api/v2/automations, POST /api/v2/automations, etc.",
      "search": "Search API allows you to search across Zendesk data.\nEndpoints: GET /api/v2/search, etc.",
      "help_center": "Help Center API allows you to manage articles, categories, and sections.\nEndpoints: GET /api/v2/help_center/articles, etc.",
      "support": "Support API includes core functionality for the Support product.\nEndpoints: Various endpoints for tickets, users, etc.",
      "talk": "Talk API allows you to manage Zendesk Talk phone calls and settings.\nEndpoints: GET /api/v2/channels/voice/stats, etc.",
      "chat": "Chat API allows you to manage Zendesk Chat conversations.\nEndpoints: GET /api/v2/chats, etc.",
      "highest_ticket_category": "This tool analyzes tickets to determine the category with the highest number of tickets.\nIt helps identify common issues and areas for improvement.",
      "custom_fields": "Custom Fields API allows you to create and manage custom fields for tickets, users, and organizations.\nEndpoints: GET /api/v2/ticket_fields, etc.",
      "overview": "The Zendesk API is a RESTful API that uses JSON for serialization. It provides access to Zendesk Support, Talk, Chat, and Guide products."
    };

    if (!section || section === "all") {
      return {
        contents: [{
          uri: uri.href,
          text: `Zendesk API Documentation Overview\n\n${Object.keys(docs).map(key => `- ${key}: ${docs[key].split('\n')[0]}`).join('\n')}`
        }]
      };
    }

    if (docs[section]) {
      return {
        contents: [{
          uri: uri.href,
          text: `Zendesk API Documentation: ${section}\n\n${docs[section]}`
        }]
      };
    }

    return {
      contents: [{
        uri: uri.href,
        text: `Documentation section '${section}' not found. Available sections: ${Object.keys(docs).join(', ')}`
      }]
    };
  }
);

export { server };