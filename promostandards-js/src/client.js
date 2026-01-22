const PromoStandardsAuth = require('./core/auth');
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
    this.defaultOptions = {
      timeout: options.timeout || 30000,
      cache: options.cache,
      cacheTTL: options.cacheTTL
    };

    if (options.autoInitialize) {
      this.initializeServices(options.services || {});
    }
  }

  /**
   * Create authentication handler
   * Returns null if no credentials provided (for per-call auth pattern)
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

    // If no credentials provided, return null (per-call auth will be used)
    if (!options.id && !options.username && !options.auth) {
      debug('No client-level auth configured - per-call credentials required');
      return null;
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
   * Create a service with direct WSDL
   * @private
   */
  _createDirectService(serviceName, ServiceClass, wsdl, options = {}) {
    const key = `${serviceName}_direct_${wsdl}`;

    if (!this.services.has(key)) {
      // Use per-call credentials if provided, otherwise fall back to client auth
      let auth = this.auth;
      if (options.username || options.password) {
        auth = new PromoStandardsAuth({
          id: options.username,
          password: options.password
        });
      } else if (!auth) {
        throw new ValidationError(
          'Credentials required. Provide username/password in options or configure client-level auth.',
          { method: serviceName }
        );
      }

      this.addService(key, ServiceClass, { ...options, wsdl, auth });
    }

    return this.services.get(key);
  }

  /**
   * Get inventory service
   * @param {string} wsdl - WSDL URL
   * @param {Object} options - Optional configuration
   * @returns {InventoryService} Inventory service instance
   */
  inventory(wsdl, options = {}) {
    return this._createDirectService('inventory', InventoryService, wsdl, options);
  }

  /**
   * Get product data service
   * @param {string} wsdl - WSDL URL
   * @param {Object} options - Optional configuration
   * @returns {ProductDataService} Product data service instance
   */
  productData(wsdl, options = {}) {
    return this._createDirectService('productData', ProductDataService, wsdl, options);
  }

  /**
   * Get order status service
   * @param {string} wsdl - WSDL URL
   * @param {Object} options - Optional configuration
   * @returns {OrderStatusService} Order status service instance
   */
  orderStatus(wsdl, options = {}) {
    return this._createDirectService('orderStatus', OrderStatusService, wsdl, options);
  }

  /**
   * Get order shipment service
   * @param {string} wsdl - WSDL URL
   * @param {Object} options - Optional configuration
   * @returns {OrderShipmentNotificationService} Order shipment service instance
   */
  orderShipment(wsdl, options = {}) {
    return this._createDirectService('orderShipment', OrderShipmentNotificationService, wsdl, options);
  }

  /**
   * Get invoice service
   * @param {string} wsdl - WSDL URL
   * @param {Object} options - Optional configuration
   * @returns {InvoiceService} Invoice service instance
   */
  invoice(wsdl, options = {}) {
    return this._createDirectService('invoice', InvoiceService, wsdl, options);
  }

  /**
   * Get pricing configuration service
   * @param {string} wsdl - WSDL URL
   * @param {Object} options - Optional configuration
   * @returns {PricingConfigurationService} Pricing configuration service instance
   */
  pricingConfig(wsdl, options = {}) {
    return this._createDirectService('pricingConfig', PricingConfigurationService, wsdl, options);
  }

  /**
   * Get product media service
   * @param {string} wsdl - WSDL URL
   * @param {Object} options - Optional configuration
   * @returns {ProductMediaService} Product media service instance
   */
  productMedia(wsdl, options = {}) {
    return this._createDirectService('productMedia', ProductMediaService, wsdl, options);
  }

  /**
   * Get purchase order service
   * @param {string} wsdl - WSDL URL
   * @param {Object} options - Optional configuration
   * @returns {PurchaseOrderService} Purchase order service instance
   */
  purchaseOrder(wsdl, options = {}) {
    return this._createDirectService('purchaseOrder', PurchaseOrderService, wsdl, options);
  }

  /**
   * Get product compliance service
   * @param {string} wsdl - WSDL URL
   * @param {Object} options - Optional configuration
   * @returns {ProductComplianceService} Product compliance service instance
   */
  productCompliance(wsdl, options = {}) {
    return this._createDirectService('productCompliance', ProductComplianceService, wsdl, options);
  }

  /**
   * Get company data service
   * @param {string} wsdl - WSDL URL
   * @param {Object} options - Optional configuration
   * @returns {CompanyDataService} Company data service instance
   */
  companyData(wsdl, options = {}) {
    return this._createDirectService('companyData', CompanyDataService, wsdl, options);
  }

  /**
   * Get remittance advice service
   * @param {string} wsdl - WSDL URL
   * @param {Object} options - Optional configuration
   * @returns {RemittanceAdviceService} Remittance advice service instance
   */
  remittanceAdvice(wsdl, options = {}) {
    return this._createDirectService('remittanceAdvice', RemittanceAdviceService, wsdl, options);
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
  }

  /**
   * Quick one-off call without maintaining client state
   */
  static async quickCall(options) {
    const { service, operation, wsdl, data, ...clientOptions } = options;

    if (!service || !operation) {
      throw new ValidationError(
        'service and operation are required for quickCall',
        { provided: Object.keys(options) }
      );
    }

    if (!wsdl) {
      throw new ValidationError(
        'wsdl is required for quickCall',
        { provided: Object.keys(options) }
      );
    }

    const client = new PromoStandardsClient(clientOptions);

    const serviceInstance = client[service](wsdl);

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
}

module.exports = PromoStandardsClient;
