# Foursquare Places MCP Server

Bu proje, Foursquare Places API'sini kullanan bir Model Context Protocol (MCP) server'ıdır. Claude Desktop ile entegre edilerek mekan arama, detay görüntüleme ve fotoğraf listeleme işlemlerini gerçekleştirebilirsiniz.

## Özellikler

- **Mekan Arama**: Belirtilen lokasyon yakınında mekanları arayın
- **Mekan Detayları**: Belirli bir mekanın detaylı bilgilerini alın
- **Mekan Fotoğrafları**: Mekanların fotoğraflarını listeleyin

## Kurulum

1. Proje klasörüne gidin:
```bash
cd /Users/emirarslan/Desktop/mcp
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

## Claude Desktop Konfigürasyonu

Claude Desktop'ınızın ayarlar dosyasını (`claude_desktop_config.json`) açın ve şu konfigürasyonu ekleyin:

```json
{
  "mcpServers": {
    "foursquare-places": {
      "command": "node",
      "args": ["/Users/emirarslan/Desktop/mcp/server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**macOS için config dosyası konumu:**
`~/Library/Application Support/Claude/claude_desktop_config.json`

**Alternatif olarak**, bu repo'daki `claude_desktop_config.json` dosyasını yukarıdaki konuma kopyalayabilirsiniz.

## Kullanım

Claude Desktop'ı yeniden başlattıktan sonra aşağıdaki araçlar kullanılabilir olacaktır:

### 1. Mekan Arama (`search_places`)
```
Antalya'da bazaar ara
```
veya
```
İstanbul'da restaurant ara, 5 sonuç getir
```

### 2. Mekan Detayları (`get_place_details`)
```
Bu mekanın detaylarını göster: [fsq_id]
```

### 3. Mekan Fotoğrafları (`get_place_photos`)
```
Bu mekanın fotoğraflarını göster: [fsq_id]
```

## API Anahtarı

Server şu anda sabit kodlanmış bir Foursquare API anahtarı kullanıyor. Prodüksiyon kullanımı için:

1. `server.js` dosyasındaki `API_KEY` değişkenini kendi API anahtarınızla değiştirin
2. Alternatif olarak, environment variable kullanın:
```javascript
const API_KEY = process.env.FOURSQUARE_API_KEY || "YOUR_API_KEY_HERE";
```

## Geliştirme

Development modunda çalıştırmak için:
```bash
npm run dev
```

## Test

Server'ı manuel olarak test etmek için:
```bash
npm start
```

Server başlatıldıktan sonra stdio üzerinden MCP protokolü ile iletişim kuracaktır.

## Sorun Giderme

1. **Server çalışmıyor**: Node.js sürümünüzün 18+ olduğunu kontrol edin
2. **API hataları**: Foursquare API anahtarınızın geçerli olduğunu kontrol edin
3. **Claude Desktop bağlantı sorunu**: Config dosyası yolunun doğru olduğunu ve JSON formatının geçerli olduğunu kontrol edin

## Lisans

MIT
