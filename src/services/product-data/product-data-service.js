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
      localizationCountry: params.localizationCountry || params.country || 'US',
      localizationLanguage: params.localizationLanguage || params.language || 'en'
    };

    // productId is optional - if omitted, returns ALL sellable products
    const productId = params.productId || params.productID;
    if (productId) {
      request.productId = productId;
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

  static extractServiceMessage(response) {
    // Check for ServiceMessageArray in response (vendor error messages)
    const messageArray = response.serviceMessageArray || response.ServiceMessageArray;
    if (!messageArray) return null;

    // Handle both array and single message
    const messages = messageArray.serviceMessage || messageArray.ServiceMessage || messageArray;
    if (!messages) return null;

    const messageList = Array.isArray(messages) ? messages : [messages];
    if (messageList.length === 0) return null;

    // Extract code and description from first message
    const msg = messageList[0];
    const code = msg.code || msg.Code;
    const description = msg.description || msg.Description;

    if (code || description) {
      return { code, description, messages: messageList };
    }
    return null;
  }

  static responseValidators = {
    getProduct: (response) => {
      // Check for vendor error messages first
      const serviceMsg = ProductDataService.extractServiceMessage(response);
      if (serviceMsg && !response.product) {
        throw new Error(`Vendor error ${serviceMsg.code}: ${serviceMsg.description}`);
      }
      // After normalizeJsonResponse, all keys are camelCase
      if (!response.product) {
        throw new Error('Invalid response: missing product data');
      }
      return response;
    },

    getProductDateModified: (response) => {
      // Check for vendor error messages first
      const serviceMsg = ProductDataService.extractServiceMessage(response);
      if (serviceMsg && !response.productDateModifiedArray) {
        throw new Error(`Vendor error ${serviceMsg.code}: ${serviceMsg.description}`);
      }
      // After normalizeJsonResponse, all keys are camelCase
      if (!response.productDateModifiedArray) {
        throw new Error('Invalid response: missing productDateModifiedArray');
      }
      return response;
    },

    getProductSellable: (response) => {
      // Check for vendor error messages first
      const serviceMsg = ProductDataService.extractServiceMessage(response);
      if (serviceMsg && !response.productSellableArray) {
        throw new Error(`Vendor error ${serviceMsg.code}: ${serviceMsg.description}`);
      }
      // After normalizeJsonResponse, all keys are camelCase
      if (!response.productSellableArray) {
        throw new Error('Invalid response: missing productSellableArray');
      }
      return response;
    },

    getProductCloseOut: (response) => {
      // Check for vendor error messages first
      const serviceMsg = ProductDataService.extractServiceMessage(response);
      if (serviceMsg && !response.productCloseOutArray) {
        throw new Error(`Vendor error ${serviceMsg.code}: ${serviceMsg.description}`);
      }
      // After normalizeJsonResponse, all keys are camelCase
      if (!response.productCloseOutArray) {
        throw new Error('Invalid response: missing productCloseOutArray');
      }
      return response;
    }
  };
}

module.exports = ProductDataService;