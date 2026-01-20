import { getUncachableStripeClient } from './stripeClient';

async function updatePrices() {
  console.log('Updating I GET IT DONE subscription prices...');
  
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.search({
    query: "name:'I GET IT DONE Pro'"
  });

  if (existingProducts.data.length === 0) {
    console.log('No existing product found. Run seed-products.ts first.');
    return;
  }

  const product = existingProducts.data[0];
  console.log('Found product:', product.id);

  const existingPrices = await stripe.prices.list({
    product: product.id,
    active: true,
  });

  console.log('Existing prices:');
  existingPrices.data.forEach(price => {
    const interval = price.recurring?.interval || 'one-time';
    const amount = (price.unit_amount || 0) / 100;
    console.log(`  - ${price.id}: $${amount}/${interval}`);
  });

  console.log('\nDeactivating old prices and creating new ones...');

  for (const price of existingPrices.data) {
    if (price.recurring) {
      await stripe.prices.update(price.id, { active: false });
      console.log(`Deactivated: ${price.id}`);
    }
  }

  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 799,
    currency: 'usd',
    recurring: {
      interval: 'month',
    },
    metadata: {
      plan: 'monthly',
    },
  });
  
  console.log('Created monthly price:', monthlyPrice.id, '- $7.99/month');

  const annualPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 5999,
    currency: 'usd',
    recurring: {
      interval: 'year',
    },
    metadata: {
      plan: 'annual',
      savings: '37%',
    },
  });
  
  console.log('Created annual price:', annualPrice.id, '- $59.99/year');

  console.log('\n--- Price Update Complete ---');
  console.log('Monthly Price: $7.99/month');
  console.log('Annual Price: $59.99/year (saves 37%)');
  console.log('Lifetime: $149.99 one-time');
}

updatePrices().catch(console.error);
