const BaseService = require('../../core/base-service');
const { ValidationError } = require('../../core/errors');

class InventoryService extends BaseService {
  static serviceName = 'Inventory';
  static supportedVersions = ['1.2.1', '2.0.0'];
  static defaultVersion = '2.0.0';

  constructor(options = {}) {
    super(options);

    // Operations are the same for both versions
    this.operations = {
      getFilterValues: 'getFilterValues',
      getInventoryLevels: 'getInventoryLevels'
    };
  }

  async getInventoryLevels(params = {}) {
    const requestData = this.buildInventoryRequest(params);
    // V1.2.1 uses element name "Request" per the official WSDL
    // V2.0.0 uses "GetInventoryLevelsRequest"
    const options = this.version === '1.2.1' ? { elementName: 'Request' } : {};
    return this.call(this.operations.getInventoryLevels, requestData, options);
  }

  async getFilterValues(params = {}) {
    const requestData = {
      productId: params.productId || params.productID
    };
    
    if (!requestData.productId) {
      throw new ValidationError(
        'productId is required for getFilterValues',
        { method: 'getFilterValues' }
      );
    }

    return this.call(this.operations.getFilterValues, requestData);
  }

  buildInventoryRequest(params) {
    if (this.version === '1.2.1') {
      return this.buildV1Request(params);
    } else {
      return this.buildV2Request(params);
    }
  }

  buildV1Request(params) {
    // V1.2.1 uses specific field names per the official XSD:
    // - productID (not productId)
    // - productIDtype (required)
    // - FilterColorArray, FilterSizeArray, FilterSelectionArray (not Filter)
    const productId = params.productId || params.productID;

    if (!productId) {
      throw new ValidationError(
        'productId is required for getInventoryLevels',
        { version: '1.2.1' }
      );
    }

    const request = {
      productID: productId,
      productIDtype: params.productIDtype || params.productIdType || 'Supplier'
    };

    // FilterColorArray
    if (params.filterColors || params.colors || params.partColors || params.partColorArray) {
      const colors = params.filterColors || params.colors || params.partColors || params.partColorArray;
      request.FilterColorArray = {
        filterColor: Array.isArray(colors) ? colors : [colors]
      };
    }

    // FilterSizeArray
    if (params.filterSizes || params.sizes || params.labelSizes || params.labelSizeArray) {
      const sizes = params.filterSizes || params.sizes || params.labelSizes || params.labelSizeArray;
      request.FilterSizeArray = {
        filterSize: Array.isArray(sizes) ? sizes : [sizes]
      };
    }

    // FilterSelectionArray (generic filter)
    if (params.filterSelections || params.partIds || params.partIdArray) {
      const selections = params.filterSelections || params.partIds || params.partIdArray;
      request.FilterSelectionArray = {
        filterSelection: Array.isArray(selections) ? selections : [selections]
      };
    }

    return request;
  }

  buildV2Request(params) {
    const request = {};

    if (params.productId || params.productID) {
      request.productId = params.productId || params.productID;
    }

    if (params.productIdType) {
      request.productIDtype = params.productIdType;
    }

    if (params.filters) {
      request.Filter = this.buildV2Filters(params.filters);
    } else if (params.filter) {
      request.Filter = params.filter;
    } else {
      const filters = {};
      
      if (params.partIds || params.partIdArray) {
        filters.partIdArray = Array.isArray(params.partIds || params.partIdArray)
          ? (params.partIds || params.partIdArray)
          : [params.partIds || params.partIdArray];
      }

      if (params.colors || params.colorArray) {
        filters.colorArray = Array.isArray(params.colors || params.colorArray)
          ? (params.colors || params.colorArray)
          : [params.colors || params.colorArray];
      }

      if (params.sizes || params.sizeArray) {
        filters.sizeArray = Array.isArray(params.sizes || params.sizeArray)
          ? (params.sizes || params.sizeArray)
          : [params.sizes || params.sizeArray];
      }

      if (Object.keys(filters).length > 0) {
        request.Filter = filters;
      }
    }

    return request;
  }

  buildV2Filters(filters) {
    const built = {};

    if (filters.partIds) {
      built.partIdArray = Array.isArray(filters.partIds) ? filters.partIds : [filters.partIds];
    }

    if (filters.colors) {
      built.colorArray = Array.isArray(filters.colors) ? filters.colors : [filters.colors];
    }

    if (filters.sizes) {
      built.sizeArray = Array.isArray(filters.sizes) ? filters.sizes : [filters.sizes];
    }

    return built;
  }

  static responseValidators = {
    getInventoryLevels: (response) => {
      // After normalizeJsonResponse, all keys are camelCase
      if (!response.inventory && !response.inventoryLevels) {
        throw new Error('Invalid response: missing inventory data');
      }
      return response;
    },

    getFilterValues: (response) => {
      // After normalizeJsonResponse, all keys are camelCase
      if (!response.filterValues) {
        throw new Error('Invalid response: missing filterValues');
      }
      return response;
    }
  };
}

module.exports = InventoryService;