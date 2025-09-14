import { GoogleGenerativeAI } from '@google/generative-ai';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import dotenv from 'dotenv';

dotenv.config();

class GeminiMCPClient {
  constructor() {
    this.mcpClient = null;
    this.availableTools = [];
    
    // Initialize Gemini client
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || "gemini-1.5-pro" 
    });
  }

  async startMCPServer() {
    try {
      console.log('🚀 Starting Zendesk MCP server for Gemini...');
      
      // Create transport using the working pattern
      const transport = new StdioClientTransport({
        command: 'node',
        args: ['src/index.js'],
        cwd: process.env.MCP_SERVER_PATH || process.cwd(),
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

      this.mcpClient = new Client({
        name: "gemini-zendesk-client",
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

  async stopMCPServer() {
    if (this.mcpClient) {
      await this.mcpClient.close();
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

  // Convert MCP tools to function descriptions for Gemini
  getGeminiFunctionDeclarations() {
    return this.availableTools.map(tool => {
      // Clean the schema to remove unsupported properties
      const cleanSchema = this.cleanSchemaForGemini(tool.inputSchema || {});
      
      return {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: cleanSchema.properties || {},
          required: cleanSchema.required || []
        }
      };
    });
  }

  // Clean schema by removing additionalProperties and other unsupported fields
  cleanSchemaForGemini(schema) {
    if (!schema || typeof schema !== 'object') {
      return { type: "object", properties: {}, required: [] };
    }

    const cleaned = JSON.parse(JSON.stringify(schema));
    
    // Recursively clean the schema
    this.removeUnsupportedProperties(cleaned);
    
    return cleaned;
  }

  removeUnsupportedProperties(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    // Remove additionalProperties and other unsupported fields
    const unsupportedFields = ['additionalProperties', '$ref', 'oneOf', 'anyOf', 'allOf'];
    unsupportedFields.forEach(field => {
      delete obj[field];
    });

    // Recursively clean nested objects
    Object.values(obj).forEach(value => {
      if (typeof value === 'object' && value !== null) {
        this.removeUnsupportedProperties(value);
      }
    });
  }

  async chatWithGemini(message, useTools = true) {
    try {
      let tools = [];
      if (useTools && this.availableTools.length > 0) {
        tools = [{
          functionDeclarations: this.getGeminiFunctionDeclarations()
        }];
      }

      const chat = this.model.startChat({
        tools: tools.length > 0 ? tools : undefined,
        history: []
      });

      let result = await chat.sendMessage(message);
      let response = result.response;

      // Handle function calls
      while (response.functionCalls && response.functionCalls.length > 0) {
        const functionCalls = response.functionCalls;
        
        for (const call of functionCalls) {
          console.log(`🔧 Calling tool: ${call.name} with args:`, call.args);
          
          const toolResult = await this.callTool(call.name, call.args || {});
          
          // Send function response back to Gemini
          result = await chat.sendMessage([{
            functionResponse: {
              name: call.name,
              response: toolResult
            }
          }]);
        }
        
        response = result.response;
      }

      return {
        response: response.text(),
        usage: response.usageMetadata,
        candidates: response.candidates
      };
    } catch (error) {
      console.error('❌ Error in Gemini chat:', error);
      return { error: error.message };
    }
  }

  // Convenience methods
  async analyzeTickets(query) {
    const fullQuery = `${query}. Please use the available Zendesk tools to get relevant data and provide insights.`;
    return await this.chatWithGemini(fullQuery);
  }

  async generateReport(reportType = "weekly") {
    const query = `Generate a comprehensive ${reportType} Zendesk report. Include ticket statistics, trends, and actionable insights. Use the database tools to get current data.`;
    return await this.chatWithGemini(query);
  }
}

// Example usage
async function geminiExample() {
  const client = new GeminiMCPClient();
  
  try {
    await client.startMCPServer();
    
    // Example 1: Analyze ticket trends
    console.log('\n📊 Analyzing ticket trends...');
    const analysis = await client.analyzeTickets(
      "What are the current ticket trends and which groups are most busy?"
    );
    console.log('Gemini Analysis:', analysis.response);
    
    // Example 2: Generate a report
    console.log('\n📈 Generating weekly report...');
    const report = await client.generateReport("weekly");
    console.log('Weekly Report:', report.response);
    
  } catch (error) {
    console.error('❌ Example error:', error);
  } finally {
    await client.stopMCPServer();
  }
}

export default GeminiMCPClient;

// Environment variables needed:
// GOOGLE_API_KEY=
// GEMINI_MODEL=gemini-1.5-pro (optional)
// MCP_SERVER_PATH=/path/to/zendesk-mcp-server
// Plus all Zendesk and SQL environment variables

// Uncomment to run example
// geminiExample().catch(console.error);