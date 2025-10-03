#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// Foursquare API Configuration
const API_KEY = "VAIBONJPWHIA3LZVS41H1YJX2XNZM5HTLKPBC30KCCHHO24P";
const API_BASE_URL = "https://places-api.foursquare.com/places";
const API_VERSION = "2025-06-17";

class FoursquareMCPServer {
  constructor() {
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
    
    this.setupToolHandlers();
  }

  setupToolHandlers() {
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
        },
        {
          name: 'get_place_photos',
          description: 'Get photos for a specific place',
          inputSchema: {
            type: 'object',
            properties: {
              fsq_place_id: {
                type: 'string',
                description: 'Foursquare place ID'
              },
              limit: {
                type: 'number',
                description: 'Number of photos to return (1-50)',
                default: 10,
                minimum: 1,
                maximum: 50
              }
            },
            required: ['fsq_place_id']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_places':
            return await this.searchPlaces(args);
          case 'get_place_details':
            return await this.getPlaceDetails(args);
          case 'get_place_photos':
            return await this.getPlacePhotos(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    });
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
      address: place.location?.formatted_address || 'Address not available',
      categories: place.categories?.map(cat => cat.name).join(', ') || 'No categories',
      rating: place.rating || 'No rating',
      popularity: place.popularity || 'No popularity score',
      price: place.price || 'No price info',
      hours: place.hours || 'No hours info',
      website: place.website || 'No website',
      tel: place.tel || 'No phone',
      email: place.email || 'No email',
      social_media: place.social_media || 'No social media',
      verified: place.verified ? 'Verified' : 'Not verified',
      description: place.description || 'No description'
    };

    return {
      content: [
        {
          type: 'text',
          text: `**${details.name}**\n\n` +
                `📍 **Address:** ${details.address}\n` +
                `🏷️ **Categories:** ${details.categories}\n` +
                `⭐ **Rating:** ${details.rating}\n` +
                `📊 **Popularity:** ${details.popularity}\n` +
                `💰 **Price:** ${details.price}\n` +
                `🕒 **Hours:** ${JSON.stringify(details.hours, null, 2)}\n` +
                `📞 **Phone:** ${details.tel}\n` +
                `📧 **Email:** ${details.email}\n` +
                `🌐 **Website:** ${details.website}\n` +
                `✅ **Verified:** ${details.verified}\n` +
                `📝 **Description:** ${details.description}\n`
        }
      ]
    };
  }

  async getPlacePhotos(args) {
    const { fsq_place_id, limit = 10 } = args;

    if (!fsq_place_id) {
      throw new Error('fsq_place_id is required');
    }

    const data = await this.makeApiRequest(`/${fsq_place_id}/photos`, {
      limit: Math.min(Math.max(limit, 1), 50)
    });

    const photos = data || [];
    
    if (photos.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No photos found for this place.'
          }
        ]
      };
    }

    const photoList = photos.map((photo, index) => 
      `${index + 1}. **Size:** ${photo.width}x${photo.height}\n` +
      `   **URL:** ${photo.prefix}original${photo.suffix}\n` +
      `   **Categories:** ${photo.categories?.join(', ') || 'No categories'}\n`
    ).join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${photos.length} photos:\n\n${photoList}`
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Foursquare MCP server running on stdio');
  }
}

const server = new FoursquareMCPServer();
server.run().catch(console.error);
