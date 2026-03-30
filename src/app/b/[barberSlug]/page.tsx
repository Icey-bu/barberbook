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

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center space-y-4 pt-4">
        {barber.avatar_url ? (
          <img
            src={barber.avatar_url}
            alt={barber.name}
            className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg"
          />
        ) : (
          <div
            className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-lg"
            style={{ backgroundColor: barber.brand_color }}
          >
            {barber.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{barber.name}</h1>
          {barber.bio && (
            <p className="mt-2 text-gray-600 max-w-sm mx-auto text-sm leading-relaxed">
              {barber.bio}
            </p>
          )}
        </div>
        {barber.phone && (
          <a href={`tel:${barber.phone}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            {barber.phone}
          </a>
        )}
      </section>

      {/* Services */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Services</h2>
        {activeServices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">No services available at the moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeServices.map((service) => (
              <Link key={service.id} href={`/b/${barberSlug}/book?service=${service.id}`}>
                <ServiceCard service={service} brandColor={barber.brand_color} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Book Button */}
      {activeServices.length > 0 && (
        <Link
          href={`/b/${barberSlug}/book`}
          className="block w-full py-3.5 px-6 rounded-xl text-white font-semibold text-center transition-opacity hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: barber.brand_color }}
        >
          Book Now
        </Link>
      )}

      {/* Location Map */}
      {barber.location && (
        <LocationMap
          address={barber.location}
          barberName={barber.name}
          brandColor={barber.brand_color}
        />
      )}

      {/* Cancellation policy */}
      {barber.cancellation_policy && (
        <div className="bg-amber-50 rounded-xl px-4 py-3 text-xs text-amber-800">
          <strong>Cancellation Policy:</strong> {barber.cancellation_policy}
        </div>
      )}
    </div>
  );
}
