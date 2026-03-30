'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { ServiceGroup } from '@/types';

const EMPTY_SERVICE: Partial<ServiceGroup> = {
  name: '',
  description: '',
  duration_minutes: 30,
  price: 0,
  deposit_type: 'none' as any,
  deposit_value: 0,
  display_order: 0,
};

export default function BarberServicesPage() {
  const [services, setServices] = useState<ServiceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ServiceGroup> | null>(null);
  const [saving, setSaving] = useState(false);
  const [barberId, setBarberId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: barber } = await supabase.from('barbers').select('id').eq('user_id', user.id).single();
      if (!barber) return;
      setBarberId(barber.id);
      const { data: svcs } = await supabase
        .from('service_groups')
        .select('*')
        .eq('barber_id', barber.id)
        .order('display_order');
      setServices(svcs ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function saveService() {
    if (!editing || !barberId) return;
    setSaving(true);
    const supabase = createClient();

    if (editing.id) {
      await fetch(`/api/barber/services/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
    } else {
      await supabase.from('service_groups').insert({ ...editing, barber_id: barberId, is_active: true });
    }

    const { data: svcs } = await supabase
      .from('service_groups').select('*').eq('barber_id', barberId).order('display_order');
    setServices(svcs ?? []);
    setEditing(null);
    setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/barber/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    setServices((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !current } : s));
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Services</h1>
        <button
          onClick={() => setEditing({ ...EMPTY_SERVICE })}
          className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800"
        >
          + Add Service
        </button>
      </div>

      <div className="space-y-3">
        {services.map((svc) => (
          <div key={svc.id} className={`bg-white rounded-2xl border p-4 shadow-sm ${!svc.is_active ? 'opacity-50' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{svc.name}</p>
                  {!svc.is_active && <span className="text-xs text-gray-400">(inactive)</span>}
                </div>
                {svc.description && <p className="text-sm text-gray-500 mt-0.5">{svc.description}</p>}
                <p className="text-sm text-gray-500 mt-1">
                  ${Number(svc.price).toFixed(0)} · {svc.duration_minutes} min
                  {svc.deposit_type !== 'none' && ` · $${svc.deposit_value} deposit`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(svc)}
                  className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(svc.id, svc.is_active)}
                  className={`text-xs px-3 py-1.5 rounded-lg ${svc.is_active ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                >
                  {svc.is_active ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">{editing.id ? 'Edit Service' : 'New Service'}</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  value={editing.name ?? ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="e.g. Classic Fade"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editing.description ?? ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none"
                  placeholder="Short description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={editing.price ?? 0}
                    onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    value={editing.duration_minutes ?? 30}
                    onChange={(e) => setEditing({ ...editing, duration_minutes: parseInt(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    min={15}
                    step={15}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Type</label>
                  <select
                    value={editing.deposit_type ?? 'none'}
                    onChange={(e) => setEditing({ ...editing, deposit_type: e.target.value as any })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  >
                    <option value="none">None</option>
                    <option value="fixed">Fixed amount</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>
                {editing.deposit_type !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {editing.deposit_type === 'percentage' ? 'Deposit %' : 'Deposit ($)'}
                    </label>
                    <input
                      type="number"
                      value={editing.deposit_value ?? 0}
                      onChange={(e) => setEditing({ ...editing, deposit_value: parseFloat(e.target.value) })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                      min={0}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveService}
                disabled={saving || !editing.name}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
