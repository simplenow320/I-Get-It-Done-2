import { getStripeSync } from './stripeClient';
import { db } from './db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    const event = JSON.parse(payload.toString());
    await WebhookHandlers.handleSubscriptionEvents(event);
  }

  static async handleSubscriptionEvents(event: any): Promise<void> {
    const eventType = event.type;
    const data = event.data?.object;

    if (!data) return;

    switch (eventType) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const customerId = data.customer;
        const subscriptionId = data.id;
        const status = data.status;
        const trialEnd = data.trial_end ? new Date(data.trial_end * 1000) : null;

        await db.execute(sql`
          UPDATE users 
          SET stripe_subscription_id = ${subscriptionId},
              subscription_status = ${status},
              trial_ends_at = ${trialEnd}
          WHERE stripe_customer_id = ${customerId}
        `);
        console.log(`Subscription ${eventType}: ${subscriptionId} status=${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const customerId = data.customer;
        
        await db.execute(sql`
          UPDATE users 
          SET stripe_subscription_id = NULL,
              subscription_status = 'canceled',
              trial_ends_at = NULL
          WHERE stripe_customer_id = ${customerId}
        `);
        console.log(`Subscription canceled for customer: ${customerId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const customerId = data.customer;
        const subscriptionId = data.subscription;
        
        if (subscriptionId) {
          await db.execute(sql`
            UPDATE users 
            SET subscription_status = 'active'
            WHERE stripe_customer_id = ${customerId}
          `);
          console.log(`Payment succeeded for customer: ${customerId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const customerId = data.customer;
        
        await db.execute(sql`
          UPDATE users 
          SET subscription_status = 'past_due'
          WHERE stripe_customer_id = ${customerId}
        `);
        console.log(`Payment failed for customer: ${customerId}`);
        break;
      }
    }
  }
}
