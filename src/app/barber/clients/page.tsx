'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { Client } from '@/types';

export default function BarberClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  async function fetchClients(searchTerm = '') {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    params.set('sortBy', 'last_visit_at');
    params.set('sortOrder', 'desc');
    const res = await fetch(`/api/barber/clients?${params}`);
    const json = await res.json();
    setClients(json.clients ?? []);
    setTotal(json.pagination?.total ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => fetchClients(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total clients</p>
        </div>
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, or phone..."
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
      />

      {loading ? (
        <LoadingSpinner />
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 text-sm">
          {search ? 'No clients match your search.' : 'No clients yet. They appear automatically after bookings.'}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden shadow-sm">
          {clients.map((client) => (
            <div key={client.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{client.name}</p>
                    <p className="text-xs text-gray-500 truncate">{client.email}</p>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-sm font-medium text-gray-900">{client.total_visits} visit{client.total_visits !== 1 ? 's' : ''}</p>
                {client.no_show_count > 0 && (
                  <p className="text-xs text-orange-500">{client.no_show_count} no-show{client.no_show_count !== 1 ? 's' : ''}</p>
                )}
                {client.last_visit_at && (
                  <p className="text-xs text-gray-400">
                    Last: {new Date(client.last_visit_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
