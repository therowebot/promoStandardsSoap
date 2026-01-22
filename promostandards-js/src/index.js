const PromoStandardsClient = require('./client');
const { SupplierConnection } = require('./client');
const PromoStandardsAuth = require('./core/auth');
const OneSourceClient = require('./core/onesource-client');
const WSDLProvider = require('./core/wsdl-provider');

// Core classes
const BaseService = require('./core/base-service');
const SoapClient = require('./core/soap-client');
const XmlConverter = require('./core/xml-converter');

// Services
const InventoryService = require('./services/inventory/inventory-service');
const ProductDataService = require('./services/product-data/product-data-service');
const OrderStatusService = require('./services/order-status/order-status-service');
const OrderShipmentNotificationService = require('./services/order-shipment/order-shipment-service');
const InvoiceService = require('./services/invoice/invoice-service');
const PricingConfigurationService = require('./services/pricing-config/pricing-config-service');
const ProductMediaService = require('./services/product-media/product-media-service');
const PurchaseOrderService = require('./services/purchase-order/purchase-order-service');
const ProductComplianceService = require('./services/product-compliance/product-compliance-service');
const CompanyDataService = require('./services/company-data/company-data-service');
const RemittanceAdviceService = require('./services/remittance-advice/remittance-advice-service');

// Errors
const PromoStandardsError = require('./core/errors');
const {
  AuthenticationError,
  ValidationError,
  ServiceError,
  NetworkError,
  TimeoutError
} = require('./core/errors');

// Main export
module.exports = PromoStandardsClient;

// Named exports - Client
module.exports.PromoStandardsClient = PromoStandardsClient;
module.exports.SupplierConnection = SupplierConnection;

// Named exports - Auth & OneSource
module.exports.PromoStandardsAuth = PromoStandardsAuth;
module.exports.OneSourceClient = OneSourceClient;
module.exports.WSDLProvider = WSDLProvider;

// Services
module.exports.InventoryService = InventoryService;
module.exports.ProductDataService = ProductDataService;
module.exports.OrderStatusService = OrderStatusService;
module.exports.OrderShipmentNotificationService = OrderShipmentNotificationService;
module.exports.InvoiceService = InvoiceService;
module.exports.PricingConfigurationService = PricingConfigurationService;
module.exports.ProductMediaService = ProductMediaService;
module.exports.PurchaseOrderService = PurchaseOrderService;
module.exports.ProductComplianceService = ProductComplianceService;
module.exports.CompanyDataService = CompanyDataService;
module.exports.RemittanceAdviceService = RemittanceAdviceService;

// Core utilities
module.exports.BaseService = BaseService;
module.exports.SoapClient = SoapClient;
module.exports.XmlConverter = XmlConverter;

// Errors
module.exports.PromoStandardsError = PromoStandardsError;
module.exports.AuthenticationError = AuthenticationError;
module.exports.ValidationError = ValidationError;
module.exports.ServiceError = ServiceError;
module.exports.NetworkError = NetworkError;
module.exports.TimeoutError = TimeoutError;

// Convenience factory methods
module.exports.createClient = (options) => new PromoStandardsClient(options);
module.exports.createAuth = (credentials) => new PromoStandardsAuth(credentials);
module.exports.createOneSourceClient = (options) => new OneSourceClient(options);
module.exports.createWsdlProvider = (options) => new WSDLProvider(options);

// Service factory methods
module.exports.createInventoryService = (options) => new InventoryService(options);
module.exports.createProductDataService = (options) => new ProductDataService(options);
module.exports.createOrderStatusService = (options) => new OrderStatusService(options);
module.exports.createOrderShipmentService = (options) => new OrderShipmentNotificationService(options);
module.exports.createInvoiceService = (options) => new InvoiceService(options);
module.exports.createPricingConfigService = (options) => new PricingConfigurationService(options);
module.exports.createProductMediaService = (options) => new ProductMediaService(options);
module.exports.createPurchaseOrderService = (options) => new PurchaseOrderService(options);
module.exports.createProductComplianceService = (options) => new ProductComplianceService(options);
module.exports.createCompanyDataService = (options) => new CompanyDataService(options);
module.exports.createRemittanceAdviceService = (options) => new RemittanceAdviceService(options);
