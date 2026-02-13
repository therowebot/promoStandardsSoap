const BaseService = require('../../core/base-service');
const { ValidationError } = require('../../core/errors');

/**
 * ProductComplianceService - PromoStandards Product Compliance Service
 *
 * Provides methods to query product compliance and safety information.
 *
 * Operations:
 * - getProductComplianceInfo: Get compliance/safety info for a product
 */
class ProductComplianceService extends BaseService {
  static serviceName = 'ProductCompliance';
  static supportedVersions = ['1.0.0'];
  static defaultVersion = '1.0.0';

  constructor(options = {}) {
    super(options);

    this.operations = {
      getProductComplianceInfo: 'getProductComplianceInfo'
    };
  }

  /**
   * Get product compliance information
   * @param {Object} params - Request parameters
   * @param {string} params.productId - Product ID
   * @param {string} params.partId - Part ID (optional)
   * @param {string} params.localizationCountry - Country code
   * @param {string} params.localizationLanguage - Language code
   * @returns {Promise<Object>} Compliance info response
   */
  async getProductComplianceInfo(params = {}) {
    if (!params.productId) {
      throw new ValidationError(
        'productId is required for getProductComplianceInfo',
        { method: 'getProductComplianceInfo' }
      );
    }

    const request = {
      productId: params.productId,
      localizationCountry: params.localizationCountry || params.country || 'US',
      localizationLanguage: params.localizationLanguage || params.language || 'en'
    };

    if (params.partId) {
      request.partId = params.partId;
    }

    return this.call(this.operations.getProductComplianceInfo, request);
  }

  /**
   * Response validators
   */
  static responseValidators = {
    getProductComplianceInfo: (response) => {
      if (!response.productComplianceArray && !response.productCompliance) {
        throw new Error('Invalid response: missing compliance info');
      }
      return response;
    }
  };
}

module.exports = ProductComplianceService;
