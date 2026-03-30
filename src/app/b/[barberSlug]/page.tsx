import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ServiceCard from '@/components/ServiceCard';
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
        {barber.location && (
          <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {barber.location}
          </p>
        )}
      </section>

      {/* Services */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Book an Appointment</h2>
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
        <div className="pt-2">
          <Link
            href={`/b/${barberSlug}/book`}
            className="block w-full py-3.5 px-6 rounded-xl text-white font-semibold text-center transition-opacity hover:opacity-90 active:opacity-80"
            style={{ backgroundColor: barber.brand_color }}
          >
            Book Now
          </Link>
        </div>
      )}

      {/* Contact info */}
      {barber.phone && (
        <div className="text-center border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-500">Questions? Call or text:</p>
          <a href={`tel:${barber.phone}`} className="text-sm font-medium mt-1 block" style={{ color: barber.brand_color }}>
            {barber.phone}
          </a>
        </div>
      )}
    </div>
  );
}
