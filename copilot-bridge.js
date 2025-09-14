// GitHub Copilot Studio Integration with MCP
// This demonstrates how to integrate your Zendesk MCP server with Microsoft Copilot Studio

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { spawn } from 'child_process';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

class CopilotMCPBridge {
  constructor() {
    this.mcpClient = null;
    this.serverProcess = null;
    this.availableTools = [];
    this.app = express();
    this.app.use(express.json());
  }

  async startMCPServer() {
    try {
      console.log('🚀 Starting Zendesk MCP server for Copilot...');
      
      this.serverProcess = spawn('node', ['src/index.js'], {
        cwd: process.env.MCP_SERVER_PATH || './',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ZENDESK_SUBDOMAIN: process.env.ZENDESK_SUBDOMAIN,
          ZENDESK_EMAIL: process.env.ZENDESK_EMAIL,
          ZENDESK_API_TOKEN: process.env.ZENDESK_API_TOKEN,
          SQL_SERVER: process.env.SQL_SERVER,
          SQL_DATABASE: process.env.SQL_DATABASE,
          SQL_USER: process.env.SQL_USER,
          SQL_PASSWORD: process.env.SQL_PASSWORD
        }
      });

      const transport = new StdioClientTransport({
        stdin: this.serverProcess.stdin,
        stdout: this.serverProcess.stdout
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
      console.log(`📋 Available tools: ${tools.map(t => t.name).join(', ')}`);

      return true;
    } catch (error) {
      console.error('❌ Error starting MCP server:', error);
      return false;
    }
  }

  async callTool(toolName, args = {}) {
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
        mcp_connected: !!this.mcpClient,
        available_tools: this.availableTools.length,
        timestamp: new Date().toISOString()
      });
    });

    // Get available actions for Copilot Studio configuration
    this.app.get('/actions', (req, res) => {
      const actions = [
        {
          name: 'get_ticket_analytics',
          description: 'Get comprehensive ticket analytics',
          parameters: {
            days_back: { type: 'number', required: false, description: 'Number of days to look back' }
          }
        },
        {
          name: 'search_tickets',
          description: 'Search tickets with various criteria',
          parameters: {
            status: { type: 'string', required: false, description: 'Ticket status' },
            priority: { type: 'string', required: false, description: 'Ticket priority' },
            group_name: { type: 'string', required: false, description: 'Group name' },
            days_back: { type: 'number', required: false, description: 'Days to look back' },
            limit: { type: 'number', required: false, description: 'Max results' }
          }
        },
        {
          name: 'execute_procedure',
          description: 'Execute a stored procedure',
          parameters: {
            procedure_name: { type: 'string', required: true, description: 'Stored procedure name' },
            procedure_params: { type: 'object', required: false, description: 'Procedure parameters' }
          }
        },
        {
          name: 'get_schema',
          description: 'Get database schema information',
          parameters: {
            object_type: { type: 'string', required: false, description: 'Type: tables, views, procedures, all' }
          }
        },
        {
          name: 'custom_query',
          description: 'Execute a custom SQL query (SELECT only)',
          parameters: {
            query: { type: 'string', required: true, description: 'SQL query to execute' },
            query_params: { type: 'object', required: false, description: 'Query parameters' }
          }
        }
      ];
      
      res.json({
        actions: actions,
        webhook_url: `${req.protocol}://${req.get('host')}/webhook/copilot`,
        available_tools: this.availableTools.map(t => ({ name: t.name, description: t.description }))
      });
    });
  }

  async startWebhookServer(port = 3000) {
    this.setupWebhookEndpoints();
    
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`🌐 Copilot webhook server running on port ${port}`);
        console.log(`📡 Webhook URL: http://localhost:${port}/webhook/copilot`);
        console.log(`📋 Available actions: http://localhost:${port}/actions`);
        resolve();
      });
    });
  }

  async stop() {
    if (this.mcpClient) {
      await this.mcpClient.close();
    }
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
    console.log('🛑 Copilot MCP bridge stopped');
  }
}

// Example usage
async function startCopilotBridge() {
  const bridge = new CopilotMCPBridge();
  
  try {
    await bridge.startMCPServer();
    await bridge.startWebhookServer(3000);
    
    console.log('\n✅ Copilot MCP Bridge is ready!');
    console.log('\n📋 Configuration for Copilot Studio:');
    console.log('Webhook URL: http://localhost:3000/webhook/copilot');
    console.log('Available Actions: http://localhost:3000/actions');
    
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