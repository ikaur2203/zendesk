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
          ZENDESK_API_TOKEN: process.env.ZENDESK_API_TOKEN,
          SQL_SERVER: process.env.SQL_SERVER,
          SQL_DATABASE: process.env.SQL_DATABASE,
          SQL_USER: process.env.SQL_USER,
          SQL_PASSWORD: process.env.SQL_PASSWORD
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

  // Convert MCP tools to Claude tool format
  getClaudeTools() {
    return this.availableTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema || {
        type: "object",
        properties: {},
        required: []
      }
    }));
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

      // Handle tool calls
      let finalResponse = response;
      while (finalResponse.content.some(content => content.type === 'tool_use')) {
        const toolUses = finalResponse.content.filter(content => content.type === 'tool_use');
        
        // Add Claude's response to messages
        messages.push({
          role: "assistant",
          content: finalResponse.content
        });

        // Process tool calls
        const toolResults = [];
        for (const toolUse of toolUses) {
          console.log(`🔧 Calling tool: ${toolUse.name} with args:`, toolUse.input);
          
          const toolResult = await this.callTool(toolUse.name, toolUse.input || {});
          
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(toolResult)
          });
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
        model: finalResponse.model
      };
    } catch (error) {
      console.error('❌ Error in Claude chat:', error);
      return { error: error.message };
    }
  }

  // Convenience methods
  async analyzeTickets(query) {
    const fullQuery = `${query}. Please use the available Zendesk tools to get relevant data and provide insights.`;
    return await this.chatWithClaude(fullQuery);
  }

  async generateReport(reportType = "weekly") {
    const query = `Generate a comprehensive ${reportType} Zendesk report. Include ticket statistics, trends, and actionable insights. Use the database tools to get current data.`;
    return await this.chatWithClaude(query);
  }
}

export default ClaudeMCPClient;
