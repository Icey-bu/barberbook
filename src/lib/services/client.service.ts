import type { SupabaseClient } from '@supabase/supabase-js';
import type { Client } from '@/types';

export interface UpsertClientInput {
  barber_id: string;
  name: string;
  email: string;
  phone?: string;
}

/**
 * Upsert a client record for a barber, matching on (barber_id, email).
 * On conflict, updates name and phone if provided.
 */
export async function upsertClient(
  supabase: SupabaseClient,
  input: UpsertClientInput
): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .upsert(
      {
        barber_id: input.barber_id,
        name: input.name,
        email: input.email.toLowerCase().trim(),
        phone: input.phone ?? null,
      },
      {
        onConflict: 'barber_id,email',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single<Client>();

  if (error) throw new Error(`Failed to upsert client: ${error.message}`);
  if (!data) throw new Error('Failed to upsert client: no data returned');

  return data;
}

/**
 * Get clients for a barber with optional search and pagination.
 */
export async function getBarberClients(
  supabase: SupabaseClient,
  barberId: string,
  options?: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
): Promise<{ clients: Client[]; total: number }> {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('barber_id', barberId);

  if (options?.search) {
    const search = options.search;
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const sortBy = options?.sortBy ?? 'created_at';
  const sortOrder = options?.sortOrder ?? 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return { clients: (data as Client[]) ?? [], total: count ?? 0 };
}
