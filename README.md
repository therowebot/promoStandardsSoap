# PromoStandards JavaScript Client

A comprehensive JavaScript/Node.js client library for PromoStandards SOAP/XML services with a clean JSON interface. This library handles all XML/JSON conversions transparently, making it easy to integrate with PromoStandards-compliant servers.

## Features

- 🔄 **Automatic XML/JSON conversion** - Work with familiar JSON objects
- 🏭 **All PromoStandards services** - Support for all 11 standard services
- 🔐 **Built-in authentication** - PromoStandards authentication handling
- 📦 **TypeScript support** - Full type definitions (coming soon)
- 💾 **Response caching** - Optional caching for better performance
- 🛡️ **Comprehensive error handling** - Detailed error messages and types
- 🚀 **Modern async/await API** - Clean, promise-based interface

## Installation

```bash
npm install promostandards
```

## Quick Start

```javascript
const PromoStandards = require('promostandards');

// Create a service instance
const inventory = new PromoStandards.InventoryService({
  wsdl: 'https://vendor.com/inventory/wsdl',
  username: 'myuser',
  password: 'mypass',
  version: '2.0.0'
});

// Make requests with JSON
const result = await inventory.getInventoryLevels({
  productId: 'ABC123',
  filters: {
    colors: ['Red', 'Blue'],
    sizes: ['M', 'L', 'XL']
  }
});

console.log(result); // JSON response
```

## Supported Services

| Service | Versions | Status |
|---------|----------|--------|
| Inventory Service | 1.2.1, 2.0.0 | ✅ Implemented |
| Product Data | 1.0.0, 2.0.0 | ✅ Implemented |
| Invoice | 1.0.0 | 🚧 In Progress |
| Order Status | 1.0.0, 2.0.0 | 🚧 In Progress |
| Order Shipment Notification | 1.0.0, 2.0.0, 2.1.0 | 🚧 In Progress |
| Purchase Order | 1.0.0 | 🚧 In Progress |
| Pricing & Configuration | 1.0.0 | 🚧 In Progress |
| Product Media | 1.1.0 | 🚧 In Progress |
| Product Compliance | 1.0.0 | 🚧 In Progress |
| Company Data | 1.0.0 | 🚧 In Progress |
| Remittance Advice | 1.0.0 | 🚧 In Progress |

## Usage Examples

### Direct Service Usage

```javascript
const { InventoryService } = require('promostandards');

const inventory = new InventoryService({
  wsdl: 'https://vendor.com/inventory/wsdl',
  username: 'myuser',
  password: 'mypass',
  version: '2.0.0'
});

// Get inventory levels
const levels = await inventory.getInventoryLevels({
  productId: 'ABC123',
  filters: {
    partIds: ['PART-001', 'PART-002']
  }
});

// Get filter values
const filters = await inventory.getFilterValues({
  productId: 'ABC123'
});
```

### Unified Client

```javascript
const { PromoStandardsClient } = require('promostandards');

const client = new PromoStandardsClient({
  username: 'myuser',
  password: 'mypass',
  autoInitialize: true,
  services: {
    inventory: {
      wsdl: 'https://vendor.com/inventory/wsdl',
      version: '2.0.0'
    },
    productData: {
      wsdl: 'https://vendor.com/product/wsdl',
      version: '2.0.0'
    }
  }
});

// Use multiple services with shared auth
const inventory = await client.inventory.getInventoryLevels({ productId: 'ABC123' });
const product = await client.productData.getProduct({ productId: 'ABC123' });
```

### Environment Variables

```javascript
// Set environment variables:
// PROMOSTANDARDS_ID=myuser
// PROMOSTANDARDS_PASSWORD=mypass
// PROMOSTANDARDS_VERSION=2.0.0

const { PromoStandardsClient } = require('promostandards');

// Client automatically uses environment auth
const client = new PromoStandardsClient();
```

### Quick One-off Calls

```javascript
const { PromoStandardsClient } = require('promostandards');

const result = await PromoStandardsClient.quickCall({
  service: 'inventory',
  operation: 'getInventoryLevels',
  wsdl: 'https://vendor.com/inventory/wsdl',
  username: 'myuser',
  password: 'mypass',
  version: '2.0.0',
  data: {
    productId: 'ABC123'
  }
});
```

## Error Handling

```javascript
const { ValidationError, AuthenticationError } = require('promostandards');

try {
  await inventory.getInventoryLevels({ /* missing productId */ });
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.message);
    console.log('Details:', error.details);
  } else if (error instanceof AuthenticationError) {
    console.log('Auth failed:', error.message);
  }
}
```

## Configuration Options

```javascript
{
  // Required
  wsdl: 'https://vendor.com/service/wsdl',     // WSDL URL
  username: 'myuser',                           // PromoStandards ID
  password: 'mypass',                           // PromoStandards password
  
  // Optional
  version: '2.0.0',                             // Service version
  endpoint: 'https://vendor.com/service',       // Override SOAP endpoint
  timeout: 30000,                               // Request timeout (ms)
  cache: cacheInstance,                         // Cache instance
  cacheTTL: 300000,                             // Cache TTL (ms)
  headers: { 'X-Custom': 'value' }              // Custom HTTP headers
}
```

## Caching

```javascript
// Implement a simple cache
const cache = new Map();

const inventory = new InventoryService({
  wsdl: 'https://vendor.com/inventory/wsdl',
  username: 'myuser',
  password: 'mypass',
  cache: {
    get: async (key) => cache.get(key),
    set: async (key, value) => cache.set(key, value),
    delete: async (key) => cache.delete(key)
  },
  cacheTTL: 600000 // 10 minutes
});
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT