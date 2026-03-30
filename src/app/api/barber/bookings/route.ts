import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Barber } from '@/types';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { data: barber } = await supabase
    .from('barbers').select('id').eq('user_id', user.id).single<Barber>();
  if (!barber) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('bookings')
    .select(`
      *,
      service:service_groups(id, name, duration_minutes, price),
      client:clients(id, name, email, phone)
    `, { count: 'exact' })
    .eq('barber_id', barber.id)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false })
    .range(from, to);

  if (status) query = query.eq('status', status);
  if (dateFrom) query = query.gte('booking_date', dateFrom);
  if (dateTo) query = query.lte('booking_date', dateTo);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    bookings: data ?? [],
    pagination: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
  });
}
