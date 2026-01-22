const debug = require('debug')('promostandards:wsdl-provider');
const { ValidationError } = require('./errors');

/**
 * WSDLProvider - Abstraction for resolving WSDL URLs
 *
 * Supports two modes:
 * 1. Static WSDL URL (backward compatible)
 * 2. Custom resolver function
 */
class WSDLProvider {
  constructor(options = {}) {
    this.staticWsdl = options.wsdl;
    this.version = options.version;
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
   * Resolve WSDL URL - returns cached result or uses resolver
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

    debug('Resolving WSDL...');
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
      const result = await this.customResolver(this.version);
      this._resolvedWsdl = result.wsdl;
      this._resolvedEndpoint = result.endpoint;
      this._resolvedVersion = result.version;
      return result;
    }

    throw new ValidationError(
      'Cannot resolve WSDL: provide wsdl or custom resolver',
      {}
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
   * Create a provider with a custom resolver function
   * @param {Function} resolver - Async function (version) => {wsdl, endpoint?, version?}
   * @returns {WSDLProvider}
   */
  static fromResolver(resolver) {
    return new WSDLProvider({ resolver });
  }
}

module.exports = WSDLProvider;
