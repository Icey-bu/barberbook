import type { SupabaseClient } from '@supabase/supabase-js';
import type { Booking, ServiceGroup, Client, Barber } from '@/types';

interface BookingEmailData {
  booking: Booking;
  service: ServiceGroup;
  client: Client;
  barber: Barber;
}

/**
 * Send booking confirmation email to customer.
 */
export async function sendConfirmationEmail(
  supabase: SupabaseClient,
  data: BookingEmailData
): Promise<void> {
  const { booking, service, client, barber } = data;

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping confirmation email');
    return;
  }

  const formattedDate = new Date(booking.starts_at).toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: barber.timezone,
  });
  const formattedTime = new Date(booking.starts_at).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: barber.timezone,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://barberbook.app';
  const bookingUrl = `${appUrl}/b/${barber.slug}/confirmation?booking_id=${booking.id}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
      <div style="background: ${barber.brand_color}; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Booking Confirmed ✓</h1>
      </div>
      <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
        <p style="margin-top: 0;">Hi ${client.name},</p>
        <p>Your appointment with <strong>${barber.name}</strong> is confirmed.</p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Service</td>
              <td style="padding: 8px 0; font-weight: 600;">${service.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td>
              <td style="padding: 8px 0; font-weight: 600;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time</td>
              <td style="padding: 8px 0; font-weight: 600;">${formattedTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Duration</td>
              <td style="padding: 8px 0; font-weight: 600;">${service.duration_minutes} minutes</td>
            </tr>
            ${booking.deposit_amount > 0 ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Deposit paid</td>
              <td style="padding: 8px 0; font-weight: 600; color: #059669;">$${Number(booking.deposit_amount).toFixed(2)}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Confirmation code</td>
              <td style="padding: 8px 0; font-weight: 700; font-size: 18px; letter-spacing: 2px;">${booking.confirmation_code}</td>
            </tr>
          </table>
        </div>

        ${barber.cancellation_policy ? `
        <p style="font-size: 13px; color: #6b7280; background: #f3f4f6; padding: 12px; border-radius: 6px;">
          <strong>Cancellation Policy:</strong> ${barber.cancellation_policy}
        </p>
        ` : ''}

        <p style="font-size: 14px; color: #374151;">
          <a href="${bookingUrl}" style="color: ${barber.brand_color};">View your booking details →</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          Powered by BarberBook
        </p>
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${barber.name} via BarberBook <bookings@barberbook.app>`,
        to: [client.email],
        subject: `Booking Confirmed — ${formattedDate} at ${formattedTime}`,
        html,
      }),
    });

    const result = await response.json();

    // Log to message_logs
    await supabase.from('message_logs').insert({
      barber_id: barber.id,
      client_id: client.id,
      booking_id: booking.id,
      message_type: 'confirmation',
      channel: 'email',
      status: response.ok ? 'sent' : 'failed',
      recipient_email: client.email,
      subject: `Booking Confirmed — ${formattedDate} at ${formattedTime}`,
      provider_id: result.id ?? null,
      error_message: response.ok ? null : JSON.stringify(result),
      sent_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to send confirmation email:', err);
  }
}

/**
 * Send a reminder email to customer before appointment.
 */
export async function sendReminderEmail(
  supabase: SupabaseClient,
  data: BookingEmailData,
  hoursBeforeLabel: '24h' | '1h'
): Promise<void> {
  const { booking, service, client, barber } = data;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return;

  const formattedDate = new Date(booking.starts_at).toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: barber.timezone,
  });
  const formattedTime = new Date(booking.starts_at).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: barber.timezone,
  });

  const timeLabel = hoursBeforeLabel === '24h' ? 'Tomorrow' : 'In 1 Hour';
  const subject = `Reminder: Your appointment ${hoursBeforeLabel === '24h' ? 'is tomorrow' : 'is in 1 hour'}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
      <div style="background: ${barber.brand_color}; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Appointment Reminder</h1>
      </div>
      <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
        <p style="margin-top: 0;">Hi ${client.name},</p>
        <p>This is a reminder that your appointment with <strong>${barber.name}</strong> is coming up.</p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 2px solid ${barber.brand_color};">
          <p style="margin: 0 0 8px; font-weight: 700; color: ${barber.brand_color};">${timeLabel}</p>
          <p style="margin: 0 0 4px;"><strong>${service.name}</strong></p>
          <p style="margin: 0; color: #6b7280;">${formattedDate} at ${formattedTime}</p>
        </div>

        ${barber.location ? `<p style="font-size: 14px;">📍 ${barber.location}</p>` : ''}
        ${barber.cancellation_policy ? `
        <p style="font-size: 13px; color: #6b7280; background: #f3f4f6; padding: 12px; border-radius: 6px;">
          <strong>Cancellation Policy:</strong> ${barber.cancellation_policy}
        </p>
        ` : ''}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">Powered by BarberBook</p>
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${barber.name} via BarberBook <bookings@barberbook.app>`,
        to: [client.email],
        subject,
        html,
      }),
    });

    const result = await response.json();
    const messageType = hoursBeforeLabel === '24h' ? 'reminder_24h' : 'reminder_1h';

    await supabase.from('message_logs').insert({
      barber_id: barber.id,
      client_id: client.id,
      booking_id: booking.id,
      message_type: messageType,
      channel: 'email',
      status: response.ok ? 'sent' : 'failed',
      recipient_email: client.email,
      subject,
      provider_id: result.id ?? null,
      error_message: response.ok ? null : JSON.stringify(result),
      sent_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to send reminder email:', err);
  }
}

/**
 * Notify barber of a new booking.
 */
export async function sendBarberNewBookingNotification(
  data: BookingEmailData
): Promise<void> {
  const { booking, service, client, barber } = data;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY || !barber.email) return;

  const formattedDate = new Date(booking.starts_at).toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: barber.timezone,
  });
  const formattedTime = new Date(booking.starts_at).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: barber.timezone,
  });

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Booking 🎉</h2>
      <p><strong>${client.name}</strong> has booked a <strong>${service.name}</strong> appointment.</p>
      <ul>
        <li>Date: ${formattedDate}</li>
        <li>Time: ${formattedTime}</li>
        <li>Client email: ${client.email}</li>
        ${client.phone ? `<li>Client phone: ${client.phone}</li>` : ''}
        ${booking.notes ? `<li>Note: ${booking.notes}</li>` : ''}
      </ul>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/barber/bookings">View in Dashboard →</a></p>
    </div>
  `;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'BarberBook Notifications <notifications@barberbook.app>',
        to: [barber.email],
        subject: `New Booking — ${client.name} on ${formattedDate}`,
        html,
      }),
    });
  } catch (err) {
    console.error('Failed to send barber notification:', err);
  }
}
