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

  // Parse brand color to RGB for CSS custom property
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '17, 24, 39';
  };

  return (
    <div
      className="min-h-screen mesh-bg relative overflow-x-hidden"
      style={{
        '--brand-color': brandColor,
        '--brand-color-rgb': hexToRgb(brandColor),
      } as React.CSSProperties}
    >
      {/* Ambient blobs */}
      <div
        className="pointer-events-none fixed top-[-15%] left-[-10%] w-[50vw] h-[50vw] rounded-full opacity-30 blur-[80px] animate-pulse-slow"
        style={{ background: `radial-gradient(circle, ${brandColor}55, transparent 70%)` }}
      />
      <div
        className="pointer-events-none fixed bottom-[-20%] right-[-10%] w-[55vw] h-[55vw] rounded-full opacity-20 blur-[100px] animate-pulse-slow"
        style={{ background: `radial-gradient(circle, #8b5cf655, transparent 70%)`, animationDelay: '2s' }}
      />

      {/* Frosted glass sticky header */}
      <header className="glass-white sticky top-0 z-40 border-b border-white/50 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          {barber.brand_logo_url ? (
            <img src={barber.brand_logo_url} alt={barber.name} className="h-8 w-auto" />
          ) : (
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-brand"
                style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}
              >
                {barber.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-gray-900 text-sm">{barber.name}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="pulse-dot" />
            <span>BarberBook</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-6 relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-4 py-8 text-center relative z-10">
        <p className="text-xs text-gray-400/80">
          Secure booking powered by{' '}
          <span className="font-medium text-gray-500">BarberBook</span>
        </p>
      </footer>
    </div>
  );
}
