// Fixed GitHub Copilot Studio Integration with MCP
// This demonstrates how to integrate your Zendesk MCP server with Microsoft Copilot Studio

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

class CopilotMCPBridge {
  constructor() {
    this.mcpClient = null;
    this.availableTools = [];
    this.app = express();
    this.app.use(express.json());
    this.mcpConnected = false;
  }

  async startMCPServer() {
    try {
      console.log('🚀 Starting Zendesk MCP server for Copilot...');
      
      // Use the same transport configuration that works in our other clients
      const transport = new StdioClientTransport({
        command: 'node',
        args: ['src/index.js']
      });

      this.mcpClient = new Client({
        name: "copilot-zendesk-bridge",
        version: "1.0.0"
      }, {
        capabilities: {
          tools: {}
        }
      });

      await this.mcpClient.connect(transport);
      console.log('✅ Connected to Zendesk MCP server');

      const { tools } = await this.mcpClient.listTools();
      this.availableTools = tools;
      this.mcpConnected = true;
      console.log(`📋 Available tools: ${tools.map(t => t.name).join(', ')}`);

      return true;
    } catch (error) {
      console.error('❌ Error starting MCP server:', error.message);
      console.log('⚠️  Continuing without MCP connection - webhook server will still work for testing');
      this.mcpConnected = false;
      return false;
    }
  }

  async callTool(toolName, args = {}) {
    if (!this.mcpConnected) {
      return { 
        error: 'MCP server not connected. Please check MCP server configuration.',
        available: false
      };
    }
    
    try {
      const result = await this.mcpClient.callTool({
        name: toolName,
        arguments: args
      });
      return result;
    } catch (error) {
      console.error(`❌ Error calling tool ${toolName}:`, error);
      return { error: error.message };
    }
  }

  setupWebhookEndpoints() {
    // Webhook endpoint for Copilot Studio
    this.app.post('/webhook/copilot', async (req, res) => {
      try {
        const { action, parameters, conversation_id } = req.body;
        
        console.log(`📥 Received action: ${action} with params:`, parameters);
        
        if (!this.mcpConnected) {
          res.json({
            conversation_id: conversation_id,
            success: false,
            data: null,
            error: 'MCP server not connected. Please restart the bridge.',
            timestamp: new Date().toISOString()
          });
          return;
        }
        
        let result;
        
        switch (action) {
          case 'get_ticket_analytics':
            result = await this.callTool('get_zendesk_ticket_analytics', {
              days_back: parameters.days_back || 30
            });
            break;
            
          case 'search_tickets':
            result = await this.callTool('get_tickets_by_criteria', {
              status: parameters.status,
              priority: parameters.priority,
              group_name: parameters.group_name,
              assignee_name: parameters.assignee_name,
              organization_name: parameters.organization_name,
              days_back: parameters.days_back || 30,
              limit: parameters.limit || 50
            });
            break;
            
          case 'execute_procedure':
            result = await this.callTool('execute_stored_procedure', {
              procedure_name: parameters.procedure_name,
              parameters: parameters.procedure_params || {}
            });
            break;
            
          case 'get_schema':
            result = await this.callTool('get_database_schema', {
              object_type: parameters.object_type || 'all'
            });
            break;
            
          case 'custom_query':
            result = await this.callTool('execute_custom_sql', {
              query: parameters.query,
              parameters: parameters.query_params || {}
            });
            break;
            
          case 'sync_tickets':
            result = await this.callTool('sync_tickets_to_database');
            break;
            
          default:
            result = { error: `Unknown action: ${action}` };
        }
        
        // Format response for Copilot Studio
        const response = {
          conversation_id: conversation_id,
          success: !result.error,
          data: result.error ? null : result,
          error: result.error || null,
          timestamp: new Date().toISOString()
        };
        
        res.json(response);
        
      } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).json({
          conversation_id: req.body.conversation_id,
          success: false,
          data: null,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        mcp_connected: this.mcpConnected,
        available_tools: this.availableTools.length,
        server_time: new Date().toISOString(),
        tools: this.mcpConnected ? this.availableTools.map(t => t.name) : []
      });
    });

    // Get available actions for Copilot Studio configuration
    this.app.get('/actions', (req, res) => {
      const actions = [
        {
          name: 'get_ticket_analytics',
          description: 'Get comprehensive ticket analytics for specified time period',
          parameters: {
            days_back: { type: 'number', required: false, description: 'Number of days to look back (default: 30)' }
          },
          example: { action: 'get_ticket_analytics', parameters: { days_back: 7 } }
        },
        {
          name: 'search_tickets',
          description: 'Search tickets with various criteria',
          parameters: {
            status: { type: 'string', required: false, description: 'Ticket status (open, closed, pending, etc.)' },
            priority: { type: 'string', required: false, description: 'Ticket priority (low, normal, high, urgent)' },
            group_name: { type: 'string', required: false, description: 'Group name filter' },
            assignee_name: { type: 'string', required: false, description: 'Assignee name filter' },
            organization_name: { type: 'string', required: false, description: 'Organization name filter' },
            days_back: { type: 'number', required: false, description: 'Days to look back (default: 30)' },
            limit: { type: 'number', required: false, description: 'Max results (default: 50)' }
          },
          example: { action: 'search_tickets', parameters: { status: 'open', priority: 'high', limit: 10 } }
        },
        {
          name: 'sync_tickets',
          description: 'Sync latest tickets from Zendesk to database',
          parameters: {},
          example: { action: 'sync_tickets', parameters: {} }
        },
        {
          name: 'get_schema',
          description: 'Get database schema information',
          parameters: {
            object_type: { type: 'string', required: false, description: 'Type: tables, views, procedures, all (default: all)' }
          },
          example: { action: 'get_schema', parameters: { object_type: 'tables' } }
        },
        {
          name: 'custom_query',
          description: 'Execute a custom SQL query (SELECT only for security)',
          parameters: {
            query: { type: 'string', required: true, description: 'SQL query to execute (SELECT statements only)' },
            query_params: { type: 'object', required: false, description: 'Query parameters for parameterized queries' }
          },
          example: { action: 'custom_query', parameters: { query: 'SELECT COUNT(*) as total FROM zendesk.tbl_Ticket WHERE Created >= DATEADD(day, -7, GETDATE())' } }
        }
      ];
      
      res.json({
        webhook_url: `${req.protocol}://${req.get('host')}/webhook/copilot`,
        mcp_connected: this.mcpConnected,
        available_actions: actions,
        available_mcp_tools: this.mcpConnected ? this.availableTools.map(t => ({ 
          name: t.name, 
          description: t.description 
        })) : [],
        usage_example: {
          url: `${req.protocol}://${req.get('host')}/webhook/copilot`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            action: 'get_ticket_analytics',
            parameters: { days_back: 7 },
            conversation_id: 'test-conversation-123'
          }
        }
      });
    });

    // Test endpoint
    this.app.post('/test', async (req, res) => {
      try {
        const result = await this.callTool('get_zendesk_ticket_analytics', { days_back: 1 });
        res.json({
          test: 'MCP Bridge Test',
          mcp_connected: this.mcpConnected,
          result: result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          test: 'MCP Bridge Test',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  async startWebhookServer(port = 3000) {
    this.setupWebhookEndpoints();
    
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`🌐 Copilot webhook server running on port ${port}`);
        console.log(`📡 Webhook URL: http://localhost:${port}/webhook/copilot`);
        console.log(`📋 Available actions: http://localhost:${port}/actions`);
        console.log(`🔍 Health check: http://localhost:${port}/health`);
        console.log(`🧪 Test endpoint: http://localhost:${port}/test`);
        resolve();
      });
    });
  }

  async stop() {
    if (this.mcpClient) {
      await this.mcpClient.close();
    }
    console.log('🛑 Copilot MCP bridge stopped');
  }
}

// Example usage
async function startCopilotBridge() {
  const bridge = new CopilotMCPBridge();
  
  try {
    await bridge.startMCPServer();
    await bridge.startWebhookServer(3001);
    
    console.log('\n✅ Copilot MCP Bridge is ready!');
    console.log('\n📋 Configuration for Copilot Studio:');
    console.log('Webhook URL: http://localhost:3001/webhook/copilot');
    console.log('Actions Config: http://localhost:3001/actions');
    console.log('\n💡 Quick Test Commands:');
    console.log('  curl http://localhost:3001/health');
    console.log('  curl -X POST http://localhost:3001/test');
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      await bridge.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error starting bridge:', error);
  }
}

export default CopilotMCPBridge;

// Uncomment to start the bridge
startCopilotBridge().catch(console.error);
