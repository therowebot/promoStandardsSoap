# PromoStandards SOAP Client - Implementation Plan

## Project Overview

This project provides a JavaScript/Node.js client library for PromoStandards SOAP/XML services with a clean JSON interface. The library is designed to:

1. **Use OneSource** to discover SOAP endpoints for PromoStandards suppliers (✅ IMPLEMENTED)
2. **Call SOAP services** using discovered or manually-provided endpoints
3. **Parse PromoStandards data** from XML to JSON automatically

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PromoStandardsClient                          │
│  - Unified entry point for all services                         │
│  - Manages shared authentication                                │
│  - Auto-initializes services                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│InventoryService │  │ProductDataService│  │ Other Services  │
│   (v1.2.1, 2.0) │  │   (v1.0, 2.0)   │  │   (pending)     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │   BaseService   │
                    │  - Auth inject  │
                    │  - Caching      │
                    │  - Validation   │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   SoapClient    │
                    │  - WSDL parsing │
                    │  - SOAP calls   │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  XmlConverter   │
                    │  - XML ↔ JSON   │
                    │  - Type coerce  │
                    └─────────────────┘
```

## File Structure

```
promostandards-js/
├── package.json
├── jest.config.js
├── src/
│   ├── index.js                 # Main exports
│   ├── client.js                # PromoStandardsClient class
│   ├── core/
│   │   ├── auth.js              # PromoStandardsAuth - credential management
│   │   ├── base-service.js      # BaseService - abstract service class
│   │   ├── soap-client.js       # SoapClient - SOAP wrapper
│   │   ├── xml-converter.js     # XmlConverter - XML/JSON conversion
│   │   ├── errors.js            # Custom error classes
│   │   └── onesource-client.js  # OneSource integration ✅
│   └── services/
│       ├── inventory/
│       │   └── inventory-service.js           ✅
│       ├── product-data/
│       │   └── product-data-service.js        ✅
│       ├── invoice/
│       │   └── invoice-service.js             ✅
│       ├── order-status/
│       │   └── order-status-service.js        ✅
│       ├── order-shipment/
│       │   └── order-shipment-service.js      ✅
│       ├── purchase-order/
│       │   └── purchase-order-service.js      ✅
│       ├── pricing-config/
│       │   └── pricing-config-service.js      ✅
│       ├── product-media/
│       │   └── product-media-service.js       ✅
│       ├── product-compliance/
│       │   └── product-compliance-service.js  ✅
│       ├── company-data/
│       │   └── company-data-service.js        ✅
│       └── remittance-advice/
│           └── remittance-advice-service.js   ✅
├── examples/
│   └── basic-usage.js
└── tests/
    ├── xml-converter.test.js
    ├── auth.test.js                    # TO BE CREATED
    ├── inventory-service.test.js       # TO BE CREATED
    └── integration/                    # TO BE CREATED
```

## Current Implementation Status

### Completed ✅
- [x] Core infrastructure (SoapClient, XmlConverter, BaseService)
- [x] Authentication handling (PromoStandardsAuth)
- [x] Error classes (PromoStandardsError, ValidationError, etc.)
- [x] **OneSource Integration** (OneSourceClient for endpoint discovery)
- [x] InventoryService (v1.2.1, v2.0.0)
- [x] ProductDataService (v1.0.0, v2.0.0)
- [x] Order Status Service (v1.0.0, v2.0.0)
- [x] Order Shipment Notification Service (v1.0.0, v2.0.0, v2.1.0)
- [x] Invoice Service (v1.0.0)
- [x] Pricing & Configuration Service (v1.0.0, v2.0.0)
- [x] Product Media Service (v1.0.0, v1.1.0)
- [x] Purchase Order Service (v1.0.0, v2.0.0)
- [x] Product Compliance Service (v1.0.0)
- [x] Company Data Service (v1.0.0)
- [x] Remittance Advice Service (v1.0.0)
- [x] Basic XML converter tests
- [x] Bug fixes (toXmlCase, response validators)

### Still Needed
- [ ] TypeScript definitions
- [ ] Integration tests with mocked SOAP responses
- [ ] End-to-end tests with real endpoints
- [ ] Additional unit tests for all services

## Bugs Fixed ✅

### 1. xml-converter.js - toXmlCase method (FIXED)
**File:** `src/core/xml-converter.js`
**Issue:** The replace function returned the same character, doing nothing.
**Fix:** Simplified to just capitalize first letter.

### 2. Response validators (FIXED)
**Files:** `inventory-service.js`, `product-data-service.js`
**Issue:** Validators checked for PascalCase keys that didn't exist after normalization.
**Fix:** Updated validators to only check camelCase keys.

### 3. Redundant version check in inventory-service.js (FIXED)
**Issue:** Both version branches had identical code.
**Fix:** Removed redundant conditional.

## Original Bug Details (for reference)

### 1. xml-converter.js - toXmlCase method was a no-op
```javascript
// Was (broken):
toXmlCase(key) {
  const capitalized = key.charAt(0).toUpperCase() + key.slice(1);
  return capitalized.replace(/[A-Z]/g, (match, offset) =>
    offset > 0 ? match : match  // Did nothing!
  );
}

// Now (fixed):
toXmlCase(key) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}
```

### 2. Response validators checked wrong case
```javascript
// Current:
if (!response.Inventory && !response.inventory) { ... }

// Should be:
if (!response.inventory) { ... }
```

### 3. Redundant version check in inventory-service.js
**File:** `src/services/inventory/inventory-service.js:12-22`
**Issue:** Both version branches set identical operation mappings.

## OneSource Integration Design

OneSource is a discovery service that provides SOAP endpoint URLs for PromoStandards suppliers. The integration should:

### OneSourceClient Class
```javascript
class OneSourceClient {
  constructor(options) {
    this.apiUrl = options.apiUrl || 'https://onesource.promostandards.org/api';
    this.credentials = options.credentials;
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 3600000; // 1 hour
  }

  // Get all available suppliers
  async getSuppliers() { }

  // Get endpoints for a specific supplier
  async getSupplierEndpoints(supplierId) { }

  // Get endpoint for specific service
  async getServiceEndpoint(supplierId, serviceName, version) { }

  // Search suppliers by name or criteria
  async searchSuppliers(query) { }
}
```

### Integration with PromoStandardsClient
```javascript
const client = new PromoStandardsClient({
  username: 'myuser',
  password: 'mypass',
  onesource: {
    enabled: true,
    apiKey: 'optional-api-key'
  }
});

// Auto-discover endpoints for supplier
const supplier = await client.useSupplier('SanMar');

// Now use services without manually specifying WSDL
const inventory = await supplier.inventory.getInventoryLevels({
  productId: 'ABC123'
});
```

## PromoStandards Services Reference

### 1. Inventory Service
- **Versions:** 1.2.1, 2.0.0
- **Operations:**
  - `getFilterValues` - Get available filter options for a product
  - `getInventoryLevels` - Get inventory quantities with optional filters
- **WSDL:** `documentation/InventoryV2Final-1-1/` and `InventoryService_v1_2_1-1/`

### 2. Product Data Service
- **Versions:** 1.0.0, 2.0.0
- **Operations:**
  - `getProduct` - Get full product details
  - `getProductDateModified` - Get products modified since timestamp
  - `getProductSellable` - Get sellable product info
  - `getProductCloseOut` - Get closeout products (v2.0.0 only)
- **WSDL:** `documentation/ProductData2-0-0-1/` and `ProductData-1-0-0-1-1/`

### 3. Invoice Service
- **Versions:** 1.0.0
- **Operations:**
  - `getInvoices` - Get invoices by date range or invoice number
- **WSDL:** `documentation/Invoice-1.0.0-1/`

### 4. Order Status Service
- **Versions:** 1.0.0, 2.0.0
- **Operations:**
  - `getOrderStatusDetails` - Get detailed order status
  - `getOrderStatusTypes` - Get available status types
- **WSDL:** `documentation/PromoStandards-Order-Status-2.0.0-WSDL-1/`

### 5. Order Shipment Notification (OSN) Service
- **Versions:** 1.0.0, 2.0.0, 2.1.0
- **Operations:**
  - `getOrderShipmentNotification` - Get shipment details for an order
- **WSDL:** `documentation/OSN-1-0-0-1-1/`, `OSN2-0-0-1/`, `promostandards-ordershipmentnotificationv2.1/`

### 6. Purchase Order Service
- **Versions:** 1.0.0
- **Operations:**
  - `sendPO` - Submit a purchase order
  - `getPOSupportedVersions` - Get supported PO versions
- **WSDL:** `documentation/purchaseOrder-1.0.0-1/`

### 7. Pricing & Configuration (PPC) Service
- **Versions:** 1.0.0
- **Operations:**
  - `getConfigurationAndPricing` - Get pricing/config for a product
  - `getAvailableLocations` - Get decoration locations
  - `getAvailableCharges` - Get available charges
  - `getFobPoints` - Get FOB shipping points
- **WSDL:** `documentation/PPC_1_0_0-1/`

### 8. Product Media Service
- **Versions:** 1.1.0
- **Operations:**
  - `getMediaContent` - Get media URLs for a product
  - `getMediaDateModified` - Get products with modified media
- **WSDL:** `documentation/ProductMedia-1-1-0a-1/`

### 9. Product Compliance Service
- **Versions:** 1.0.0
- **Operations:**
  - `getProductComplianceInfo` - Get compliance/safety info
- **WSDL:** `documentation/productCompliance1-0-0-1-1/`

### 10. Company Data Service
- **Versions:** 1.0.0
- **Operations:**
  - `getCompanyInfo` - Get supplier company information
- **WSDL:** `documentation/companydatav1-0-1/`

### 11. Remittance Advice Service
- **Versions:** 1.0.0
- **Operations:**
  - `getRemittanceAdvice` - Get payment remittance details
- **WSDL:** `documentation/remittanceadvicev1-0-1/`

## Implementation Priority

### Phase 1: Bug Fixes (Immediate)
1. Fix `toXmlCase` method
2. Fix response validators
3. Clean up redundant code

### Phase 2: OneSource Integration (High Priority)
1. Research OneSource API documentation
2. Implement OneSourceClient
3. Integrate with PromoStandardsClient
4. Add tests

### Phase 3: Remaining Services (Medium Priority)
1. Order Status Service
2. Order Shipment Notification Service
3. Purchase Order Service
4. Pricing & Configuration Service
5. Invoice Service
6. Product Media Service
7. Product Compliance Service
8. Company Data Service
9. Remittance Advice Service

### Phase 4: Testing & Quality (Ongoing)
1. Unit tests for each service
2. Integration tests with mocked SOAP responses
3. End-to-end tests (with real credentials)
4. TypeScript definitions

## Testing Strategy

### Unit Tests
- Test each service method in isolation
- Mock SoapClient responses
- Test validation logic
- Test error handling

### Integration Tests
- Use `nock` to mock HTTP responses
- Test full request/response flow
- Test authentication injection
- Test caching behavior

### End-to-End Tests
- Requires real PromoStandards credentials
- Test against real supplier endpoints
- Validate response structure against WSDL/XSD schemas

## Environment Variables

```bash
# Authentication
PROMOSTANDARDS_ID=your_username
PROMOSTANDARDS_PASSWORD=your_password
PROMOSTANDARDS_VERSION=2.0.0

# OneSource (when implemented)
ONESOURCE_API_URL=https://onesource.promostandards.org/api
ONESOURCE_API_KEY=optional_api_key

# Debug
DEBUG=promostandards:*
```

## Dependencies

```json
{
  "dependencies": {
    "soap": "^1.0.0",      // SOAP client
    "xml2js": "^0.6.2",    // XML parsing
    "lodash": "^4.17.21",  // Utilities
    "ajv": "^8.12.0",      // JSON schema validation
    "debug": "^4.3.4",     // Debug logging
    "axios": "^1.6.0"      // HTTP client (for OneSource)
  }
}
```

## Notes for Future Development

1. **WSDL files are in `documentation/`** - Use these as the source of truth for operation names, request/response structures, and data types.

2. **Version differences matter** - Each service version may have different operations, request formats, and response structures. Always check WSDL for the specific version.

3. **PromoStandards auth header format:**
   ```xml
   <wsVersion>2.0.0</wsVersion>
   <id>username</id>
   <password>password</password>
   ```

4. **Response normalization** - All XML responses are converted to camelCase JSON with type coercion (strings to numbers/booleans where appropriate).

5. **Caching** - Built-in caching with configurable TTL. Cache key format: `service:version:operation:dataHash`
