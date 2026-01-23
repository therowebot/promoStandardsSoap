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

    // PromoStandards uses different element names depending on the service/version:
    // - Some use PascalCase + Request suffix (e.g., GetProductRequest)
    // - Others use just "Request" (e.g., Inventory 1.2.1)
    // The element name can be overridden via options.elementName

    try {
      debug(`Calling operation: ${operation}`, requestData);

      const namespace = await this.getNamespace();
      const endpoint = this.getEndpoint();

      // Use provided element name or try to detect from WSDL, fallback to PascalCase+Request
      const requestElementName = options.elementName ||
        this.getElementNameFromWsdl(operation) ||
        this.toPascalCase(operation) + 'Request';

      // Build the XML body with proper namespacing
      const xmlBody = this.buildRequestXml(requestData, requestElementName, namespace);

      // Build full SOAP envelope
      const soapEnvelope = this.buildSoapEnvelope(xmlBody, namespace);

      debug('SOAP Request:', soapEnvelope);

      // Send the request
      const response = await this.httpClient.post(endpoint, soapEnvelope, {
        headers: {
          'SOAPAction': operation
        }
      });

      debug('SOAP Response received');

      // Parse the response
      const jsonResponse = await this.xmlConverter.xmlToJson(response.data);
      const bodyContent = this.extractSoapBody(jsonResponse);
      const normalizedResult = this.xmlConverter.normalizeJsonResponse(bodyContent);

      if (options.includeRaw) {
        return {
          result: normalizedResult,
          rawResponse: response.data,
          rawRequest: soapEnvelope
        };
      }

      return normalizedResult;
    } catch (error) {
      if (error.response?.data) {
        // Try to parse SOAP fault from response
        try {
          const faultJson = await this.xmlConverter.xmlToJson(error.response.data);
          const fault = this.extractSoapFault(faultJson);
          if (fault) {
            throw new PromoStandardsError(
              fault.faultstring || fault.message || 'SOAP Fault',
              fault.faultcode || 'SOAP_FAULT',
              { operation, detail: fault.detail }
            );
          }
        } catch (parseError) {
          // If we can't parse the fault, throw the original error
        }
      }
      this.handleSoapError(error, operation);
    }
  }

  /**
   * Build XML for request data
   */
  buildRequestXml(data, elementName, namespace) {
    const nsPrefix = 'ns';
    let xml = `<${nsPrefix}:${elementName} xmlns:${nsPrefix}="${namespace}">`;

    for (const [key, value] of Object.entries(data)) {
      xml += this.valueToXml(key, value, nsPrefix);
    }

    xml += `</${nsPrefix}:${elementName}>`;
    return xml;
  }

  /**
   * Convert a value to XML
   */
  valueToXml(key, value, nsPrefix) {
    if (value === null || value === undefined) {
      return '';
    }

    const tagName = key;

    if (Array.isArray(value)) {
      return value.map(v => this.valueToXml(key, v, nsPrefix)).join('');
    }

    if (typeof value === 'object') {
      let xml = `<${nsPrefix}:${tagName}>`;
      for (const [k, v] of Object.entries(value)) {
        xml += this.valueToXml(k, v, nsPrefix);
      }
      xml += `</${nsPrefix}:${tagName}>`;
      return xml;
    }

    // Escape XML special characters
    const escaped = String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    return `<${nsPrefix}:${tagName}>${escaped}</${nsPrefix}:${tagName}>`;
  }

  /**
   * Build a complete SOAP envelope
   */
  buildSoapEnvelope(body, namespace) {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>${body}</soap:Body>
</soap:Envelope>`;
  }

  /**
   * Extract the body content from a parsed SOAP response
   */
  extractSoapBody(json) {
    // Handle various response structures
    const envelope = json['soap:Envelope'] || json['SOAP-ENV:Envelope'] || json['soapenv:Envelope'] || json.Envelope;
    if (!envelope) {
      return json;
    }

    const body = envelope['soap:Body'] || envelope['SOAP-ENV:Body'] || envelope['soapenv:Body'] || envelope.Body;
    if (!body) {
      return envelope;
    }

    // Return the first child element of Body (the response element)
    const keys = Object.keys(body).filter(k => !k.startsWith('$'));
    if (keys.length > 0) {
      return body[keys[0]];
    }

    return body;
  }

  /**
   * Extract SOAP fault from response
   */
  extractSoapFault(json) {
    try {
      const envelope = json['soap:Envelope'] || json['SOAP-ENV:Envelope'] || json['soapenv:Envelope'] || json.Envelope;
      const body = envelope?.['soap:Body'] || envelope?.['SOAP-ENV:Body'] || envelope?.['soapenv:Body'] || envelope?.Body;
      const fault = body?.['soap:Fault'] || body?.['SOAP-ENV:Fault'] || body?.Fault;
      return fault;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get the SOAP endpoint URL
   */
  getEndpoint() {
    if (this.endpoint) {
      return this.endpoint;
    }

    // Extract endpoint from WSDL if available
    if (this._client) {
      try {
        const wsdl = this._client.wsdl;
        for (const service in wsdl.services) {
          for (const port in wsdl.services[service].ports) {
            const address = wsdl.services[service].ports[port].location;
            if (address) {
              return address;
            }
          }
        }
      } catch (e) {
        debug('Error getting endpoint from WSDL:', e.message);
      }
    }

    // Fallback: use WSDL URL without query string
    return this.wsdl.split('?')[0];
  }

  /**
   * Convert camelCase to PascalCase
   */
  toPascalCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get the element name for an operation from the parsed WSDL
   * Returns null if not found
   */
  getElementNameFromWsdl(operation) {
    if (!this._client || !this._client.wsdl) {
      return null;
    }

    try {
      const wsdl = this._client.wsdl;
      const definitions = wsdl.definitions;

      // Look for the message that corresponds to this operation's input
      // Message names are typically like "getInventoryLevelsRequest"
      const messageName = operation + 'Request';
      const message = definitions.messages[messageName];

      if (message && message.parts) {
        // The part should have an element attribute
        for (const partName in message.parts) {
          const part = message.parts[partName];
          if (part.element) {
            // element is like "{namespace}Request" - extract just the element name
            const elementMatch = part.element.match(/\}(.+)$/);
            if (elementMatch) {
              debug(`Found element name from WSDL: ${elementMatch[1]} for operation ${operation}`);
              return elementMatch[1];
            }
            // If no namespace prefix, use as-is
            if (!part.element.includes('{')) {
              debug(`Found element name from WSDL: ${part.element} for operation ${operation}`);
              return part.element;
            }
          }
        }
      }

      return null;
    } catch (e) {
      debug('Error getting element name from WSDL:', e.message);
      return null;
    }
  }

  /**
   * Get operation names from the client (without Async suffix)
   */
  getOperationNames() {
    if (!this._client) return [];
    return Object.keys(this._client)
      .filter(k => typeof this._client[k] === 'function' && !k.endsWith('Async'))
      .filter(k => !['setEndpoint', 'setSecurity', 'addSoapHeader', 'describe'].includes(k));
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
    const wsdl = client.wsdl;

    // Try multiple approaches to find operations
    // Method 1: Standard services structure
    if (wsdl.services) {
      for (const service in wsdl.services) {
        const serviceObj = wsdl.services[service];
        if (serviceObj.ports) {
          for (const port in serviceObj.ports) {
            const portObj = serviceObj.ports[port];
            if (portObj.binding && portObj.binding.operations) {
              for (const operation in portObj.binding.operations) {
                operations.push({
                  name: operation,
                  service,
                  port,
                  input: portObj.binding.operations[operation].input,
                  output: portObj.binding.operations[operation].output
                });
              }
            }
          }
        }
      }
    }

    // Method 2: Use client.describe() which gives a cleaner structure
    if (operations.length === 0) {
      try {
        const description = client.describe();
        for (const serviceName in description) {
          const service = description[serviceName];
          for (const portName in service) {
            const port = service[portName];
            for (const opName in port) {
              operations.push({
                name: opName,
                service: serviceName,
                port: portName,
                input: port[opName].input,
                output: port[opName].output
              });
            }
          }
        }
      } catch (e) {
        debug('Error using describe():', e.message);
      }
    }

    // Method 3: Get operations directly from client object
    if (operations.length === 0) {
      const opNames = this.getOperationNames();
      for (const name of opNames) {
        operations.push({ name, service: 'unknown', port: 'unknown' });
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