const BaseService = require('../../core/base-service');
const { ValidationError } = require('../../core/errors');

/**
 * RemittanceAdviceService - PromoStandards Remittance Advice Service
 *
 * Provides methods to query payment remittance information.
 *
 * Operations:
 * - getRemittanceAdvice: Get payment remittance details
 */
class RemittanceAdviceService extends BaseService {
  static serviceName = 'RemittanceAdvice';
  static supportedVersions = ['1.0.0'];
  static defaultVersion = '1.0.0';

  constructor(options = {}) {
    super(options);

    this.operations = {
      getRemittanceAdvice: 'getRemittanceAdvice'
    };
  }

  /**
   * Get remittance advice
   * @param {Object} params - Request parameters
   * @param {string} params.queryType - Query type: 1=ByPaymentId, 2=ByDate
   * @param {string} params.paymentId - Payment ID (required for queryType 1)
   * @param {string|Date} params.remittanceDate - Remittance date (required for queryType 2)
   * @returns {Promise<Object>} Remittance advice response
   */
  async getRemittanceAdvice(params = {}) {
    const request = this.buildRequest(params);
    return this.call(this.operations.getRemittanceAdvice, request);
  }

  /**
   * Convenience method to get remittance by payment ID
   * @param {string} paymentId - Payment ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Remittance advice response
   */
  async getByPaymentId(paymentId, options = {}) {
    if (!paymentId) {
      throw new ValidationError(
        'paymentId is required for getByPaymentId',
        { method: 'getByPaymentId' }
      );
    }

    return this.getRemittanceAdvice({
      queryType: '1',
      paymentId,
      ...options
    });
  }

  /**
   * Convenience method to get remittance by date
   * @param {string|Date} date - Remittance date
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Remittance advice response
   */
  async getByDate(date, options = {}) {
    if (!date) {
      throw new ValidationError(
        'date is required for getByDate',
        { method: 'getByDate' }
      );
    }

    return this.getRemittanceAdvice({
      queryType: '2',
      remittanceDate: date,
      ...options
    });
  }

  /**
   * Build remittance advice request
   */
  buildRequest(params) {
    const request = {};

    // Query type
    const queryType = params.queryType || this.inferQueryType(params);
    if (!queryType) {
      throw new ValidationError(
        'queryType is required. Use 1=ByPaymentId, 2=ByDate',
        { method: 'getRemittanceAdvice' }
      );
    }
    request.queryType = queryType;

    // Payment ID (for queryType 1)
    if (queryType === '1' || queryType === 1) {
      if (!params.paymentId) {
        throw new ValidationError(
          'paymentId is required for queryType 1',
          { method: 'getRemittanceAdvice', queryType }
        );
      }
      request.paymentId = params.paymentId;
    }

    // Remittance date (for queryType 2)
    if (queryType === '2' || queryType === 2) {
      if (!params.remittanceDate && !params.date && !params.since) {
        throw new ValidationError(
          'remittanceDate is required for queryType 2',
          { method: 'getRemittanceAdvice', queryType }
        );
      }
      request.remittanceDate = this.formatTimestamp(params.remittanceDate || params.date || params.since);
    }

    return request;
  }

  /**
   * Infer query type from parameters
   */
  inferQueryType(params) {
    if (params.paymentId) {
      return '1'; // By payment ID
    }
    if (params.remittanceDate || params.date || params.since) {
      return '2'; // By date
    }
    return null;
  }

  /**
   * Format timestamp to ISO 8601
   */
  formatTimestamp(timestamp) {
    if (!timestamp) return null;

    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }

    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        throw new ValidationError(
          'Invalid timestamp format',
          { provided: timestamp, expected: 'ISO 8601 format' }
        );
      }
      return date.toISOString();
    }

    if (typeof timestamp === 'number') {
      return new Date(timestamp).toISOString();
    }

    throw new ValidationError(
      'Invalid timestamp type',
      { type: typeof timestamp, expected: 'Date, string, or number' }
    );
  }

  /**
   * Response validators
   */
  static responseValidators = {
    getRemittanceAdvice: (response) => {
      if (!response.remittanceAdviceArray && !response.remittanceAdvice) {
        throw new Error('Invalid response: missing remittance advice data');
      }
      return response;
    }
  };
}

module.exports = RemittanceAdviceService;
