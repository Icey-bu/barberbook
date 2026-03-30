'use client';

import { useState, useEffect } from 'react';
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

export default function BarberBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchBookings() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (dateFilter) { params.set('dateFrom', dateFilter); params.set('dateTo', dateFilter); }
    const res = await fetch(`/api/barber/bookings?${params}`);
    const json = await res.json();
    setBookings(json.bookings ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchBookings(); }, [statusFilter, dateFilter]);

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none"
        />
        {(statusFilter || dateFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setDateFilter(''); }}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
          No bookings found.
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">{booking.client?.name}</p>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {booking.service?.name} · {booking.service?.duration_minutes} min
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(booking.booking_date).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' '}at{' '}
                    {new Date(`${booking.booking_date}T${booking.start_time}`).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                  {booking.notes && (
                    <p className="text-xs text-gray-400 mt-1 italic">&ldquo;{booking.notes}&rdquo;</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{booking.client?.email}</span>
                    {booking.client?.phone && <span>· {booking.client.phone}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 font-mono">#{booking.confirmation_code}</p>
                </div>

                {/* Status actions */}
                {!['completed', 'cancelled', 'no_show'].includes(booking.status) && (
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {booking.status !== 'confirmed' && (
                      <button
                        onClick={() => updateStatus(booking.id, 'confirmed')}
                        disabled={updatingId === booking.id}
                        className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                    )}
                    <button
                      onClick={() => updateStatus(booking.id, 'completed')}
                      disabled={updatingId === booking.id}
                      className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => updateStatus(booking.id, 'no_show')}
                      disabled={updatingId === booking.id}
                      className="text-xs px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 disabled:opacity-50"
                    >
                      No Show
                    </button>
                    <button
                      onClick={() => updateStatus(booking.id, 'cancelled')}
                      disabled={updatingId === booking.id}
                      className="text-xs px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
