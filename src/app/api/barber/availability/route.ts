import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { Barber } from '@/types';

const availabilitySchema = z.object({
  rules: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    is_active: z.boolean().optional().default(true),
  })),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { data: barber } = await supabase
    .from('barbers').select('id').eq('user_id', user.id).single<Barber>();
  if (!barber) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const { data: rules } = await supabase
    .from('availability_rules')
    .select('*')
    .eq('barber_id', barber.id)
    .order('day_of_week');

  return NextResponse.json({ rules: rules ?? [] });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { data: barber } = await supabase
    .from('barbers').select('id').eq('user_id', user.id).single<Barber>();
  if (!barber) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  const body = await req.json();
  const parsed = availabilitySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });

  // Replace all rules for this barber
  await supabase.from('availability_rules').delete().eq('barber_id', barber.id);

  const newRules = parsed.data.rules.map((r) => ({ ...r, barber_id: barber.id }));
  const { data, error } = await supabase.from('availability_rules').insert(newRules).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rules: data });
}
