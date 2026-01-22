const PromoStandardsAuth = require('./core/auth');
const OneSourceClient = require('./core/onesource-client');
const WSDLProvider = require('./core/wsdl-provider');
const InventoryService = require('./services/inventory/inventory-service');
const ProductDataService = require('./services/product-data/product-data-service');
const OrderStatusService = require('./services/order-status/order-status-service');
const OrderShipmentNotificationService = require('./services/order-shipment/order-shipment-service');
const InvoiceService = require('./services/invoice/invoice-service');
const PricingConfigurationService = require('./services/pricing-config/pricing-config-service');
const ProductMediaService = require('./services/product-media/product-media-service');
const PurchaseOrderService = require('./services/purchase-order/purchase-order-service');
const ProductComplianceService = require('./services/product-compliance/product-compliance-service');
const CompanyDataService = require('./services/company-data/company-data-service');
const RemittanceAdviceService = require('./services/remittance-advice/remittance-advice-service');
const { ValidationError } = require('./core/errors');
const debug = require('debug')('promostandards:client');

/**
 * Service class registry - maps service names to their implementations
 */
const SERVICE_REGISTRY = {
  inventory: InventoryService,
  productData: ProductDataService,
  orderStatus: OrderStatusService,
  orderShipment: OrderShipmentNotificationService,
  invoice: InvoiceService,
  pricingConfig: PricingConfigurationService,
  productMedia: ProductMediaService,
  purchaseOrder: PurchaseOrderService,
  productCompliance: ProductComplianceService,
  companyData: CompanyDataService,
  remittanceAdvice: RemittanceAdviceService
};

class PromoStandardsClient {
  constructor(options = {}) {
    this.auth = this.createAuth(options);
    this.services = new Map();
    this.supplierEndpoints = new Map(); // Cache for supplier endpoints
    this._lazyServices = new Map(); // Cache for lazy-initialized services
    this.defaultOptions = {
      timeout: options.timeout || 30000,
      cache: options.cache,
      cacheTTL: options.cacheTTL
    };

    // Initialize OneSource client if configured
    this.onesource = this.createOneSourceClient(options.onesource);

    if (options.autoInitialize) {
      this.initializeServices(options.services || {});
    }
  }

  /**
   * Create authentication handler
   */
  createAuth(options) {
    if (options.auth instanceof PromoStandardsAuth) {
      return options.auth;
    }

    const authFromEnv = PromoStandardsAuth.fromEnvironment();
    if (authFromEnv && !options.auth && !options.id && !options.username) {
      debug('Using authentication from environment');
      return authFromEnv;
    }

    const authConfig = {
      id: options.id || options.username,
      password: options.password,
      wsVersion: options.wsVersion || options.version
    };

    if (options.auth && typeof options.auth === 'object') {
      Object.assign(authConfig, options.auth);
    }

    return new PromoStandardsAuth(authConfig);
  }

  /**
   * Create OneSource client for endpoint discovery
   */
  createOneSourceClient(onesourceOptions) {
    if (onesourceOptions === false) {
      return null;
    }

    if (onesourceOptions instanceof OneSourceClient) {
      return onesourceOptions;
    }

    // Try environment configuration
    const envClient = OneSourceClient.fromEnvironment();
    if (envClient) {
      debug('Using OneSource from environment');
      return envClient;
    }

    // Create from options if provided
    if (onesourceOptions && typeof onesourceOptions === 'object') {
      return new OneSourceClient(onesourceOptions);
    }

    return null;
  }

  /**
   * Initialize services from configuration
   */
  initializeServices(serviceConfigs) {
    for (const [name, ServiceClass] of Object.entries(SERVICE_REGISTRY)) {
      const config = serviceConfigs[name];
      if (config && config.enabled !== false) {
        this.addService(name, ServiceClass, config);
      }
    }
  }

  /**
   * Add a service instance
   */
  addService(name, ServiceClass, config = {}) {
    const serviceOptions = {
      ...this.defaultOptions,
      ...config,
      auth: this.auth
    };

    if (!serviceOptions.wsdl && config.endpoint) {
      serviceOptions.wsdl = config.endpoint;
    }

    try {
      const service = new ServiceClass(serviceOptions);
      this.services.set(name, service);

      Object.defineProperty(this, name, {
        get: () => this.services.get(name),
        configurable: true
      });

      debug(`Added service: ${name}`);
    } catch (error) {
      debug(`Failed to add service ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get an existing service by name
   */
  getService(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new ValidationError(
        `Service '${name}' not found`,
        { availableServices: Array.from(this.services.keys()) }
      );
    }
    return service;
  }

  /**
   * Connect to a supplier via OneSource and auto-discover endpoints
   * @param {string} supplierId - Supplier identifier (ASI number, SAGE ID, etc.)
   * @param {Object} options - Optional configuration
   * @returns {Promise<SupplierConnection>} Supplier connection with service accessors
   */
  async useSupplier(supplierId, options = {}) {
    if (!this.onesource) {
      throw new ValidationError(
        'OneSource is not configured. Provide onesource options or set ONESOURCE_API_URL environment variable.',
        { method: 'useSupplier' }
      );
    }

    debug(`Connecting to supplier: ${supplierId}`);

    // Get supplier endpoints from OneSource
    const endpoints = await this.onesource.getSupplierEndpoints(supplierId);
    this.supplierEndpoints.set(supplierId, endpoints);

    // Create a supplier connection object with service accessors
    return new SupplierConnection(this, supplierId, endpoints, options);
  }

  /**
   * Get available suppliers from OneSource
   * @returns {Promise<Array>} List of suppliers
   */
  async getSuppliers() {
    if (!this.onesource) {
      throw new ValidationError(
        'OneSource is not configured',
        { method: 'getSuppliers' }
      );
    }

    return this.onesource.getSuppliers();
  }

  /**
   * Search suppliers via OneSource
   * @param {string|Object} query - Search query
   * @returns {Promise<Array>} Matching suppliers
   */
  async searchSuppliers(query) {
    if (!this.onesource) {
      throw new ValidationError(
        'OneSource is not configured',
        { method: 'searchSuppliers' }
      );
    }

    return this.onesource.searchSuppliers(query);
  }

  /**
   * Get supplier details from OneSource
   * @param {string} supplierId - Supplier identifier
   * @returns {Promise<Object>} Supplier details
   */
  async getSupplier(supplierId) {
    if (!this.onesource) {
      throw new ValidationError(
        'OneSource is not configured',
        { method: 'getSupplier' }
      );
    }

    return this.onesource.getSupplier(supplierId);
  }

  /**
   * Check if a string looks like a URL
   * @private
   */
  _isUrl(str) {
    return str && (str.startsWith('http://') || str.startsWith('https://'));
  }

  /**
   * Create a service with direct WSDL (existing behavior)
   * @private
   */
  _createDirectService(serviceName, ServiceClass, wsdl, options = {}) {
    const key = `${serviceName}_direct_${wsdl}`;

    if (!this.services.has(key)) {
      this.addService(key, ServiceClass, { ...options, wsdl });
    }

    return this.services.get(key);
  }

  /**
   * Create a lazy service that resolves WSDL on first method call
   * @private
   */
  _createLazyService(serviceName, ServiceClass, supplierId, options = {}) {
    const cacheKey = `${serviceName}:${supplierId}:${options.version || 'latest'}`;

    if (this._lazyServices.has(cacheKey)) {
      debug(`Returning cached lazy service: ${cacheKey}`);
      return this._lazyServices.get(cacheKey);
    }

    if (!this.onesource) {
      throw new ValidationError(
        'OneSource is not configured. Provide onesource options or set ONESOURCE_API_URL environment variable.',
        { method: serviceName, supplierId }
      );
    }

    debug(`Creating lazy service: ${serviceName} for supplier ${supplierId}`);

    // Create WSDLProvider for this supplier/service combo
    const wsdlProvider = WSDLProvider.fromSupplier(
      supplierId,
      serviceName,
      this.onesource,
      options.version
    );

    // Create service with provider (WSDL resolves on first call)
    const serviceOptions = {
      ...this.defaultOptions,
      ...options,
      wsdlProvider,
      auth: this.auth
    };

    const service = new ServiceClass(serviceOptions);
    this._lazyServices.set(cacheKey, service);

    return service;
  }

  /**
   * Get inventory service - auto-discovers WSDL if supplier ID provided
   * @param {string} wsdlOrSupplierId - WSDL URL or supplier identifier
   * @param {Object} options - Optional configuration
   * @returns {InventoryService} Inventory service instance
   */
  inventory(wsdlOrSupplierId, options = {}) {
    if (this._isUrl(wsdlOrSupplierId)) {
      return this._createDirectService('inventory', InventoryService, wsdlOrSupplierId, options);
    }
    return this._createLazyService('inventory', InventoryService, wsdlOrSupplierId, options);
  }

  /**
   * Get product data service - auto-discovers WSDL if supplier ID provided
   * @param {string} wsdlOrSupplierId - WSDL URL or supplier identifier
   * @param {Object} options - Optional configuration
   * @returns {ProductDataService} Product data service instance
   */
  productData(wsdlOrSupplierId, options = {}) {
    if (this._isUrl(wsdlOrSupplierId)) {
      return this._createDirectService('productData', ProductDataService, wsdlOrSupplierId, options);
    }
    return this._createLazyService('productData', ProductDataService, wsdlOrSupplierId, options);
  }

  /**
   * Get order status service - auto-discovers WSDL if supplier ID provided
   * @param {string} wsdlOrSupplierId - WSDL URL or supplier identifier
   * @param {Object} options - Optional configuration
   * @returns {OrderStatusService} Order status service instance
   */
  orderStatus(wsdlOrSupplierId, options = {}) {
    if (this._isUrl(wsdlOrSupplierId)) {
      return this._createDirectService('orderStatus', OrderStatusService, wsdlOrSupplierId, options);
    }
    return this._createLazyService('orderStatus', OrderStatusService, wsdlOrSupplierId, options);
  }

  /**
   * Get order shipment service - auto-discovers WSDL if supplier ID provided
   * @param {string} wsdlOrSupplierId - WSDL URL or supplier identifier
   * @param {Object} options - Optional configuration
   * @returns {OrderShipmentNotificationService} Order shipment service instance
   */
  orderShipment(wsdlOrSupplierId, options = {}) {
    if (this._isUrl(wsdlOrSupplierId)) {
      return this._createDirectService('orderShipment', OrderShipmentNotificationService, wsdlOrSupplierId, options);
    }
    return this._createLazyService('orderShipment', OrderShipmentNotificationService, wsdlOrSupplierId, options);
  }

  /**
   * Get invoice service - auto-discovers WSDL if supplier ID provided
   * @param {string} wsdlOrSupplierId - WSDL URL or supplier identifier
   * @param {Object} options - Optional configuration
   * @returns {InvoiceService} Invoice service instance
   */
  invoice(wsdlOrSupplierId, options = {}) {
    if (this._isUrl(wsdlOrSupplierId)) {
      return this._createDirectService('invoice', InvoiceService, wsdlOrSupplierId, options);
    }
    return this._createLazyService('invoice', InvoiceService, wsdlOrSupplierId, options);
  }

  /**
   * Get pricing configuration service - auto-discovers WSDL if supplier ID provided
   * @param {string} wsdlOrSupplierId - WSDL URL or supplier identifier
   * @param {Object} options - Optional configuration
   * @returns {PricingConfigurationService} Pricing configuration service instance
   */
  pricingConfig(wsdlOrSupplierId, options = {}) {
    if (this._isUrl(wsdlOrSupplierId)) {
      return this._createDirectService('pricingConfig', PricingConfigurationService, wsdlOrSupplierId, options);
    }
    return this._createLazyService('pricingConfig', PricingConfigurationService, wsdlOrSupplierId, options);
  }

  /**
   * Get product media service - auto-discovers WSDL if supplier ID provided
   * @param {string} wsdlOrSupplierId - WSDL URL or supplier identifier
   * @param {Object} options - Optional configuration
   * @returns {ProductMediaService} Product media service instance
   */
  productMedia(wsdlOrSupplierId, options = {}) {
    if (this._isUrl(wsdlOrSupplierId)) {
      return this._createDirectService('productMedia', ProductMediaService, wsdlOrSupplierId, options);
    }
    return this._createLazyService('productMedia', ProductMediaService, wsdlOrSupplierId, options);
  }

  /**
   * Get purchase order service - auto-discovers WSDL if supplier ID provided
   * @param {string} wsdlOrSupplierId - WSDL URL or supplier identifier
   * @param {Object} options - Optional configuration
   * @returns {PurchaseOrderService} Purchase order service instance
   */
  purchaseOrder(wsdlOrSupplierId, options = {}) {
    if (this._isUrl(wsdlOrSupplierId)) {
      return this._createDirectService('purchaseOrder', PurchaseOrderService, wsdlOrSupplierId, options);
    }
    return this._createLazyService('purchaseOrder', PurchaseOrderService, wsdlOrSupplierId, options);
  }

  /**
   * Get product compliance service - auto-discovers WSDL if supplier ID provided
   * @param {string} wsdlOrSupplierId - WSDL URL or supplier identifier
   * @param {Object} options - Optional configuration
   * @returns {ProductComplianceService} Product compliance service instance
   */
  productCompliance(wsdlOrSupplierId, options = {}) {
    if (this._isUrl(wsdlOrSupplierId)) {
      return this._createDirectService('productCompliance', ProductComplianceService, wsdlOrSupplierId, options);
    }
    return this._createLazyService('productCompliance', ProductComplianceService, wsdlOrSupplierId, options);
  }

  /**
   * Get company data service - auto-discovers WSDL if supplier ID provided
   * @param {string} wsdlOrSupplierId - WSDL URL or supplier identifier
   * @param {Object} options - Optional configuration
   * @returns {CompanyDataService} Company data service instance
   */
  companyData(wsdlOrSupplierId, options = {}) {
    if (this._isUrl(wsdlOrSupplierId)) {
      return this._createDirectService('companyData', CompanyDataService, wsdlOrSupplierId, options);
    }
    return this._createLazyService('companyData', CompanyDataService, wsdlOrSupplierId, options);
  }

  /**
   * Get remittance advice service - auto-discovers WSDL if supplier ID provided
   * @param {string} wsdlOrSupplierId - WSDL URL or supplier identifier
   * @param {Object} options - Optional configuration
   * @returns {RemittanceAdviceService} Remittance advice service instance
   */
  remittanceAdvice(wsdlOrSupplierId, options = {}) {
    if (this._isUrl(wsdlOrSupplierId)) {
      return this._createDirectService('remittanceAdvice', RemittanceAdviceService, wsdlOrSupplierId, options);
    }
    return this._createLazyService('remittanceAdvice', RemittanceAdviceService, wsdlOrSupplierId, options);
  }

  /**
   * Call a service operation directly
   */
  async call(serviceName, operation, data, options = {}) {
    const service = this.getService(serviceName);
    return service.call(operation, data, options);
  }

  /**
   * Update authentication credentials
   */
  updateAuth(credentials) {
    this.auth.updateCredentials(credentials);

    for (const service of this.services.values()) {
      service.auth = this.auth;
    }

    for (const service of this._lazyServices.values()) {
      service.auth = this.auth;
    }
  }

  /**
   * Quick one-off call without maintaining client state
   */
  static async quickCall(options) {
    const { service, operation, wsdl, supplierId, data, ...clientOptions } = options;

    if (!service || !operation) {
      throw new ValidationError(
        'service and operation are required for quickCall',
        { provided: Object.keys(options) }
      );
    }

    if (!wsdl && !supplierId) {
      throw new ValidationError(
        'Either wsdl or supplierId is required for quickCall',
        { provided: Object.keys(options) }
      );
    }

    const client = new PromoStandardsClient(clientOptions);

    let serviceInstance;
    if (supplierId) {
      // Use lazy service with auto-discovery
      serviceInstance = client[service](supplierId);
    } else {
      // Use provided WSDL directly
      serviceInstance = client[service](wsdl);
    }

    if (!serviceInstance[operation]) {
      throw new ValidationError(
        `Operation '${operation}' not found in ${service} service`,
        { service, operation }
      );
    }

    return serviceInstance[operation](data);
  }

  /**
   * Get information about all configured services
   */
  async getAllServiceInfo() {
    const info = {};

    for (const [name, service] of this.services) {
      try {
        const operations = await service.getAvailableOperations();
        info[name] = {
          version: service.version,
          wsdl: service.wsdl,
          operations: operations.map(op => op.name)
        };
      } catch (error) {
        info[name] = {
          error: error.message
        };
      }
    }

    return info;
  }

  /**
   * Get the OneSource client instance
   */
  getOneSourceClient() {
    return this.onesource;
  }

  /**
   * Clear all cached lazy services
   */
  clearLazyServiceCache() {
    this._lazyServices.clear();
    debug('Lazy service cache cleared');
  }
}

/**
 * SupplierConnection - Represents a connection to a specific supplier
 * with auto-discovered service endpoints
 */
class SupplierConnection {
  constructor(client, supplierId, endpoints, options = {}) {
    this.client = client;
    this.supplierId = supplierId;
    this.endpoints = endpoints;
    this.options = options;
    this.services = new Map();
  }

  /**
   * Get a service for this supplier
   * @param {string} serviceName - Service name (e.g., 'inventory', 'productData')
   * @param {string} version - Optional version (defaults to latest)
   * @returns {Promise<BaseService>} Service instance
   */
  async getService(serviceName, version) {
    const key = `${serviceName}_${version || 'latest'}`;

    if (this.services.has(key)) {
      return this.services.get(key);
    }

    const serviceEndpoints = this.endpoints[serviceName];
    if (!serviceEndpoints || serviceEndpoints.length === 0) {
      throw new ValidationError(
        `Supplier ${this.supplierId} does not support ${serviceName}`,
        {
          supplierId: this.supplierId,
          serviceName,
          availableServices: Object.keys(this.endpoints).filter(k => this.endpoints[k].length > 0)
        }
      );
    }

    // Find the endpoint for requested version or latest
    let endpoint;
    if (version) {
      endpoint = serviceEndpoints.find(e => e.version === version);
      if (!endpoint) {
        throw new ValidationError(
          `Version ${version} not available for ${serviceName}`,
          {
            supplierId: this.supplierId,
            serviceName,
            requestedVersion: version,
            availableVersions: serviceEndpoints.map(e => e.version)
          }
        );
      }
    } else {
      // Get latest version
      endpoint = [...serviceEndpoints].sort((a, b) => {
        const partsA = a.version.split('.').map(Number);
        const partsB = b.version.split('.').map(Number);
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
          const diff = (partsB[i] || 0) - (partsA[i] || 0);
          if (diff !== 0) return diff;
        }
        return 0;
      })[0];
    }

    // Get service class from registry
    const ServiceClass = SERVICE_REGISTRY[serviceName];
    if (!ServiceClass) {
      throw new ValidationError(
        `Service ${serviceName} is not implemented yet`,
        { serviceName, implementedServices: Object.keys(SERVICE_REGISTRY) }
      );
    }

    // Create service instance
    const serviceOptions = {
      ...this.client.defaultOptions,
      ...this.options,
      wsdl: endpoint.wsdl,
      endpoint: endpoint.endpoint,
      version: endpoint.version,
      auth: this.client.auth
    };

    const service = new ServiceClass(serviceOptions);
    this.services.set(key, service);

    return service;
  }

  /**
   * Get inventory service for this supplier
   */
  get inventory() {
    return {
      getInventoryLevels: async (params) => {
        const service = await this.getService('inventory');
        return service.getInventoryLevels(params);
      },
      getFilterValues: async (params) => {
        const service = await this.getService('inventory');
        return service.getFilterValues(params);
      }
    };
  }

  /**
   * Get product data service for this supplier
   */
  get productData() {
    return {
      getProduct: async (params) => {
        const service = await this.getService('productData');
        return service.getProduct(params);
      },
      getProductDateModified: async (params) => {
        const service = await this.getService('productData');
        return service.getProductDateModified(params);
      },
      getProductSellable: async (params) => {
        const service = await this.getService('productData');
        return service.getProductSellable(params);
      },
      getProductCloseout: async (params) => {
        const service = await this.getService('productData');
        return service.getProductCloseout(params);
      }
    };
  }

  /**
   * Get list of supported services for this supplier
   */
  getSupportedServices() {
    return Object.entries(this.endpoints)
      .filter(([_, endpoints]) => endpoints.length > 0)
      .map(([name, endpoints]) => ({
        name,
        versions: endpoints.map(e => e.version)
      }));
  }
}

module.exports = PromoStandardsClient;
module.exports.SupplierConnection = SupplierConnection;
