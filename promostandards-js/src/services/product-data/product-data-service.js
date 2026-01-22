const BaseService = require('../../core/base-service');
const { ValidationError } = require('../../core/errors');

class ProductDataService extends BaseService {
  static serviceName = 'ProductData';
  static supportedVersions = ['1.0.0', '2.0.0'];
  static defaultVersion = '2.0.0';

  async getProduct(params = {}) {
    const request = {
      productId: params.productId || params.productID,
      localizationCountry: params.localizationCountry || params.country || 'US',
      localizationLanguage: params.localizationLanguage || params.language || 'en'
    };

    if (!request.productId) {
      throw new ValidationError(
        'productId is required for getProduct',
        { method: 'getProduct' }
      );
    }

    if (this.version === '2.0.0' && params.productIdType) {
      request.productIDtype = params.productIdType;
    }

    return this.call('getProduct', request);
  }

  async getProductDateModified(params = {}) {
    const request = {
      changeTimeStamp: this.formatTimestamp(params.changeTimeStamp || params.since || params.modifiedSince),
      localizationCountry: params.localizationCountry || params.country || 'US',
      localizationLanguage: params.localizationLanguage || params.language || 'en'
    };

    if (!request.changeTimeStamp) {
      throw new ValidationError(
        'changeTimeStamp is required for getProductDateModified',
        { method: 'getProductDateModified' }
      );
    }

    return this.call('getProductDateModified', request);
  }

  async getProductSellable(params = {}) {
    const request = {
      productId: params.productId || params.productID,
      localizationCountry: params.localizationCountry || params.country || 'US',
      localizationLanguage: params.localizationLanguage || params.language || 'en'
    };

    if (!request.productId) {
      throw new ValidationError(
        'productId is required for getProductSellable',
        { method: 'getProductSellable' }
      );
    }

    if (params.partId || params.partID) {
      request.partId = params.partId || params.partID;
    }

    if (this.version === '2.0.0') {
      request.isSellable = params.isSellable !== undefined ? params.isSellable : true;
      
      if (params.productIdType) {
        request.productIDtype = params.productIdType;
      }
    }

    return this.call('getProductSellable', request);
  }

  async getProductCloseout(params = {}) {
    if (this.version === '1.0.0') {
      throw new ValidationError(
        'getProductCloseout is not available in version 1.0.0',
        { version: this.version, availableIn: ['2.0.0'] }
      );
    }

    const request = {
      localizationCountry: params.localizationCountry || params.country || 'US',
      localizationLanguage: params.localizationLanguage || params.language || 'en'
    };

    return this.call('getProductCloseOut', request);
  }

  formatTimestamp(timestamp) {
    if (!timestamp) {
      return null;
    }

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

  static responseValidators = {
    getProduct: (response) => {
      if (!response.Product && !response.product) {
        throw new Error('Invalid response: missing Product data');
      }
      return response;
    },
    
    getProductDateModified: (response) => {
      if (!response.ProductDateModifiedArray && !response.productDateModifiedArray) {
        throw new Error('Invalid response: missing ProductDateModifiedArray');
      }
      return response;
    },
    
    getProductSellable: (response) => {
      if (!response.ProductSellableArray && !response.productSellableArray) {
        throw new Error('Invalid response: missing ProductSellableArray');
      }
      return response;
    },
    
    getProductCloseOut: (response) => {
      if (!response.ProductCloseOutArray && !response.productCloseOutArray) {
        throw new Error('Invalid response: missing ProductCloseOutArray');
      }
      return response;
    }
  };
}

module.exports = ProductDataService;