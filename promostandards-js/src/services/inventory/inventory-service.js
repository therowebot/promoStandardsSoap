const BaseService = require('../../core/base-service');
const { ValidationError } = require('../../core/errors');

class InventoryService extends BaseService {
  static serviceName = 'Inventory';
  static supportedVersions = ['1.2.1', '2.0.0'];
  static defaultVersion = '2.0.0';

  constructor(options = {}) {
    super(options);
    
    if (this.version === '1.2.1') {
      this.operations = {
        getFilterValues: 'getFilterValues',
        getInventoryLevels: 'getInventoryLevels'
      };
    } else {
      this.operations = {
        getFilterValues: 'getFilterValues',
        getInventoryLevels: 'getInventoryLevels'
      };
    }
  }

  async getInventoryLevels(params = {}) {
    const requestData = this.buildInventoryRequest(params);
    return this.call(this.operations.getInventoryLevels, requestData);
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
    const request = {
      productId: params.productId || params.productID,
      Filter: {}
    };

    if (!request.productId) {
      throw new ValidationError(
        'productId is required for getInventoryLevels',
        { version: '1.2.1' }
      );
    }

    if (params.partIdArray || params.partIds) {
      request.Filter.partIdArray = {
        partId: Array.isArray(params.partIdArray || params.partIds) 
          ? (params.partIdArray || params.partIds) 
          : [params.partIdArray || params.partIds]
      };
    }

    if (params.labelSizeArray || params.labelSizes) {
      request.Filter.LabelSizeArray = {
        labelSize: Array.isArray(params.labelSizeArray || params.labelSizes)
          ? (params.labelSizeArray || params.labelSizes)
          : [params.labelSizeArray || params.labelSizes]
      };
    }

    if (params.partColorArray || params.partColors) {
      request.Filter.PartColorArray = {
        partColor: Array.isArray(params.partColorArray || params.partColors)
          ? (params.partColorArray || params.partColors)
          : [params.partColorArray || params.partColors]
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
      if (!response.Inventory && !response.inventory) {
        throw new Error('Invalid response: missing Inventory data');
      }
      return response;
    },
    
    getFilterValues: (response) => {
      if (!response.FilterValues && !response.filterValues) {
        throw new Error('Invalid response: missing FilterValues');
      }
      return response;
    }
  };
}

module.exports = InventoryService;