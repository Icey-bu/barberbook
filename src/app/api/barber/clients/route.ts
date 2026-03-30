import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBarberClients } from '@/lib/services/client.service';
import type { Barber } from '@/types';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { data: barber } = await supabase
    .from('barbers').select('id').eq('user_id', user.id).single<Barber>();
  if (!barber) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const { searchParams } = req.nextUrl;

  const { clients, total } = await getBarberClients(supabase, barber.id, {
    search: searchParams.get('search') ?? undefined,
    page: parseInt(searchParams.get('page') ?? '1'),
    limit: parseInt(searchParams.get('limit') ?? '20'),
    sortBy: searchParams.get('sortBy') ?? 'created_at',
    sortOrder: (searchParams.get('sortOrder') ?? 'desc') as 'asc' | 'desc',
  });

  const limit = parseInt(searchParams.get('limit') ?? '20');
  const page = parseInt(searchParams.get('page') ?? '1');

  return NextResponse.json({
    clients,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
