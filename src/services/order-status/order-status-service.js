const BaseService = require('../../core/base-service');
const { ValidationError } = require('../../core/errors');

/**
 * OrderStatusService - PromoStandards Order Status Service
 *
 * Provides methods to query order status information from suppliers.
 *
 * Operations:
 * - getOrderStatus: Get status of orders by PO number or date range
 * - getIssue: Get details of a specific issue
 * - getServiceMethods: Get available service methods (v2.0.0 only)
 */
class OrderStatusService extends BaseService {
  static serviceName = 'OrderStatus';
  static supportedVersions = ['1.0.0', '2.0.0'];
  static defaultVersion = '2.0.0';

  constructor(options = {}) {
    super(options);

    // Define operations based on version
    if (this.version === '2.0.0') {
      this.operations = {
        getOrderStatus: 'getOrderStatus',
        getIssue: 'getIssue',
        getServiceMethods: 'getServiceMethods'
      };
    } else {
      // v1.0.0
      this.operations = {
        getOrderStatusDetails: 'getOrderStatusDetails',
        getOrderStatusTypes: 'getOrderStatusTypes'
      };
    }
  }

  /**
   * Get order status (v2.0.0)
   * @param {Object} params - Request parameters
   * @param {string} params.queryType - Query type: 1=PO, 2=SO, 3=DateRange, 4=All
   * @param {string} params.referenceNumber - PO or SO number (required for queryType 1 or 2)
   * @param {string|Date} params.statusTimeStamp - Filter by date (for queryType 3)
   * @param {string} params.returnIssueDetailType - Issue detail type
   * @param {boolean} params.returnProductDetail - Whether to return product details
   * @returns {Promise<Object>} Order status response
   */
  async getOrderStatus(params = {}) {
    if (this.version === '1.0.0') {
      // Redirect to v1 method
      return this.getOrderStatusDetails(params);
    }

    const request = this.buildOrderStatusRequest(params);
    return this.call(this.operations.getOrderStatus, request);
  }

  /**
   * Get order status details (v1.0.0)
   * @param {Object} params - Request parameters
   * @param {string} params.purchaseOrderNumber - The PO number to query
   * @returns {Promise<Object>} Order status details
   */
  async getOrderStatusDetails(params = {}) {
    if (this.version === '2.0.0') {
      // Redirect to v2 method with PO query type
      return this.getOrderStatus({
        queryType: '1', // PO query
        referenceNumber: params.purchaseOrderNumber || params.poNumber,
        ...params
      });
    }

    const request = {
      purchaseOrderNumber: params.purchaseOrderNumber || params.poNumber
    };

    if (!request.purchaseOrderNumber) {
      throw new ValidationError(
        'purchaseOrderNumber is required for getOrderStatusDetails',
        { method: 'getOrderStatusDetails' }
      );
    }

    return this.call(this.operations.getOrderStatusDetails, request);
  }

  /**
   * Get available order status types (v1.0.0 only)
   * @returns {Promise<Object>} Available status types
   */
  async getOrderStatusTypes() {
    if (this.version === '2.0.0') {
      throw new ValidationError(
        'getOrderStatusTypes is not available in version 2.0.0. Use getServiceMethods instead.',
        { version: this.version, availableIn: ['1.0.0'] }
      );
    }

    return this.call(this.operations.getOrderStatusTypes, {});
  }

  /**
   * Get issue details (v2.0.0)
   * @param {Object} params - Request parameters
   * @param {string} params.issueId - The issue ID to query
   * @returns {Promise<Object>} Issue details
   */
  async getIssue(params = {}) {
    if (this.version === '1.0.0') {
      throw new ValidationError(
        'getIssue is not available in version 1.0.0',
        { version: this.version, availableIn: ['2.0.0'] }
      );
    }

    if (!params.issueId) {
      throw new ValidationError(
        'issueId is required for getIssue',
        { method: 'getIssue' }
      );
    }

    const request = {
      issueId: params.issueId
    };

    return this.call(this.operations.getIssue, request);
  }

  /**
   * Get available service methods (v2.0.0)
   * @returns {Promise<Object>} Available service methods
   */
  async getServiceMethods() {
    if (this.version === '1.0.0') {
      throw new ValidationError(
        'getServiceMethods is not available in version 1.0.0',
        { version: this.version, availableIn: ['2.0.0'] }
      );
    }

    return this.call(this.operations.getServiceMethods, {});
  }

  /**
   * Build order status request for v2.0.0
   */
  buildOrderStatusRequest(params) {
    const request = {};

    // Query type is required
    const queryType = params.queryType || this.inferQueryType(params);
    if (!queryType) {
      throw new ValidationError(
        'queryType is required. Use 1=PO, 2=SO, 3=DateRange, 4=All',
        { method: 'getOrderStatus' }
      );
    }
    request.queryType = queryType;

    // Reference number (required for PO and SO queries)
    if (queryType === '1' || queryType === '2' || queryType === 1 || queryType === 2) {
      const refNum = params.referenceNumber || params.poNumber || params.purchaseOrderNumber || params.soNumber || params.salesOrderNumber;
      if (!refNum) {
        throw new ValidationError(
          `referenceNumber is required for queryType ${queryType}`,
          { method: 'getOrderStatus', queryType }
        );
      }
      request.referenceNumber = refNum;
    }

    // Status timestamp (for date range queries)
    if (params.statusTimeStamp || params.since || params.fromDate) {
      request.statusTimeStamp = this.formatTimestamp(params.statusTimeStamp || params.since || params.fromDate);
    }

    // Optional parameters
    if (params.returnIssueDetailType !== undefined) {
      request.returnIssueDetailType = params.returnIssueDetailType;
    }

    if (params.returnProductDetail !== undefined) {
      request.returnProductDetail = params.returnProductDetail;
    }

    return request;
  }

  /**
   * Infer query type from parameters
   */
  inferQueryType(params) {
    if (params.poNumber || params.purchaseOrderNumber) {
      return '1'; // PO query
    }
    if (params.soNumber || params.salesOrderNumber) {
      return '2'; // SO query
    }
    if (params.statusTimeStamp || params.since || params.fromDate) {
      return '3'; // Date range query
    }
    return null;
  }

  /**
   * Format timestamp to ISO 8601
   */
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

  /**
   * Response validators
   */
  static responseValidators = {
    getOrderStatus: (response) => {
      // After normalizeJsonResponse, all keys are camelCase
      if (!response.orderStatusArray && !response.orderStatus) {
        throw new Error('Invalid response: missing orderStatus data');
      }
      return response;
    },

    getOrderStatusDetails: (response) => {
      if (!response.orderStatusDetails && !response.orderStatus) {
        throw new Error('Invalid response: missing orderStatusDetails');
      }
      return response;
    },

    getOrderStatusTypes: (response) => {
      if (!response.orderStatusTypes && !response.statusTypes) {
        throw new Error('Invalid response: missing orderStatusTypes');
      }
      return response;
    },

    getIssue: (response) => {
      if (!response.issue && !response.issueArray) {
        throw new Error('Invalid response: missing issue data');
      }
      return response;
    },

    getServiceMethods: (response) => {
      if (!response.serviceMethods && !response.serviceMethodArray) {
        throw new Error('Invalid response: missing serviceMethods');
      }
      return response;
    }
  };
}

module.exports = OrderStatusService;
