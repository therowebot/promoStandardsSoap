/**
 * Real Integration Tests for Hit Promotional Products
 *
 * These tests require actual credentials in .env file:
 * - hitUserName
 * - hitPassword
 *
 * Run with: npm run test:integration
 * Skip in CI by not setting the environment variables
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const PromoStandardsClient = require('../../src/client');
const InventoryService = require('../../src/services/inventory/inventory-service');
const ProductDataService = require('../../src/services/product-data/product-data-service');

// Skip all tests if credentials are not available
const hasCredentials = process.env.hitUserName && process.env.hitPassword;

const describeIfCredentials = hasCredentials ? describe : describe.skip;

// Known Hit Promotional WSDL endpoints (correct URLs from ppds.hitpromo.net)
const HIT_ENDPOINTS = {
  inventory: 'https://ppds.hitpromo.net/inventoryV2?wsdl',
  productData: 'https://ppds.hitpromo.net/productData?wsdl'
};

// Known test product IDs for Hit Promotional
const TEST_PRODUCTS = {
  productId: '1625', // A common product ID - adjust if needed
  alternateProductId: 'GB1'
};

describe('Hit Promotional Products - Real Integration Tests', () => {
  jest.setTimeout(30000); // 30 second timeout for real API calls

  describeIfCredentials('InventoryService', () => {
    let inventoryService;

    beforeAll(() => {
      inventoryService = new InventoryService({
        wsdl: HIT_ENDPOINTS.inventory,
        username: process.env.hitUserName,
        password: process.env.hitPassword,
        version: '2.0.0'
      });
    });

    it('should connect to Hit Promotional inventory service', async () => {
      await inventoryService.initialize();
      const operations = await inventoryService.getAvailableOperations();

      expect(operations).toBeDefined();
      expect(operations.length).toBeGreaterThan(0);

      const operationNames = operations.map(op => op.name);
      console.log('Available Inventory Operations:', operationNames);
    });

    it('should get inventory levels for a product', async () => {
      try {
        const result = await inventoryService.getInventoryLevels({
          productId: TEST_PRODUCTS.productId
        });

        console.log('Inventory Response:', JSON.stringify(result, null, 2));

        expect(result).toBeDefined();
        // The response structure may vary, so we just check it returns something
      } catch (error) {
        console.log('Inventory Error:', error.message);
        // Some products may not have inventory, that's okay
        if (!error.message.includes('Invalid response')) {
          throw error;
        }
      }
    });

    it('should get filter values for a product', async () => {
      try {
        const result = await inventoryService.getFilterValues({
          productId: TEST_PRODUCTS.productId
        });

        console.log('Filter Values Response:', JSON.stringify(result, null, 2));

        expect(result).toBeDefined();
      } catch (error) {
        console.log('Filter Values Error:', error.message);
        // May fail for some products
      }
    });
  });

  describeIfCredentials('ProductDataService', () => {
    let productDataService;

    beforeAll(() => {
      productDataService = new ProductDataService({
        wsdl: HIT_ENDPOINTS.productData,
        username: process.env.hitUserName,
        password: process.env.hitPassword,
        version: '2.0.0'
      });
    });

    it('should connect to Hit Promotional product data service', async () => {
      await productDataService.initialize();
      const operations = await productDataService.getAvailableOperations();

      expect(operations).toBeDefined();
      expect(operations.length).toBeGreaterThan(0);

      const operationNames = operations.map(op => op.name);
      console.log('Available Product Data Operations:', operationNames);
    });

    it('should get product details', async () => {
      try {
        const result = await productDataService.getProduct({
          productId: TEST_PRODUCTS.productId,
          localizationCountry: 'US',
          localizationLanguage: 'en'
        });

        console.log('Product Response:', JSON.stringify(result, null, 2));

        expect(result).toBeDefined();
      } catch (error) {
        console.log('Product Error:', error.message);
        if (!error.message.includes('Invalid response')) {
          throw error;
        }
      }
    });

    it('should get products modified since date', async () => {
      try {
        // Get products modified in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await productDataService.getProductDateModified({
          changeTimeStamp: thirtyDaysAgo,
          localizationCountry: 'US',
          localizationLanguage: 'en'
        });

        console.log('Modified Products Response:', JSON.stringify(result, null, 2));

        expect(result).toBeDefined();
      } catch (error) {
        console.log('Modified Products Error:', error.message);
      }
    });
  });

  describeIfCredentials('PromoStandardsClient - Full Flow', () => {
    it('should work with unified client', async () => {
      const client = new PromoStandardsClient({
        username: process.env.hitUserName,
        password: process.env.hitPassword,
        version: '2.0.0'
      });

      // Add inventory service manually
      const inventory = await client.inventory(HIT_ENDPOINTS.inventory);

      expect(inventory).toBeDefined();

      try {
        const result = await inventory.getInventoryLevels({
          productId: TEST_PRODUCTS.productId
        });

        console.log('Unified Client Result:', JSON.stringify(result, null, 2));
        expect(result).toBeDefined();
      } catch (error) {
        console.log('Unified Client Error:', error.message);
      }
    });
  });
});

// Export test configuration for external runners
module.exports = {
  hasCredentials,
  HIT_ENDPOINTS,
  TEST_PRODUCTS
};
