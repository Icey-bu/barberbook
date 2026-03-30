import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAvailableSlots } from '@/lib/services/availability.service';
import type { ServiceGroup, Barber } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = req.nextUrl;
  const date = searchParams.get('date');
  const serviceId = searchParams.get('serviceId');

  if (!date || !serviceId) {
    return NextResponse.json(
      { error: 'INVALID_PARAMS', message: 'date (YYYY-MM-DD) and serviceId are required.' },
      { status: 400 }
    );
  }

  // Validate date format and not in the past
  const parsedDate = new Date(date + 'T00:00:00');
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'INVALID_PARAMS', message: 'date must be a valid ISO date (YYYY-MM-DD).' }, { status: 400 });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsedDate < today) {
    return NextResponse.json({ error: 'DATE_IN_PAST', message: 'Cannot query availability for past dates.' }, { status: 422 });
  }

  const supabase = await createClient();

  // Get barber
  const { data: barber } = await supabase
    .from('barbers')
    .select('id, timezone')
    .eq('slug', slug)
    .eq('is_active', true)
    .single<Barber>();

  if (!barber) {
    return NextResponse.json({ error: 'BARBER_NOT_FOUND', message: 'No active barber with that slug.' }, { status: 404 });
  }

  // Get service
  const { data: service } = await supabase
    .from('service_groups')
    .select('id, duration_minutes')
    .eq('id', serviceId)
    .eq('barber_id', barber.id)
    .eq('is_active', true)
    .single<ServiceGroup>();

  if (!service) {
    return NextResponse.json({ error: 'SERVICE_NOT_FOUND', message: 'Service does not belong to this barber or is inactive.' }, { status: 404 });
  }

  const slots = await getAvailableSlots(supabase, barber.id, date, service.duration_minutes);

  return NextResponse.json({
    date,
    serviceId,
    durationMinutes: service.duration_minutes,
    slots,
  });
}
