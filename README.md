# 🌍 Multi-API MCP Server

Bu proje, **Foursquare Places API** ve **Amadeus Activities API**'lerini kullanan gelişmiş bir Model Context Protocol (MCP) server'ıdır. Claude Desktop ve OpenAI Agent SDK ile entegre edilerek mekan arama, turistik aktivite bulma ve seyahat planlaması işlemlerini gerçekleştirebilirsiniz.

## ✨ Özellikler

### 🏢 **Foursquare Places API**
- **Mekan Arama**: Belirtilen lokasyon yakınında mekanları arayın
- **Mekan Detayları**: Belirli bir mekanın detaylı bilgilerini alın
- **Kategori Filtreleme**: Restoran, kafe, müze gibi kategorilere göre filtreleyin
- **Mesafe Hesaplama**: Konumunuza göre mesafe bilgisi

### 🎯 **Amadeus Activities API**
- **Turistik Aktiviteler**: Şehirlerdeki müze, tur, etkinlik arama
- **Şehir Bazlı Arama**: Belirli şehirlerdeki tüm aktiviteleri listeleyin
- **Fiyat Bilgisi**: Aktivite fiyatları ve rezervasyon linkleri
- **Detaylı Açıklamalar**: HTML temizlenmiş aktivite açıklamaları

### 🔗 **Entegrasyon Seçenekleri**
- **HTTP MCP Server**: OpenAI Agent SDK ile entegrasyon
- **Stdio MCP Server**: Claude Desktop ile direkt entegrasyon
- **REST API Endpoints**: Direkt API erişimi
- **CORS Desteği**: Web uygulamaları için

### 📸 **Fotoğraf Özellikleri** (Şimdilik Devre Dışı)
- ~~**Foursquare Photos API**~~ (Credit tasarrufu için kapalı)
- ~~**Bing Image Scraping**~~ (Yedekte tutuluyor)

## 🌐 Live Demo

**🔗 Production Server:** https://mcp-enuygun-fs.onrender.com

- **Health Check:** https://mcp-enuygun-fs.onrender.com/health
- **MCP Endpoint:** https://mcp-enuygun-fs.onrender.com/mcp
- **API Endpoints:** https://mcp-enuygun-fs.onrender.com/api/

## 🚀 Kurulum

### 1. Proje Kurulumu
```bash
cd /Users/emirarslan/Desktop/mcp
npm install
```

### 2. Environment Variables
`.env` dosyası oluşturun:
```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:
```env
FOURSQUARE_API_KEY="YOUR_FOURSQUARE_API_KEY"
AMADEUS_API_KEY="YOUR_AMADEUS_API_KEY"
AMADEUS_API_SECRET="YOUR_AMADEUS_API_SECRET"
NOMINATIM_USER_AGENT="mcp-server/1.0 (contact: your-email@example.com)"
```

### 3. API Key'lerini Alın
- **Foursquare**: [developer.foursquare.com](https://developer.foursquare.com)
- **Amadeus**: [developers.amadeus.com](https://developers.amadeus.com)

## 🎮 Kullanım

### HTTP MCP Server (Önerilen)
```bash
npm run http
# Server: http://localhost:3000
# MCP Endpoint: http://localhost:3000/mcp
# Health Check: http://localhost:3000/health
```

### Stdio MCP Server (Claude Desktop)
```bash
npm start
```

### Development Mode
```bash
npm run http-dev  # HTTP server with auto-reload
npm run dev       # Stdio server with auto-reload
```

## 🧪 Test Komutları

```bash
# Temel API testleri
npm run test-api      # Foursquare API testi
npm run test-simple   # Kapsamlı HTTP MCP testi

# Özel testler
npm run test-photos   # Foursquare Photos testi (devre dışı)
npm run test-bing     # Bing Image testi (devre dışı)

# MCP Protocol testleri
npm run test-mcp      # Stdio MCP testi
npm run test-http     # HTTP MCP testi
npm run test-agent    # OpenAI Agent SDK testi
```

## 🔧 Claude Desktop Entegrasyonu

`claude_desktop_config.json` dosyasına ekleyin:
```json
{
  "mcpServers": {
    "foursquare-places": {
      "command": "node",
      "args": ["/Users/emirarslan/Desktop/mcp/server.js"],
      "env": {
        "FOURSQUARE_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

## 🤖 OpenAI Agent SDK Entegrasyonu

```javascript
import { Agent, MCPServerStreamableHttp } from '@openai/agents';

// Local development
const mcpServer = new MCPServerStreamableHttp({
  url: 'http://localhost:3000/mcp',
  name: 'Multi-API Travel Server',
});

// Production (Live server)
const mcpServerProd = new MCPServerStreamableHttp({
  url: 'https://mcp-enuygun-fs.onrender.com/mcp',
  name: 'Multi-API Travel Server (Production)',
});

const agent = new Agent({
  name: 'Travel Assistant',
  instructions: 'Use Foursquare and Amadeus APIs for travel planning.',
  mcpServers: [mcpServerProd], // Use mcpServer for local development
});
```

## 🛠️ Available Tools

### Foursquare Tools
- **`search_places`**: Mekan arama
  ```json
  {
    "near": "Istanbul Kadıköy",
    "query": "cafe",
    "limit": 10,
    "categories": "13065" // Optional
  }
  ```

- **`get_place_details`**: Mekan detayları
  ```json
  {
    "fsq_place_id": "4eaec357b8f765aba1e03d9e"
  }
  ```

### Amadeus Tools
- **`search_activities`**: Aktivite arama
  ```json
  {
    "city": "Istanbul",
    "type": "museum",
    "limit": 10
  }
  ```

- **`get_city_activities`**: Şehir aktiviteleri
  ```json
  {
    "city": "Cappadocia",
    "limit": 20
  }
  ```

## 🌐 REST API Endpoints

### Foursquare Endpoints
```bash
# Local
GET http://localhost:3000/api/search?near=Istanbul&query=cafe&limit=5
GET http://localhost:3000/api/place/:fsq_place_id
GET http://localhost:3000/api/photos/:fsq_place_id?limit=10

# Production
GET https://mcp-enuygun-fs.onrender.com/api/search?near=Istanbul&query=cafe&limit=5
GET https://mcp-enuygun-fs.onrender.com/api/place/:fsq_place_id
GET https://mcp-enuygun-fs.onrender.com/api/photos/:fsq_place_id?limit=10
```

### Amadeus Endpoints
```bash
# Local
GET http://localhost:3000/api/activities?city=Istanbul&type=museum&limit=5

# Production
GET https://mcp-enuygun-fs.onrender.com/api/activities?city=Istanbul&type=museum&limit=5
```

### System Endpoints
```bash
# Local
GET http://localhost:3000/health           # Health check
POST http://localhost:3000/mcp            # MCP protocol endpoint

# Production
GET https://mcp-enuygun-fs.onrender.com/health           # Health check
POST https://mcp-enuygun-fs.onrender.com/mcp            # MCP protocol endpoint
```

## 📸 Fotoğraf Özelliklerini Aktifleştirme

### Foursquare Photos API'yi Açmak İçin:
1. `http-server.js` dosyasında şu satırları bulun:
   ```javascript
   // === FOURSQUARE PHOTOS API (DISABLED) ===
   // Uncomment the methods below to re-enable Foursquare Photos API
   /*
   ```

2. `/*` ve `*/` işaretlerini kaldırın

3. Bu satırı aktifleştirin:
   ```javascript
   // formattedResults = await this.enhanceWithFoursquarePhotos(formattedResults);
   ```

4. Bu satırı değiştirin:
   ```javascript
   `   📸 Photo feature temporarily disabled\n` +
   // Şu hale getirin:
   `   📸 ${place.foursquarePhoto || 'No photo available'}\n` +
   ```

### Bing Image Scraping'i Açmak İçin:
1. `http-server.js` dosyasında şu bölümü bulun:
   ```javascript
   // === BING IMAGE SCRAPING METHODS (DISABLED) ===
   /*
   ```

2. `/*` ve `*/` işaretlerini kaldırın

3. `searchPlaces` method'unda şu satırı aktifleştirin:
   ```javascript
   // formattedResults = await this.enhanceWithImages(formattedResults, (place) => {
   //   return `${place.name} ${near}`;
   // });
   ```

## 🚨 Sorun Giderme

### Yaygın Hatalar
1. **Server çalışmıyor**: Node.js sürümünüzün 18+ olduğunu kontrol edin
2. **API hataları**: API anahtarlarınızın geçerli olduğunu kontrol edin
3. **429 Hatası**: API credit'iniz bitmiş olabilir - billing sayfasından kontrol edin
4. **Port çakışması**: `PORT=3001 npm run http` ile farklı port kullanın
5. **CORS hataları**: Server'ın CORS middleware'i aktif olduğunu kontrol edin

### Debug Modları
```bash
# Detaylı loglar için
DEBUG=* npm run http

# Sadece API logları
DEBUG=api npm run http
```

### API Limitleri
- **Foursquare**: Günlük 1000 istek (Free tier)
- **Amadeus**: Aylık 1000 istek (Test environment)
- **Nominatim**: Saniyede 1 istek (Rate limiting)

## 📁 Proje Yapısı

```
mcp/
├── server.js                 # Stdio MCP server
├── http-server.js           # HTTP MCP server (Ana dosya)
├── test-api.js              # API testleri
├── test-simple.js           # Kapsamlı testler
├── test-foursquare-photos.js # Fotoğraf testleri
├── test-bing-images.js      # Bing image testleri
├── claude_desktop_config.json # Claude Desktop config
├── .env.example             # Environment variables template
├── package.json             # Dependencies ve scripts
└── README.md               # Bu dosya
```

## 🔄 Deployment

### Railway
```bash
railway login
railway init
railway deploy
```

### Render
1. GitHub repo'yu bağlayın
2. Build command: `npm install`
3. Start command: `npm start`
4. Environment variables'ları ekleyin

### ngrok (Local testing)
```bash
ngrok http 3000
# Public URL: https://xxx.ngrok-free.dev/mcp
```

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

MIT License - Detaylar için `LICENSE` dosyasına bakın.

## 🙏 Teşekkürler

- [Foursquare Places API](https://developer.foursquare.com)
- [Amadeus for Developers](https://developers.amadeus.com)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [OpenAI Agent SDK](https://github.com/openai/agents-sdk)

---

**🚀 Happy Coding!** Bu server ile seyahat planlaması artık çok daha kolay!