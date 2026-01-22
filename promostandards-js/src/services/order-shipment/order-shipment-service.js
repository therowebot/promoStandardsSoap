const BaseService = require('../../core/base-service');
const { ValidationError } = require('../../core/errors');

/**
 * OrderShipmentNotificationService (OSN) - PromoStandards Order Shipment Notification Service
 *
 * Provides methods to query shipment information for orders.
 *
 * Operations:
 * - getOrderShipmentNotification: Get shipment details for orders
 */
class OrderShipmentNotificationService extends BaseService {
  static serviceName = 'OrderShipmentNotification';
  static supportedVersions = ['1.0.0', '2.0.0', '2.1.0'];
  static defaultVersion = '2.0.0';

  constructor(options = {}) {
    super(options);

    this.operations = {
      getOrderShipmentNotification: 'getOrderShipmentNotification'
    };
  }

  /**
   * Get order shipment notification
   * @param {Object} params - Request parameters
   * @param {string} params.queryType - Query type: 1=PO, 2=SO, 3=DateRange
   * @param {string} params.referenceNumber - PO or SO number (required for queryType 1 or 2)
   * @param {string|Date} params.shipmentDateTimestamp - Shipment date filter (for queryType 3)
   * @returns {Promise<Object>} Shipment notification response
   */
  async getOrderShipmentNotification(params = {}) {
    const request = this.buildShipmentRequest(params);
    return this.call(this.operations.getOrderShipmentNotification, request);
  }

  /**
   * Convenience method to get shipments by PO number
   * @param {string} poNumber - Purchase order number
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Shipment notification response
   */
  async getShipmentsByPO(poNumber, options = {}) {
    if (!poNumber) {
      throw new ValidationError(
        'poNumber is required for getShipmentsByPO',
        { method: 'getShipmentsByPO' }
      );
    }

    return this.getOrderShipmentNotification({
      queryType: '1',
      referenceNumber: poNumber,
      ...options
    });
  }

  /**
   * Convenience method to get shipments by SO number
   * @param {string} soNumber - Sales order number
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Shipment notification response
   */
  async getShipmentsBySO(soNumber, options = {}) {
    if (!soNumber) {
      throw new ValidationError(
        'soNumber is required for getShipmentsBySO',
        { method: 'getShipmentsBySO' }
      );
    }

    return this.getOrderShipmentNotification({
      queryType: '2',
      referenceNumber: soNumber,
      ...options
    });
  }

  /**
   * Convenience method to get shipments by date range
   * @param {string|Date} since - Get shipments since this date
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Shipment notification response
   */
  async getShipmentsSince(since, options = {}) {
    if (!since) {
      throw new ValidationError(
        'since date is required for getShipmentsSince',
        { method: 'getShipmentsSince' }
      );
    }

    return this.getOrderShipmentNotification({
      queryType: '3',
      shipmentDateTimestamp: since,
      ...options
    });
  }

  /**
   * Build shipment request
   */
  buildShipmentRequest(params) {
    const request = {};

    // Query type is required
    const queryType = params.queryType || this.inferQueryType(params);
    if (!queryType) {
      throw new ValidationError(
        'queryType is required. Use 1=PO, 2=SO, 3=DateRange',
        { method: 'getOrderShipmentNotification' }
      );
    }
    request.queryType = queryType;

    // Reference number (required for PO and SO queries)
    if (queryType === '1' || queryType === '2' || queryType === 1 || queryType === 2) {
      const refNum = params.referenceNumber || params.poNumber || params.purchaseOrderNumber || params.soNumber || params.salesOrderNumber;
      if (!refNum) {
        throw new ValidationError(
          `referenceNumber is required for queryType ${queryType}`,
          { method: 'getOrderShipmentNotification', queryType }
        );
      }
      request.referenceNumber = refNum;
    }

    // Shipment date timestamp (for date range queries)
    if (params.shipmentDateTimestamp || params.since || params.fromDate) {
      request.shipmentDateTimestamp = this.formatTimestamp(
        params.shipmentDateTimestamp || params.since || params.fromDate
      );
    } else if (queryType === '3' || queryType === 3) {
      throw new ValidationError(
        'shipmentDateTimestamp is required for queryType 3 (DateRange)',
        { method: 'getOrderShipmentNotification', queryType }
      );
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
    if (params.shipmentDateTimestamp || params.since || params.fromDate) {
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
    getOrderShipmentNotification: (response) => {
      // After normalizeJsonResponse, all keys are camelCase
      if (!response.orderShipmentNotificationArray && !response.salesOrderArray && !response.shipmentNotification) {
        throw new Error('Invalid response: missing shipment notification data');
      }
      return response;
    }
  };
}

module.exports = OrderShipmentNotificationService;
