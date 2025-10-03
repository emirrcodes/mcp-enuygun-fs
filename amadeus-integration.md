# Amadeus Activities MCP Server Integration

## Files Generated
- `amadeus-server.js` - Main Amadeus activities server
- `test-amadeus.js` - Comprehensive test script

## Integration Steps

### 1. Copy Files
Copy the generated files to your MCP project directory.

### 2. Add Scripts to package.json
Add these scripts to your existing `package.json`:

```json
"scripts": {
  "amadeus": "node amadeus-server.js",
  "amadeus-dev": "nodemon amadeus-server.js", 
  "test-amadeus": "node test-amadeus.js"
}
```

### 3. Environment Variables (Optional)
Create a `.env` file or set environment variables:

```bash
# Amadeus API Credentials (optional - defaults are included)
AMADEUS_API_KEY=your_amadeus_api_key
AMADEUS_API_SECRET=your_amadeus_api_secret

# Nominatim User Agent (optional)
NOMINATIM_USER_AGENT=your-app/1.0 (contact@example.com)
```

### 4. Test the Server
```bash
# Start the server
npm run amadeus

# In another terminal, run tests
npm run test-amadeus
```

### 5. Deploy to Production
The server runs on port 3001 by default to avoid conflicts with the Foursquare server.

## Tools Available

### 1. `search_activities`
Search for specific types of activities in a city.

**Parameters:**
- `city` (required): City name (e.g., "Istanbul", "Antalya", "Cappadocia")
- `type` (optional): Activity type (e.g., "museum", "restaurant", "tour", "boat") 
- `limit` (optional): Max results (1-50, default: 10)

**Example:**
```javascript
{
  name: "search_activities",
  arguments: {
    city: "Istanbul",
    type: "museum", 
    limit: 5
  }
}
```

### 2. `get_city_activities`
Get all available activities in a city without type filtering.

**Parameters:**
- `city` (required): City name
- `limit` (optional): Max results (1-50, default: 20)

**Example:**
```javascript
{
  name: "get_city_activities",
  arguments: {
    city: "Antalya",
    limit: 10
  }
}
```

## API Integration Details

### Amadeus API
- **Authentication**: OAuth2 Client Credentials flow
- **Endpoint**: `/v1/shopping/activities/by-square`
- **Rate Limiting**: Managed by automatic token refresh

### Nominatim (OpenStreetMap)
- **Purpose**: Convert city names to geographic coordinates
- **No API key required**
- **Rate Limiting**: Respectful delays built-in

## OpenAI Agent SDK Usage

```javascript
const amadeusServer = new MCPServerStreamableHttp({
  url: 'https://your-domain.com/mcp',  // Your deployed URL
  name: 'Amadeus Activities Server',
});

const agent = new Agent({
  name: 'Travel Assistant',
  instructions: `You help users find activities and attractions in cities using the Amadeus API.
  Use search_activities to find specific types of activities.
  Use get_city_activities to get a general overview of what's available.`,
  mcpServers: [amadeusServer],
});
```

## Response Format

Each activity includes:
- **name**: Activity name
- **link**: Booking/information URL
- **price**: Amount and currency (if available)
- **image**: Photo URL (if available) 
- **description**: HTML-cleaned description

## Error Handling

The server handles:
- Invalid city names (Nominatim lookup failures)
- Amadeus API authentication errors
- Rate limiting and token expiry
- Network timeouts
- Malformed requests

## Configuration

### Port Configuration
Default port is 3001. Change via environment variable:
```bash
PORT=4000 node amadeus-server.js
```

### API Credentials
Update the constants in `amadeus-server.js` or use environment variables:
```javascript
const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY || "your_key";
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET || "your_secret";
```

## Direct API Access (Optional)

For testing, you can also access the API directly:
```
GET /api/activities?city=Istanbul&type=museum&limit=5
```

## Troubleshooting

### Common Issues:
1. **401 Unauthorized**: Check Amadeus API credentials
2. **Location not found**: Verify city name spelling
3. **No activities found**: Try different city or activity type
4. **Port conflict**: Change PORT environment variable

### Debug Logs:
The server logs all API calls and responses for debugging.

## Production Deployment

1. **Environment Variables**: Set API credentials
2. **Process Management**: Use PM2 or similar
3. **Reverse Proxy**: Configure nginx/Apache if needed
4. **Monitoring**: Monitor API quotas and response times

The server is production-ready and follows the same patterns as the Foursquare MCP server.
