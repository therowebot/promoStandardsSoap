const XmlConverter = require('../src/core/xml-converter');

describe('XmlConverter', () => {
  let converter;

  beforeEach(() => {
    converter = new XmlConverter();
  });

  describe('xmlToJson', () => {
    it('should convert simple XML to JSON with camelCase keys', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <Product>
          <productId>ABC123</productId>
          <productName>Test Product</productName>
          <price>19.99</price>
          <inStock>true</inStock>
        </Product>`;

      const result = await converter.xmlToJson(xml);

      // All keys are normalized to camelCase, including the root element
      expect(result).toEqual({
        product: {
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

      // Keys are camelCase
      expect(result.products.product).toBeInstanceOf(Array);
      expect(result.products.product).toHaveLength(2);
      expect(result.products.product[0].id).toBe(1);
      expect(result.products.product[1].id).toBe(2);
    });

    it('should normalize keys to camelCase', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <ProductID>ABC123</ProductID>
          <product_name>Test Product</product_name>
          <PRICE_VALUE>19.99</PRICE_VALUE>
        </Response>`;

      const result = await converter.xmlToJson(xml);

      // Root key is also normalized
      expect(result.response).toHaveProperty('productId');
      expect(result.response).toHaveProperty('productName');
      expect(result.response).toHaveProperty('priceValue');
      expect(result.response.productId).toBe('ABC123');
      expect(result.response.productName).toBe('Test Product');
      expect(result.response.priceValue).toBe(19.99);
    });

    it('should convert string booleans to actual booleans', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <Item>
          <active>true</active>
          <deleted>false</deleted>
        </Item>`;

      const result = await converter.xmlToJson(xml);

      expect(result.item.active).toBe(true);
      expect(result.item.deleted).toBe(false);
    });

    it('should convert numeric strings to numbers', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <Product>
          <quantity>100</quantity>
          <price>29.99</price>
        </Product>`;

      const result = await converter.xmlToJson(xml);

      expect(result.product.quantity).toBe(100);
      expect(result.product.price).toBe(29.99);
    });

    it('should convert empty strings to null', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <Product>
          <name>Test</name>
          <description></description>
        </Product>`;

      const result = await converter.xmlToJson(xml);

      expect(result.product.name).toBe('Test');
      expect(result.product.description).toBeNull();
    });
  });

  describe('jsonToXml', () => {
    it('should convert JSON to XML with PascalCase keys', () => {
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

    it('should handle null values by excluding them', () => {
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

    it('should handle nested objects', () => {
      const json = {
        product: {
          id: 'ABC123',
          details: {
            color: 'Red',
            size: 'Large'
          }
        }
      };

      const xml = converter.jsonToXml(json, 'Request');

      expect(xml).toContain('<Request>');
      expect(xml).toContain('<Product>');
      expect(xml).toContain('<Id>ABC123</Id>');
      expect(xml).toContain('<Details>');
      expect(xml).toContain('<Color>Red</Color>');
      expect(xml).toContain('<Size>Large</Size>');
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

    it('should return original if no envelope found', () => {
      const response = {
        data: 'value'
      };

      const result = converter.extractSoapBody(response);

      expect(result).toEqual({ data: 'value' });
    });
  });

  describe('prepareJsonForXml', () => {
    it('should convert camelCase to PascalCase', () => {
      const json = {
        productId: 'ABC123',
        isActive: true
      };

      const result = converter.prepareJsonForXml(json);

      expect(result).toHaveProperty('ProductId', 'ABC123');
      expect(result).toHaveProperty('IsActive', 'true');
    });

    it('should filter out null and undefined values', () => {
      const json = {
        productId: 'ABC123',
        description: null,
        category: undefined,
        price: 19.99
      };

      const result = converter.prepareJsonForXml(json);

      expect(result).toHaveProperty('ProductId', 'ABC123');
      expect(result).toHaveProperty('Price', 19.99);
      expect(result).not.toHaveProperty('Description');
      expect(result).not.toHaveProperty('Category');
    });

    it('should convert booleans to strings', () => {
      const json = {
        active: true,
        deleted: false
      };

      const result = converter.prepareJsonForXml(json);

      expect(result.Active).toBe('true');
      expect(result.Deleted).toBe('false');
    });
  });

  describe('normalizeJsonResponse', () => {
    it('should normalize nested objects', () => {
      const data = {
        ProductResponse: {
          ProductData: {
            ProductID: 'ABC123'
          }
        }
      };

      const result = converter.normalizeJsonResponse(data);

      expect(result.productResponse.productData.productId).toBe('ABC123');
    });

    it('should handle arrays', () => {
      const data = {
        Products: [
          { ProductID: '1', Name: 'Product 1' },
          { ProductID: '2', Name: 'Product 2' }
        ]
      };

      const result = converter.normalizeJsonResponse(data);

      expect(result.products).toHaveLength(2);
      // Numeric strings are converted to numbers
      expect(result.products[0].productId).toBe(1);
      expect(result.products[1].productId).toBe(2);
      expect(result.products[0].name).toBe('Product 1');
      expect(result.products[1].name).toBe('Product 2');
    });
  });
});
