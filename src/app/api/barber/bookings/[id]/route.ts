import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { Barber, Booking } from '@/types';

const patchSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  notes: z.string().optional(),
  barber_notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { data: barber } = await supabase
    .from('barbers').select('id').eq('user_id', user.id).single<Barber>();
  if (!barber) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });

  const { data: booking, error } = await supabase
    .from('bookings')
    .update(parsed.data)
    .eq('id', id)
    .eq('barber_id', barber.id)
    .select()
    .single<Booking>();

  if (error || !booking) return NextResponse.json({ error: 'BOOKING_NOT_FOUND' }, { status: 404 });

  return NextResponse.json(booking);
}
