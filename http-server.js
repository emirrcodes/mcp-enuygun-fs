#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// Foursquare API Configuration
const API_KEY = "VAIBONJPWHIA3LZVS41H1YJX2XNZM5HTLKPBC30KCCHHO24P";
const API_BASE_URL = "https://places-api.foursquare.com/places";
const API_VERSION = "2025-06-17";

class FoursquareHTTPServer {
  constructor() {
    this.app = express();
    this.server = new Server(
      {
        name: 'foursquare-places-server',
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
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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
                name: 'foursquare-places-server',
                version: '1.0.0'
              }
            };
            break;
            
          case 'tools/list':
            result = await this.handleListTools();
            break;
            
          case 'tools/call':
            result = await this.handleCallTool(params);
            break;
            
          default:
            throw new Error(`Unknown method: ${method}`);
        }

        res.json({
          jsonrpc: '2.0',
          id,
          result
        });

      } catch (error) {
        console.error('MCP Error:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body.id || 1,
          error: {
            code: -32603,
            message: error.message
          }
        });
      }
    });

    // Direct API endpoints (bonus - for easier testing)
    this.app.get('/api/search', async (req, res) => {
      try {
        const { near = 'Antalya', query = 'restaurant', limit = 10 } = req.query;
        const result = await this.searchPlaces({ near, query, limit: parseInt(limit) });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/places/:id', async (req, res) => {
      try {
        const result = await this.getPlaceDetails({ fsq_place_id: req.params.id });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  setupMCPHandlers() {
    // Keep the same MCP server logic for consistency
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_places',
          description: 'Search for places using Foursquare Places API',
          inputSchema: {
            type: 'object',
            properties: {
              near: {
                type: 'string',
                description: 'Location to search near (e.g., "Antalya", "Istanbul")',
                default: 'Antalya'
              },
              query: {
                type: 'string',
                description: 'Search query for places (e.g., "restaurant", "cafe", "bazaar")',
                default: 'restaurant'
              },
              limit: {
                type: 'number',
                description: 'Number of results to return (1-50)',
                default: 10,
                minimum: 1,
                maximum: 50
              },
              categories: {
                type: 'string',
                description: 'Category IDs to filter by (comma-separated)',
                default: ''
              }
            },
            required: ['near', 'query']
          }
        },
        {
          name: 'get_place_details',
          description: 'Get detailed information about a specific place',
          inputSchema: {
            type: 'object',
            properties: {
              fsq_place_id: {
                type: 'string',
                description: 'Foursquare place ID'
              }
            },
            required: ['fsq_place_id']
          }
        }
      ]
    }));
  }

  async handleListTools() {
    return {
      tools: [
        {
          name: 'search_places',
          description: 'Search for places using Foursquare Places API',
          inputSchema: {
            type: 'object',
            properties: {
              near: {
                type: 'string',
                description: 'Location to search near (e.g., "Antalya", "Istanbul")',
                default: 'Antalya'
              },
              query: {
                type: 'string',
                description: 'Search query for places (e.g., "restaurant", "cafe", "bazaar")',
                default: 'restaurant'
              },
              limit: {
                type: 'number',
                description: 'Number of results to return (1-50)',
                default: 10,
                minimum: 1,
                maximum: 50
              }
            },
            required: ['near', 'query']
          }
        },
        {
          name: 'get_place_details',
          description: 'Get detailed information about a specific place',
          inputSchema: {
            type: 'object',
            properties: {
              fsq_place_id: {
                type: 'string',
                description: 'Foursquare place ID'
              }
            },
            required: ['fsq_place_id']
          }
        }
      ]
    };
  }

  async handleCallTool(params) {
    const { name, arguments: args } = params;

    switch (name) {
      case 'search_places':
        return await this.searchPlaces(args);
      case 'get_place_details':
        return await this.getPlaceDetails(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async makeApiRequest(endpoint, params = {}) {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.append(key, value);
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Places-Api-Version': API_VERSION,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  async searchPlaces(args) {
    const { near = 'Antalya', query = 'restaurant', limit = 10, categories = '' } = args;

    const params = {
      near,
      query,
      limit: Math.min(Math.max(limit, 1), 50)
    };

    if (categories) {
      params.categories = categories;
    }

    const data = await this.makeApiRequest('/search', params);

    const results = data.results || [];
    const formattedResults = results.map(place => ({
      fsq_place_id: place.fsq_place_id,
      name: place.name,
      address: place.location?.formatted_address || place.location?.country || 'Address not available',
      categories: place.categories?.map(cat => cat.name).join(', ') || 'No categories',
      distance: place.distance ? `${place.distance}m` : 'Distance unknown',
      latitude: place.latitude || 'No lat',
      longitude: place.longitude || 'No lng',
      link: place.link || 'No link'
    }));

    return {
      content: [
        {
          type: 'text',
          text: `Found ${results.length} places near "${near}" matching "${query}":\n\n` +
                formattedResults.map((place, index) => 
                  `${index + 1}. **${place.name}**\n` +
                  `   📍 ${place.address}\n` +
                  `   🏷️ ${place.categories}\n` +
                  `   📏 ${place.distance}\n` +
                  `   🌍 ${place.latitude}, ${place.longitude}\n` +
                  `   🔗 ${place.link}\n` +
                  `   🆔 ID: ${place.fsq_place_id}\n`
                ).join('\n')
        }
      ]
    };
  }

  async getPlaceDetails(args) {
    const { fsq_place_id } = args;

    if (!fsq_place_id) {
      throw new Error('fsq_place_id is required');
    }

    const data = await this.makeApiRequest(`/${fsq_place_id}`);

    const place = data;
    const details = {
      name: place.name || 'Unknown',
      address: place.location?.formatted_address || place.location?.country || 'Address not available',
      categories: place.categories?.map(cat => cat.name).join(', ') || 'No categories',
      latitude: place.latitude || 'No lat',
      longitude: place.longitude || 'No lng',
      distance: place.distance ? `${place.distance}m` : 'Distance unknown',
      link: place.link || 'No link',
      social_media: place.social_media || 'No social media'
    };

    return {
      content: [
        {
          type: 'text',
          text: `**${details.name}**\n\n` +
                `📍 **Address:** ${details.address}\n` +
                `🏷️ **Categories:** ${details.categories}\n` +
                `🌍 **Location:** ${details.latitude}, ${details.longitude}\n` +
                `📏 **Distance:** ${details.distance}\n` +
                `🔗 **Link:** ${details.link}\n` +
                `📱 **Social Media:** ${JSON.stringify(details.social_media)}\n`
        }
      ]
    };
  }

  async start(port = 3000) {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`🚀 Foursquare MCP HTTP Server running on http://localhost:${port}`);
        console.log(`📋 Health check: http://localhost:${port}/health`);
        console.log(`🔌 MCP endpoint: http://localhost:${port}/mcp`);
        console.log(`🧪 Direct API: http://localhost:${port}/api/search?near=Antalya&query=restaurant`);
        resolve();
      });
    });
  }
}

// Start server
const server = new FoursquareHTTPServer();
const port = process.env.PORT || 3000;
server.start(port).catch(console.error);
