const BaseService = require('../../core/base-service');

/**
 * CompanyDataService - PromoStandards Company Data Service
 *
 * Provides methods to query supplier company information.
 *
 * Operations:
 * - getCompanyInfo: Get supplier company information
 */
class CompanyDataService extends BaseService {
  static serviceName = 'CompanyData';
  static supportedVersions = ['1.0.0'];
  static defaultVersion = '1.0.0';

  constructor(options = {}) {
    super(options);

    this.operations = {
      getCompanyInfo: 'getCompanyInfo'
    };
  }

  /**
   * Get company information
   * @param {Object} params - Request parameters (optional)
   * @returns {Promise<Object>} Company info response
   */
  async getCompanyInfo(params = {}) {
    const request = {};

    // Include any optional parameters
    if (params.localizationCountry || params.country) {
      request.localizationCountry = params.localizationCountry || params.country;
    }

    if (params.localizationLanguage || params.language) {
      request.localizationLanguage = params.localizationLanguage || params.language;
    }

    return this.call(this.operations.getCompanyInfo, request);
  }

  /**
   * Response validators
   */
  static responseValidators = {
    getCompanyInfo: (response) => {
      if (!response.companyInfo && !response.company) {
        throw new Error('Invalid response: missing company info');
      }
      return response;
    }
  };
}

module.exports = CompanyDataService;
