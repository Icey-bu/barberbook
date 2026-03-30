'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/admin/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !data.user) {
      setError(authError?.message ?? 'Login failed');
      setLoading(false);
      return;
    }
    const role = data.user.user_metadata?.role;
    if (role !== 'admin') {
      await supabase.auth.signOut();
      setError('Access denied. Admin credentials required.');
      setLoading(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-700 rounded-xl mx-auto flex items-center justify-center mb-4">
            <span className="text-white font-bold">BB</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Login</h1>
          <p className="text-sm text-gray-400 mt-1">BarberBook Platform Operations</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4 bg-gray-900 p-8 rounded-2xl border border-gray-800">
          {error && <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-700 rounded-xl px-4 py-3 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-700 rounded-xl px-4 py-3 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-gray-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-white text-gray-900 py-3 rounded-xl font-semibold hover:bg-gray-100 disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
