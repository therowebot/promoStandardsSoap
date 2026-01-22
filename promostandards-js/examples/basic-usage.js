const PromoStandards = require('../src/index');

// Example 1: Basic usage with per-vendor credentials
async function basicExample() {
  console.log('=== Basic Usage ===\n');

  // Create client with OneSource (no credentials at client level)
  const client = new PromoStandards.PromoStandardsClient({
    onesource: {}
  });

  // Vendor credentials (typically from your database)
  const vendor = {
    code: 'SUPPLIER_ID',
    username: 'vendor_user',
    password: 'vendor_pass'
  };

  try {
    // WSDL is auto-discovered, version defaults to newest
    const result = await client.inventory(vendor.code, {
      username: vendor.username,
      password: vendor.password
    }).getInventoryLevels({
      productId: 'ABC123'
    });

    console.log('Inventory:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 2: Querying multiple vendors
async function multiVendorExample() {
  console.log('\n=== Multi-Vendor Usage ===\n');

  const client = new PromoStandards.PromoStandardsClient({
    onesource: {}
  });

  // Simulate vendors from database
  const vendors = [
    { code: 'VENDOR_A', username: 'user_a', password: 'pass_a' },
    { code: 'VENDOR_B', username: 'user_b', password: 'pass_b' },
    { code: 'VENDOR_C', username: 'user_c', password: 'pass_c' }
  ];

  try {
    for (const vendor of vendors) {
      const result = await client.productData(vendor.code, {
        username: vendor.username,
        password: vendor.password
      }).getProduct({
        productId: 'PROD-001',
        localizationCountry: 'US',
        localizationLanguage: 'en'
      });

      console.log(`Product from ${vendor.code}:`, result);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 3: Using different services for same vendor
async function multiServiceExample() {
  console.log('\n=== Multi-Service Usage ===\n');

  const client = new PromoStandards.PromoStandardsClient({
    onesource: {}
  });

  const vendor = {
    code: 'SUPPLIER_ID',
    username: 'vendor_user',
    password: 'vendor_pass'
  };

  const creds = { username: vendor.username, password: vendor.password };

  try {
    // Get inventory
    const inventory = await client.inventory(vendor.code, creds)
      .getInventoryLevels({ productId: 'ABC123' });
    console.log('Inventory:', inventory);

    // Get product details
    const product = await client.productData(vendor.code, creds)
      .getProduct({
        productId: 'ABC123',
        localizationCountry: 'US',
        localizationLanguage: 'en'
      });
    console.log('Product:', product);

    // Get pricing
    const pricing = await client.pricingConfig(vendor.code, creds)
      .getConfigurationAndPricing({
        productId: 'ABC123',
        currency: 'USD',
        fobId: 'FOB001',
        configurationType: 'Decorated'
      });
    console.log('Pricing:', pricing);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 4: Quick one-off call
async function quickCallExample() {
  console.log('\n=== Quick Call Example ===\n');

  try {
    const result = await PromoStandards.PromoStandardsClient.quickCall({
      service: 'inventory',
      operation: 'getInventoryLevels',
      supplierId: 'SUPPLIER_ID',
      username: 'vendor_user',
      password: 'vendor_pass',
      onesource: {},
      data: {
        productId: 'XYZ789'
      }
    });

    console.log('Quick Call Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 5: Error handling
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===\n');

  const client = new PromoStandards.PromoStandardsClient({
    onesource: {}
  });

  // Test: Missing credentials
  try {
    client.inventory('SUPPLIER_ID');  // No credentials provided
  } catch (error) {
    if (error instanceof PromoStandards.ValidationError) {
      console.log('Caught missing credentials:', error.message);
    }
  }

  // Test: Missing required field
  try {
    await client.inventory('SUPPLIER_ID', {
      username: 'user',
      password: 'pass'
    }).getInventoryLevels({
      // Missing required productId
      filters: { colors: ['Red'] }
    });
  } catch (error) {
    if (error instanceof PromoStandards.ValidationError) {
      console.log('Caught validation error:', error.message);
    } else if (error instanceof PromoStandards.AuthenticationError) {
      console.log('Caught auth error:', error.message);
    } else if (error instanceof PromoStandards.NetworkError) {
      console.log('Caught network error:', error.message);
    } else {
      console.log('Other error:', error.message);
    }
  }
}

// Example 6: Direct WSDL usage (when you know the endpoint)
async function directWsdlExample() {
  console.log('\n=== Direct WSDL Usage ===\n');

  const client = new PromoStandards.PromoStandardsClient({
    onesource: {}
  });

  try {
    // If you already know the WSDL URL, pass it directly
    const result = await client.inventory('https://supplier.com/inventory.wsdl', {
      username: 'myuser',
      password: 'mypass'
    }).getInventoryLevels({
      productId: 'ABC123'
    });

    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run examples
async function runExamples() {
  console.log('PromoStandards JavaScript Client Examples\n');
  console.log('Note: Replace SUPPLIER_ID with actual vendor codes\n');

  // Uncomment to run examples:
  // await basicExample();
  // await multiVendorExample();
  // await multiServiceExample();
  // await quickCallExample();
  // await errorHandlingExample();
  // await directWsdlExample();
}

runExamples();
