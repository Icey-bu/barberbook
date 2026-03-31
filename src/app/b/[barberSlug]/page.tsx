import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ServiceCard from '@/components/ServiceCard';
import LocationMap from '@/components/LocationMap';
import type { Barber, ServiceGroup } from '@/types';

interface Props {
  params: Promise<{ barberSlug: string }>;
}

export default async function BarberLandingPage({ params }: Props) {
  const { barberSlug } = await params;
  const supabase = await createClient();

  const { data: barber } = await supabase
    .from('barbers')
    .select('*')
    .eq('slug', barberSlug)
    .eq('is_active', true)
    .single<Barber>();

  if (!barber) notFound();

  const { data: services } = await supabase
    .from('service_groups')
    .select('*')
    .eq('barber_id', barber.id)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .returns<ServiceGroup[]>();

  const activeServices = services ?? [];
  const brandColor = barber.brand_color ?? '#111827';

  return (
    <div className="space-y-6 slide-up">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative glass-card rounded-3xl overflow-hidden p-6 text-center">
        {/* Subtle brand band at top */}
        <div
          className="absolute top-0 inset-x-0 h-1.5 rounded-t-3xl"
          style={{ background: `linear-gradient(90deg, ${brandColor}00, ${brandColor}, ${brandColor}00)` }}
        />

        {/* Avatar */}
        <div className="flex justify-center mb-4">
          {barber.avatar_url ? (
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-md opacity-40 scale-110"
                style={{ background: brandColor }}
              />
              <img
                src={barber.avatar_url}
                alt={barber.name}
                className="relative w-24 h-24 rounded-full object-cover border-4 border-white shadow-glass-lg"
              />
            </div>
          ) : (
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-md opacity-40 scale-110"
                style={{ background: brandColor }}
              />
              <div
                className="relative w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-glass-lg"
                style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}99)` }}
              >
                {barber.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900">{barber.name}</h1>

        {barber.bio && (
          <p className="mt-2 text-gray-500 max-w-sm mx-auto text-sm leading-relaxed">
            {barber.bio}
          </p>
        )}

        {barber.phone && (
          <a
            href={`tel:${barber.phone}`}
            className="inline-flex items-center gap-1.5 mt-3 text-sm text-gray-500 hover:text-gray-700 glass-sm rounded-full px-3 py-1.5 transition-all hover:glass"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            {barber.phone}
          </a>
        )}
      </section>

      {/* ── Services ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-800">Services</h2>
          <span className="text-xs text-gray-400">{activeServices.length} available</span>
        </div>

        {activeServices.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center text-gray-400">
            <p className="text-sm">No services available at the moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeServices.map((service) => (
              <Link key={service.id} href={`/b/${barberSlug}/book?service=${service.id}`}>
                <ServiceCard service={service} brandColor={brandColor} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Book CTA ─────────────────────────────────────── */}
      {activeServices.length > 0 && (
        <Link
          href={`/b/${barberSlug}/book`}
          className="block w-full py-4 px-6 rounded-2xl text-white font-semibold text-center transition-all hover:opacity-90 active:scale-[0.98] shadow-brand-lg"
          style={{
            background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)`,
          }}
        >
          Book an Appointment
        </Link>
      )}

      {/* ── Location ─────────────────────────────────────── */}
      {barber.location && (
        <LocationMap
          address={barber.location}
          barberName={barber.name}
          brandColor={brandColor}
        />
      )}

      {/* ── Cancellation policy ──────────────────────────── */}
      {barber.cancellation_policy && (
        <div className="glass-card rounded-2xl px-4 py-3 border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
          <p className="text-xs text-amber-800">
            <strong>Cancellation Policy:</strong> {barber.cancellation_policy}
          </p>
        </div>
      )}
    </div>
  );
}
