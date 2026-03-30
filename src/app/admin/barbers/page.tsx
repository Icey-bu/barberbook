import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Barber } from '@/types';

export const metadata = { title: 'Admin — Barbers' };

export default async function AdminBarbersPage() {
  const supabase = await createClient();
  const { data: barbers } = await supabase
    .from('barbers')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Barber[]>();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Barbers</h1>
      </div>

      <p className="text-sm text-gray-400 bg-gray-900 rounded-xl p-4 border border-gray-800">
        To add a new barber: create a Supabase Auth user with <code className="bg-gray-800 px-1 rounded">role: &apos;barber&apos;</code> in user_metadata,
        then insert a row into the <code className="bg-gray-800 px-1 rounded">barbers</code> table linked to that user_id.
        Admin barber creation UI is a Milestone 4 deliverable.
      </p>

      <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800">
        {!barbers || barbers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No barbers yet.</div>
        ) : barbers.map((barber) => (
          <div key={barber.id} className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {barber.avatar_url ? (
                <img src={barber.avatar_url} alt={barber.name} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: barber.brand_color }}
                >
                  {barber.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-medium text-white">{barber.name}</p>
                <p className="text-xs text-gray-400">/b/{barber.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full ${barber.is_active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                {barber.is_active ? 'Active' : 'Inactive'}
              </span>
              <Link
                href={`/b/${barber.slug}`}
                target="_blank"
                className="text-xs text-gray-400 hover:text-white"
              >
                View page ↗
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
