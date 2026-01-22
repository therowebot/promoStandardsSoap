const soap = require('soap');
const axios = require('axios');
const debug = require('debug')('promostandards:soap');
const XmlConverter = require('./xml-converter');
const PromoStandardsError = require('./errors');

class SoapClient {
  constructor(options = {}) {
    this.wsdl = options.wsdl;
    this.endpoint = options.endpoint;
    this.timeout = options.timeout || 30000;
    this.xmlConverter = new XmlConverter(options.xmlOptions);
    this.httpClient = axios.create({
      timeout: this.timeout,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Accept': 'text/xml',
        ...options.headers
      }
    });
    
    this._client = null;
    this._wsdlCache = new Map();
  }

  async initialize() {
    if (this._client) {
      return this._client;
    }

    try {
      debug('Initializing SOAP client with WSDL:', this.wsdl);
      
      const options = {
        endpoint: this.endpoint,
        forceSoap12Headers: false,
        escapeXML: false,
        suppressStack: true,
        returnFault: false
      };

      this._client = await soap.createClientAsync(this.wsdl, options);
      
      if (this.endpoint) {
        this._client.setEndpoint(this.endpoint);
      }

      debug('SOAP client initialized successfully');
      return this._client;
    } catch (error) {
      throw new PromoStandardsError(
        `Failed to initialize SOAP client: ${error.message}`,
        'SOAP_INIT_ERROR',
        { wsdl: this.wsdl }
      );
    }
  }

  async call(operation, requestData, options = {}) {
    await this.initialize();

    const operationMethod = this._client[operation];
    if (!operationMethod) {
      throw new PromoStandardsError(
        `Operation '${operation}' not found in WSDL`,
        'INVALID_OPERATION',
        { operation, availableOperations: Object.keys(this._client).filter(k => typeof this._client[k] === 'function') }
      );
    }

    try {
      debug(`Calling operation: ${operation}`, requestData);
      
      const xmlRequest = this.xmlConverter.prepareJsonForXml(requestData);
      
      const [result, rawResponse, soapHeader, rawRequest] = await operationMethod.call(
        this._client,
        xmlRequest,
        options.soapOptions
      );

      debug('Raw SOAP response received');
      
      const normalizedResult = this.xmlConverter.normalizeJsonResponse(result);
      
      if (options.includeRaw) {
        return {
          result: normalizedResult,
          rawResponse,
          rawRequest,
          soapHeader
        };
      }

      return normalizedResult;
    } catch (error) {
      this.handleSoapError(error, operation);
    }
  }

  async callWithDirectXml(operation, xmlBody, soapAction) {
    const namespace = await this.getNamespace();
    const envelope = this.xmlConverter.buildSoapEnvelope(xmlBody, namespace, soapAction);
    
    try {
      debug(`Direct XML call to: ${this.endpoint}`);
      
      const response = await this.httpClient.post(this.endpoint || this.wsdl, envelope, {
        headers: {
          'SOAPAction': soapAction || `"${namespace}#${operation}"`
        }
      });

      const jsonResponse = await this.xmlConverter.xmlToJson(response.data);
      return this.xmlConverter.extractSoapBody(jsonResponse);
    } catch (error) {
      this.handleHttpError(error, operation);
    }
  }

  async getNamespace() {
    await this.initialize();
    const wsdlObject = this._client.wsdl;
    const targetNamespace = wsdlObject.definitions.$targetNamespace;
    return targetNamespace;
  }

  async getAvailableOperations() {
    await this.initialize();
    
    const operations = [];
    const client = this._client;
    
    for (const service in client.wsdl.services) {
      for (const port in client.wsdl.services[service].ports) {
        const binding = client.wsdl.services[service].ports[port].binding;
        
        for (const operation in binding.operations) {
          operations.push({
            name: operation,
            service,
            port,
            input: binding.operations[operation].input,
            output: binding.operations[operation].output
          });
        }
      }
    }
    
    return operations;
  }

  handleSoapError(error, operation) {
    if (error.root && error.root.Envelope) {
      const fault = error.root.Envelope.Body?.Fault;
      if (fault) {
        throw new PromoStandardsError(
          fault.faultstring || 'SOAP Fault',
          fault.faultcode || 'SOAP_FAULT',
          { operation, detail: fault.detail }
        );
      }
    }

    throw new PromoStandardsError(
      `SOAP operation failed: ${error.message}`,
      'SOAP_ERROR',
      { operation, originalError: error.message }
    );
  }

  handleHttpError(error, operation) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      throw new PromoStandardsError(
        `HTTP ${status}: ${error.message}`,
        'HTTP_ERROR',
        { operation, status, response: data }
      );
    }

    throw new PromoStandardsError(
      `Network error: ${error.message}`,
      'NETWORK_ERROR',
      { operation }
    );
  }

  setSecurity(security) {
    if (this._client) {
      this._client.setSecurity(security);
    }
  }

  addSoapHeader(header, name, namespace, xmlns) {
    if (this._client) {
      this._client.addSoapHeader(header, name, namespace, xmlns);
    }
  }
}

module.exports = SoapClient;