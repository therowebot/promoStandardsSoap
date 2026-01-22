require('dotenv').config();
const PromoStandards = require('../src/index');

// Load HIT credentials from .env
// Create a .env file with:
//   HIT_VENDOR_CODE=your_hit_code
//   HIT_USERNAME=your_username
//   HIT_PASSWORD=your_password
const hit = {
  code: process.env.HIT_VENDOR_CODE,
  username: process.env.HIT_USERNAME,
  password: process.env.HIT_PASSWORD
};

// Example 1: Basic usage with HIT
async function basicExample() {
  console.log('=== Basic Usage ===\n');

  const client = new PromoStandards.PromoStandardsClient({
    onesource: {}
  });

  try {
    const result = await client.inventory(hit.code, {
      username: hit.username,
      password: hit.password
    }).getInventoryLevels({
      productId: 'ABC123'
    });

    console.log('Inventory:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 2: Get product data from HIT
async function productDataExample() {
  console.log('\n=== Product Data ===\n');

  const client = new PromoStandards.PromoStandardsClient({
    onesource: {}
  });

  try {
    const result = await client.productData(hit.code, {
      username: hit.username,
      password: hit.password
    }).getProduct({
      productId: 'ABC123',
      localizationCountry: 'US',
      localizationLanguage: 'en'
    });

    console.log('Product:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 3: Using multiple services
async function multiServiceExample() {
  console.log('\n=== Multi-Service Usage ===\n');

  const client = new PromoStandards.PromoStandardsClient({
    onesource: {}
  });

  const creds = { username: hit.username, password: hit.password };

  try {
    // Get inventory
    const inventory = await client.inventory(hit.code, creds)
      .getInventoryLevels({ productId: 'ABC123' });
    console.log('Inventory:', inventory);

    // Get product details
    const product = await client.productData(hit.code, creds)
      .getProduct({
        productId: 'ABC123',
        localizationCountry: 'US',
        localizationLanguage: 'en'
      });
    console.log('Product:', product);

    // Get pricing
    const pricing = await client.pricingConfig(hit.code, creds)
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
      supplierId: hit.code,
      username: hit.username,
      password: hit.password,
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
    client.inventory(hit.code);  // No credentials provided
  } catch (error) {
    if (error instanceof PromoStandards.ValidationError) {
      console.log('Caught missing credentials:', error.message);
    }
  }

  // Test: Missing required field
  try {
    await client.inventory(hit.code, {
      username: hit.username,
      password: hit.password
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
      username: hit.username,
      password: hit.password
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

  if (!hit.code || !hit.username || !hit.password) {
    console.log('Please create a .env file with HIT credentials:');
    console.log('  HIT_VENDOR_CODE=your_hit_code');
    console.log('  HIT_USERNAME=your_username');
    console.log('  HIT_PASSWORD=your_password\n');
    return;
  }

  console.log(`Using HIT vendor: ${hit.code}\n`);

  // Uncomment to run examples:
  // await basicExample();
  // await productDataExample();
  // await multiServiceExample();
  // await quickCallExample();
  // await errorHandlingExample();
  // await directWsdlExample();
}

runExamples();
