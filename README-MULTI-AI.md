# Multi-AI Zendesk MCP Integration

This project provides a unified Model Context Protocol (MCP) server that connects Zendesk data to multiple AI platforms simultaneously: **Google Gemini**, **Anthropic Claude**, and **Microsoft Copilot**.

## 🌟 Features

### Multi-AI Integration
- **Google Gemini**: Advanced reasoning and analysis
- **Anthropic Claude**: Detailed explanations and comprehensive reports
- **Microsoft Copilot**: Enterprise integration via webhooks
- **Parallel Processing**: Query multiple AIs simultaneously
- **Consensus Analysis**: Compare and analyze responses from different AIs

### Zendesk Integration
- 57+ tools for comprehensive Zendesk data access
- Real-time ticket analytics and reporting
- Custom SQL database queries
- Advanced search and filtering capabilities

### MCP Protocol
- Standard Model Context Protocol implementation
- 57 available tools for Zendesk operations
- Secure and efficient data access

## 🚀 Quick Start

### 1. Environment Setup

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

Configure the following in your `.env` file:

```bash
# Zendesk Configuration
ZENDESK_SUBDOMAIN=your-subdomain
ZENDESK_EMAIL=your-email@domain.com
ZENDESK_API_TOKEN=your-zendesk-api-token

# SQL Server Configuration
SQL_SERVER=your-sql-server.database.windows.net
SQL_DATABASE=your-database-name
SQL_USER=your-username
SQL_PASSWORD=your-password

# AI Platform API Keys
GOOGLE_API_KEY=your-google-api-key          # Required for Gemini
ANTHROPIC_API_KEY=your-anthropic-api-key    # Required for Claude

# Optional Configuration
GEMINI_MODEL=gemini-1.5-pro
CLAUDE_MODEL=claude-3-5-sonnet-20241022
COPILOT_PORT=3001
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Test the Integration

Run the comprehensive multi-AI test:

```bash
npm run test:multi-ai
```

## 📖 Usage Examples

### Basic Multi-AI Client

```javascript
import MultiAIMCPClient from './multi-ai-client.js';

const client = new MultiAIMCPClient();
await client.startMCPServer();

// Chat with specific AI
const geminiResponse = await client.chatWithGemini("Analyze my support tickets");
const claudeResponse = await client.chatWithClaude("Generate a support report");

// Chat with all AIs simultaneously
const allResponses = await client.chatWithAll("What are the top support issues?");

// Get consensus analysis
const consensus = await client.getConsensusAnalysis("How can we improve support?");

await client.stopMCPServer();
```

### Individual AI Clients

#### Gemini Integration
```javascript
import GeminiMCPClient from './gemini-client.js';

const gemini = new GeminiMCPClient();
await gemini.startMCPServer();

const analysis = await gemini.analyzeTickets("Show me high priority tickets");
const report = await gemini.generateReport("weekly");

await gemini.stopMCPServer();
```

#### Claude Integration
```javascript
import ClaudeMCPClient from './claude-client.js';

const claude = new ClaudeMCPClient();
await claude.startMCPServer();

const analysis = await claude.analyzeTickets("Analyze customer satisfaction trends");
const report = await claude.generateReport("monthly");

await claude.stopMCPServer();
```

### Copilot Integration

The Copilot integration works via webhooks. Start the bridge:

```bash
npm run start:copilot
```

Then send POST requests to the webhook:

```bash
curl -X POST http://localhost:3001/webhook/copilot \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show me today'\''s ticket summary"
  }'
```

## 🧪 Testing

### Available Test Commands

```bash
# Test all AI integrations
npm run test:multi-ai

# Test individual AI platforms
npm run test:gemini
npm test:health

# Test MCP server functionality
npm run test:mcp
npm run test:db
npm run test:performance
```

### Test Results

The multi-AI test will show:
- ✅ Configuration validation
- ✅ Individual AI responses
- ✅ Parallel processing results
- ✅ Consensus analysis
- ✅ Copilot webhook functionality
- ✅ Direct tool testing

## 🛠️ Available NPM Scripts

```bash
# Start services
npm start                # Start MCP server
npm run start:gemini     # Start Gemini client
npm run start:claude     # Start Claude client
npm run start:multi-ai   # Start multi-AI client
npm run start:copilot    # Start Copilot webhook bridge

# Testing
npm test                 # Run full test suite
npm run test:multi-ai    # Test multi-AI integration
npm run test:health      # Health check
npm run test:performance # Performance tests
npm run test:mcp         # MCP integration tests

# Development
npm run dev              # Start with file watching
npm run inspect          # Start with MCP inspector
```

## 🔧 Architecture

### Components

1. **MultiAIMCPClient**: Unified client managing all AI platforms
2. **GeminiMCPClient**: Google Gemini integration
3. **ClaudeMCPClient**: Anthropic Claude integration
4. **Copilot Bridge**: Express webhook server for Microsoft Copilot
5. **MCP Server**: Core Zendesk data access layer

### Data Flow

```
Zendesk API ←→ MCP Server ←→ Multi-AI Client ←→ [Gemini|Claude|Copilot]
                    ↓
               SQL Database
```

### Available Tools

The MCP server provides 57 tools including:
- `mcp_zendesk_get_zendesk_ticket_analytics`
- `mcp_zendesk_get_tickets_by_criteria`
- `mcp_zendesk_list_tickets`
- `mcp_zendesk_get_ticket`
- `mcp_zendesk_search`
- `mcp_zendesk_execute_custom_sql`
- And many more...

## 🔗 Integration Endpoints

### Copilot Webhook Endpoints

- **Health Check**: `GET http://localhost:3001/health`
- **Chat Interface**: `POST http://localhost:3001/webhook/copilot`

Example webhook payload:
```json
{
  "message": "Analyze my support tickets",
  "toolName": "mcp_zendesk_get_zendesk_ticket_analytics",
  "args": {"days_back": 7}
}
```

## 🔍 Troubleshooting

### Common Issues

1. **"GOOGLE_API_KEY not found"**
   - Ensure your `.env` file contains `GOOGLE_API_KEY=your-key`
   - Get a key from: https://makersuite.google.com/app/apikey

2. **"ANTHROPIC_API_KEY not found"**
   - Ensure your `.env` file contains `ANTHROPIC_API_KEY=your-key`
   - Get a key from: https://console.anthropic.com

3. **"Failed to start MCP server"**
   - Check Zendesk credentials in `.env`
   - Verify SQL database connection
   - Run `npm run test:health` for diagnostics

4. **Copilot webhook not responding**
   - Ensure port 3001 is available
   - Check firewall settings
   - Verify the webhook bridge is running

### Debug Mode

Enable debug logging:
```bash
DEBUG=true npm run test:multi-ai
```

## 📊 Performance

- **Parallel Processing**: Multiple AIs can process requests simultaneously
- **Shared MCP Connection**: Single server instance shared across all AIs
- **Efficient Tool Caching**: Tools are loaded once and shared
- **Optimized Database Queries**: Proper indexing and query optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**🎉 You now have a unified interface to chat with Gemini, Claude, and Copilot using your Zendesk data!**
