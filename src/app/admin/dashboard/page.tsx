import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Admin Dashboard' };

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalBarbers },
    { count: totalBookings },
    { count: activeBookings },
  ] = await Promise.all([
    supabase.from('barbers').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['confirmed', 'booked']),
  ]);

  const { data: recentBookings } = await supabase
    .from('bookings')
    .select('*, barber:barbers(name,slug), client:clients(name,email)')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Platform Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Barbers', value: totalBarbers ?? 0 },
          { label: 'Total Bookings', value: totalBookings ?? 0 },
          { label: 'Active Bookings', value: activeBookings ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-xs text-gray-400">{stat.label}</p>
            <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Bookings</h2>
        <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800">
          {recentBookings?.map((booking: any) => (
            <div key={booking.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{booking.client?.name}</p>
                <p className="text-xs text-gray-400">{booking.barber?.name} · {booking.booking_date}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                booking.status === 'confirmed' ? 'bg-green-900 text-green-300' :
                booking.status === 'cancelled' ? 'bg-red-900 text-red-300' :
                'bg-gray-800 text-gray-300'
              }`}>{booking.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
