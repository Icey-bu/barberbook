import type { SupabaseClient } from '@supabase/supabase-js';
import type { Booking, ServiceGroup, Barber, Client } from '@/types';
import { upsertClient } from './client.service';

function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'BBK-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateCustomerToken(): string {
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface CreateBookingInput {
  barber: Barber;
  service: ServiceGroup;
  startTime: string;  // ISO datetime
  client: {
    name: string;
    email: string;
    phone?: string;
  };
  notes?: string;
}

/**
 * Create a booking record (with pending status if deposit required).
 * Returns the booking ID and whether deposit is required.
 */
export async function createBooking(
  supabase: SupabaseClient,
  input: CreateBookingInput
): Promise<{ booking: Booking; depositRequired: boolean }> {
  const { barber, service, startTime, client: clientInput, notes } = input;

  // Calculate times
  const startDate = new Date(startTime);
  const endDate = new Date(startDate.getTime() + service.duration_minutes * 60_000);
  const bookingDate = startTime.split('T')[0];
  const startTimeStr = startDate.toTimeString().split(' ')[0]; // HH:MM:SS
  const endTimeStr = endDate.toTimeString().split(' ')[0];

  // Determine deposit
  const depositRequired =
    barber.deposit_required &&
    service.deposit_type !== 'none' &&
    service.deposit_value > 0;

  let depositAmount = 0;
  if (depositRequired) {
    if (service.deposit_type === 'fixed') {
      depositAmount = service.deposit_value;
    } else if (service.deposit_type === 'percentage') {
      depositAmount = (service.price * service.deposit_value) / 100;
    } else {
      // Fall back to barber default
      if (barber.deposit_type === 'fixed') {
        depositAmount = barber.deposit_value;
      } else if (barber.deposit_type === 'percentage') {
        depositAmount = (service.price * barber.deposit_value) / 100;
      }
    }
  }

  // Upsert client record
  const clientRecord = await upsertClient(supabase, {
    barber_id: barber.id,
    name: clientInput.name,
    email: clientInput.email,
    phone: clientInput.phone,
  });

  // Generate unique confirmation code
  let confirmationCode = generateConfirmationCode();
  // Ensure uniqueness (simple retry)
  for (let i = 0; i < 3; i++) {
    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('confirmation_code', confirmationCode)
      .single();
    if (!existing) break;
    confirmationCode = generateConfirmationCode();
  }

  const customerToken = generateCustomerToken();

  const bookingStatus = depositRequired ? 'deposit_pending' : 'confirmed';
  const paymentStatus = depositRequired ? 'pending' : 'none';

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      barber_id: barber.id,
      client_id: clientRecord.id,
      service_group_id: service.id,
      booking_date: bookingDate,
      start_time: startTimeStr,
      end_time: endTimeStr,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      status: bookingStatus,
      payment_status: paymentStatus,
      deposit_amount: depositAmount,
      customer_token: customerToken,
      confirmation_code: confirmationCode,
      notes: notes ?? null,
    })
    .select()
    .single<Booking>();

  if (error) throw new Error(error.message);
  if (!booking) throw new Error('Failed to create booking');

  return { booking, depositRequired };
}

/**
 * Get a booking by ID with optional joins.
 */
export async function getBookingById(
  supabase: SupabaseClient,
  bookingId: string
): Promise<(Booking & { service: ServiceGroup; client: Client; barber: Barber }) | null> {
  const { data } = await supabase
    .from('bookings')
    .select(`
      *,
      service:service_groups(*),
      client:clients(*),
      barber:barbers(*)
    `)
    .eq('id', bookingId)
    .single();

  return data as (Booking & { service: ServiceGroup; client: Client; barber: Barber }) | null;
}

/**
 * Update booking status.
 */
export async function updateBookingStatus(
  supabase: SupabaseClient,
  bookingId: string,
  status: string,
  extra?: Partial<Booking>
): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status, ...extra })
    .eq('id', bookingId)
    .select()
    .single<Booking>();

  if (error) throw new Error(error.message);
  return data;
}
