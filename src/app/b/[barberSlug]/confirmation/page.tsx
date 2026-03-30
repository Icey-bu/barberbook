import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Booking, ServiceGroup, Barber, Client } from '@/types';

interface Props {
  params: Promise<{ barberSlug: string }>;
  searchParams: Promise<{ booking_id?: string }>;
}

export const metadata = { title: 'Booking Confirmed' };

export default async function ConfirmationPage({ params, searchParams }: Props) {
  const { barberSlug } = await params;
  const { booking_id } = await searchParams;

  if (!booking_id) notFound();

  const supabase = await createClient();

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      service:service_groups(*),
      client:clients(*),
      barber:barbers(*)
    `)
    .eq('id', booking_id)
    .single<Booking & { service: ServiceGroup; client: Client; barber: Barber }>();

  if (!booking || booking.barber?.slug !== barberSlug) notFound();

  const formattedDate = new Date(booking.starts_at).toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: booking.barber.timezone,
  });
  const formattedTime = new Date(booking.starts_at).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: booking.barber.timezone,
  });

  const isPaid = booking.payment_status === 'paid';
  const brandColor = booking.barber.brand_color ?? '#111827';

  return (
    <div className="text-center space-y-8 py-4">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${brandColor}18` }}
        >
          <svg className="w-10 h-10" fill="none" stroke={brandColor} viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">You&apos;re booked!</h1>
        <p className="mt-2 text-gray-600 text-sm">
          A confirmation email has been sent to{' '}
          <strong>{booking.client.email}</strong>
        </p>
      </div>

      {/* Booking Details Card */}
      <div className="bg-white rounded-2xl border border-gray-200 text-left overflow-hidden">
        <div
          className="px-6 py-4"
          style={{ backgroundColor: `${brandColor}10`, borderBottom: `1px solid ${brandColor}20` }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: brandColor }}>
            Confirmation Code
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1 tracking-widest">
            {booking.confirmation_code}
          </p>
        </div>

        <div className="px-6 py-4 space-y-3 text-sm">
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500">Barber</span>
            <span className="font-medium text-gray-900">{booking.barber.name}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500">Service</span>
            <span className="font-medium text-gray-900">{booking.service.name}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500">Date</span>
            <span className="font-medium text-gray-900">{formattedDate}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500">Time</span>
            <span className="font-medium text-gray-900">{formattedTime}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500">Duration</span>
            <span className="font-medium text-gray-900">{booking.service.duration_minutes} min</span>
          </div>
          {isPaid && Number(booking.deposit_amount) > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Deposit paid</span>
              <span className="font-medium text-green-600">
                ${Number(booking.deposit_amount).toFixed(2)} ✓
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Location */}
      {booking.barber.location && (
        <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600 flex items-center justify-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          {booking.barber.location}
        </div>
      )}

      {/* Reminder note */}
      <div className="text-sm text-gray-500 bg-blue-50 rounded-xl px-4 py-3">
        <p>📧 You&apos;ll receive a reminder the day before your appointment.</p>
      </div>

      {/* Back to profile */}
      <Link
        href={`/b/${barberSlug}`}
        className="block text-sm font-medium"
        style={{ color: brandColor }}
      >
        ← Back to {booking.barber.name}&apos;s page
      </Link>
    </div>
  );
}
