import type { SupabaseClient } from '@supabase/supabase-js';
import type { AvailabilityRule, BlockedTime, TimeSlot } from '@/types';

/**
 * Generate available time slots for a barber on a given date.
 * Slots are generated every 30 minutes but filtered so that:
 * - The slot doesn't overlap any existing confirmed/booked appointment
 * - The slot doesn't overlap any blocked time
 * - There is enough room for the full service duration before the end of shift
 */
export async function getAvailableSlots(
  supabase: SupabaseClient,
  barberId: string,
  date: string,           // "YYYY-MM-DD"
  durationMinutes: number
): Promise<TimeSlot[]> {
  const dayOfWeek = new Date(date + 'T12:00:00').getDay(); // use noon to avoid DST edge cases

  // 1. Get availability rules for this day
  const { data: rules } = await supabase
    .from('availability_rules')
    .select('*')
    .eq('barber_id', barberId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .returns<AvailabilityRule[]>();

  if (!rules || rules.length === 0) return [];

  // 2. Get blocked times for this date
  const { data: blocked } = await supabase
    .from('blocked_times')
    .select('*')
    .eq('barber_id', barberId)
    .eq('date', date)
    .returns<BlockedTime[]>();

  // Full day block?
  if (blocked?.some((b) => b.start_time === null)) return [];

  // 3. Get ALL active bookings for this barber on this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time, status')
    .eq('barber_id', barberId)
    .eq('booking_date', date)
    .not('status', 'in', '("cancelled","no_show")');

  // 4. Build busy intervals in minutes-from-midnight
  type Interval = { start: number; end: number };
  const busyIntervals: Interval[] = [];

  // Blocked windows
  for (const b of blocked ?? []) {
    if (b.start_time && b.end_time) {
      busyIntervals.push({
        start: timeToMinutes(b.start_time),
        end: timeToMinutes(b.end_time),
      });
    }
  }

  // Existing bookings — each booking blocks start_time → end_time
  for (const booking of existingBookings ?? []) {
    busyIntervals.push({
      start: timeToMinutes(booking.start_time),
      end: timeToMinutes(booking.end_time),
    });
  }

  // 5. Don't show slots in the past (for today)
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMinutes = date === todayStr
    ? now.getHours() * 60 + now.getMinutes() + 60 // add 1hr buffer
    : 0;

  // 6. Generate slots — offer every 30min increment within each rule window
  const SLOT_INTERVAL = 30;
  const slots: TimeSlot[] = [];

  for (const rule of rules) {
    const ruleStart = timeToMinutes(rule.start_time);
    const ruleEnd = timeToMinutes(rule.end_time);

    let current = ruleStart;

    // Snap to next clean 30-min mark if rule starts at an odd time
    while (current % SLOT_INTERVAL !== 0) current++;

    while (current + durationMinutes <= ruleEnd) {
      const slotEnd = current + durationMinutes;

      // Skip past slots
      if (current < currentMinutes) {
        current += SLOT_INTERVAL;
        continue;
      }

      // Check overlap with any busy interval
      // A slot [current, slotEnd] overlaps [busyStart, busyEnd] if:
      //   current < busyEnd AND slotEnd > busyStart
      const isBusy = busyIntervals.some(
        (busy) => current < busy.end && slotEnd > busy.start
      );

      if (!isBusy) {
        slots.push({
          startTime: `${date}T${minutesToTimeStr(current)}`,
          endTime: `${date}T${minutesToTimeStr(slotEnd)}`,
          available: true,
        });
      }

      current += SLOT_INTERVAL;
    }
  }

  return slots;
}

/**
 * Check if a specific slot is still available (used before creating a booking).
 */
export async function isSlotAvailable(
  supabase: SupabaseClient,
  barberId: string,
  startTime: string,      // ISO datetime e.g. "2026-04-01T09:00:00"
  durationMinutes: number,
  excludeBookingId?: string
): Promise<boolean> {
  const date = startTime.split('T')[0];
  const startMin = timeToMinutes(startTime.split('T')[1]);
  const endMin = startMin + durationMinutes;

  let query = supabase
    .from('bookings')
    .select('id')
    .eq('barber_id', barberId)
    .eq('booking_date', date)
    .not('status', 'in', '("cancelled","no_show")')
    .lt('start_time', minutesToTimeStr(endMin))   // existing.start < newEnd
    .gt('end_time', minutesToTimeStr(startMin));   // existing.end > newStart

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { data, error } = await query;
  if (error) return false;
  return data.length === 0; // available if no conflicts
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  // Handles "HH:MM", "HH:MM:SS", and "YYYY-MM-DDTHH:MM:SS"
  const t = time.includes('T') ? time.split('T')[1] : time;
  const parts = t.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}:00`;
}
