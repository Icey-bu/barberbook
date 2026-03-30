import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendReminderEmail } from '@/lib/services/notification.service';
import type { Booking, ServiceGroup, Client, Barber } from '@/types';

/**
 * Cron endpoint — called by Vercel Cron every hour.
 * Sends 24h and 1h reminder emails for upcoming appointments.
 */
export async function GET(req: NextRequest) {
  // Authenticate cron calls
  const secret = req.headers.get('x-internal-secret');
  if (secret !== process.env.INTERNAL_CRON_SECRET) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const now = new Date();

  // Find bookings ~24h from now (within ±5 min window)
  const in24h = new Date(now.getTime() + 24 * 3600_000);
  const in24hMin = new Date(in24h.getTime() - 5 * 60_000).toISOString();
  const in24hMax = new Date(in24h.getTime() + 5 * 60_000).toISOString();

  // Find bookings ~1h from now
  const in1h = new Date(now.getTime() + 1 * 3600_000);
  const in1hMin = new Date(in1h.getTime() - 5 * 60_000).toISOString();
  const in1hMax = new Date(in1h.getTime() + 5 * 60_000).toISOString();

  const { data: bookings24h } = await supabase
    .from('bookings')
    .select('*, service:service_groups(*), client:clients(*), barber:barbers(*)')
    .gte('starts_at', in24hMin)
    .lte('starts_at', in24hMax)
    .in('status', ['confirmed', 'booked'])
    .returns<(Booking & { service: ServiceGroup; client: Client; barber: Barber })[]>();

  const { data: bookings1h } = await supabase
    .from('bookings')
    .select('*, service:service_groups(*), client:clients(*), barber:barbers(*)')
    .gte('starts_at', in1hMin)
    .lte('starts_at', in1hMax)
    .in('status', ['confirmed', 'booked'])
    .returns<(Booking & { service: ServiceGroup; client: Client; barber: Barber })[]>();

  let sent = 0;

  for (const booking of bookings24h ?? []) {
    // Check if we already sent a 24h reminder for this booking
    const { data: existing } = await supabase
      .from('message_logs')
      .select('id')
      .eq('booking_id', booking.id)
      .eq('message_type', 'reminder_24h')
      .eq('status', 'sent')
      .limit(1);

    if (!existing || existing.length === 0) {
      await sendReminderEmail(supabase, {
        booking,
        service: booking.service,
        client: booking.client,
        barber: booking.barber,
      }, '24h');
      sent++;
    }
  }

  for (const booking of bookings1h ?? []) {
    const { data: existing } = await supabase
      .from('message_logs')
      .select('id')
      .eq('booking_id', booking.id)
      .eq('message_type', 'reminder_1h')
      .eq('status', 'sent')
      .limit(1);

    if (!existing || existing.length === 0) {
      await sendReminderEmail(supabase, {
        booking,
        service: booking.service,
        client: booking.client,
        barber: booking.barber,
      }, '1h');
      sent++;
    }
  }

  return NextResponse.json({
    success: true,
    processed: {
      reminders_24h: bookings24h?.length ?? 0,
      reminders_1h: bookings1h?.length ?? 0,
      sent,
    },
    timestamp: now.toISOString(),
  });
}
