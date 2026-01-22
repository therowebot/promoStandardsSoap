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
    
    this.auth = this.createAuth(options);
    
    this.client = new SoapClient({
      wsdl: this.wsdl,
      endpoint: this.endpoint,
      timeout: options.timeout,
      headers: options.headers,
      xmlOptions: options.xmlOptions
    });

    this.cache = options.cache || null;
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes
  }

  validateOptions(options) {
    if (!options.wsdl) {
      throw new ValidationError(
        'WSDL URL is required',
        { service: this.constructor.serviceName }
      );
    }

    const supportedVersions = this.constructor.supportedVersions || [];
    if (options.version && !supportedVersions.includes(options.version)) {
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

  async call(operation, data = {}, options = {}) {
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
    return this.client.getAvailableOperations();
  }

  async initialize() {
    await this.client.initialize();
    return this;
  }

  static create(options) {
    return new this(options);
  }
}

module.exports = BaseService;