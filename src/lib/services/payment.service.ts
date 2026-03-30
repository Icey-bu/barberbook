import Stripe from 'stripe';
import type { Booking, ServiceGroup, Barber, Client } from '@/types';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2024-06-20' as any });
}

export interface CreateCheckoutSessionInput {
  booking: Booking;
  service: ServiceGroup;
  barber: Barber;
  client: Client;
  depositAmount: number;
}

/**
 * Create a Stripe Checkout Session for deposit collection.
 */
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<{ url: string; sessionId: string; expiresAt: string }> {
  const stripe = getStripe();
  const { booking, service, barber, client, depositAmount } = input;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://barberbook.app';
  const depositCents = Math.round(depositAmount * 100);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'cad',
          product_data: {
            name: `${service.name} — Deposit`,
            description: `Appointment with ${barber.name}. Deposit is applied toward your total.`,
          },
          unit_amount: depositCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/b/${barber.slug}/confirmation?booking_id=${booking.id}`,
    cancel_url: `${appUrl}/b/${barber.slug}`,
    customer_email: client.email,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
    metadata: {
      booking_id: booking.id,
      barber_id: barber.id,
      service_id: service.id,
      client_id: client.id,
      client_name: client.name,
      client_email: client.email,
      client_phone: client.phone ?? '',
      deposit_amount: depositAmount.toString(),
    },
    payment_intent_data: {
      capture_method: 'automatic',
      metadata: {
        booking_id: booking.id,
        barber_id: barber.id,
      },
    },
  });

  if (!session.url) throw new Error('Failed to create Stripe session URL');

  const expiresAt = new Date((session.expires_at ?? 0) * 1000).toISOString();

  return { url: session.url, sessionId: session.id, expiresAt };
}

/**
 * Verify and parse a Stripe webhook event.
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
