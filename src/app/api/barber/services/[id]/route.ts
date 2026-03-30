import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { Barber, ServiceGroup } from '@/types';

const serviceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  duration_minutes: z.number().int().min(15).optional(),
  price: z.number().min(0).optional(),
  deposit_type: z.enum(['none', 'fixed', 'percentage']).optional(),
  deposit_value: z.number().min(0).optional(),
  image_url: z.string().nullable().optional(),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
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
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });

  const { data, error } = await supabase
    .from('service_groups')
    .update(parsed.data)
    .eq('id', id)
    .eq('barber_id', barber.id)
    .select()
    .single<ServiceGroup>();

  if (error || !data) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { data: barber } = await supabase
    .from('barbers').select('id').eq('user_id', user.id).single<Barber>();
  if (!barber) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  // Soft delete — set is_active = false
  await supabase.from('service_groups').update({ is_active: false }).eq('id', id).eq('barber_id', barber.id);

  return NextResponse.json({ success: true });
}
