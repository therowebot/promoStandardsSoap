const nock = require('nock');
const InventoryService = require('../../src/services/inventory/inventory-service');
const { ValidationError } = require('../../src/core/errors');

/**
 * InventoryService Tests
 *
 * Note: Full SOAP mocking is complex because the 'soap' library
 * requires a complete, valid WSDL with XSD schemas. These tests focus on:
 * - Validation logic
 * - Request building
 * - Error handling
 *
 * For full end-to-end tests, use hit-promotional.real.test.js with actual credentials.
 */
describe('InventoryService', () => {
  const MOCK_WSDL = 'https://mock-vendor.com/inventory?wsdl';

  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('constructor', () => {
    it('should require WSDL URL', () => {
      expect(() => new InventoryService({
        username: 'test',
        password: 'test'
      })).toThrow(ValidationError);
    });

    it('should accept valid options', () => {
      const service = new InventoryService({
        wsdl: MOCK_WSDL,
        username: 'test',
        password: 'test',
        version: '2.0.0'
      });

      expect(service.wsdl).toBe(MOCK_WSDL);
      expect(service.version).toBe('2.0.0');
    });

    it('should use default version if not specified', () => {
      const service = new InventoryService({
        wsdl: MOCK_WSDL,
        username: 'test',
        password: 'test'
      });

      expect(service.version).toBe('2.0.0');
    });

    it('should reject unsupported versions', () => {
      expect(() => new InventoryService({
        wsdl: MOCK_WSDL,
        username: 'test',
        password: 'test',
        version: '3.0.0'
      })).toThrow(ValidationError);
    });

    it('should support v1.2.1', () => {
      const service = new InventoryService({
        wsdl: MOCK_WSDL,
        username: 'test',
        password: 'test',
        version: '1.2.1'
      });

      expect(service.version).toBe('1.2.1');
    });
  });

  describe('getFilterValues validation', () => {
    it('should require productId', async () => {
      const service = new InventoryService({
        wsdl: MOCK_WSDL,
        username: 'test',
        password: 'test'
      });

      await expect(service.getFilterValues({}))
        .rejects.toThrow('productId is required');
    });
  });

  describe('buildInventoryRequest', () => {
    let service;

    beforeEach(() => {
      service = new InventoryService({
        wsdl: MOCK_WSDL,
        username: 'test',
        password: 'test',
        version: '2.0.0'
      });
    });

    it('should build v2 request with productId', () => {
      const request = service.buildInventoryRequest({
        productId: 'ABC123'
      });

      expect(request.productId).toBe('ABC123');
    });

    it('should build v2 request with filters', () => {
      const request = service.buildInventoryRequest({
        productId: 'ABC123',
        filters: {
          colors: ['Red', 'Blue'],
          sizes: ['M', 'L']
        }
      });

      expect(request.productId).toBe('ABC123');
      expect(request.Filter).toBeDefined();
      expect(request.Filter.colorArray).toEqual(['Red', 'Blue']);
      expect(request.Filter.sizeArray).toEqual(['M', 'L']);
    });

    it('should build v2 request with partIds filter', () => {
      const request = service.buildInventoryRequest({
        productId: 'ABC123',
        filters: {
          partIds: ['PART-001', 'PART-002']
        }
      });

      expect(request.Filter.partIdArray).toEqual(['PART-001', 'PART-002']);
    });

    it('should handle single value filters as arrays', () => {
      const request = service.buildInventoryRequest({
        productId: 'ABC123',
        filters: {
          colors: 'Red'
        }
      });

      expect(request.Filter.colorArray).toEqual(['Red']);
    });

    it('should accept alternative parameter names', () => {
      const request = service.buildInventoryRequest({
        productID: 'ABC123',
        partIds: ['PART-001'],
        colors: ['Red']
      });

      expect(request.productId).toBe('ABC123');
      expect(request.Filter).toBeDefined();
    });

    it('should support productIdType', () => {
      const request = service.buildInventoryRequest({
        productId: 'ABC123',
        productIdType: 'Supplier'
      });

      expect(request.productId).toBe('ABC123');
      expect(request.productIDtype).toBe('Supplier');
    });
  });

  describe('buildV1Request', () => {
    let service;

    beforeEach(() => {
      service = new InventoryService({
        wsdl: MOCK_WSDL,
        username: 'test',
        password: 'test',
        version: '1.2.1'
      });
    });

    it('should require productId for v1', () => {
      expect(() => service.buildV1Request({}))
        .toThrow('productId is required');
    });

    it('should build v1 request with productID and productIDtype per official XSD', () => {
      const request = service.buildV1Request({
        productId: 'ABC123'
      });

      // V1.2.1 uses productID (not productId) and requires productIDtype
      expect(request.productID).toBe('ABC123');
      expect(request.productIDtype).toBe('Supplier'); // Default
    });

    it('should build v1 request with FilterSelectionArray for partIds', () => {
      const request = service.buildV1Request({
        productId: 'ABC123',
        partIds: ['PART-001', 'PART-002']
      });

      expect(request.productID).toBe('ABC123');
      expect(request.FilterSelectionArray.filterSelection).toEqual(['PART-001', 'PART-002']);
    });

    it('should build v1 request with FilterSizeArray', () => {
      const request = service.buildV1Request({
        productId: 'ABC123',
        filterSizes: ['M', 'L']
      });

      expect(request.FilterSizeArray.filterSize).toEqual(['M', 'L']);
    });

    it('should build v1 request with FilterColorArray', () => {
      const request = service.buildV1Request({
        productId: 'ABC123',
        filterColors: ['Red', 'Blue']
      });

      expect(request.FilterColorArray.filterColor).toEqual(['Red', 'Blue']);
    });

    it('should accept custom productIDtype', () => {
      const request = service.buildV1Request({
        productId: 'ABC123',
        productIDtype: 'Distributor'
      });

      expect(request.productIDtype).toBe('Distributor');
    });
  });

  describe('static properties', () => {
    it('should have correct service name', () => {
      expect(InventoryService.serviceName).toBe('Inventory');
    });

    it('should have correct supported versions', () => {
      expect(InventoryService.supportedVersions).toContain('1.2.1');
      expect(InventoryService.supportedVersions).toContain('2.0.0');
    });

    it('should have correct default version', () => {
      expect(InventoryService.defaultVersion).toBe('2.0.0');
    });
  });

  describe('response validators', () => {
    it('should have validator for getInventoryLevels', () => {
      expect(InventoryService.responseValidators.getInventoryLevels).toBeDefined();
    });

    it('should have validator for getFilterValues', () => {
      expect(InventoryService.responseValidators.getFilterValues).toBeDefined();
    });

    it('should validate inventory response', () => {
      const validator = InventoryService.responseValidators.getInventoryLevels;

      // Valid response
      expect(() => validator({ inventory: {} })).not.toThrow();
      expect(() => validator({ inventoryLevels: {} })).not.toThrow();

      // Invalid response
      expect(() => validator({})).toThrow('missing inventory data');
    });

    it('should validate filter values response', () => {
      const validator = InventoryService.responseValidators.getFilterValues;

      // Valid response
      expect(() => validator({ filterValues: {} })).not.toThrow();

      // Invalid response
      expect(() => validator({})).toThrow('missing filterValues');
    });
  });
});
