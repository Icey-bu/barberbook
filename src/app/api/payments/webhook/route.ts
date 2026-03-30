import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/services/payment.service';
import { createServiceClient } from '@/lib/supabase/server';
import { sendConfirmationEmail, sendBarberNewBookingNotification } from '@/lib/services/notification.service';
import type { Booking, ServiceGroup, Client, Barber } from '@/types';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'MISSING_SIGNATURE' }, { status: 400 });
  }

  let rawBody: Buffer;
  try {
    rawBody = Buffer.from(await req.arrayBuffer());
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  let event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 400 });
  }

  const supabase = await createServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as { id: string; metadata?: Record<string, string>; payment_intent?: string; amount_total?: number };
        const meta = session.metadata ?? {};
        const bookingId = meta.booking_id;

        if (!bookingId) break;

        // Update booking status to confirmed + payment to paid
        const { data: booking } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            payment_status: 'paid',
          })
          .eq('id', bookingId)
          .select()
          .single<Booking>();

        if (!booking) break;

        // Create payment record
        await supabase.from('payment_records').insert({
          booking_id: bookingId,
          provider: 'stripe',
          provider_payment_id: session.payment_intent ?? null,
          provider_session_id: session.id,
          amount: (session.amount_total ?? 0) / 100,
          currency: 'cad',
          payment_type: 'deposit',
          status: 'paid',
          metadata: meta,
        });

        // Load relations for email
        const { data: fullBooking } = await supabase
          .from('bookings')
          .select('*, service:service_groups(*), client:clients(*), barber:barbers(*)')
          .eq('id', bookingId)
          .single<Booking & { service: ServiceGroup; client: Client; barber: Barber }>();

        if (fullBooking) {
          await sendConfirmationEmail(supabase, {
            booking: fullBooking,
            service: fullBooking.service,
            client: fullBooking.client,
            barber: fullBooking.barber,
          });
          await sendBarberNewBookingNotification({
            booking: fullBooking,
            service: fullBooking.service,
            client: fullBooking.client,
            barber: fullBooking.barber,
          });
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as { metadata?: Record<string, string> };
        const bookingId = session.metadata?.booking_id;
        if (bookingId) {
          await supabase
            .from('bookings')
            .update({ status: 'cancelled', payment_status: 'failed' })
            .eq('id', bookingId)
            .eq('status', 'deposit_pending');
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as { metadata?: Record<string, string>; last_payment_error?: { message?: string } };
        const bookingId = pi.metadata?.booking_id;
        if (bookingId) {
          await supabase
            .from('bookings')
            .update({ payment_status: 'failed' })
            .eq('id', bookingId);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'WEBHOOK_PROCESSING_ERROR' }, { status: 500 });
  }
}
