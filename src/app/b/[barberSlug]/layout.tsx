import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import type { Barber } from '@/types';

interface Props {
  children: React.ReactNode;
  params: Promise<{ barberSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { barberSlug } = await params;
  const supabase = await createClient();
  const { data: barber } = await supabase
    .from('barbers')
    .select('name, bio, avatar_url')
    .eq('slug', barberSlug)
    .eq('is_active', true)
    .single();

  if (!barber) return { title: 'Barber Not Found' };

  return {
    title: `${barber.name} — Book an Appointment`,
    description: barber.bio ?? `Book your next appointment with ${barber.name}.`,
    openGraph: {
      title: `${barber.name} — Book an Appointment`,
      description: barber.bio ?? `Book with ${barber.name}`,
      ...(barber.avatar_url && { images: [{ url: barber.avatar_url }] }),
    },
  };
}

export default async function BarberLayout({ children, params }: Props) {
  const { barberSlug } = await params;
  const supabase = await createClient();

  const { data: barber } = await supabase
    .from('barbers')
    .select('id, name, brand_color, brand_logo_url, avatar_url, slug')
    .eq('slug', barberSlug)
    .eq('is_active', true)
    .single<Barber>();

  if (!barber) notFound();

  const brandColor = barber.brand_color ?? '#111827';

  return (
    <div className="min-h-screen bg-gray-50" style={{ '--brand-color': brandColor } as React.CSSProperties}>
      {/* Minimal branded header */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          {barber.brand_logo_url ? (
            <img src={barber.brand_logo_url} alt={barber.name} className="h-8 w-auto" />
          ) : (
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: brandColor }}
              >
                {barber.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-gray-900 text-sm">{barber.name}</span>
            </div>
          )}
          <div className="text-xs text-gray-400">Powered by BarberBook</div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-4 py-8 text-center">
        <p className="text-xs text-gray-400">
          Secure booking powered by{' '}
          <span className="font-medium text-gray-500">BarberBook</span>
        </p>
      </footer>
    </div>
  );
}
