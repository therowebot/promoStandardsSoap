const SoapClient = require('./soap-client');
const PromoStandardsAuth = require('./auth');
const { ServiceError, ValidationError } = require('./errors');
const debug = require('debug')('promostandards:service');

class BaseService {
  constructor(options = {}) {
    this.validateOptions(options);

    this.serviceName = this.constructor.serviceName || 'Unknown';
    this.version = options.version || this.constructor.defaultVersion;
    this.wsdl = options.wsdl;
    this.endpoint = options.endpoint;

    // Support deferred WSDL resolution via provider
    this.wsdlProvider = options.wsdlProvider || null;

    this.auth = this.createAuth(options);

    // Store options for deferred SoapClient creation
    this._soapClientOptions = {
      timeout: options.timeout,
      headers: options.headers,
      xmlOptions: options.xmlOptions
    };

    // Create SoapClient immediately only if WSDL is available
    if (this.wsdl) {
      this.client = new SoapClient({
        wsdl: this.wsdl,
        endpoint: this.endpoint,
        ...this._soapClientOptions
      });
    } else {
      this.client = null;
    }

    this.cache = options.cache || null;
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes
  }

  validateOptions(options) {
    // Allow wsdl OR wsdlProvider (for lazy discovery)
    if (!options.wsdl && !options.wsdlProvider) {
      throw new ValidationError(
        'WSDL URL or wsdlProvider is required',
        { service: this.constructor.serviceName }
      );
    }

    const supportedVersions = this.constructor.supportedVersions || [];
    // Only validate version if explicitly provided and not using lazy discovery
    // (lazy discovery may return a different version)
    if (options.version && supportedVersions.length > 0 && !options.wsdlProvider) {
      if (!supportedVersions.includes(options.version)) {
        throw new ValidationError(
          `Unsupported version: ${options.version}`,
          {
            service: this.constructor.serviceName,
            supportedVersions,
            provided: options.version
          }
        );
      }
    }
  }

  createAuth(options) {
    if (options.auth instanceof PromoStandardsAuth) {
      return options.auth;
    }

    const authConfig = {
      id: options.id || options.username,
      password: options.password,
      wsVersion: options.version || this.version
    };

    if (options.auth && typeof options.auth === 'object') {
      Object.assign(authConfig, options.auth);
    }

    return new PromoStandardsAuth(authConfig);
  }

  /**
   * Ensure WSDL is resolved before making SOAP calls
   * Called automatically by call(), initialize(), and getAvailableOperations()
   */
  async ensureWsdlResolved() {
    // Already have a client - nothing to do
    if (this.client) {
      return;
    }

    if (!this.wsdlProvider) {
      throw new ValidationError(
        'No WSDL or wsdlProvider configured',
        { service: this.serviceName }
      );
    }

    debug(`Resolving WSDL for ${this.serviceName} via provider`);
    const resolved = await this.wsdlProvider.resolve();

    this.wsdl = resolved.wsdl;
    this.endpoint = resolved.endpoint || this.endpoint;

    // Update version if discovery returned one and we don't have one set
    if (resolved.version && !this.version) {
      this.version = resolved.version;
      // Update auth with resolved version
      if (this.auth && this.auth.wsVersion !== resolved.version) {
        this.auth.wsVersion = resolved.version;
      }
    }

    debug(`WSDL resolved: ${this.wsdl}, version: ${this.version}`);

    // Create the SOAP client now
    this.client = new SoapClient({
      wsdl: this.wsdl,
      endpoint: this.endpoint,
      ...this._soapClientOptions
    });
  }

  async call(operation, data = {}, options = {}) {
    // Ensure WSDL is resolved before making the call
    await this.ensureWsdlResolved();

    try {
      const cacheKey = this.getCacheKey(operation, data);

      if (this.cache && !options.noCache) {
        const cached = await this.getFromCache(cacheKey);
        if (cached) {
          debug(`Cache hit for ${operation}`);
          return cached;
        }
      }

      debug(`Calling ${this.serviceName}.${operation} v${this.version}`);

      const requestData = this.auth.injectAuth(data, this.version);
      const result = await this.client.call(operation, requestData, options);

      const validated = await this.validateResponse(operation, result);

      if (this.cache && !options.noCache) {
        await this.setCache(cacheKey, validated);
      }

      return validated;
    } catch (error) {
      throw this.handleError(error, operation);
    }
  }

  async validateResponse(operation, response) {
    const validator = this.getResponseValidator(operation);

    if (!validator) {
      return response;
    }

    try {
      const validated = await validator(response);
      return validated || response;
    } catch (error) {
      throw new ValidationError(
        `Invalid response from ${operation}: ${error.message}`,
        { operation, service: this.serviceName }
      );
    }
  }

  getResponseValidator(operation) {
    const validators = this.constructor.responseValidators || {};
    return validators[operation];
  }

  handleError(error, operation) {
    if (error instanceof ServiceError) {
      return error;
    }

    if (error.code === 'AUTH_ERROR') {
      error.details = { ...error.details, service: this.serviceName, operation };
      return error;
    }

    return new ServiceError(
      error.message,
      this.serviceName,
      operation,
      { originalError: error }
    );
  }

  getCacheKey(operation, data) {
    const dataString = JSON.stringify(data);
    return `${this.serviceName}:${this.version}:${operation}:${dataString}`;
  }

  async getFromCache(key) {
    if (!this.cache) return null;

    try {
      const cached = await this.cache.get(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age > this.cacheTTL) {
        await this.cache.delete(key);
        return null;
      }

      return data;
    } catch (error) {
      debug('Cache get error:', error);
      return null;
    }
  }

  async setCache(key, data) {
    if (!this.cache) return;

    try {
      const cacheData = JSON.stringify({
        data,
        timestamp: Date.now()
      });

      await this.cache.set(key, cacheData);
    } catch (error) {
      debug('Cache set error:', error);
    }
  }

  async getAvailableOperations() {
    await this.ensureWsdlResolved();
    return this.client.getAvailableOperations();
  }

  async initialize() {
    await this.ensureWsdlResolved();
    await this.client.initialize();
    return this;
  }

  /**
   * Check if the service has resolved its WSDL
   */
  isResolved() {
    return this.client !== null;
  }

  static create(options) {
    return new this(options);
  }
}

module.exports = BaseService;
