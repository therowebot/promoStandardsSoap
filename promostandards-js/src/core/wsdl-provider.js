const debug = require('debug')('promostandards:wsdl-provider');
const { ValidationError } = require('./errors');

/**
 * WSDLProvider - Abstraction for resolving WSDL URLs
 *
 * Supports three modes:
 * 1. Static WSDL URL (backward compatible)
 * 2. Supplier-based discovery via OneSource
 * 3. Custom resolver function
 */
class WSDLProvider {
  constructor(options = {}) {
    this.staticWsdl = options.wsdl;
    this.supplierId = options.supplierId;
    this.serviceName = options.serviceName;
    this.version = options.version;
    this.onesource = options.onesource;
    this.customResolver = options.resolver;

    // Cache for resolved WSDL
    this._resolvedWsdl = null;
    this._resolvedEndpoint = null;
    this._resolvedVersion = null;
    this._resolving = null; // Promise for concurrent resolution
  }

  /**
   * Check if WSDL is immediately available (static mode)
   */
  isStatic() {
    return !!this.staticWsdl;
  }

  /**
   * Check if WSDL has been resolved
   */
  isResolved() {
    return !!this._resolvedWsdl;
  }

  /**
   * Resolve WSDL URL - returns cached result or fetches from OneSource
   * @returns {Promise<{wsdl: string, endpoint?: string, version?: string}>}
   */
  async resolve() {
    // Return cached result
    if (this._resolvedWsdl) {
      debug(`Returning cached WSDL: ${this._resolvedWsdl}`);
      return {
        wsdl: this._resolvedWsdl,
        endpoint: this._resolvedEndpoint,
        version: this._resolvedVersion
      };
    }

    // Static WSDL - no resolution needed
    if (this.staticWsdl) {
      this._resolvedWsdl = this.staticWsdl;
      debug(`Using static WSDL: ${this.staticWsdl}`);
      return { wsdl: this.staticWsdl };
    }

    // Prevent concurrent resolution - return existing promise
    if (this._resolving) {
      debug('Resolution already in progress, waiting...');
      return this._resolving;
    }

    debug(`Resolving WSDL for supplier: ${this.supplierId}, service: ${this.serviceName}`);
    this._resolving = this._doResolve();

    try {
      const result = await this._resolving;
      return result;
    } finally {
      this._resolving = null;
    }
  }

  /**
   * Internal resolution logic
   * @private
   */
  async _doResolve() {
    // Custom resolver
    if (this.customResolver) {
      debug('Using custom resolver');
      const result = await this.customResolver(this.supplierId, this.serviceName, this.version);
      this._resolvedWsdl = result.wsdl;
      this._resolvedEndpoint = result.endpoint;
      this._resolvedVersion = result.version;
      return result;
    }

    // OneSource discovery
    if (this.onesource && this.supplierId && this.serviceName) {
      debug(`Fetching from OneSource: ${this.supplierId}/${this.serviceName}`);
      const endpoint = await this.onesource.getServiceEndpoint(
        this.supplierId,
        this.serviceName,
        this.version
      );

      this._resolvedWsdl = endpoint.wsdl;
      this._resolvedEndpoint = endpoint.endpoint;
      this._resolvedVersion = endpoint.version;

      debug(`Resolved WSDL: ${endpoint.wsdl}, version: ${endpoint.version}`);

      return {
        wsdl: endpoint.wsdl,
        endpoint: endpoint.endpoint,
        version: endpoint.version
      };
    }

    throw new ValidationError(
      'Cannot resolve WSDL: provide wsdl, supplierId with onesource, or custom resolver',
      { supplierId: this.supplierId, serviceName: this.serviceName }
    );
  }

  /**
   * Get the resolved WSDL URL (or null if not yet resolved)
   */
  getWsdl() {
    return this._resolvedWsdl || this.staticWsdl;
  }

  /**
   * Get the resolved endpoint URL (or null if not yet resolved)
   */
  getEndpoint() {
    return this._resolvedEndpoint;
  }

  /**
   * Get the resolved version (or null if not yet resolved)
   */
  getVersion() {
    return this._resolvedVersion || this.version;
  }

  /**
   * Create a static provider from WSDL URL
   * @param {string} wsdl - WSDL URL
   * @returns {WSDLProvider}
   */
  static fromWsdl(wsdl) {
    return new WSDLProvider({ wsdl });
  }

  /**
   * Create a provider for supplier-based discovery
   * @param {string} supplierId - Supplier identifier
   * @param {string} serviceName - Service name (e.g., 'inventory')
   * @param {OneSourceClient} onesource - OneSource client instance
   * @param {string} [version] - Optional version
   * @returns {WSDLProvider}
   */
  static fromSupplier(supplierId, serviceName, onesource, version) {
    return new WSDLProvider({ supplierId, serviceName, onesource, version });
  }

  /**
   * Create a provider with a custom resolver function
   * @param {Function} resolver - Async function (supplierId, serviceName, version) => {wsdl, endpoint?, version?}
   * @returns {WSDLProvider}
   */
  static fromResolver(resolver) {
    return new WSDLProvider({ resolver });
  }
}

module.exports = WSDLProvider;
