const axios = require('axios');
const debug = require('debug')('promostandards:onesource');
const { NetworkError, ValidationError } = require('./errors');

/**
 * OneSourceClient - Discovers PromoStandards SOAP endpoints via OneSource API
 *
 * OneSource is a directory service that provides WSDL/endpoint URLs for
 * PromoStandards-compliant suppliers.
 */
class OneSourceClient {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || process.env.ONESOURCE_API_URL || 'https://promostandards.org/WebServiceRepository/WebServiceRepository.svc';
    this.apiKey = options.apiKey || process.env.ONESOURCE_API_KEY;
    this.timeout = options.timeout || 30000;

    // Cache for discovered endpoints
    this.cache = new Map();
    this.cacheTTL = options.cacheTTL || 3600000; // 1 hour default

    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        ...options.headers
      }
    });

    // Service name mappings (PromoStandards service codes)
    this.serviceTypes = {
      inventory: { code: 'INV', name: 'Inventory' },
      productData: { code: 'PROD', name: 'Product Data' },
      invoice: { code: 'INVC', name: 'Invoice' },
      orderStatus: { code: 'ORDSTAT', name: 'Order Status' },
      orderShipment: { code: 'OSN', name: 'Order Shipment Notification' },
      purchaseOrder: { code: 'PO', name: 'Purchase Order' },
      pricingConfig: { code: 'PPC', name: 'Product Pricing and Configuration' },
      productMedia: { code: 'MED', name: 'Media Content' },
      productCompliance: { code: 'PCOMP', name: 'Product Compliance' },
      companyData: { code: 'COMP', name: 'Company Data' },
      remittanceAdvice: { code: 'RA', name: 'Remittance Advice' }
    };
  }

  /**
   * Get all available suppliers from OneSource
   * @returns {Promise<Array>} List of suppliers with their info
   */
  async getSuppliers() {
    const cacheKey = 'suppliers:all';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      debug('Fetching all suppliers from OneSource');
      const response = await this.httpClient.get('/json/companies');

      const suppliers = this.normalizeSupplierList(response.data);
      this.setCache(cacheKey, suppliers);

      return suppliers;
    } catch (error) {
      throw this.handleError(error, 'getSuppliers');
    }
  }

  /**
   * Search suppliers by name or criteria
   * @param {string|Object} query - Search query or criteria object
   * @returns {Promise<Array>} Matching suppliers
   */
  async searchSuppliers(query) {
    // OneSource doesn't have a search endpoint, so we filter locally
    const suppliers = await this.getSuppliers();
    const searchTerm = typeof query === 'string' ? query.toLowerCase() : (query.name || '').toLowerCase();

    return suppliers.filter(s =>
      s.name?.toLowerCase().includes(searchTerm) ||
      s.id?.toLowerCase().includes(searchTerm) ||
      s.asiNumber?.includes(searchTerm)
    );
  }

  /**
   * Get a specific supplier by ID
   * @param {string} supplierId - The supplier identifier (company code)
   * @returns {Promise<Object>} Supplier details with endpoints
   */
  async getSupplier(supplierId) {
    if (!supplierId) {
      throw new ValidationError('supplierId is required', { method: 'getSupplier' });
    }

    const cacheKey = `supplier:${supplierId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      debug(`Fetching supplier: ${supplierId}`);
      const response = await this.httpClient.get(`/json/companies/${supplierId}`);

      const supplier = this.normalizeSupplier(response.data);
      this.setCache(cacheKey, supplier);

      return supplier;
    } catch (error) {
      throw this.handleError(error, 'getSupplier');
    }
  }

  /**
   * Get all endpoints for a supplier
   * @param {string} supplierId - The supplier identifier (company code)
   * @returns {Promise<Object>} Map of service endpoints
   */
  async getSupplierEndpoints(supplierId) {
    if (!supplierId) {
      throw new ValidationError('supplierId is required', { method: 'getSupplierEndpoints' });
    }

    const cacheKey = `endpoints:${supplierId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      debug(`Fetching endpoints for supplier: ${supplierId}`);
      const response = await this.httpClient.get(`/json/companies/${supplierId}/endpoints`);

      const endpoints = this.normalizeEndpoints(response.data);
      this.setCache(cacheKey, endpoints);

      return endpoints;
    } catch (error) {
      throw this.handleError(error, 'getSupplierEndpoints');
    }
  }

  /**
   * Get endpoint for a specific service
   * @param {string} supplierId - The supplier identifier
   * @param {string} serviceName - Service name (e.g., 'inventory', 'productData')
   * @param {string} version - Service version (e.g., '2.0.0')
   * @returns {Promise<Object>} Service endpoint details
   */
  async getServiceEndpoint(supplierId, serviceName, version) {
    if (!supplierId || !serviceName) {
      throw new ValidationError('supplierId and serviceName are required', {
        method: 'getServiceEndpoint',
        provided: { supplierId, serviceName, version }
      });
    }

    const serviceType = this.serviceTypes[serviceName];
    if (!serviceType) {
      throw new ValidationError(`Unknown service: ${serviceName}`, {
        method: 'getServiceEndpoint',
        availableServices: Object.keys(this.serviceTypes)
      });
    }

    const cacheKey = `endpoint:${supplierId}:${serviceName}:${version || 'latest'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      debug(`Fetching ${serviceName} endpoint for supplier: ${supplierId}`);

      // Try to get from full endpoints list first
      const endpoints = await this.getSupplierEndpoints(supplierId);

      const serviceEndpoints = endpoints[serviceName];
      if (!serviceEndpoints || serviceEndpoints.length === 0) {
        throw new ValidationError(`Supplier ${supplierId} does not support ${serviceName}`, {
          supplierId,
          serviceName,
          availableServices: Object.keys(endpoints).filter(k => endpoints[k].length > 0)
        });
      }

      // Find matching version or latest
      let endpoint;
      if (version) {
        endpoint = serviceEndpoints.find(e => e.version === version);
        if (!endpoint) {
          throw new ValidationError(`Version ${version} not available for ${serviceName}`, {
            supplierId,
            serviceName,
            requestedVersion: version,
            availableVersions: serviceEndpoints.map(e => e.version)
          });
        }
      } else {
        // Get latest version (highest version number)
        endpoint = serviceEndpoints.sort((a, b) =>
          this.compareVersions(b.version, a.version)
        )[0];
      }

      this.setCache(cacheKey, endpoint);
      return endpoint;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw this.handleError(error, 'getServiceEndpoint');
    }
  }

  /**
   * Get all services supported by a supplier
   * @param {string} supplierId - The supplier identifier
   * @returns {Promise<Array>} List of supported services with versions
   */
  async getSupportedServices(supplierId) {
    const endpoints = await this.getSupplierEndpoints(supplierId);

    return Object.entries(endpoints)
      .filter(([_, services]) => services.length > 0)
      .map(([serviceName, services]) => ({
        serviceName,
        versions: services.map(s => s.version),
        latestVersion: services.sort((a, b) =>
          this.compareVersions(b.version, a.version)
        )[0]?.version
      }));
  }

  /**
   * Normalize supplier list from API response
   * PromoStandards API returns: { Companies: [...] } or array directly
   */
  normalizeSupplierList(data) {
    const suppliers = Array.isArray(data)
      ? data
      : (data.Companies || data.companies || data.suppliers || data.Suppliers || []);
    return suppliers.map(s => this.normalizeSupplier(s));
  }

  /**
   * Normalize single supplier from API response
   * PromoStandards API fields: Code, Name, Id, etc.
   */
  normalizeSupplier(data) {
    return {
      id: data.Code || data.code || data.id || data.Id || data.supplierId || data.SupplierId,
      name: data.Name || data.name || data.companyName || data.CompanyName,
      asiNumber: data.AsiNumber || data.asiNumber || data.ASINumber || data.asi,
      sageId: data.SageNumber || data.sageId || data.SAGEId || data.sage,
      ppaiId: data.PpaiNumber || data.ppaiId || data.PPAIId || data.ppai,
      website: data.Website || data.website || data.url,
      status: data.Status || data.status || 'active',
      endpoints: data.endpoints ? this.normalizeEndpoints(data.endpoints) : null
    };
  }

  /**
   * Normalize endpoints from API response
   * PromoStandards API fields: ServiceCode, ServiceTypeCode, WsVersion, ServiceUrl, etc.
   */
  normalizeEndpoints(data) {
    const endpoints = {};
    const serviceList = Array.isArray(data)
      ? data
      : (data.Endpoints || data.endpoints || data.services || data.Services || []);

    // Initialize all service types with empty arrays
    for (const serviceName of Object.keys(this.serviceTypes)) {
      endpoints[serviceName] = [];
    }

    for (const service of serviceList) {
      // PromoStandards API uses ServiceTypeCode (e.g., "Inventory", "ProductData")
      const serviceCode = service.ServiceCode || service.ServiceTypeCode || service.serviceCode || service.code;
      const serviceName = this.getServiceNameByCode(serviceCode) || this.getServiceNameByTypeName(serviceCode);

      if (serviceName) {
        endpoints[serviceName].push({
          version: service.WsVersion || service.Version || service.version,
          wsdl: service.ServiceUrl || service.wsdl || service.WSDL || service.wsdlUrl || service.WSDLUrl,
          endpoint: service.ServiceUrl || service.endpoint || service.Endpoint || service.url || service.URL,
          status: service.Status || service.status || 'active'
        });
      }
    }

    return endpoints;
  }

  /**
   * Get service name by PromoStandards service type name (e.g., "Inventory", "ProductData")
   */
  getServiceNameByTypeName(typeName) {
    if (!typeName) return null;
    const lowerName = typeName.toLowerCase().replace(/\s+/g, '');

    const typeNameMap = {
      'inventory': 'inventory',
      'productdata': 'productData',
      'invoice': 'invoice',
      'orderstatus': 'orderStatus',
      'ordershipmentnotification': 'orderShipment',
      'purchaseorder': 'purchaseOrder',
      'productpricingandconfiguration': 'pricingConfig',
      'ppc': 'pricingConfig',
      'mediacontent': 'productMedia',
      'productcompliance': 'productCompliance',
      'companydata': 'companyData',
      'remittanceadvice': 'remittanceAdvice'
    };

    return typeNameMap[lowerName] || null;
  }

  /**
   * Get service name by PromoStandards service code
   */
  getServiceNameByCode(code) {
    if (!code) return null;
    const upperCode = code.toUpperCase();

    for (const [name, info] of Object.entries(this.serviceTypes)) {
      if (info.code === upperCode) {
        return name;
      }
    }
    return null;
  }

  /**
   * Compare version strings (e.g., "2.0.0" > "1.2.1")
   */
  compareVersions(a, b) {
    if (!a || !b) return 0;

    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA !== numB) return numA - numB;
    }
    return 0;
  }

  /**
   * Get from cache with TTL check
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const { data, timestamp } = cached;
    if (Date.now() - timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    debug(`Cache hit: ${key}`);
    return data;
  }

  /**
   * Set cache with timestamp
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
    debug('Cache cleared');
  }

  /**
   * Handle HTTP errors
   */
  handleError(error, operation) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      if (status === 404) {
        throw new ValidationError(`Not found: ${message}`, {
          operation,
          status
        });
      }

      throw new NetworkError(`HTTP ${status}: ${message}`, {
        operation,
        status,
        response: error.response.data
      });
    }

    throw new NetworkError(`Network error: ${error.message}`, {
      operation,
      originalError: error.message
    });
  }

  /**
   * Create client from environment variables
   */
  static fromEnvironment() {
    const apiUrl = process.env.ONESOURCE_API_URL;
    const apiKey = process.env.ONESOURCE_API_KEY;

    if (!apiUrl && !apiKey) {
      debug('No OneSource environment configuration found');
      return null;
    }

    return new OneSourceClient({ apiUrl, apiKey });
  }
}

module.exports = OneSourceClient;
