const xml2js = require('xml2js');
const _ = require('lodash');

class XmlConverter {
  constructor(options = {}) {
    this.parserOptions = {
      explicitArray: false,
      mergeAttrs: true,
      tagNameProcessors: [xml2js.processors.stripPrefix],
      ...options.parser
    };

    this.builderOptions = {
      renderOpts: { pretty: false },
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      ...options.builder
    };

    this.parser = new xml2js.Parser(this.parserOptions);
    this.builder = new xml2js.Builder(this.builderOptions);
  }

  async xmlToJson(xml) {
    try {
      const result = await this.parser.parseStringPromise(xml);
      return this.normalizeJsonResponse(result);
    } catch (error) {
      throw new Error(`XML parsing failed: ${error.message}`);
    }
  }

  jsonToXml(json, rootName = 'Request') {
    try {
      const xmlData = this.prepareJsonForXml(json);
      return this.builder.buildObject({ [rootName]: xmlData });
    } catch (error) {
      throw new Error(`XML building failed: ${error.message}`);
    }
  }

  normalizeJsonResponse(data) {
    if (_.isArray(data)) {
      return data.map(item => this.normalizeJsonResponse(item));
    }

    if (_.isObject(data) && !_.isDate(data)) {
      // Handle objects with empty string key containing text content (xml2js mergeAttrs format)
      // e.g., { "": "actualValue", "xmlns": "http://..." } should return "actualValue"
      const keys = Object.keys(data);
      if (keys.includes('') && typeof data[''] === 'string') {
        const nonMetaKeys = keys.filter(k => k !== '' && k !== 'xmlns' && !k.startsWith('xmlns'));
        if (nonMetaKeys.length === 0) {
          // All other keys are namespace-related, extract the text value
          return this.normalizeJsonResponse(data['']);
        }
      }

      const normalized = {};

      for (const [key, value] of Object.entries(data)) {
        // Skip empty string keys and xmlns attributes at this level
        if (key === '' || key === 'xmlns' || key.startsWith('xmlns')) {
          continue;
        }

        const normalizedKey = this.normalizeKey(key);

        if (value === '') {
          normalized[normalizedKey] = null;
        } else if (value === 'true' || value === 'false') {
          normalized[normalizedKey] = value === 'true';
        } else if (!isNaN(value) && value !== '' && typeof value === 'string') {
          const num = Number(value);
          normalized[normalizedKey] = Number.isInteger(num) ? num : parseFloat(value);
        } else if (_.isObject(value) || _.isArray(value)) {
          normalized[normalizedKey] = this.normalizeJsonResponse(value);
        } else {
          normalized[normalizedKey] = value;
        }
      }

      return normalized;
    }

    return data;
  }

  prepareJsonForXml(data) {
    if (_.isArray(data)) {
      return data.map(item => this.prepareJsonForXml(item));
    }

    if (_.isObject(data) && !_.isDate(data)) {
      const prepared = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) {
          continue;
        }
        
        const xmlKey = this.toXmlCase(key);
        
        if (_.isArray(value)) {
          prepared[xmlKey] = value.map(item => this.prepareJsonForXml(item));
        } else if (_.isObject(value) && !_.isDate(value)) {
          prepared[xmlKey] = this.prepareJsonForXml(value);
        } else if (typeof value === 'boolean') {
          prepared[xmlKey] = value.toString();
        } else {
          prepared[xmlKey] = value;
        }
      }
      
      return prepared;
    }
    
    return data;
  }

  normalizeKey(key) {
    return _.camelCase(key);
  }

  toXmlCase(key) {
    // Convert camelCase to PascalCase (first letter uppercase)
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  extractSoapBody(jsonResponse) {
    const keys = Object.keys(jsonResponse);
    const envelopeKey = keys.find(k => k.toLowerCase().includes('envelope'));
    
    if (!envelopeKey) {
      return jsonResponse;
    }

    const envelope = jsonResponse[envelopeKey];
    const bodyKey = Object.keys(envelope).find(k => k.toLowerCase().includes('body'));
    
    if (!bodyKey) {
      return envelope;
    }

    const body = envelope[bodyKey];
    const responseKeys = Object.keys(body).filter(k => !k.toLowerCase().includes('fault'));
    
    if (responseKeys.length === 1) {
      return body[responseKeys[0]];
    }

    return body;
  }

  buildSoapEnvelope(body, namespace, soapAction) {
    const envelope = {
      'soapenv:Envelope': {
        $: {
          'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',
          'xmlns:ns': namespace
        },
        'soapenv:Header': {},
        'soapenv:Body': body
      }
    };

    return this.builder.buildObject(envelope);
  }
}

module.exports = XmlConverter;