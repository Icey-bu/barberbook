import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { createBooking } from '@/lib/services/booking.service';
import { createCheckoutSession } from '@/lib/services/payment.service';
import { sendConfirmationEmail, sendBarberNewBookingNotification } from '@/lib/services/notification.service';
import { isSlotAvailable } from '@/lib/services/availability.service';
import type { Barber, ServiceGroup, Client, Booking } from '@/types';

const createBookingSchema = z.object({
  barberSlug: z.string(),
  serviceId: z.string().uuid(),
  startTime: z.string().datetime({ offset: false }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)),
  client: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { barberSlug, serviceId, startTime, client: clientInput, notes } = parsed.data;

  // Use service client to bypass RLS for booking creation
  const supabase = await createServiceClient();

  // Load barber
  const { data: barber } = await supabase
    .from('barbers')
    .select('*')
    .eq('slug', barberSlug)
    .eq('is_active', true)
    .single<Barber>();

  if (!barber) {
    return NextResponse.json({ error: 'BARBER_NOT_FOUND', message: 'No active barber with that slug.' }, { status: 404 });
  }

  // Load service
  const { data: service } = await supabase
    .from('service_groups')
    .select('*')
    .eq('id', serviceId)
    .eq('barber_id', barber.id)
    .eq('is_active', true)
    .single<ServiceGroup>();

  if (!service) {
    return NextResponse.json({ error: 'SERVICE_INACTIVE', message: 'This service is no longer offered.' }, { status: 422 });
  }

  // Check slot availability
  const available = await isSlotAvailable(supabase, barber.id, startTime, service.duration_minutes);
  if (!available) {
    return NextResponse.json({ error: 'SLOT_UNAVAILABLE', message: 'That time slot is no longer available.' }, { status: 409 });
  }

  // Validate advance notice
  const startDate = new Date(startTime);
  const minNotice = barber.min_advance_hours * 3600_000;
  if (startDate.getTime() - Date.now() < minNotice) {
    return NextResponse.json(
      { error: 'ADVANCE_NOTICE', message: `Bookings require at least ${barber.min_advance_hours} hours advance notice.` },
      { status: 422 }
    );
  }

  try {
    const { booking, depositRequired } = await createBooking(supabase, {
      barber,
      service,
      startTime,
      client: clientInput,
      notes,
    });

    // Get client for notifications
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', booking.client_id)
      .single<Client>();

    if (!depositRequired) {
      // Send confirmation email immediately
      if (client) {
        await sendConfirmationEmail(supabase, { booking, service, client, barber });
        await sendBarberNewBookingNotification({ booking, service, client, barber });
      }

      return NextResponse.json({
        status: 'confirmed',
        booking: {
          id: booking.id,
          confirmationCode: booking.confirmation_code,
          startTime: booking.starts_at,
          endTime: booking.ends_at,
          service: { name: service.name, durationMinutes: service.duration_minutes, price: service.price },
          barber: { displayName: barber.name, avatarUrl: barber.avatar_url },
        },
      });
    }

    // Deposit required — create Stripe checkout
    const depositAmount = Number(booking.deposit_amount);
    const checkoutSession = await createCheckoutSession({
      booking,
      service,
      barber,
      client: client!,
      depositAmount,
    });

    // Save Stripe session ID to booking
    await supabase
      .from('bookings')
      .update({ stripe_session_id: checkoutSession.sessionId })
      .eq('id', booking.id);

    return NextResponse.json({
      status: 'deposit_required',
      checkoutUrl: checkoutSession.url,
      bookingId: booking.id,
      expiresAt: checkoutSession.expiresAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('conflict')) {
      return NextResponse.json({ error: 'SLOT_UNAVAILABLE', message: 'That time slot is no longer available.' }, { status: 409 });
    }
    console.error('Booking creation error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: 'Failed to create booking.' }, { status: 500 });
  }
}
