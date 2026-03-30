import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import type { Barber } from '@/types';

export const metadata = { title: 'Dashboard' };

export default async function BarberDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/barber/login');

  const { data: barber } = await supabase
    .from('barbers').select('*').eq('user_id', user.id).single<Barber>();
  if (!barber) redirect('/barber/login');

  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date(Date.now() + 7 * 86400_000).toISOString().split('T')[0];

  // Today's bookings
  const { data: todayBookings } = await supabase
    .from('bookings')
    .select('*, service:service_groups(name, duration_minutes), client:clients(name, email, phone)')
    .eq('barber_id', barber.id)
    .eq('booking_date', today)
    .not('status', 'in', '("cancelled","no_show")')
    .order('start_time');

  // Upcoming this week
  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select('*, service:service_groups(name), client:clients(name)')
    .eq('barber_id', barber.id)
    .gt('booking_date', today)
    .lte('booking_date', weekEnd)
    .not('status', 'in', '("cancelled","no_show")')
    .order('booking_date')
    .order('start_time')
    .limit(10);

  // Stats
  const { count: totalBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('barber_id', barber.id)
    .eq('status', 'completed');

  const { count: totalClients } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('barber_id', barber.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good day, {barber.name.split(' ')[0]}!</h1>
        <p className="text-gray-500 text-sm mt-1">{new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Bookings", value: todayBookings?.length ?? 0, color: barber.brand_color },
          { label: 'This Week', value: upcomingBookings?.length ?? 0, color: '#6366f1' },
          { label: 'Total Completed', value: totalBookings ?? 0, color: '#059669' },
          { label: 'Total Clients', value: totalClients ?? 0, color: '#d97706' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Today's Schedule */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Schedule</h2>
          <Link href="/barber/bookings" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>

        {!todayBookings || todayBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500 text-sm">
            No bookings today.
          </div>
        ) : (
          <div className="space-y-3">
            {todayBookings.map((booking: any) => (
              <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
                <div
                  className="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: barber.brand_color }}
                >
                  <span className="text-xs font-bold leading-none">
                    {new Date(`${today}T${booking.start_time}`).toLocaleTimeString('en-CA', { hour: 'numeric', hour12: true }).replace(' ', '')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{booking.client?.name}</p>
                  <p className="text-xs text-gray-500">{booking.service?.name} · {booking.service?.duration_minutes} min</p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming */}
      {upcomingBookings && upcomingBookings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming This Week</h2>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
            {upcomingBookings.map((booking: any) => (
              <div key={booking.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{booking.client?.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(booking.booking_date).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' '}at{' '}
                    {new Date(`${booking.booking_date}T${booking.start_time}`).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <p className="text-sm text-gray-500">{booking.service?.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/barber/services" className="bg-white rounded-2xl border border-gray-100 p-4 text-center hover:shadow-md transition-shadow shadow-sm">
            <p className="font-semibold text-gray-900 text-sm">Manage Services</p>
            <p className="text-xs text-gray-500 mt-1">Add or edit service offerings</p>
          </Link>
          <Link href="/barber/settings" className="bg-white rounded-2xl border border-gray-100 p-4 text-center hover:shadow-md transition-shadow shadow-sm">
            <p className="font-semibold text-gray-900 text-sm">Settings</p>
            <p className="text-xs text-gray-500 mt-1">Availability & profile</p>
          </Link>
          <Link href={`/b/${barber.slug}`} target="_blank" className="bg-white rounded-2xl border border-gray-100 p-4 text-center hover:shadow-md transition-shadow shadow-sm col-span-2">
            <p className="font-semibold text-sm" style={{ color: barber.brand_color }}>View Your Public Booking Page ↗</p>
            <p className="text-xs text-gray-500 mt-1">/b/{barber.slug}</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
