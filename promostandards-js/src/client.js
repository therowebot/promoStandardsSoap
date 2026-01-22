const PromoStandardsAuth = require('./core/auth');
const InventoryService = require('./services/inventory/inventory-service');
const ProductDataService = require('./services/product-data/product-data-service');
const { ValidationError } = require('./core/errors');
const debug = require('debug')('promostandards:client');

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

  initializeServices(serviceConfigs) {
    const defaultServices = {
      inventory: InventoryService,
      productData: ProductDataService
    };

    for (const [name, ServiceClass] of Object.entries(defaultServices)) {
      const config = serviceConfigs[name];
      if (config && config.enabled !== false) {
        this.addService(name, ServiceClass, config);
      }
    }
  }

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

  async inventory(wsdl, options = {}) {
    const key = `inventory_${wsdl}`;
    
    if (!this.services.has(key)) {
      this.addService(key, InventoryService, { ...options, wsdl });
    }

    return this.getService(key);
  }

  async productData(wsdl, options = {}) {
    const key = `productData_${wsdl}`;
    
    if (!this.services.has(key)) {
      this.addService(key, ProductDataService, { ...options, wsdl });
    }

    return this.getService(key);
  }

  async call(serviceName, operation, data, options = {}) {
    const service = this.getService(serviceName);
    return service.call(operation, data, options);
  }

  updateAuth(credentials) {
    this.auth.updateCredentials(credentials);
    
    for (const service of this.services.values()) {
      service.auth = this.auth;
    }
  }

  static async quickCall(options) {
    const { service, operation, wsdl, data, ...clientOptions } = options;
    
    if (!service || !operation || !wsdl) {
      throw new ValidationError(
        'service, operation, and wsdl are required for quickCall',
        { provided: Object.keys(options) }
      );
    }

    const client = new PromoStandardsClient(clientOptions);
    const serviceInstance = await client[service](wsdl);
    
    if (!serviceInstance[operation]) {
      throw new ValidationError(
        `Operation '${operation}' not found in ${service} service`,
        { service, operation }
      );
    }

    return serviceInstance[operation](data);
  }

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