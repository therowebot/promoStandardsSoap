const XmlConverter = require('../src/core/xml-converter');

describe('XmlConverter', () => {
  let converter;

  beforeEach(() => {
    converter = new XmlConverter();
  });

  describe('xmlToJson', () => {
    it('should convert simple XML to JSON', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <Product>
          <productId>ABC123</productId>
          <productName>Test Product</productName>
          <price>19.99</price>
          <inStock>true</inStock>
        </Product>`;

      const result = await converter.xmlToJson(xml);
      
      expect(result).toEqual({
        Product: {
          productId: 'ABC123',
          productName: 'Test Product',
          price: 19.99,
          inStock: true
        }
      });
    });

    it('should handle arrays in XML', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <Products>
          <Product>
            <id>1</id>
            <name>Product 1</name>
          </Product>
          <Product>
            <id>2</id>
            <name>Product 2</name>
          </Product>
        </Products>`;

      const result = await converter.xmlToJson(xml);
      
      expect(result.Products.Product).toBeInstanceOf(Array);
      expect(result.Products.Product).toHaveLength(2);
    });

    it('should normalize keys to camelCase', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <ProductID>ABC123</ProductID>
          <product_name>Test Product</product_name>
          <PRICE_VALUE>19.99</PRICE_VALUE>
        </Response>`;

      const result = await converter.xmlToJson(xml);
      
      expect(result.Response).toHaveProperty('productId');
      expect(result.Response).toHaveProperty('productName');
      expect(result.Response).toHaveProperty('priceValue');
    });
  });

  describe('jsonToXml', () => {
    it('should convert JSON to XML', () => {
      const json = {
        productId: 'ABC123',
        productName: 'Test Product',
        price: 19.99,
        inStock: true
      };

      const xml = converter.jsonToXml(json, 'Product');
      
      expect(xml).toContain('<Product>');
      expect(xml).toContain('<ProductId>ABC123</ProductId>');
      expect(xml).toContain('<ProductName>Test Product</ProductName>');
      expect(xml).toContain('<Price>19.99</Price>');
      expect(xml).toContain('<InStock>true</InStock>');
    });

    it('should handle null values', () => {
      const json = {
        productId: 'ABC123',
        description: null,
        price: 19.99
      };

      const xml = converter.jsonToXml(json, 'Product');
      
      expect(xml).toContain('<ProductId>ABC123</ProductId>');
      expect(xml).not.toContain('Description');
      expect(xml).toContain('<Price>19.99</Price>');
    });

    it('should handle arrays', () => {
      const json = {
        colors: ['Red', 'Blue', 'Green']
      };

      const xml = converter.jsonToXml(json, 'Filter');
      
      expect(xml).toContain('<Colors>Red</Colors>');
      expect(xml).toContain('<Colors>Blue</Colors>');
      expect(xml).toContain('<Colors>Green</Colors>');
    });
  });

  describe('extractSoapBody', () => {
    it('should extract body from SOAP envelope', () => {
      const soapResponse = {
        'soap:Envelope': {
          'soap:Body': {
            'GetProductResponse': {
              productId: 'ABC123',
              productName: 'Test Product'
            }
          }
        }
      };

      const result = converter.extractSoapBody(soapResponse);
      
      expect(result).toEqual({
        productId: 'ABC123',
        productName: 'Test Product'
      });
    });

    it('should handle different namespace prefixes', () => {
      const soapResponse = {
        'soapenv:Envelope': {
          'soapenv:Body': {
            'ns1:Response': {
              status: 'success'
            }
          }
        }
      };

      const result = converter.extractSoapBody(soapResponse);
      
      expect(result).toEqual({
        status: 'success'
      });
    });
  });
});