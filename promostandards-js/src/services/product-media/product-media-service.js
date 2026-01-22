const BaseService = require('../../core/base-service');
const { ValidationError } = require('../../core/errors');

/**
 * ProductMediaService - PromoStandards Media Content Service
 *
 * Provides methods to query product media (images, videos, etc).
 *
 * Operations:
 * - getMediaContent: Get media URLs for a product
 * - getMediaDateModified: Get products with modified media since date
 */
class ProductMediaService extends BaseService {
  static serviceName = 'ProductMedia';
  static supportedVersions = ['1.0.0', '1.1.0'];
  static defaultVersion = '1.1.0';

  constructor(options = {}) {
    super(options);

    this.operations = {
      getMediaContent: 'getMediaContent',
      getMediaDateModified: 'getMediaDateModified'
    };
  }

  /**
   * Get media content for a product
   * @param {Object} params - Request parameters
   * @param {string} params.productId - Product ID
   * @param {string} params.mediaType - Media type filter (optional)
   * @param {string} params.partId - Part ID filter (optional)
   * @param {string} params.classType - Class type filter (optional)
   * @param {string} params.localizationCountry - Country code
   * @param {string} params.localizationLanguage - Language code
   * @returns {Promise<Object>} Media content response
   */
  async getMediaContent(params = {}) {
    if (!params.productId) {
      throw new ValidationError(
        'productId is required for getMediaContent',
        { method: 'getMediaContent' }
      );
    }

    const request = {
      productId: params.productId,
      localizationCountry: params.localizationCountry || params.country || 'US',
      localizationLanguage: params.localizationLanguage || params.language || 'en'
    };

    if (params.mediaType) {
      request.mediaType = params.mediaType;
    }

    if (params.partId) {
      request.partId = params.partId;
    }

    if (params.classType) {
      request.classType = params.classType;
    }

    return this.call(this.operations.getMediaContent, request);
  }

  /**
   * Get products with media modified since date
   * @param {Object} params - Request parameters
   * @param {string|Date} params.changeTimeStamp - Get media modified since this date
   * @param {string} params.localizationCountry - Country code
   * @param {string} params.localizationLanguage - Language code
   * @returns {Promise<Object>} Modified media response
   */
  async getMediaDateModified(params = {}) {
    if (!params.changeTimeStamp && !params.since && !params.modifiedSince) {
      throw new ValidationError(
        'changeTimeStamp is required for getMediaDateModified',
        { method: 'getMediaDateModified' }
      );
    }

    const request = {
      changeTimeStamp: this.formatTimestamp(params.changeTimeStamp || params.since || params.modifiedSince),
      localizationCountry: params.localizationCountry || params.country || 'US',
      localizationLanguage: params.localizationLanguage || params.language || 'en'
    };

    return this.call(this.operations.getMediaDateModified, request);
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
    getMediaContent: (response) => {
      if (!response.mediaContentArray && !response.mediaContent) {
        throw new Error('Invalid response: missing media content');
      }
      return response;
    },

    getMediaDateModified: (response) => {
      if (!response.mediaDateModifiedArray && !response.mediaDateModified) {
        throw new Error('Invalid response: missing media date modified');
      }
      return response;
    }
  };
}

module.exports = ProductMediaService;
