const PromoStandards = require('../src/index');

// Example 1: Direct service usage
async function directServiceExample() {
  console.log('=== Direct Service Usage ===\n');

  // Create an inventory service instance
  // Version defaults to newest (2.0.0) if not specified
  const inventory = new PromoStandards.InventoryService({
    wsdl: 'https://example.com/inventory/wsdl',
    username: 'myuser',
    password: 'mypass'
  });

  try {
    // Get inventory levels with JSON input
    const result = await inventory.getInventoryLevels({
      productId: 'ABC123',
      filters: {
        colors: ['Red', 'Blue'],
        sizes: ['M', 'L', 'XL']
      }
    });

    console.log('Inventory Levels:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 2: Using the unified client
async function unifiedClientExample() {
  console.log('\n=== Unified Client Usage ===\n');
  
  // Create a client with shared authentication
  // Versions default to newest if not specified
  const client = new PromoStandards.PromoStandardsClient({
    username: 'myuser',
    password: 'mypass',
    timeout: 60000, // 60 seconds
    autoInitialize: true,
    services: {
      inventory: {
        wsdl: 'https://example.com/inventory/wsdl'
      },
      productData: {
        wsdl: 'https://example.com/product/wsdl'
      }
    }
  });

  try {
    // Use inventory service
    const inventory = await client.inventory.getInventoryLevels({
      productId: 'ABC123'
    });
    console.log('Inventory:', inventory);

    // Use product data service
    const product = await client.productData.getProduct({
      productId: 'ABC123',
      localizationCountry: 'US',
      localizationLanguage: 'en'
    });
    console.log('Product:', product);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 3: Quick one-off call
async function quickCallExample() {
  console.log('\n=== Quick Call Example ===\n');

  try {
    // Version defaults to newest if not specified
    const result = await PromoStandards.PromoStandardsClient.quickCall({
      service: 'inventory',
      operation: 'getInventoryLevels',
      wsdl: 'https://example.com/inventory/wsdl',
      username: 'myuser',
      password: 'mypass',
      data: {
        productId: 'XYZ789',
        filters: {
          partIds: ['PART-001', 'PART-002']
        }
      }
    });

    console.log('Quick Call Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 4: Environment-based authentication
async function envAuthExample() {
  console.log('\n=== Environment Auth Example ===\n');
  
  // Set environment variables:
  // PROMOSTANDARDS_ID=myuser
  // PROMOSTANDARDS_PASSWORD=mypass
  // PROMOSTANDARDS_VERSION=2.0.0

  // Client will automatically use environment variables
  const client = new PromoStandards.PromoStandardsClient();
  
  const inventory = await client.inventory('https://example.com/inventory/wsdl');
  
  try {
    const result = await inventory.getFilterValues({
      productId: 'ABC123'
    });
    
    console.log('Filter Values:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 5: Lazy WSDL Discovery via OneSource
async function lazyDiscoveryExample() {
  console.log('\n=== Lazy WSDL Discovery Example ===\n');

  // Create client with OneSource configured
  const client = new PromoStandards.PromoStandardsClient({
    username: 'myuser',
    password: 'mypass',
    onesource: {
      apiUrl: 'https://promostandards.org/WebServiceRepository/WebServiceRepository.svc'
    }
  });

  try {
    // Pass supplier ID instead of WSDL URL
    // WSDL is automatically discovered from OneSource on first call
    const result = await client.inventory('SUPPLIER_ID').getInventoryLevels({
      productId: 'ABC123'
    });

    console.log('Inventory (auto-discovered):', result);

    // Subsequent calls use cached WSDL
    const result2 = await client.inventory('SUPPLIER_ID').getFilterValues({
      productId: 'ABC123'
    });

    console.log('Filter Values:', result2);

    // You can also use other services with the same pattern
    const product = await client.productData('SUPPLIER_ID').getProduct({
      productId: 'ABC123',
      localizationCountry: 'US',
      localizationLanguage: 'en'
    });

    console.log('Product:', product);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 6: Error handling
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===\n');

  const inventory = new PromoStandards.InventoryService({
    wsdl: 'https://example.com/inventory/wsdl',
    username: 'myuser',
    password: 'mypass'
  });

  try {
    // This will throw a ValidationError
    await inventory.getInventoryLevels({
      // Missing required productId
      filters: { colors: ['Red'] }
    });
  } catch (error) {
    if (error instanceof PromoStandards.ValidationError) {
      console.log('Validation Error:', error.message);
      console.log('Error Details:', error.details);
    } else if (error instanceof PromoStandards.AuthenticationError) {
      console.log('Authentication Error:', error.message);
    } else {
      console.log('Unknown Error:', error);
    }
  }
}

// Run examples
async function runExamples() {
  // Note: These examples won't actually work without valid WSDL endpoints
  console.log('PromoStandards JavaScript Client Examples\n');
  console.log('Note: Replace example.com URLs with actual PromoStandards endpoints\n');

  // Uncomment to run examples:
  // await directServiceExample();
  // await unifiedClientExample();
  // await quickCallExample();
  // await envAuthExample();
  // await lazyDiscoveryExample();
  // await errorHandlingExample();
}

runExamples();