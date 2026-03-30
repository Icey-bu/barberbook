import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

async function signOut() {
  'use server';
  const { createClient: create } = await import('@/lib/supabase/server');
  const supabase = await create();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') redirect('/admin/login');

  const navLinks = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/barbers', label: 'Barbers' },
    { href: '/admin/config', label: 'Config' },
    { href: '/admin/monitoring', label: 'Monitoring' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="flex">
        <div className="w-56 min-h-screen bg-gray-900 flex flex-col border-r border-gray-800">
          <div className="px-5 py-4 border-b border-gray-800">
            <p className="text-sm font-bold text-white">BarberBook Admin</p>
            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className="block px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="px-3 py-4 border-t border-gray-800">
            <form action={signOut}>
              <button type="submit" className="text-xs text-gray-400 hover:text-gray-200 px-3 py-2">Sign Out</button>
            </form>
          </div>
        </div>
        <main className="flex-1 px-6 py-6 max-w-4xl">{children}</main>
      </div>
    </div>
  );
}
