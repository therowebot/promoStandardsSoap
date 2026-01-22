const BaseService = require('../../core/base-service');
const { ValidationError } = require('../../core/errors');

/**
 * PricingConfigurationService (PPC) - PromoStandards Pricing and Configuration Service
 *
 * Provides methods to query product pricing and configuration options.
 *
 * Operations:
 * - getConfigurationAndPricing: Get pricing and configuration for a product
 * - getAvailableLocations: Get available decoration locations
 * - getAvailableCharges: Get available charges for a product
 * - getDecorationColors: Get available decoration colors
 * - getFobPoints: Get FOB shipping points
 */
class PricingConfigurationService extends BaseService {
  static serviceName = 'PricingConfiguration';
  static supportedVersions = ['1.0.0', '2.0.0'];
  static defaultVersion = '1.0.0';

  constructor(options = {}) {
    super(options);

    this.operations = {
      getConfigurationAndPricing: 'getConfigurationAndPricing',
      getAvailableLocations: 'getAvailableLocations',
      getAvailableCharges: 'getAvailableCharges',
      getDecorationColors: 'getDecorationColors',
      getFobPoints: 'getFobPoints'
    };
  }

  /**
   * Get configuration and pricing for a product
   * @param {Object} params - Request parameters
   * @param {string} params.productId - Product ID
   * @param {string} params.partId - Part ID (optional)
   * @param {string} params.currency - Currency code (default: USD)
   * @param {string} params.fobId - FOB point ID
   * @param {string} params.priceType - Price type
   * @param {string} params.localizationCountry - Country code (default: US)
   * @param {string} params.localizationLanguage - Language code (default: en)
   * @param {Object} params.configurationType - Configuration options
   * @returns {Promise<Object>} Pricing and configuration response
   */
  async getConfigurationAndPricing(params = {}) {
    if (!params.productId) {
      throw new ValidationError(
        'productId is required for getConfigurationAndPricing',
        { method: 'getConfigurationAndPricing' }
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

    if (params.currency) {
      request.currency = params.currency;
    }

    if (params.fobId) {
      request.fobId = params.fobId;
    }

    if (params.priceType) {
      request.priceType = params.priceType;
    }

    if (params.configurationType) {
      request.configurationType = params.configurationType;
    }

    return this.call(this.operations.getConfigurationAndPricing, request);
  }

  /**
   * Get available decoration locations for a product
   * @param {Object} params - Request parameters
   * @param {string} params.productId - Product ID
   * @param {string} params.localizationCountry - Country code
   * @param {string} params.localizationLanguage - Language code
   * @returns {Promise<Object>} Available locations response
   */
  async getAvailableLocations(params = {}) {
    if (!params.productId) {
      throw new ValidationError(
        'productId is required for getAvailableLocations',
        { method: 'getAvailableLocations' }
      );
    }

    const request = {
      productId: params.productId,
      localizationCountry: params.localizationCountry || params.country || 'US',
      localizationLanguage: params.localizationLanguage || params.language || 'en'
    };

    return this.call(this.operations.getAvailableLocations, request);
  }

  /**
   * Get available charges for a product
   * @param {Object} params - Request parameters
   * @param {string} params.productId - Product ID
   * @param {string} params.localizationCountry - Country code
   * @param {string} params.localizationLanguage - Language code
   * @returns {Promise<Object>} Available charges response
   */
  async getAvailableCharges(params = {}) {
    if (!params.productId) {
      throw new ValidationError(
        'productId is required for getAvailableCharges',
        { method: 'getAvailableCharges' }
      );
    }

    const request = {
      productId: params.productId,
      localizationCountry: params.localizationCountry || params.country || 'US',
      localizationLanguage: params.localizationLanguage || params.language || 'en'
    };

    return this.call(this.operations.getAvailableCharges, request);
  }

  /**
   * Get decoration colors for a product at a location
   * @param {Object} params - Request parameters
   * @param {string} params.productId - Product ID
   * @param {string} params.locationId - Location ID
   * @param {string} params.decorationId - Decoration method ID (optional)
   * @param {string} params.localizationCountry - Country code
   * @param {string} params.localizationLanguage - Language code
   * @returns {Promise<Object>} Decoration colors response
   */
  async getDecorationColors(params = {}) {
    if (!params.productId) {
      throw new ValidationError(
        'productId is required for getDecorationColors',
        { method: 'getDecorationColors' }
      );
    }

    if (!params.locationId) {
      throw new ValidationError(
        'locationId is required for getDecorationColors',
        { method: 'getDecorationColors' }
      );
    }

    const request = {
      productId: params.productId,
      locationId: params.locationId,
      localizationCountry: params.localizationCountry || params.country || 'US',
      localizationLanguage: params.localizationLanguage || params.language || 'en'
    };

    if (params.decorationId) {
      request.decorationId = params.decorationId;
    }

    return this.call(this.operations.getDecorationColors, request);
  }

  /**
   * Get FOB (Free On Board) shipping points
   * @param {Object} params - Request parameters
   * @param {string} params.productId - Product ID
   * @param {string} params.localizationCountry - Country code
   * @param {string} params.localizationLanguage - Language code
   * @returns {Promise<Object>} FOB points response
   */
  async getFobPoints(params = {}) {
    if (!params.productId) {
      throw new ValidationError(
        'productId is required for getFobPoints',
        { method: 'getFobPoints' }
      );
    }

    const request = {
      productId: params.productId,
      localizationCountry: params.localizationCountry || params.country || 'US',
      localizationLanguage: params.localizationLanguage || params.language || 'en'
    };

    return this.call(this.operations.getFobPoints, request);
  }

  /**
   * Response validators
   */
  static responseValidators = {
    getConfigurationAndPricing: (response) => {
      if (!response.configuration && !response.configurationAndPricing) {
        throw new Error('Invalid response: missing configuration data');
      }
      return response;
    },

    getAvailableLocations: (response) => {
      if (!response.availableLocationArray && !response.availableLocations) {
        throw new Error('Invalid response: missing available locations');
      }
      return response;
    },

    getAvailableCharges: (response) => {
      if (!response.availableChargeArray && !response.availableCharges) {
        throw new Error('Invalid response: missing available charges');
      }
      return response;
    },

    getDecorationColors: (response) => {
      if (!response.decorationColorArray && !response.decorationColors) {
        throw new Error('Invalid response: missing decoration colors');
      }
      return response;
    },

    getFobPoints: (response) => {
      if (!response.fobPointArray && !response.fobPoints) {
        throw new Error('Invalid response: missing FOB points');
      }
      return response;
    }
  };
}

module.exports = PricingConfigurationService;
