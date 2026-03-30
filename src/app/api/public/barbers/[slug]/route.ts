import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Barber, ServiceGroup } from '@/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: barber, error } = await supabase
    .from('barbers')
    .select('id, slug, name, bio, phone, avatar_url, brand_color, location, cancellation_policy, min_advance_hours, max_advance_days, deposit_required, deposit_type, deposit_value, timezone')
    .eq('slug', slug)
    .eq('is_active', true)
    .single<Barber>();

  if (error || !barber) {
    return NextResponse.json({ error: 'BARBER_NOT_FOUND', message: 'No active barber with that slug.' }, { status: 404 });
  }

  const { data: services } = await supabase
    .from('service_groups')
    .select('*')
    .eq('barber_id', barber.id)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .returns<ServiceGroup[]>();

  return NextResponse.json({
    data: {
      barber,
      services: services ?? [],
    },
  });
}
