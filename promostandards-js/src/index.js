const PromoStandardsClient = require('./client');
const PromoStandardsAuth = require('./core/auth');

// Core classes
const BaseService = require('./core/base-service');
const SoapClient = require('./core/soap-client');
const XmlConverter = require('./core/xml-converter');

// Services
const InventoryService = require('./services/inventory/inventory-service');
const ProductDataService = require('./services/product-data/product-data-service');

// Errors
const {
  PromoStandardsError,
  AuthenticationError,
  ValidationError,
  ServiceError,
  NetworkError,
  TimeoutError
} = require('./core/errors');

// Main export
module.exports = PromoStandardsClient;

// Named exports
module.exports.PromoStandardsClient = PromoStandardsClient;
module.exports.PromoStandardsAuth = PromoStandardsAuth;

// Services
module.exports.InventoryService = InventoryService;
module.exports.ProductDataService = ProductDataService;

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
module.exports.createInventoryService = (options) => new InventoryService(options);
module.exports.createProductDataService = (options) => new ProductDataService(options);