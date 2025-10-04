#!/usr/bin/env node

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// Foursquare API Configuration
const API_KEY = process.env.FOURSQUARE_API_KEY || "VAIBONJPWHIA3LZVS41H1YJX2XNZM5HTLKPBC30KCCHHO24P";
const API_BASE_URL = "https://places-api.foursquare.com/places";
const API_VERSION = "2025-06-17";

// Amadeus API Configuration
const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY || "cHLsOr3SiGhAZsoEc3ubeAep9apsGqBa";
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET || "CryAkOZZYTB82Mhc";
const AMADEUS_BASE_URL = "https://test.api.amadeus.com";
const AMADEUS_TOKEN_URL = `${AMADEUS_BASE_URL}/v1/security/oauth2/token`;
const NOMINATIM_USER_AGENT = process.env.NOMINATIM_USER_AGENT || "mcp-server/1.0 (contact: admin@example.com)";

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
    
    // Amadeus token management
    this.amadeusAccessToken = null;
    this.amadeusTokenExpiry = null;
    
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
                name: 'foursquare-places-server',
                version: '1.0.0'
              }
            };
            break;
            
          case 'notifications/initialized':
            // Client initialization notification - just acknowledge
            res.json({
              jsonrpc: '2.0',
              id
            });
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

    // Amadeus API endpoints
    this.app.get('/api/activities', async (req, res) => {
      try {
        const { city = 'Istanbul', type = 'museum', limit = 10 } = req.query;
        const result = await this.searchActivities({ city, type, limit: parseInt(limit) });
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
        // Foursquare Tools
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
        },
        // Amadeus Tools
        {
          name: 'search_activities',
          description: 'Search for activities and attractions in a city using Amadeus API',
          inputSchema: {
            type: 'object',
            properties: {
              city: {
                type: 'string',
                description: 'City name to search activities in (e.g., "Istanbul", "Paris", "New York")',
                default: 'Istanbul'
              },
              type: {
                type: 'string',
                description: 'Type of activity to search for (e.g., "museum", "restaurant", "tour", "boat", "food")',
                default: 'museum'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of activities to return (1-50)',
                default: 10,
                minimum: 1,
                maximum: 50
              }
            },
            required: ['city']
          }
        },
        {
          name: 'get_city_activities',
          description: 'Get all available activities in a specific city without filtering',
          inputSchema: {
            type: 'object',
            properties: {
              city: {
                type: 'string',
                description: 'City name (e.g., "Istanbul", "Antalya", "Cappadocia")',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of activities to return',
                default: 20,
                minimum: 1,
                maximum: 50
              }
            },
            required: ['city']
          }
        }
      ]
    };
  }

  async handleCallTool(params) {
    const { name, arguments: args } = params;

    switch (name) {
      // Foursquare Tools
      case 'search_places':
        return await this.searchPlaces(args);
      case 'get_place_details':
        return await this.getPlaceDetails(args);
      // Amadeus Tools  
      case 'search_activities':
        return await this.searchActivities(args);
      case 'get_city_activities':
        return await this.getCityActivities(args);
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

    // console.log(`🌍 [FOURSQUARE API] Making request to: ${url.toString()}`);
    // console.log(`🔑 Using API Key: ${API_KEY.substring(0, 10)}...`);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Places-Api-Version': API_VERSION,
      },
    });

    // console.log(`📡 [FOURSQUARE API] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ [FOURSQUARE API] Error: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ [FOURSQUARE API] ${endpoint} - Found ${data.results?.length || 'N/A'} results`);
    
    return data;
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
    let formattedResults = results.map(place => ({
      fsq_place_id: place.fsq_place_id,
      name: place.name,
      address: place.location?.formatted_address || place.location?.country || 'Address not available',
      categories: place.categories?.map(cat => cat.name).join(', ') || 'No categories',
      distance: place.distance ? `${place.distance}m` : 'Distance unknown',
      latitude: place.latitude || 'No lat',
      longitude: place.longitude || 'No lng',
      link: place.link || 'No link'
    }));

    // Enhance with Foursquare Photos API (DISABLED)
    // Uncomment the line below to re-enable Foursquare Photos
    // formattedResults = await this.enhanceWithFoursquarePhotos(formattedResults);

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
                  `   📸 Photo feature temporarily disabled\n` +
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

  // === AMADEUS API METHODS ===

  async getAmadeusToken() {
    // Check if we have a valid token
    if (this.amadeusAccessToken && this.amadeusTokenExpiry && Date.now() < this.amadeusTokenExpiry) {
      return this.amadeusAccessToken;
    }

    console.log('🔑 [AMADEUS] Getting new access token...');
    
    const response = await fetch(AMADEUS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: AMADEUS_API_KEY,
        client_secret: AMADEUS_API_SECRET
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Amadeus OAuth failed: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();
    this.amadeusAccessToken = tokenData.access_token;
    this.amadeusTokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000; // 1 minute buffer
    
    console.log('✅ [AMADEUS] Access token obtained');
    return this.amadeusAccessToken;
  }

  async getNominatimBoundingBox(city) {
    console.log(`🗺️ [NOMINATIM] Getting coordinates for: ${city}`);
    
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.append('q', city);
    url.searchParams.append('format', 'json');
    url.searchParams.append('addressdetails', '1');
    url.searchParams.append('limit', '1');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API failed: ${response.status}`);
    }

    const results = await response.json();
    if (!results || results.length === 0) {
      throw new Error(`No location found for: ${city}`);
    }

    const boundingbox = results[0].boundingbox;
    // Nominatim returns: [south, north, west, east]
    const south = parseFloat(boundingbox[0]);
    const north = parseFloat(boundingbox[1]);
    const west = parseFloat(boundingbox[2]);
    const east = parseFloat(boundingbox[3]);

    console.log(`✅ [NOMINATIM] Coordinates found: N:${north}, W:${west}, S:${south}, E:${east}`);
    return { north, west, south, east };
  }

  async getActivitiesBySquare(accessToken, north, west, south, east) {
    const url = new URL(`${AMADEUS_BASE_URL}/v1/shopping/activities/by-square`);
    url.searchParams.append('north', north.toString());
    url.searchParams.append('west', west.toString());
    url.searchParams.append('south', south.toString());
    url.searchParams.append('east', east.toString());
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Amadeus activities API failed: ${response.status} ${errorText}`);
    }

    return await response.json();
  }

  htmlToText(html, maxLen = 180) {
    if (!html) return '';
    
    // Remove HTML tags
    let text = html.replace(/<[^>]+>/g, ' ');
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    if (text.length > maxLen) {
      return text.substring(0, maxLen - 1).trim() + '…';
    }
    return text;
  }

  filterActivities(items, activityType) {
    if (!activityType) return items;
    
    const query = activityType.toLowerCase();
    return items.filter(item => {
      const name = (item.name || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      const categories = (item.classifications || [])
        .map(c => (c.category?.code || '').toLowerCase())
        .join(' ');
      
      const searchText = `${name} ${description} ${categories}`;
      return searchText.includes(query);
    });
  }

  mapActivity(item) {
    const price = item.price || {};
    const pictures = item.pictures || [];
    
    return {
      name: item.name,
      link: item.bookingLink || item.self?.href,
      price: {
        amount: price.amount,
        currency: price.currencyCode
      },
      image: pictures[0] || null,
      description: this.htmlToText(item.description || '', 300)
    };
  }

  async searchActivities(args) {
    const { city = 'Istanbul', type = 'museum', limit = 10 } = args;

    try {
      // Get access token
      const accessToken = await this.getAmadeusToken();
      
      // Get city coordinates
      const { north, west, south, east } = await this.getNominatimBoundingBox(city);
      
      // Get activities
      const activitiesResponse = await this.getActivitiesBySquare(accessToken, north, west, south, east);
      let items = activitiesResponse.data || [];
      
      // Filter by type
      items = this.filterActivities(items, type);
      
      // Apply limit
      if (limit && limit > 0) {
        items = items.slice(0, limit);
      }

      // Map to our format
      const activities = items.map(item => this.mapActivity(item));

      console.log(`✅ [AMADEUS] Found ${activities.length} activities for "${type}" in ${city}`);

      return {
        content: [
          {
            type: 'text',
            text: `Found ${activities.length} ${type} activities in ${city}:\n\n` +
                  activities.map((activity, index) => 
                    `${index + 1}. **${activity.name}**\n` +
                    `   🔗 ${activity.link || 'No booking link'}\n` +
                    `   💰 ${activity.price.amount ? `${activity.price.amount} ${activity.price.currency}` : 'Price not available'}\n` +
                    `   📸 ${activity.image || 'No image'}\n` +
                    `   📝 ${activity.description || 'No description'}\n`
                  ).join('\n')
          }
        ]
      };

    } catch (error) {
      console.error(`❌ [AMADEUS] Error searching activities: ${error.message}`);
      throw error;
    }
  }

  async getCityActivities(args) {
    const { city, limit = 20 } = args;
    
    // Use searchActivities without type filter
    return await this.searchActivities({ city, type: '', limit });
  }

  // === BING IMAGE SCRAPING METHODS (DISABLED) ===
  // Uncomment the methods below to re-enable Bing image scraping

  /*
  async getBingImageUrl(searchTerm, count = 1) {
    if (!searchTerm || searchTerm.trim() === '') {
      return null;
    }

    try {
      console.log(`🖼️ [BING] Searching images for: ${searchTerm}`);
      
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };

      const url = `https://www.bing.com/images/search?q=${encodeURIComponent(searchTerm)}&first=1`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        console.log(`❌ [BING] Request failed: ${response.status}`);
        return null;
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      
      const imageUrls = [];
      
      // Find all image containers with 'iusc' class
      $('a.iusc').each((index, element) => {
        if (imageUrls.length >= count) return false; // Break loop
        
        const mAttribute = $(element).attr('m');
        if (mAttribute) {
          try {
            const data = JSON.parse(mAttribute);
            const imageUrl = data.murl; // Original image URL
            if (imageUrl) {
              imageUrls.push(imageUrl);
            }
          } catch (parseError) {
            // Ignore JSON parse errors
          }
        }
      });

      console.log(`✅ [BING] Found ${imageUrls.length} images for "${searchTerm}"`);
      return imageUrls.length > 0 ? imageUrls[0] : null; // Return first image

    } catch (error) {
      console.error(`❌ [BING] Error fetching images: ${error.message}`);
      return null;
    }
  }

  async enhanceWithImages(items, nameExtractor) {
    // Enhance results with Bing images
    const enhancedItems = [];
    
    for (const item of items) {
      const searchTerm = nameExtractor(item);
      const imageUrl = await this.getBingImageUrl(searchTerm, 1);
      
      enhancedItems.push({
        ...item,
        bingImage: imageUrl
      });
      
      // Small delay to be respectful to Bing
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return enhancedItems;
  }
  */

  // === FOURSQUARE PHOTOS API (DISABLED) ===
  // Uncomment the methods below to re-enable Foursquare Photos API

  /*
  async getPlacePhotos(fsq_place_id, limit = 1) {
    try {
      console.log(`📸 [FOURSQUARE PHOTOS] Getting photos for place: ${fsq_place_id}`);
      
      const url = `${API_BASE_URL}/${fsq_place_id}/photos?limit=${limit}&sort=popular`;
      console.log(`🔗 [FOURSQUARE PHOTOS] Request URL: ${url}`);
      console.log(`🔑 [FOURSQUARE PHOTOS] API Key: ${API_KEY.substring(0, 10)}...`);
      console.log(`📅 [FOURSQUARE PHOTOS] API Version: ${API_VERSION}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'X-Places-Api-Version': API_VERSION,
        },
      });

      console.log(`📊 [FOURSQUARE PHOTOS] Response Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ [FOURSQUARE PHOTOS] Request failed: ${response.status}`);
        console.log(`❌ [FOURSQUARE PHOTOS] Error Response: ${errorText}`);
        
        // Check if it's a credit/billing issue
        if (response.status === 429) {
          console.log(`💳 [FOURSQUARE PHOTOS] Rate limit or credit issue detected`);
        }
        
        return null;
      }

      const photos = await response.json();
      console.log(`📸 [FOURSQUARE PHOTOS] Raw response:`, JSON.stringify(photos, null, 2));
      
      if (!photos || photos.length === 0) {
        console.log(`📸 [FOURSQUARE PHOTOS] No photos found for place: ${fsq_place_id}`);
        return null;
      }

      // Get first photo and assemble URL
      const firstPhoto = photos[0];
      const photoUrl = `${firstPhoto.prefix}original${firstPhoto.suffix}`;
      
      console.log(`✅ [FOURSQUARE PHOTOS] Found photo: ${photoUrl}`);
      return photoUrl;

    } catch (error) {
      console.error(`❌ [FOURSQUARE PHOTOS] Error: ${error.message}`);
      console.error(`❌ [FOURSQUARE PHOTOS] Stack: ${error.stack}`);
      return null;
    }
  }

  async enhanceWithFoursquarePhotos(places) {
    // Enhance places with Foursquare Photos API
    const enhancedPlaces = [];
    
    for (const place of places) {
      const photoUrl = await this.getPlacePhotos(place.fsq_place_id, 1);
      
      enhancedPlaces.push({
        ...place,
        foursquarePhoto: photoUrl
      });
      
      // Small delay to be respectful to API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return enhancedPlaces;
  }
  */

  async start(port = 3000) {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`🚀 Multi-API MCP HTTP Server running on http://localhost:${port}`);
        console.log(`📋 Health check: http://localhost:${port}/health`);
        console.log(`🔌 MCP endpoint: http://localhost:${port}/mcp`);
        console.log(`🧪 Foursquare API: http://localhost:${port}/api/search?near=Antalya&query=restaurant`);
        console.log(`🎭 Amadeus API: http://localhost:${port}/api/activities?city=Istanbul&type=museum`);
        console.log(`📊 Available tools: search_places, get_place_details, search_activities, get_city_activities`);
        resolve();
      });
    });
  }
}

// Start server
const server = new FoursquareHTTPServer();
const port = process.env.PORT || 3000;
server.start(port).catch(console.error);
