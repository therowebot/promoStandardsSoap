const BaseService = require('../../core/base-service');
const { ValidationError } = require('../../core/errors');

/**
 * InvoiceService - PromoStandards Invoice Service
 *
 * Provides methods to query invoice information from suppliers.
 *
 * Operations:
 * - getInvoices: Get invoices by date range or invoice number
 * - getVoidedInvoices: Get voided invoices
 */
class InvoiceService extends BaseService {
  static serviceName = 'Invoice';
  static supportedVersions = ['1.0.0'];
  static defaultVersion = '1.0.0';

  constructor(options = {}) {
    super(options);

    this.operations = {
      getInvoices: 'getInvoices',
      getVoidedInvoices: 'getVoidedInvoices'
    };
  }

  /**
   * Get invoices
   * @param {Object} params - Request parameters
   * @param {string} params.queryType - Query type: 1=InvoiceNumber, 2=PO, 3=DateRange
   * @param {string} params.referenceNumber - Invoice number or PO (required for queryType 1 or 2)
   * @param {string|Date} params.requestedDate - Date filter (for queryType 3)
   * @param {string} params.availableTimeStamp - Filter by availability timestamp
   * @returns {Promise<Object>} Invoice response
   */
  async getInvoices(params = {}) {
    const request = this.buildInvoiceRequest(params);
    return this.call(this.operations.getInvoices, request);
  }

  /**
   * Get voided invoices
   * @param {Object} params - Request parameters
   * @param {string|Date} params.voidedTimeStamp - Get invoices voided since this date
   * @returns {Promise<Object>} Voided invoices response
   */
  async getVoidedInvoices(params = {}) {
    const request = {};

    if (params.voidedTimeStamp || params.since) {
      request.voidedTimeStamp = this.formatTimestamp(params.voidedTimeStamp || params.since);
    }

    return this.call(this.operations.getVoidedInvoices, request);
  }

  /**
   * Convenience method to get invoices by invoice number
   * @param {string} invoiceNumber - Invoice number
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Invoice response
   */
  async getByInvoiceNumber(invoiceNumber, options = {}) {
    if (!invoiceNumber) {
      throw new ValidationError(
        'invoiceNumber is required for getByInvoiceNumber',
        { method: 'getByInvoiceNumber' }
      );
    }

    return this.getInvoices({
      queryType: '1',
      referenceNumber: invoiceNumber,
      ...options
    });
  }

  /**
   * Convenience method to get invoices by PO number
   * @param {string} poNumber - Purchase order number
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Invoice response
   */
  async getByPO(poNumber, options = {}) {
    if (!poNumber) {
      throw new ValidationError(
        'poNumber is required for getByPO',
        { method: 'getByPO' }
      );
    }

    return this.getInvoices({
      queryType: '2',
      referenceNumber: poNumber,
      ...options
    });
  }

  /**
   * Convenience method to get invoices by date range
   * @param {string|Date} since - Get invoices since this date
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Invoice response
   */
  async getByDateRange(since, options = {}) {
    if (!since) {
      throw new ValidationError(
        'since date is required for getByDateRange',
        { method: 'getByDateRange' }
      );
    }

    return this.getInvoices({
      queryType: '3',
      requestedDate: since,
      ...options
    });
  }

  /**
   * Build invoice request
   */
  buildInvoiceRequest(params) {
    const request = {};

    // Query type is required
    const queryType = params.queryType || this.inferQueryType(params);
    if (!queryType) {
      throw new ValidationError(
        'queryType is required. Use 1=InvoiceNumber, 2=PO, 3=DateRange',
        { method: 'getInvoices' }
      );
    }
    request.queryType = queryType;

    // Reference number (required for invoice and PO queries)
    if (queryType === '1' || queryType === '2' || queryType === 1 || queryType === 2) {
      const refNum = params.referenceNumber || params.invoiceNumber || params.poNumber || params.purchaseOrderNumber;
      if (!refNum) {
        throw new ValidationError(
          `referenceNumber is required for queryType ${queryType}`,
          { method: 'getInvoices', queryType }
        );
      }
      request.referenceNumber = refNum;
    }

    // Requested date (for date range queries)
    if (params.requestedDate || params.since || params.fromDate) {
      request.requestedDate = this.formatTimestamp(params.requestedDate || params.since || params.fromDate);
    } else if (queryType === '3' || queryType === 3) {
      throw new ValidationError(
        'requestedDate is required for queryType 3 (DateRange)',
        { method: 'getInvoices', queryType }
      );
    }

    // Available timestamp (optional filter)
    if (params.availableTimeStamp) {
      request.availableTimeStamp = this.formatTimestamp(params.availableTimeStamp);
    }

    return request;
  }

  /**
   * Infer query type from parameters
   */
  inferQueryType(params) {
    if (params.invoiceNumber) {
      return '1'; // Invoice number query
    }
    if (params.poNumber || params.purchaseOrderNumber) {
      return '2'; // PO query
    }
    if (params.requestedDate || params.since || params.fromDate) {
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
    getInvoices: (response) => {
      if (!response.invoiceArray && !response.invoices) {
        throw new Error('Invalid response: missing invoice data');
      }
      return response;
    },

    getVoidedInvoices: (response) => {
      if (!response.voidedInvoiceArray && !response.voidedInvoices) {
        throw new Error('Invalid response: missing voided invoice data');
      }
      return response;
    }
  };
}

module.exports = InvoiceService;
