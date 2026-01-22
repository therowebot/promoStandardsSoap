const BaseService = require('../../core/base-service');
const { ValidationError } = require('../../core/errors');

/**
 * PurchaseOrderService - PromoStandards Purchase Order Service
 *
 * Provides methods to submit purchase orders to suppliers.
 *
 * Operations:
 * - sendPO: Submit a purchase order
 * - getPOSupportedVersions: Get supported PO versions
 */
class PurchaseOrderService extends BaseService {
  static serviceName = 'PurchaseOrder';
  static supportedVersions = ['1.0.0', '2.0.0'];
  static defaultVersion = '1.0.0';

  constructor(options = {}) {
    super(options);

    this.operations = {
      sendPO: 'sendPO',
      getSupportedOrderTypes: 'getSupportedOrderTypes'
    };
  }

  /**
   * Send a purchase order
   * @param {Object} params - Request parameters
   * @param {Object} params.PO - The purchase order object
   * @returns {Promise<Object>} PO submission response
   */
  async sendPO(params = {}) {
    if (!params.PO && !params.purchaseOrder) {
      throw new ValidationError(
        'PO (purchase order) is required for sendPO',
        { method: 'sendPO' }
      );
    }

    const request = {
      PO: params.PO || params.purchaseOrder
    };

    return this.call(this.operations.sendPO, request);
  }

  /**
   * Get supported order types
   * @returns {Promise<Object>} Supported order types response
   */
  async getSupportedOrderTypes() {
    return this.call(this.operations.getSupportedOrderTypes, {});
  }

  /**
   * Build a purchase order object (helper method)
   * @param {Object} orderData - Order data
   * @returns {Object} Formatted PO object
   */
  buildPurchaseOrder(orderData) {
    const po = {
      orderType: orderData.orderType || 'Blank',
      orderNumber: orderData.orderNumber,
      orderDate: this.formatDate(orderData.orderDate || new Date()),
      lastModified: this.formatDate(orderData.lastModified || new Date()),
      totalAmount: orderData.totalAmount,
      paymentTerms: orderData.paymentTerms,
      rush: orderData.rush || false,
      currency: orderData.currency || 'USD'
    };

    // Order contact info
    if (orderData.orderContactInfo || orderData.contact) {
      po.OrderContactArray = {
        OrderContact: this.buildContact(orderData.orderContactInfo || orderData.contact)
      };
    }

    // Ship to info
    if (orderData.shipTo) {
      po.ShipmentArray = {
        Shipment: this.buildShipment(orderData.shipTo)
      };
    }

    // Line items
    if (orderData.lineItems && orderData.lineItems.length > 0) {
      po.LineItemArray = {
        LineItem: orderData.lineItems.map((item, index) =>
          this.buildLineItem(item, index + 1)
        )
      };
    }

    return po;
  }

  /**
   * Build contact object
   */
  buildContact(contact) {
    return {
      contactType: contact.type || 'Buyer',
      contactName: contact.name,
      email: contact.email,
      phone: contact.phone,
      fax: contact.fax
    };
  }

  /**
   * Build shipment object
   */
  buildShipment(shipTo) {
    return {
      shipmentId: shipTo.id || '1',
      shipReferences: {
        purchaseOrderNumber: shipTo.poNumber
      },
      comments: shipTo.comments,
      ThirdPartyAccount: shipTo.thirdPartyAccount,
      allowConsolidation: shipTo.allowConsolidation || false,
      blindShip: shipTo.blindShip || false,
      packingListRequired: shipTo.packingListRequired || false,
      FreightDetails: {
        carrier: shipTo.carrier,
        service: shipTo.service
      },
      ShipTo: {
        shipToRegistrationId: shipTo.registrationId,
        customerPickup: shipTo.customerPickup || false,
        contactDetails: {
          attentionTo: shipTo.attentionTo,
          companyName: shipTo.companyName,
          address1: shipTo.address1,
          address2: shipTo.address2,
          address3: shipTo.address3,
          city: shipTo.city,
          region: shipTo.state || shipTo.region,
          postalCode: shipTo.postalCode || shipTo.zip,
          country: shipTo.country || 'US'
        }
      }
    };
  }

  /**
   * Build line item object
   */
  buildLineItem(item, lineNumber) {
    return {
      lineNumber: lineNumber,
      description: item.description,
      lineType: item.lineType || 'New',
      quantity: item.quantity,
      fobId: item.fobId,
      ToleranceDetails: {
        tolerance: item.tolerance || 'ExactOnly',
        tolerancePercent: item.tolerancePercent
      },
      allowPartialShipments: item.allowPartialShipments || false,
      unitPrice: item.unitPrice,
      lineItemTotal: item.lineItemTotal || (item.quantity * item.unitPrice),
      requestedShipDate: this.formatDate(item.requestedShipDate),
      requestedInHandsDate: this.formatDate(item.requestedInHandsDate),
      referenceSalesQuote: item.salesQuote,
      Product: {
        productId: item.productId,
        productName: item.productName
      },
      PartArray: item.parts ? {
        Part: item.parts.map(part => ({
          partId: part.partId,
          quantity: part.quantity,
          description: part.description,
          unitPrice: part.unitPrice
        }))
      } : undefined
    };
  }

  /**
   * Format date to ISO 8601
   */
  formatDate(date) {
    if (!date) return undefined;

    if (date instanceof Date) {
      return date.toISOString();
    }

    if (typeof date === 'string') {
      return new Date(date).toISOString();
    }

    return undefined;
  }

  /**
   * Response validators
   */
  static responseValidators = {
    sendPO: (response) => {
      if (!response.transactionId && !response.poResponse) {
        throw new Error('Invalid response: missing PO response');
      }
      return response;
    },

    getSupportedOrderTypes: (response) => {
      if (!response.supportedOrderTypes && !response.orderTypes) {
        throw new Error('Invalid response: missing supported order types');
      }
      return response;
    }
  };
}

module.exports = PurchaseOrderService;
