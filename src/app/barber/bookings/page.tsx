'use client';

import { useState, useEffect, useCallback } from 'react';
import StatusBadge from '@/components/StatusBadge';
import LoadingSpinner from '@/components/LoadingSpinner';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'booked', label: 'Booked' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

const ACTION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  confirmed: { bg: 'bg-emerald-50',  text: 'text-emerald-700',  label: 'Confirm' },
  completed: { bg: 'bg-gray-50',     text: 'text-gray-700',     label: 'Complete' },
  no_show:   { bg: 'bg-orange-50',   text: 'text-orange-700',   label: 'No Show' },
  cancelled: { bg: 'bg-red-50',      text: 'text-red-600',      label: 'Cancel' },
};

export default function BarberBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (dateFilter) { params.set('dateFrom', dateFilter); params.set('dateTo', dateFilter); }
    const res = await fetch(`/api/barber/bookings?${params}`);
    const json = await res.json();
    setBookings(json.bookings ?? []);
    setLoading(false);
  }, [statusFilter, dateFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    await fetch(`/api/barber/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await fetchBookings();
    setUpdatingId(null);
  }

  const hasFilter = statusFilter || dateFilter;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/80">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ───────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          {!loading && (
            <span className="text-xs glass-white rounded-full px-3 py-1.5 text-gray-500 font-medium">
              {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}
            </span>
          )}
        </div>

        {/* ── Filters ──────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-4 flex flex-wrap gap-3 items-center">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setStatusFilter(o.value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                  statusFilter === o.value
                    ? 'text-white shadow-sm'
                    : 'glass-white text-gray-600 hover:scale-105'
                }`}
                style={statusFilter === o.value ? { background: '#111827' } : {}}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="glass-input border-0 rounded-xl px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            {hasFilter && (
              <button
                onClick={() => { setStatusFilter(''); setDateFilter(''); }}
                className="text-xs text-gray-400 hover:text-gray-600 glass-white rounded-full px-3 py-1.5 transition-all hover:scale-105"
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* ── List ─────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : bookings.length === 0 ? (
          <div className="glass-card rounded-2xl p-16 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 text-sm font-medium">No bookings found</p>
            {hasFilter && (
              <p className="text-gray-400 text-xs mt-1">Try clearing your filters</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="glass-card rounded-2xl overflow-hidden hover:shadow-glass-lg transition-all"
              >
                {/* Status accent line */}
                <div
                  className="h-1"
                  style={{
                    background:
                      booking.status === 'confirmed' ? '#10b981' :
                      booking.status === 'booked'    ? '#6366f1' :
                      booking.status === 'completed' ? '#059669' :
                      booking.status === 'cancelled' ? '#ef4444' :
                      booking.status === 'no_show'   ? '#f59e0b' :
                      '#e5e7eb',
                  }}
                />

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{booking.client?.name}</p>
                        <StatusBadge status={booking.status} />
                        <span className="text-xs font-mono text-gray-300">#{booking.confirmation_code}</span>
                      </div>

                      {/* Service + time row */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-gray-600 mb-1.5">
                        <span className="font-medium">{booking.service?.name}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-500">{booking.service?.duration_minutes} min</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-500">
                          {new Date(booking.booking_date).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
                          {' '}at{' '}
                          {new Date(`${booking.booking_date}T${booking.start_time}`).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Contact */}
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{booking.client?.email}</span>
                        {booking.client?.phone && <><span className="text-gray-200">·</span><span>{booking.client.phone}</span></>}
                      </div>

                      {booking.notes && (
                        <p className="mt-2 text-xs text-gray-400 italic glass-sm rounded-lg px-2.5 py-1.5 inline-block">
                          &ldquo;{booking.notes}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    {!['completed', 'cancelled', 'no_show'].includes(booking.status) && (
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        {booking.status !== 'confirmed' && (
                          <button
                            onClick={() => updateStatus(booking.id, 'confirmed')}
                            disabled={updatingId === booking.id}
                            className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            ✓ Confirm
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(booking.id, 'completed')}
                          disabled={updatingId === booking.id}
                          className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => updateStatus(booking.id, 'no_show')}
                          disabled={updatingId === booking.id}
                          className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 bg-orange-50 text-orange-600 hover:bg-orange-100 disabled:opacity-50"
                        >
                          No Show
                        </button>
                        <button
                          onClick={() => updateStatus(booking.id, 'cancelled')}
                          disabled={updatingId === booking.id}
                          className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
