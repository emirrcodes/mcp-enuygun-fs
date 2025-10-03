# Cursor Prompt: Python MCP Server to Node.js Migration (Direct Integration)

## Context
I have a Python MCP (Model Context Protocol) server that integrates with a third-party API. I need to convert this to Node.js and make it ready for direct integration into an existing MCP server repository.

## Target Repository Structure
The converted code will be integrated into an existing Node.js MCP server project that already has:
- `http-server.js` (Foursquare Places API server)
- `server.js` (stdio-based MCP server) 
- `package.json` with existing dependencies
- Test files and deployment setup

## Requirements for Conversion

### 1. File Naming Convention
- **Main Server**: `[api-name]-server.js` (e.g., `weather-server.js`, `booking-server.js`)
- **Test File**: `test-[api-name].js` (e.g., `test-weather.js`)
- **Documentation**: `[api-name]-integration.md`
- **Package Updates**: Suggest dependencies to add to existing `package.json`

### 2. Server Class Structure
```javascript
#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import fetch from 'node-fetch';

// API Configuration
const API_KEY = "YOUR_API_KEY_HERE";
const API_BASE_URL = "https://api.example.com";

class [APIName]HTTPServer {
  constructor() {
    this.app = express();
    this.server = new Server(
      {
        name: '[api-name]-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupMCPHandlers();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Simple request logging
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`🔵 [${timestamp}] ${req.method} ${req.path} - ${req.body?.method || 'N/A'}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // MCP endpoint - compatible with OpenAI Agent SDK
    this.app.post('/mcp', async (req, res) => {
      try {
        const { method, params = {}, id = 1 } = req.body;
        
        let result;
        switch (method) {
          case 'initialize':
            result = {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: {
                name: '[api-name]-server',
                version: '1.0.0'
              }
            };
            break;
            
          case 'notifications/initialized':
            res.json({ jsonrpc: '2.0', id });
            return;
            
          case 'tools/list':
            result = await this.handleListTools();
            break;
            
          case 'tools/call':
            result = await this.handleCallTool(params);
            break;
            
          default:
            throw new Error(`Unknown method: ${method}`);
        }

        res.json({ jsonrpc: '2.0', id, result });

      } catch (error) {
        console.error('MCP Error:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body.id || 1,
          error: { code: -32603, message: error.message }
        });
      }
    });

    // Direct API endpoints (optional)
    this.app.get('/api/[endpoint]', async (req, res) => {
      try {
        // Direct API access
        const result = await this.someMethod(req.query);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  async handleListTools() {
    return {
      tools: [
        // Convert each Python tool to this format
      ]
    };
  }

  async handleCallTool(params) {
    const { name, arguments: args } = params;
    switch (name) {
      // Handle each tool
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async start(port = 3000) {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`🚀 [API Name] MCP HTTP Server running on http://localhost:${port}`);
        console.log(`📋 Health check: http://localhost:${port}/health`);
        console.log(`🔌 MCP endpoint: http://localhost:${port}/mcp`);
        resolve();
      });
    });
  }
}

// Start server
const server = new [APIName]HTTPServer();
const port = process.env.PORT || 3000;
server.start(port).catch(console.error);
```

### 3. Package.json Dependencies to Add
Provide a list of new dependencies that should be added to the existing package.json:
```json
"dependencies": {
  // List any new dependencies your API needs
  // Example: "axios": "^1.6.0" if you need axios instead of node-fetch
}
```

### 4. Integration Script Template
Create a script that shows how to add the new server to existing package.json scripts:
```json
"scripts": {
  "[api-name]": "node [api-name]-server.js",
  "[api-name]-dev": "nodemon [api-name]-server.js",
  "test-[api-name]": "node test-[api-name].js"
}
```

## Migration Steps

1. **Backup Original**: Copy all Python files with `.backup` extension
2. **Analyze Python Code**: Document all functions, API calls, and tools
3. **Create Node.js Server**: Following the exact template above
4. **Convert Tools**: Each Python MCP tool → Node.js MCP tool
5. **API Mapping**: Python API calls → Node.js fetch calls
6. **Create Test File**: Comprehensive testing script
7. **Integration Guide**: Step-by-step integration instructions

## Expected Output Files

### 1. `[api-name]-server.js`
Complete HTTP server following the template above

### 2. `test-[api-name].js`
```javascript
#!/usr/bin/env node

import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3000';

async function test[APIName]Server() {
  console.log('🧪 [API Name] MCP Server Test Starting...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${SERVER_URL}/health`);
    // ... rest of tests

    console.log('\n🎉 ALL TESTS PASSED!');
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
  }
}

test[APIName]Server();
```

### 3. `[api-name]-integration.md`
```markdown
# [API Name] MCP Server Integration

## Files Generated
- `[api-name]-server.js` - Main server
- `test-[api-name].js` - Test script
- `*.py.backup` - Original Python files

## Integration Steps
1. Copy generated files to your MCP project
2. Add dependencies to package.json: `npm install [new-dependencies]`
3. Add scripts to package.json
4. Test: `npm run test-[api-name]`
5. Start: `npm run [api-name]`

## Tools Available
- [List each tool with description]

## API Usage
[Example of how to use with OpenAI Agent SDK]

## Configuration
- Update API_KEY in [api-name]-server.js
- Customize port if needed
```

### 4. `package-updates.json`
```json
{
  "dependencies": {
    // New dependencies to add
  },
  "scripts": {
    // New scripts to add
  }
}
```

## Quality Requirements

- [ ] All Python tools converted with same functionality
- [ ] Same external API endpoints and responses
- [ ] MCP protocol fully compliant (initialize, tools/list, tools/call)
- [ ] OpenAI Agent SDK compatible
- [ ] Consistent with existing codebase style
- [ ] Complete test coverage
- [ ] Integration documentation
- [ ] No conflicts with existing files

## Final Deliverables

Create these exact files for copy-paste integration:
1. `[api-name]-server.js` (complete server)
2. `test-[api-name].js` (complete test suite)
3. `[api-name]-integration.md` (integration guide)
4. `package-updates.json` (dependencies to add)
5. `*.py.backup` (original files)

**Make sure all generated code is production-ready and can be directly copied into the existing MCP server repository without any modifications.**
