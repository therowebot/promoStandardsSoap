const { AuthenticationError } = require('./errors');
const debug = require('debug')('promostandards:auth');

class PromoStandardsAuth {
  constructor(credentials = {}) {
    this.validateCredentials(credentials);
    
    this.id = credentials.id || credentials.username;
    this.password = credentials.password;
    this.wsVersion = credentials.wsVersion || credentials.version;
    
    this.includePassword = credentials.includePassword !== false;
  }

  validateCredentials(credentials) {
    if (!credentials.id && !credentials.username) {
      throw new AuthenticationError(
        'Missing required credential: id or username',
        { provided: Object.keys(credentials) }
      );
    }

    if (credentials.id && credentials.id.length > 64) {
      throw new AuthenticationError(
        'ID exceeds maximum length of 64 characters',
        { length: credentials.id.length }
      );
    }

    if (credentials.password && credentials.password.length > 64) {
      throw new AuthenticationError(
        'Password exceeds maximum length of 64 characters',
        { length: credentials.password.length }
      );
    }
  }

  buildAuthHeader(wsVersion) {
    const version = wsVersion || this.wsVersion;
    
    if (!version) {
      throw new AuthenticationError(
        'wsVersion is required for authentication',
        { availableVersions: ['1.0.0', '1.2.1', '2.0.0'] }
      );
    }

    const authHeader = {
      wsVersion: version,
      id: this.id
    };

    if (this.includePassword && this.password) {
      authHeader.password = this.password;
    }

    debug('Built auth header:', { ...authHeader, password: authHeader.password ? '***' : undefined });
    
    return authHeader;
  }

  injectAuth(requestData, wsVersion) {
    const authHeader = this.buildAuthHeader(wsVersion);
    
    if (typeof requestData !== 'object' || requestData === null) {
      return authHeader;
    }

    if (Array.isArray(requestData)) {
      return [authHeader, ...requestData];
    }

    return {
      ...authHeader,
      ...requestData
    };
  }

  updateCredentials(newCredentials) {
    this.validateCredentials({ ...this.getCredentials(), ...newCredentials });
    
    if (newCredentials.id || newCredentials.username) {
      this.id = newCredentials.id || newCredentials.username;
    }
    
    if (newCredentials.password !== undefined) {
      this.password = newCredentials.password;
    }
    
    if (newCredentials.wsVersion !== undefined || newCredentials.version !== undefined) {
      this.wsVersion = newCredentials.wsVersion || newCredentials.version;
    }
  }

  getCredentials() {
    return {
      id: this.id,
      password: this.password,
      wsVersion: this.wsVersion
    };
  }

  static fromEnvironment(prefix = 'PROMOSTANDARDS') {
    const credentials = {
      id: process.env[`${prefix}_ID`] || process.env[`${prefix}_USERNAME`],
      password: process.env[`${prefix}_PASSWORD`],
      wsVersion: process.env[`${prefix}_VERSION`] || process.env[`${prefix}_WS_VERSION`]
    };

    const hasAnyCredential = Object.values(credentials).some(v => v !== undefined);
    
    if (!hasAnyCredential) {
      debug('No environment credentials found');
      return null;
    }

    return new PromoStandardsAuth(credentials);
  }

  static validateServiceAuth(serviceName, requiredVersion) {
    return (auth) => {
      if (!auth || !(auth instanceof PromoStandardsAuth)) {
        throw new AuthenticationError(
          `Invalid authentication for ${serviceName}`,
          { service: serviceName }
        );
      }

      if (requiredVersion && auth.wsVersion !== requiredVersion) {
        throw new AuthenticationError(
          `Invalid wsVersion for ${serviceName}. Required: ${requiredVersion}, Provided: ${auth.wsVersion}`,
          { service: serviceName, required: requiredVersion, provided: auth.wsVersion }
        );
      }

      return true;
    };
  }
}

module.exports = PromoStandardsAuth;