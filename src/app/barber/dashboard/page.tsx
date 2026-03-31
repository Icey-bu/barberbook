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
  const brandColor = barber.brand_color ?? '#111827';

  const hexToRgb = (hex: string) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1],16)}, ${parseInt(r[2],16)}, ${parseInt(r[3],16)}` : '17,24,39';
  };

  const [
    { data: todayBookings },
    { data: upcomingBookings },
    { count: totalBookings },
    { count: totalClients },
  ] = await Promise.all([
    supabase.from('bookings')
      .select('*, service:service_groups(name, duration_minutes), client:clients(name, email, phone)')
      .eq('barber_id', barber.id).eq('booking_date', today)
      .not('status', 'in', '("cancelled","no_show")').order('start_time'),
    supabase.from('bookings')
      .select('*, service:service_groups(name), client:clients(name)')
      .eq('barber_id', barber.id).gt('booking_date', today).lte('booking_date', weekEnd)
      .not('status', 'in', '("cancelled","no_show")').order('booking_date').order('start_time').limit(10),
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .eq('barber_id', barber.id).eq('status', 'completed'),
    supabase.from('clients').select('*', { count: 'exact', head: true })
      .eq('barber_id', barber.id),
  ]);

  const stats = [
    { label: "Today's Bookings", value: todayBookings?.length ?? 0, color: brandColor, icon: '📅' },
    { label: 'This Week',         value: upcomingBookings?.length ?? 0, color: '#6366f1', icon: '📆' },
    { label: 'Completed',         value: totalBookings ?? 0,            color: '#059669', icon: '✅' },
    { label: 'Clients',           value: totalClients ?? 0,             color: '#d97706', icon: '👥' },
  ];

  return (
    <div
      className="min-h-screen mesh-bg"
      style={{ '--brand-color': brandColor, '--brand-color-rgb': hexToRgb(brandColor) } as React.CSSProperties}
    >
      {/* Ambient blobs */}
      <div
        className="pointer-events-none fixed top-[-15%] left-[-10%] w-[45vw] h-[45vw] rounded-full opacity-20 blur-[80px]"
        style={{ background: `radial-gradient(circle, ${brandColor}66, transparent 70%)` }}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* ── Header ─────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Good day,{' '}
              <span style={{ color: brandColor }}>{barber.name.split(' ')[0]}</span>!
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs glass-white rounded-full px-3 py-1.5 text-gray-500">
            <span className="pulse-dot scale-75" />
            Live
          </div>
        </div>

        {/* ── Stat cards ─────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass-card rounded-2xl p-5 hover:shadow-glass-lg transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">{stat.icon}</span>
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${stat.color}18` }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ background: stat.color }} />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs font-medium text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Today's Schedule ───────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Schedule</h2>
            <Link
              href="/barber/bookings"
              className="text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: brandColor }}
            >
              View all →
            </Link>
          </div>

          {!todayBookings || todayBookings.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <div className="text-4xl mb-3">☀️</div>
              <p className="text-gray-500 text-sm font-medium">No bookings today</p>
              <p className="text-gray-400 text-xs mt-1">Enjoy your free day!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayBookings.map((booking: any) => (
                <div
                  key={booking.id}
                  className="glass-card rounded-2xl p-4 flex items-center gap-4 hover:shadow-glass-lg transition-all hover:scale-[1.005]"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}
                  >
                    <span className="text-xs font-bold leading-none">
                      {new Date(`${today}T${booking.start_time}`).toLocaleTimeString('en-CA', { hour: 'numeric', hour12: true })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{booking.client?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {booking.service?.name} · {booking.service?.duration_minutes} min
                    </p>
                    {booking.client?.phone && (
                      <p className="text-xs text-gray-400 mt-0.5">{booking.client.phone}</p>
                    )}
                  </div>
                  <StatusBadge status={booking.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Upcoming This Week ─────────────────────── */}
        {upcomingBookings && upcomingBookings.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming This Week</h2>
            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/50">
              {upcomingBookings.map((booking: any) => (
                <div key={booking.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-white/30 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{booking.client?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(booking.booking_date).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' '}at{' '}
                      {new Date(`${booking.booking_date}T${booking.start_time}`).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium rounded-full px-3 py-1"
                    style={{ color: brandColor, background: `${brandColor}15` }}
                  >
                    {booking.service?.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Quick Actions ──────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/barber/services', title: 'Manage Services', desc: 'Add or edit offerings', icon: '✂️' },
              { href: '/barber/settings', title: 'Settings', desc: 'Availability & profile', icon: '⚙️' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="glass-card rounded-2xl p-5 hover:shadow-glass-lg transition-all hover:scale-[1.02] active:scale-[0.99]"
              >
                <span className="text-2xl">{action.icon}</span>
                <p className="font-semibold text-gray-900 text-sm mt-2">{action.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
              </Link>
            ))}
            <Link
              href={`/b/${barber.slug}`}
              target="_blank"
              className="glass-card rounded-2xl p-5 col-span-2 flex items-center justify-between hover:shadow-glass-lg transition-all hover:scale-[1.005] active:scale-[0.99] group"
            >
              <div>
                <p className="font-semibold text-sm" style={{ color: brandColor }}>
                  View Your Public Booking Page
                </p>
                <p className="text-xs text-gray-400 mt-0.5">/b/{barber.slug}</p>
              </div>
              <span className="text-lg group-hover:translate-x-1 transition-transform">↗</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
