'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Barber, AvailabilityRule } from '@/types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function BarberSettingsPage() {
  const [barber, setBarber] = useState<Barber | null>(null);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    bio: '',
    phone: '',
    location: '',
    brand_color: '#111827',
    cancellation_policy: '',
    min_advance_hours: 2,
    max_advance_days: 30,
    deposit_required: true,
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: b } = await supabase.from('barbers').select('*').eq('user_id', user.id).single<Barber>();
      if (!b) return;
      setBarber(b);
      setProfileData({
        name: b.name,
        bio: b.bio ?? '',
        phone: b.phone ?? '',
        location: b.location ?? '',
        brand_color: b.brand_color,
        cancellation_policy: b.cancellation_policy ?? '',
        min_advance_hours: b.min_advance_hours,
        max_advance_days: b.max_advance_days,
        deposit_required: b.deposit_required,
      });
      const res = await fetch('/api/barber/availability');
      const json = await res.json();
      setRules(json.rules ?? []);
    }
    load();
  }, []);

  function getRuleForDay(dayOfWeek: number) {
    return rules.find((r) => r.day_of_week === dayOfWeek);
  }

  function toggleDay(dayOfWeek: number) {
    const existing = getRuleForDay(dayOfWeek);
    if (existing) {
      setRules(rules.filter((r) => r.day_of_week !== dayOfWeek));
    } else {
      setRules([...rules, {
        id: `temp-${dayOfWeek}`,
        barber_id: barber?.id ?? '',
        day_of_week: dayOfWeek,
        start_time: '09:00:00',
        end_time: '18:00:00',
        is_active: true,
        created_at: '',
        updated_at: '',
      }]);
    }
  }

  function updateRuleTime(dayOfWeek: number, field: 'start_time' | 'end_time', value: string) {
    setRules(rules.map((r) =>
      r.day_of_week === dayOfWeek ? { ...r, [field]: value + ':00' } : r
    ));
  }

  async function saveAll() {
    if (!barber) return;
    setSaving(true);
    const supabase = createClient();

    // Save profile
    await supabase.from('barbers').update(profileData).eq('id', barber.id);

    // Save availability
    await fetch('/api/barber/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: rules.map((r) => ({
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
        is_active: r.is_active,
      }))}),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!barber) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Profile */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-sm">
        <h2 className="font-semibold text-gray-900">Public Profile</h2>

        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={profileData.bio}
              onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none"
              placeholder="Tell clients about yourself..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={profileData.location}
                onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                placeholder="e.g. Downtown Ottawa"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={profileData.brand_color}
                onChange={(e) => setProfileData({ ...profileData, brand_color: e.target.value })}
                className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
              <span className="text-sm text-gray-500 font-mono">{profileData.brand_color}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Booking settings */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-sm">
        <h2 className="font-semibold text-gray-900">Booking Rules</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min advance notice (hours)</label>
            <input
              type="number"
              value={profileData.min_advance_hours}
              onChange={(e) => setProfileData({ ...profileData, min_advance_hours: parseInt(e.target.value) })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max advance booking (days)</label>
            <input
              type="number"
              value={profileData.max_advance_days}
              onChange={(e) => setProfileData({ ...profileData, max_advance_days: parseInt(e.target.value) })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
              min={1}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Policy</label>
          <textarea
            value={profileData.cancellation_policy}
            onChange={(e) => setProfileData({ ...profileData, cancellation_policy: e.target.value })}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none"
            placeholder="e.g. Please cancel at least 24 hours in advance."
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="deposit_required"
            checked={profileData.deposit_required}
            onChange={(e) => setProfileData({ ...profileData, deposit_required: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <label htmlFor="deposit_required" className="text-sm text-gray-700">Require deposit for bookings</label>
        </div>
      </section>

      {/* Availability */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Weekly Availability</h2>
        <div className="space-y-3">
          {DAYS.map((day, index) => {
            const rule = getRuleForDay(index);
            const isOpen = !!rule;
            return (
              <div key={day} className="flex items-center gap-3">
                <button
                  onClick={() => toggleDay(index)}
                  className={`w-28 text-left text-sm font-medium py-1.5 px-3 rounded-lg transition-colors ${
                    isOpen ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {day}
                </button>
                {isOpen && rule && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={rule.start_time.slice(0, 5)}
                      onChange={(e) => updateRuleTime(index, 'start_time', e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                    />
                    <span className="text-gray-400 text-sm">to</span>
                    <input
                      type="time"
                      value={rule.end_time.slice(0, 5)}
                      onChange={(e) => updateRuleTime(index, 'end_time', e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                )}
                {!isOpen && <span className="text-sm text-gray-400">Closed</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={saveAll}
          disabled={saving}
          className="bg-gray-900 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
        {saved && <p className="text-sm text-green-600 font-medium">✓ Saved successfully!</p>}
      </div>

      {/* Booking page link */}
      <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600">
        <p className="font-medium mb-1">Your public booking page URL:</p>
        <p className="font-mono text-gray-900 break-all">
          {typeof window !== 'undefined' ? `${window.location.origin}/b/${barber.slug}` : `/b/${barber.slug}`}
        </p>
      </div>
    </div>
  );
}
