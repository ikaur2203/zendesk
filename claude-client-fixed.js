import Anthropic from '@anthropic-ai/sdk';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import dotenv from 'dotenv';

dotenv.config();

class ClaudeMCPClient {
  constructor() {
    this.mcpClient = null;
    this.availableTools = [];
    
    // Initialize Claude client
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
    });
  }

  async startMCPServer() {
    try {
      console.log('🚀 Starting Zendesk MCP server for Claude...');
      
      // Create transport using the working pattern
      const transport = new StdioClientTransport({
        command: 'node',
        args: ['src/index.js'],
        cwd: process.env.MCP_SERVER_PATH || process.cwd(),
        env: {
          ...process.env,
          ZENDESK_SUBDOMAIN: process.env.ZENDESK_SUBDOMAIN,
          ZENDESK_EMAIL: process.env.ZENDESK_EMAIL,
          ZENDESK_API_TOKEN: process.env.ZENDESK_API_TOKEN
        }
      });

      this.mcpClient = new Client({
        name: "claude-zendesk-client",
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
      console.log(`📋 Available tools: ${tools.length} tools loaded`);

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
      
      // Ensure we return clean, properly formatted content
      if (result && result.content) {
        return {
          content: result.content,
          isError: result.isError || false
        };
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Error calling tool ${toolName}:`, error);
      return { 
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true 
      };
    }
  }

  // Convert MCP tools to Claude tool format with proper schema handling
  getClaudeTools() {
    return this.availableTools.map(tool => {
      // Ensure the tool has a proper schema
      const schema = tool.inputSchema || {
        type: "object",
        properties: {},
        required: []
      };

      return {
        name: tool.name,
        description: tool.description || `Tool: ${tool.name}`,
        input_schema: schema
      };
    });
  }

  // Helper to safely extract text content from various response formats
  extractTextContent(content) {
    if (typeof content === 'string') {
      return content;
    }
    
    if (Array.isArray(content)) {
      return content
        .filter(item => item && item.type === 'text')
        .map(item => item.text)
        .join('\n');
    }
    
    if (content && content.text) {
      return content.text;
    }
    
    return JSON.stringify(content);
  }

  async chatWithClaude(message, useTools = true) {
    try {
      const tools = useTools && this.availableTools.length > 0 ? this.getClaudeTools() : [];

      let messages = [
        {
          role: "user",
          content: message
        }
      ];

      const response = await this.anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        tools: tools.length > 0 ? tools : undefined,
        messages: messages
      });

      // Handle tool calls with improved content block handling
      let finalResponse = response;
      let maxIterations = 5; // Prevent infinite loops
      let iterations = 0;
      
      while (finalResponse.content.some(content => content.type === 'tool_use') && iterations < maxIterations) {
        iterations++;
        const toolUses = finalResponse.content.filter(content => content.type === 'tool_use');
        
        // Add Claude's response to messages with proper content indexing
        messages.push({
          role: "assistant",
          content: finalResponse.content
        });

        // Process tool calls sequentially to avoid content block conflicts
        const toolResults = [];
        for (let i = 0; i < toolUses.length; i++) {
          const toolUse = toolUses[i];
          console.log(`🔧 Calling tool: ${toolUse.name}`);
          
          try {
            const toolResult = await this.callTool(toolUse.name, toolUse.input || {});
            
            // Safely format tool result content
            let resultContent;
            if (toolResult && toolResult.content) {
              resultContent = this.extractTextContent(toolResult.content);
            } else {
              resultContent = JSON.stringify(toolResult);
            }

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: resultContent,
              is_error: toolResult.isError || false
            });
          } catch (error) {
            console.error(`Error with tool ${toolUse.name}:`, error);
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: `Error executing tool: ${error.message}`,
              is_error: true
            });
          }
        }

        // Add tool results to messages
        messages.push({
          role: "user",
          content: toolResults
        });

        // Get Claude's final response
        finalResponse = await this.anthropic.messages.create({
          model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022",
          max_tokens: 4000,
          tools: tools.length > 0 ? tools : undefined,
          messages: messages
        });
      }

      const textContent = finalResponse.content
        .filter(content => content.type === 'text')
        .map(content => content.text)
        .join('\n');

      return {
        response: textContent,
        usage: finalResponse.usage,
        model: finalResponse.model,
        iterations: iterations
      };
    } catch (error) {
      console.error('❌ Error in Claude chat:', error);
      return { error: error.message };
    }
  }

  // Test connection method
  async testConnection() {
    try {
      console.log('🧪 Testing Claude MCP connection...');
      
      if (!this.mcpClient) {
        console.log('Starting MCP server...');
        const started = await this.startMCPServer();
        if (!started) {
          throw new Error('Failed to start MCP server');
        }
      }

      // Test a simple tool call
      const result = await this.callTool('list_tickets', { per_page: 3 });
      
      if (result.isError) {
        throw new Error(`Tool call failed: ${result.content[0].text}`);
      }

      console.log('✅ Connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }

  // Convenience methods
  async analyzeTickets(query) {
    const fullQuery = `${query}. Please use the available Zendesk tools to get relevant data and provide insights.`;
    return await this.chatWithClaude(fullQuery);
  }

  async generateReport(reportType = "weekly") {
    const query = `Generate a comprehensive ${reportType} Zendesk report. Include ticket statistics, trends, and actionable insights.`;
    return await this.chatWithClaude(query);
  }
}

export default ClaudeMCPClient;