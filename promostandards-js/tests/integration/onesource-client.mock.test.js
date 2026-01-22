const nock = require('nock');
const OneSourceClient = require('../../src/core/onesource-client');

describe('OneSourceClient (Mocked)', () => {
  const API_URL = 'https://promostandards.org/WebServiceRepository/WebServiceRepository.svc';

  // Mock supplier list response
  const mockSuppliersResponse = {
    suppliers: [
      {
        id: 'hit',
        name: 'Hit Promotional Products',
        asiNumber: '61125',
        sageId: '57956',
        ppaiId: '110197',
        website: 'https://www.hitpromo.net',
        status: 'active'
      },
      {
        id: 'sanmar',
        name: 'SanMar Corporation',
        asiNumber: '84863',
        status: 'active'
      }
    ]
  };

  // Mock supplier endpoints response
  const mockEndpointsResponse = {
    services: [
      {
        serviceCode: 'INV',
        version: '2.0.0',
        wsdl: 'https://ws.hitpromo.net/InventoryService/InventoryService.svc?wsdl',
        endpoint: 'https://ws.hitpromo.net/InventoryService/InventoryService.svc',
        status: 'active'
      },
      {
        serviceCode: 'INV',
        version: '1.2.1',
        wsdl: 'https://ws.hitpromo.net/InventoryService/InventoryServiceV1.svc?wsdl',
        endpoint: 'https://ws.hitpromo.net/InventoryService/InventoryServiceV1.svc',
        status: 'active'
      },
      {
        serviceCode: 'PROD',
        version: '2.0.0',
        wsdl: 'https://ws.hitpromo.net/ProductDataService/ProductDataService.svc?wsdl',
        endpoint: 'https://ws.hitpromo.net/ProductDataService/ProductDataService.svc',
        status: 'active'
      },
      {
        serviceCode: 'ORDSTAT',
        version: '2.0.0',
        wsdl: 'https://ws.hitpromo.net/OrderStatusService/OrderStatusService.svc?wsdl',
        endpoint: 'https://ws.hitpromo.net/OrderStatusService/OrderStatusService.svc',
        status: 'active'
      },
      {
        serviceCode: 'OSN',
        version: '2.0.0',
        wsdl: 'https://ws.hitpromo.net/OSNService/OSNService.svc?wsdl',
        endpoint: 'https://ws.hitpromo.net/OSNService/OSNService.svc',
        status: 'active'
      },
      {
        serviceCode: 'PPC',
        version: '1.0.0',
        wsdl: 'https://ws.hitpromo.net/PPCService/PPCService.svc?wsdl',
        endpoint: 'https://ws.hitpromo.net/PPCService/PPCService.svc',
        status: 'active'
      },
      {
        serviceCode: 'MED',
        version: '1.1.0',
        wsdl: 'https://ws.hitpromo.net/MediaService/MediaService.svc?wsdl',
        endpoint: 'https://ws.hitpromo.net/MediaService/MediaService.svc',
        status: 'active'
      }
    ]
  };

  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('getSuppliers', () => {
    it('should fetch and parse supplier list', async () => {
      nock('https://promostandards.org')
        .get('/WebServiceRepository/WebServiceRepository.svc/json/companies')
        .reply(200, mockSuppliersResponse);

      const client = new OneSourceClient({ apiUrl: API_URL });
      const suppliers = await client.getSuppliers();

      expect(suppliers).toHaveLength(2);
      expect(suppliers[0].id).toBe('hit');
      expect(suppliers[0].name).toBe('Hit Promotional Products');
      expect(suppliers[0].asiNumber).toBe('61125');
    });

    it('should cache supplier list', async () => {
      nock('https://promostandards.org')
        .get('/WebServiceRepository/WebServiceRepository.svc/json/companies')
        .reply(200, mockSuppliersResponse);

      const client = new OneSourceClient({ apiUrl: API_URL });

      // First call - hits API
      const suppliers1 = await client.getSuppliers();
      // Second call - should use cache
      const suppliers2 = await client.getSuppliers();

      expect(suppliers1).toEqual(suppliers2);
      // nock would throw if called twice without another mock
    });
  });

  describe('searchSuppliers', () => {
    it('should search suppliers by name', async () => {
      // searchSuppliers now filters locally from getSuppliers
      nock('https://promostandards.org')
        .get('/WebServiceRepository/WebServiceRepository.svc/json/companies')
        .reply(200, mockSuppliersResponse);

      const client = new OneSourceClient({ apiUrl: API_URL });
      const results = await client.searchSuppliers('Hit');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Hit Promotional Products');
    });
  });

  describe('getSupplier', () => {
    it('should fetch single supplier details', async () => {
      nock('https://promostandards.org')
        .get('/WebServiceRepository/WebServiceRepository.svc/json/companies/hit')
        .reply(200, mockSuppliersResponse.suppliers[0]);

      const client = new OneSourceClient({ apiUrl: API_URL });
      const supplier = await client.getSupplier('hit');

      expect(supplier.id).toBe('hit');
      expect(supplier.name).toBe('Hit Promotional Products');
    });

    it('should throw on missing supplierId', async () => {
      const client = new OneSourceClient({ apiUrl: API_URL });

      await expect(client.getSupplier()).rejects.toThrow('supplierId is required');
    });
  });

  describe('getSupplierEndpoints', () => {
    it('should fetch and normalize supplier endpoints', async () => {
      nock('https://promostandards.org')
        .get('/WebServiceRepository/WebServiceRepository.svc/json/companies/hit/endpoints')
        .reply(200, mockEndpointsResponse);

      const client = new OneSourceClient({ apiUrl: API_URL });
      const endpoints = await client.getSupplierEndpoints('hit');

      // Check inventory service
      expect(endpoints.inventory).toBeDefined();
      expect(endpoints.inventory).toHaveLength(2);
      expect(endpoints.inventory[0].version).toBe('2.0.0');

      // Check product data service
      expect(endpoints.productData).toBeDefined();
      expect(endpoints.productData).toHaveLength(1);

      // Check order status service
      expect(endpoints.orderStatus).toBeDefined();
      expect(endpoints.orderStatus).toHaveLength(1);

      // Check pricing config service
      expect(endpoints.pricingConfig).toBeDefined();
      expect(endpoints.pricingConfig).toHaveLength(1);
    });

    it('should cache endpoints', async () => {
      nock('https://promostandards.org')
        .get('/WebServiceRepository/WebServiceRepository.svc/json/companies/hit/endpoints')
        .reply(200, mockEndpointsResponse);

      const client = new OneSourceClient({ apiUrl: API_URL });

      const endpoints1 = await client.getSupplierEndpoints('hit');
      const endpoints2 = await client.getSupplierEndpoints('hit');

      expect(endpoints1).toEqual(endpoints2);
    });
  });

  describe('getServiceEndpoint', () => {
    it('should get specific service endpoint', async () => {
      nock('https://promostandards.org')
        .get('/WebServiceRepository/WebServiceRepository.svc/json/companies/hit/endpoints')
        .reply(200, mockEndpointsResponse);

      const client = new OneSourceClient({ apiUrl: API_URL });
      const endpoint = await client.getServiceEndpoint('hit', 'inventory', '2.0.0');

      expect(endpoint.version).toBe('2.0.0');
      expect(endpoint.wsdl).toContain('InventoryService');
    });

    it('should get latest version if not specified', async () => {
      nock('https://promostandards.org')
        .get('/WebServiceRepository/WebServiceRepository.svc/json/companies/hit/endpoints')
        .reply(200, mockEndpointsResponse);

      const client = new OneSourceClient({ apiUrl: API_URL });
      const endpoint = await client.getServiceEndpoint('hit', 'inventory');

      // Should return 2.0.0 as it's higher than 1.2.1
      expect(endpoint.version).toBe('2.0.0');
    });

    it('should throw for unknown service', async () => {
      const client = new OneSourceClient({ apiUrl: API_URL });

      await expect(client.getServiceEndpoint('hit', 'unknownService'))
        .rejects.toThrow('Unknown service');
    });

    it('should throw for unavailable version', async () => {
      nock('https://promostandards.org')
        .get('/WebServiceRepository/WebServiceRepository.svc/json/companies/hit/endpoints')
        .reply(200, mockEndpointsResponse);

      const client = new OneSourceClient({ apiUrl: API_URL });

      await expect(client.getServiceEndpoint('hit', 'inventory', '3.0.0'))
        .rejects.toThrow('Version 3.0.0 not available');
    });
  });

  describe('getSupportedServices', () => {
    it('should return list of supported services', async () => {
      nock('https://promostandards.org')
        .get('/WebServiceRepository/WebServiceRepository.svc/json/companies/hit/endpoints')
        .reply(200, mockEndpointsResponse);

      const client = new OneSourceClient({ apiUrl: API_URL });
      const services = await client.getSupportedServices('hit');

      expect(services.length).toBeGreaterThan(0);

      const inventoryService = services.find(s => s.serviceName === 'inventory');
      expect(inventoryService).toBeDefined();
      expect(inventoryService.versions).toContain('2.0.0');
      expect(inventoryService.versions).toContain('1.2.1');
      expect(inventoryService.latestVersion).toBe('2.0.0');
    });
  });

  describe('error handling', () => {
    it('should handle 404 errors', async () => {
      nock('https://promostandards.org')
        .get('/WebServiceRepository/WebServiceRepository.svc/json/companies/invalid')
        .reply(404, { message: 'Supplier not found' });

      const client = new OneSourceClient({ apiUrl: API_URL });

      await expect(client.getSupplier('invalid'))
        .rejects.toThrow('Not found');
    });

    it('should handle network errors', async () => {
      nock('https://promostandards.org')
        .get('/WebServiceRepository/WebServiceRepository.svc/json/companies')
        .replyWithError('Network error');

      const client = new OneSourceClient({ apiUrl: API_URL });

      await expect(client.getSuppliers())
        .rejects.toThrow('Network error');
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      nock('https://promostandards.org')
        .get('/WebServiceRepository/WebServiceRepository.svc/json/companies')
        .times(2)
        .reply(200, mockSuppliersResponse);

      const client = new OneSourceClient({ apiUrl: API_URL });

      await client.getSuppliers();
      client.clearCache();
      await client.getSuppliers();

      // Both calls should succeed (nock.times(2))
    });
  });
});
