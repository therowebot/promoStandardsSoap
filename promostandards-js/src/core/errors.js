class PromoStandardsError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'PromoStandardsError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

class AuthenticationError extends PromoStandardsError {
  constructor(message, details) {
    super(message, 'AUTH_ERROR', details);
    this.name = 'AuthenticationError';
  }
}

class ValidationError extends PromoStandardsError {
  constructor(message, details) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

class ServiceError extends PromoStandardsError {
  constructor(message, service, operation, details) {
    super(message, 'SERVICE_ERROR', { service, operation, ...details });
    this.name = 'ServiceError';
  }
}

class NetworkError extends PromoStandardsError {
  constructor(message, details) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

class TimeoutError extends PromoStandardsError {
  constructor(message, timeout, details) {
    super(message, 'TIMEOUT_ERROR', { timeout, ...details });
    this.name = 'TimeoutError';
  }
}

module.exports = PromoStandardsError;
module.exports.AuthenticationError = AuthenticationError;
module.exports.ValidationError = ValidationError;
module.exports.ServiceError = ServiceError;
module.exports.NetworkError = NetworkError;
module.exports.TimeoutError = TimeoutError;