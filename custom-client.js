import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { spawn } from 'child_process';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

class MCPZendeskClient {
  constructor() {
    this.mcpClient = null;
    this.serverProcess = null;
    this.availableTools = [];
    
    // Initialize OpenAI client (works with Azure OpenAI too)
    this.openai = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.AZURE_OPENAI_ENDPOINT ? 
        `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}` : 
        undefined,
      defaultQuery: process.env.AZURE_OPENAI_API_VERSION ? 
        { 'api-version': process.env.AZURE_OPENAI_API_VERSION } : 
        undefined,
    });
  }

  async startMCPServer() {
    try {
      console.log('Starting Zendesk MCP server...');
      
      // Start the MCP server process
      this.serverProcess = spawn('node', ['src/index.js'], {
        cwd: process.env.MCP_SERVER_PATH || './zendesk-mcp-server',
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

      // Create transport and client
      const transport = new StdioClientTransport({
        stdin: this.serverProcess.stdin,
        stdout: this.serverProcess.stdout
      });

      this.mcpClient = new Client({
        name: "zendesk-client",
        version: "1.0.0"
      }, {
        capabilities: {
          tools: {}
        }
      });

      await this.mcpClient.connect(transport);
      console.log('✅ Connected to Zendesk MCP server');

      // Get available tools
      const { tools } = await this.mcpClient.listTools();
      this.availableTools = tools;
      console.log(`📋 Available tools: ${tools.map(t => t.name).join(', ')}`);

      return true;
    } catch (error) {
      console.error('❌ Error starting MCP server:', error);
      return false;
    }
  }

  async stopMCPServer() {
    if (this.mcpClient) {
      await this.mcpClient.close();
    }
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
    console.log('🛑 MCP server stopped');
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

  // Convert MCP tools to OpenAI function format
  getOpenAIFunctions() {
    return this.availableTools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema || {
          type: "object",
          properties: {},
          required: []
        }
      }
    }));
  }

  async chatWithAI(messages, useTools = true) {
    try {
      const chatParams = {
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      };

      if (useTools && this.availableTools.length > 0) {
        chatParams.tools = this.getOpenAIFunctions();
        chatParams.tool_choice = "auto";
      }

      let response = await this.openai.chat.completions.create(chatParams);
      let finalMessages = [...messages, response.choices[0].message];

      // Handle tool calls
      while (response.choices[0].message.tool_calls) {
        const toolCalls = response.choices[0].message.tool_calls;
        
        for (const toolCall of toolCalls) {
          const { name, arguments: args } = toolCall.function;
          console.log(`🔧 Calling tool: ${name} with args:`, args);
          
          const toolResult = await this.callTool(name, JSON.parse(args));
          
          finalMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          });
        }

        // Get final response with tool results
        response = await this.openai.chat.completions.create({
          ...chatParams,
          messages: finalMessages
        });

        finalMessages.push(response.choices[0].message);
      }

      return {
        response: response.choices[0].message.content,
        usage: response.usage,
        messages: finalMessages
      };
    } catch (error) {
      console.error('❌ Error in AI chat:', error);
      return { error: error.message };
    }
  }

  // Convenience methods for common operations
  async getTicketAnalytics(daysBack = 30) {
    return await this.callTool('get_zendesk_ticket_analytics', { days_back: daysBack });
  }

  async searchTickets(criteria) {
    return await this.callTool('get_tickets_by_criteria', criteria);
  }

  async executeStoredProcedure(procedureName, parameters = {}) {
    return await this.callTool('execute_stored_procedure', {
      procedure_name: procedureName,
      parameters: parameters
    });
  }

  async getDatabaseSchema(objectType = "all") {
    return await this.callTool('get_database_schema', { object_type: objectType });
  }
}

// Example usage
async function example() {
  const client = new MCPZendeskClient();
  
  try {
    // Start the MCP server
    await client.startMCPServer();
    
    // Example 1: Get ticket analytics
    console.log('\n📊 Getting ticket analytics...');
    const analytics = await client.getTicketAnalytics(7); // Last 7 days
    console.log(analytics);
    
    // Example 2: Chat with AI using tools
    console.log('\n🤖 Chatting with AI...');
    const chatResult = await client.chatWithAI([
      {
        role: "user",
        content: "Can you show me the database schema and then get some ticket statistics?"
      }
    ]);
    console.log('AI Response:', chatResult.response);
    
    // Example 3: Execute a stored procedure
    console.log('\n🔧 Executing stored procedure...');
    const procResult = await client.executeStoredProcedure('sp_GetAllTickets');
    console.log(procResult);
    
  } catch (error) {
    console.error('❌ Example error:', error);
  } finally {
    // Clean up
    await client.stopMCPServer();
  }
}

// Environment variables needed for this client:
// AZURE_OPENAI_API_KEY or OPENAI_API_KEY
// AZURE_OPENAI_ENDPOINT (for Azure)
// AZURE_OPENAI_DEPLOYMENT_NAME (for Azure)
// AZURE_OPENAI_API_VERSION (for Azure, e.g., "2024-02-15-preview")
// MCP_SERVER_PATH (path to your zendesk-mcp-server directory)
// Plus all the Zendesk and SQL environment variables

export default MCPZendeskClient;

// Uncomment to run the example
// example().catch(console.error);