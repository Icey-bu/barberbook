'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { ServiceGroup } from '@/types';

const EMPTY_SERVICE = {
  name: '',
  description: '',
  duration_minutes: 30,
  price: 0,
  deposit_type: 'none' as const,
  deposit_value: 0,
  display_order: 0,
};

export default function BarberServicesPage() {
  const [services, setServices] = useState<ServiceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ServiceGroup> | null>(null);
  const [saving, setSaving] = useState(false);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async (bid: string) => {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from('service_groups')
      .select('*')
      .eq('barber_id', bid)
      .order('display_order');
    if (err) setError(err.message);
    else setServices((data as ServiceGroup[]) ?? []);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) { setError('Not authenticated'); setLoading(false); return; }
        const { data: barber, error: barberErr } = await supabase
          .from('barbers').select('id').eq('user_id', user.id).single();
        if (barberErr || !barber) { setError('Barber profile not found'); setLoading(false); return; }
        setBarberId(barber.id);
        await loadServices(barber.id);
      } catch (e) {
        setError('Failed to load services');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [loadServices]);

  async function saveService() {
    if (!editing || !barberId) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      if (editing.id) {
        const { error: err } = await supabase
          .from('service_groups')
          .update({
            name: editing.name,
            description: editing.description,
            duration_minutes: editing.duration_minutes,
            price: editing.price,
            deposit_type: editing.deposit_type,
            deposit_value: editing.deposit_value,
            display_order: editing.display_order,
          })
          .eq('id', editing.id)
          .eq('barber_id', barberId);
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await supabase
          .from('service_groups')
          .insert({ ...editing, barber_id: barberId, is_active: true });
        if (err) throw new Error(err.message);
      }
      await loadServices(barberId);
      setEditing(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    if (!barberId) return;
    const supabase = createClient();
    await supabase.from('service_groups').update({ is_active: !current }).eq('id', id).eq('barber_id', barberId);
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {services.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500 text-sm">
          No services yet. Click &quot;+ Add Service&quot; to create one.
        </div>
      )}

      <div className="space-y-3">
        {services.map((svc) => (
          <div key={svc.id} className={`bg-white rounded-2xl border p-4 shadow-sm transition-opacity ${!svc.is_active ? 'opacity-50 border-gray-100' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{svc.name}</p>
                  {!svc.is_active && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">hidden</span>}
                </div>
                {svc.description && <p className="text-sm text-gray-500 mt-0.5">{svc.description}</p>}
                <p className="text-sm text-gray-500 mt-1">
                  ${Number(svc.price).toFixed(0)} · {svc.duration_minutes} min
                  {svc.deposit_type !== 'none' && svc.deposit_value > 0 && ` · $${svc.deposit_value} deposit`}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setEditing(svc)}
                  className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  Edit
                </button>
                <button onClick={() => toggleActive(svc.id, svc.is_active)}
                  className={`text-xs px-3 py-1.5 rounded-lg ${svc.is_active ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                  {svc.is_active ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Add Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">{editing.id ? 'Edit Service' : 'New Service'}</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
                <input type="text" value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="e.g. Classic Fade" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none"
                  placeholder="Short description..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                  <input type="number" value={editing.price ?? 0} min={0}
                    onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                  <input type="number" value={editing.duration_minutes ?? 30} min={15} step={15}
                    onChange={(e) => setEditing({ ...editing, duration_minutes: parseInt(e.target.value) || 30 })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Type</label>
                  <select value={editing.deposit_type ?? 'none'}
                    onChange={(e) => setEditing({ ...editing, deposit_type: e.target.value as 'none' | 'fixed' | 'percentage' })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                    <option value="none">None</option>
                    <option value="fixed">Fixed ($)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
                {editing.deposit_type !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {editing.deposit_type === 'percentage' ? 'Deposit %' : 'Deposit ($)'}
                    </label>
                    <input type="number" value={editing.deposit_value ?? 0} min={0}
                      onChange={(e) => setEditing({ ...editing, deposit_value: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveService} disabled={saving || !editing.name}
                className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-gray-800">
                {saving ? 'Saving...' : 'Save Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
