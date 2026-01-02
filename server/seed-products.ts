import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  console.log('Creating I GET IT DONE subscription products...');
  
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.search({
    query: "name:'I GET IT DONE Pro'"
  });

  if (existingProducts.data.length > 0) {
    console.log('Products already exist, skipping creation');
    console.log('Existing product:', existingProducts.data[0].id);
    
    const prices = await stripe.prices.list({
      product: existingProducts.data[0].id,
      active: true,
    });
    
    console.log('Existing prices:');
    prices.data.forEach(price => {
      const interval = price.recurring?.interval;
      const amount = (price.unit_amount || 0) / 100;
      console.log(`  - ${price.id}: $${amount}/${interval}`);
    });
    
    return;
  }

  const product = await stripe.products.create({
    name: 'I GET IT DONE Pro',
    description: 'Premium ADHD-optimized task management with voice capture, focus timers, gamification, and team delegation',
    metadata: {
      app: 'igetitdone',
      tier: 'pro',
    },
  });
  
  console.log('Created product:', product.id);

  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 699,
    currency: 'usd',
    recurring: {
      interval: 'month',
    },
    metadata: {
      plan: 'monthly',
    },
  });
  
  console.log('Created monthly price:', monthlyPrice.id, '- $6.99/month');

  const annualPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 4999,
    currency: 'usd',
    recurring: {
      interval: 'year',
    },
    metadata: {
      plan: 'annual',
      savings: '40%',
    },
  });
  
  console.log('Created annual price:', annualPrice.id, '- $49.99/year');

  console.log('\n--- Product Setup Complete ---');
  console.log('Product ID:', product.id);
  console.log('Monthly Price ID:', monthlyPrice.id);
  console.log('Annual Price ID:', annualPrice.id);
  console.log('\nThese will sync to your database via webhooks.');
}

createProducts().catch(console.error);
