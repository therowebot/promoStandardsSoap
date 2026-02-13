require('dotenv').config();
const PromoStandards = require('../src/index');

// Load HIT credentials and endpoints from .env
const hit = {
  username: process.env.hitUserName,
  password: process.env.hitPassword,
  endpoints: {
    inventory: 'https://ppds.hitpromo.net/inventoryV2?wsdl',
    productData: 'https://ppds.hitpromo.net/productData?wsdl'
  }
};

// Example 1: Basic usage with direct WSDL
async function basicExample() {
  console.log('=== Basic Usage ===\n');

  const client = new PromoStandards.PromoStandardsClient({
    username: hit.username,
    password: hit.password
  });

  try {
    const result = await client.inventory(hit.endpoints.inventory)
      .getInventoryLevels({
        productId: '1625'
      });

    console.log('Inventory:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 2: Get product data
async function productDataExample() {
  console.log('\n=== Product Data ===\n');

  const client = new PromoStandards.PromoStandardsClient({
    username: hit.username,
    password: hit.password
  });

  try {
    const result = await client.productData(hit.endpoints.productData)
      .getProduct({
        productId: '1625',
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
    username: hit.username,
    password: hit.password
  });

  try {
    // Get inventory
    const inventory = await client.inventory(hit.endpoints.inventory)
      .getInventoryLevels({ productId: '1625' });
    console.log('Inventory:', inventory);

    // Get product details
    const product = await client.productData(hit.endpoints.productData)
      .getProduct({
        productId: '1625',
        localizationCountry: 'US',
        localizationLanguage: 'en'
      });
    console.log('Product:', product);

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
      wsdl: hit.endpoints.inventory,
      username: hit.username,
      password: hit.password,
      data: {
        productId: '1625'
      }
    });

    console.log('Quick Call Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 5: Using services directly (without client wrapper)
async function directServiceExample() {
  console.log('\n=== Direct Service Usage ===\n');

  const inventoryService = new PromoStandards.InventoryService({
    wsdl: hit.endpoints.inventory,
    username: hit.username,
    password: hit.password,
    version: '2.0.0'
  });

  try {
    const result = await inventoryService.getInventoryLevels({
      productId: '1625'
    });

    console.log('Direct Service Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 6: Error handling
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===\n');

  const client = new PromoStandards.PromoStandardsClient({
    username: hit.username,
    password: hit.password
  });

  // Test: Missing required field
  try {
    await client.inventory(hit.endpoints.inventory)
      .getInventoryLevels({
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

// Run examples
async function runExamples() {
  console.log('PromoStandards JavaScript Client Examples\n');

  if (!hit.username || !hit.password) {
    console.log('Please create a .env file with HIT credentials:');
    console.log('  hitUserName=your_username');
    console.log('  hitPassword=your_password\n');
    return;
  }

  console.log('Using HIT Promotional endpoints\n');

  // Uncomment to run examples:
  // await basicExample();
  // await productDataExample();
  // await multiServiceExample();
  // await quickCallExample();
  // await directServiceExample();
  // await errorHandlingExample();
}

runExamples();
