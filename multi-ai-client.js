import GeminiMCPClient from './gemini-client.js';
import ClaudeMCPClient from './claude-client.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

class MultiAIMCPClient {
  constructor() {
    this.mcpClient = null;
    this.availableTools = [];
    
    // AI Clients
    this.geminiClient = null;
    this.claudeClient = null;
    this.copilotBridge = null;
    
    // Configuration
    this.enabledClients = {
      gemini: !!process.env.GOOGLE_API_KEY,
      claude: !!(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY),
      copilot: true // Always available via webhook
    };
    
    console.log('🤖 Multi-AI Client Configuration:');
    console.log(`- Gemini: ${this.enabledClients.gemini ? '✅ Enabled' : '❌ Disabled (GOOGLE_API_KEY missing)'}`);
    console.log(`- Claude: ${this.enabledClients.claude ? '✅ Enabled' : '❌ Disabled (ANTHROPIC_API_KEY missing)'}`);
    console.log(`- Copilot: ${this.enabledClients.copilot ? '✅ Enabled' : '❌ Disabled'}`);
  }

  async startMCPServer() {
    try {
      console.log('🚀 Starting Multi-AI MCP Server...');
      
      // Start shared MCP server process using working pattern
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
        name: "multi-ai-zendesk-client",
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

      // Initialize AI clients
      await this.initializeAIClients();

      return true;
    } catch (error) {
      console.error('❌ Error starting MCP server:', error);
      return false;
    }
  }

  async initializeAIClients() {
    console.log('\n🔧 Initializing AI clients...');
    
    // Initialize Gemini client
    if (this.enabledClients.gemini) {
      try {
        this.geminiClient = new GeminiMCPClient();
        // Share the MCP connection
        this.geminiClient.mcpClient = this.mcpClient;
        this.geminiClient.availableTools = this.availableTools;
        console.log('✅ Gemini client initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Gemini client:', error);
        this.enabledClients.gemini = false;
      }
    }

    // Initialize Claude client
    if (this.enabledClients.claude) {
      try {
        this.claudeClient = new ClaudeMCPClient();
        // Share the MCP connection
        this.claudeClient.mcpClient = this.mcpClient;
        this.claudeClient.availableTools = this.availableTools;
        console.log('✅ Claude client initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Claude client:', error);
        this.enabledClients.claude = false;
      }
    }

    // Initialize Copilot webhook bridge
    if (this.enabledClients.copilot) {
      try {
        await this.startCopilotBridge();
        console.log('✅ Copilot bridge initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Copilot bridge:', error);
        this.enabledClients.copilot = false;
      }
    }
  }

  async startCopilotBridge() {
    const app = express();
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        availableTools: this.availableTools.length,
        enabledClients: this.enabledClients
      });
    });

    // Copilot webhook endpoint
    app.post('/webhook/copilot', async (req, res) => {
      try {
        const { message, toolName, args } = req.body;

        if (toolName && this.availableTools.some(tool => tool.name === toolName)) {
          // Direct tool call
          const result = await this.callTool(toolName, args || {});
          res.json({ success: true, result });
        } else if (message) {
          // Route to available AI client for analysis
          const response = await this.routeMessage(message, 'copilot');
          res.json({ success: true, response: response.response });
        } else {
          res.status(400).json({ 
            success: false, 
            error: 'Either message or toolName is required' 
          });
        }
      } catch (error) {
        console.error('❌ Copilot webhook error:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Start server
    const port = process.env.COPILOT_PORT || 3001;
    this.copilotBridge = app.listen(port, () => {
      console.log(`🔗 Copilot webhook bridge listening on port ${port}`);
    });
  }

  async stopMCPServer() {
    console.log('\n🛑 Stopping Multi-AI MCP Server...');
    
    if (this.mcpClient) {
      await this.mcpClient.close();
    }
    if (this.copilotBridge) {
      this.copilotBridge.close();
    }
    
    console.log('✅ All services stopped');
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

  // Route messages to appropriate AI client
  async routeMessage(message, preferredAI = null) {
    const availableClients = Object.keys(this.enabledClients).filter(
      client => this.enabledClients[client] && client !== 'copilot'
    );

    if (availableClients.length === 0) {
      return { error: 'No AI clients available' };
    }

    // Use preferred AI if available, otherwise use first available
    let targetAI = preferredAI && this.enabledClients[preferredAI] ? preferredAI : availableClients[0];
    
    console.log(`🤖 Routing message to ${targetAI.toUpperCase()}`);

    switch (targetAI) {
      case 'gemini':
        return await this.geminiClient.chatWithGemini(message);
      case 'claude':
        return await this.claudeClient.chatWithClaude(message);
      default:
        return { error: `Unknown AI client: ${targetAI}` };
    }
  }

  // Chat with specific AI
  async chatWithGemini(message) {
    if (!this.enabledClients.gemini) {
      return { error: 'Gemini client not available' };
    }
    return await this.geminiClient.chatWithGemini(message);
  }

  async chatWithClaude(message) {
    if (!this.enabledClients.claude) {
      return { error: 'Claude client not available' };
    }
    return await this.claudeClient.chatWithClaude(message);
  }

  // Parallel processing - chat with multiple AIs simultaneously
  async chatWithAll(message) {
    const promises = [];
    const results = {};

    if (this.enabledClients.gemini) {
      promises.push(
        this.geminiClient.chatWithGemini(message)
          .then(result => results.gemini = result)
          .catch(error => results.gemini = { error: error.message })
      );
    }

    if (this.enabledClients.claude) {
      promises.push(
        this.claudeClient.chatWithClaude(message)
          .then(result => results.claude = result)
          .catch(error => results.claude = { error: error.message })
      );
    }

    await Promise.all(promises);
    return results;
  }

  // Consensus analysis - compare responses from multiple AIs
  async getConsensusAnalysis(message) {
    console.log('🔍 Getting consensus analysis from multiple AIs...');
    
    const allResults = await this.chatWithAll(message);
    
    // Create a summary comparing all responses
    const summary = {
      query: message,
      timestamp: new Date().toISOString(),
      responses: allResults,
      consensus: this.analyzeConsensus(allResults)
    };

    return summary;
  }

  analyzeConsensus(results) {
    const validResponses = Object.entries(results)
      .filter(([ai, result]) => !result.error)
      .map(([ai, result]) => ({ ai, response: result.response }));

    if (validResponses.length === 0) {
      return { conclusion: 'No valid responses received' };
    }

    if (validResponses.length === 1) {
      return { 
        conclusion: `Single response from ${validResponses[0].ai}`,
        confidence: 'low'
      };
    }

    // Simple consensus analysis
    const responseTexts = validResponses.map(r => r.response.toLowerCase());
    const commonKeywords = this.findCommonKeywords(responseTexts);

    return {
      conclusion: 'Multiple AI perspectives available',
      confidence: 'high',
      commonKeywords,
      participatingAIs: validResponses.map(r => r.ai)
    };
  }

  findCommonKeywords(texts) {
    // Simple keyword extraction (could be enhanced with NLP)
    const allWords = texts.join(' ').split(/\s+/)
      .filter(word => word.length > 3)
      .map(word => word.toLowerCase());
    
    const wordCount = {};
    allWords.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
      .filter(([word, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => word);
  }

  // Convenience methods
  async analyzeTickets(query, aiPreference = null) {
    const fullQuery = `${query}. Please use the available Zendesk tools to get relevant data and provide insights.`;
    return await this.routeMessage(fullQuery, aiPreference);
  }

  async generateReport(reportType = "weekly", aiPreference = null) {
    const query = `Generate a comprehensive ${reportType} Zendesk report. Include ticket statistics, trends, and actionable insights. Use the database tools to get current data.`;
    return await this.routeMessage(query, aiPreference);
  }

  // Status and configuration
  getStatus() {
    return {
      mcpServer: !!this.mcpClient,
      availableTools: this.availableTools.length,
      enabledClients: this.enabledClients,
      copilotBridge: !!this.copilotBridge
    };
  }
}

export default MultiAIMCPClient;
