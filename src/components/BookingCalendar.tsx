'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Props {
  barberSlug: string;
  serviceId: string;
  barberTimezone?: string;
  minDate: string;   // YYYY-MM-DD
  maxDate: string;   // YYYY-MM-DD
  selectedDate: string;
  onDateSelect: (date: string) => void;
  brandColor?: string;
  barberId?: string;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function toYMD(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Availability hint: '' = unknown, 'available' | 'limited' | 'full' */
type DayHint = 'available' | 'limited' | 'full' | 'unknown';

export default function BookingCalendar({
  barberSlug,
  serviceId,
  minDate,
  maxDate,
  selectedDate,
  onDateSelect,
  brandColor = '#111827',
  barberId,
}: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + 'T00:00:00') : today;
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + 'T00:00:00') : today;
    return d.getMonth();
  });

  // Availability hints cache: key = "YYYY-MM-DD", value = hint
  const [hints, setHints] = useState<Record<string, DayHint>>({});
  const [loadingHints, setLoadingHints] = useState(false);
  const [realtimePing, setRealtimePing] = useState(0); // bump to re-fetch

  const channelRef = useRef<RealtimeChannel | null>(null);

  // ── Compute calendar grid ───────────────────────────────────
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // ── Fetch hints for visible month ───────────────────────────
  const fetchMonthHints = useCallback(async () => {
    if (!serviceId || !barberSlug) return;
    setLoadingHints(true);
    const newHints: Record<string, DayHint> = {};

    // Build list of dates in the current view month that are within range
    const rangeDates: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(viewYear, viewMonth, d);
      const iso = toYMD(dt);
      if (iso >= minDate && iso <= maxDate && dt >= today) {
        rangeDates.push(iso);
      }
    }

    // Fetch in batches of 7 (parallel)
    const chunks: string[][] = [];
    for (let i = 0; i < rangeDates.length; i += 7) {
      chunks.push(rangeDates.slice(i, i + 7));
    }

    await Promise.all(
      chunks.map(async (chunk) => {
        await Promise.all(
          chunk.map(async (date) => {
            try {
              const res = await fetch(
                `/api/public/availability/${barberSlug}?date=${date}&serviceId=${serviceId}`,
              );
              const json = await res.json();
              const slots: any[] = json.slots ?? [];
              if (slots.length === 0) {
                newHints[date] = 'full';
              } else if (slots.length <= 3) {
                newHints[date] = 'limited';
              } else {
                newHints[date] = 'available';
              }
            } catch {
              newHints[date] = 'unknown';
            }
          }),
        );
      }),
    );

    setHints((prev) => ({ ...prev, ...newHints }));
    setLoadingHints(false);
  }, [viewYear, viewMonth, daysInMonth, minDate, maxDate, barberSlug, serviceId, realtimePing]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchMonthHints();
  }, [fetchMonthHints]);

  // ── Supabase realtime subscription ─────────────────────────
  useEffect(() => {
    if (!barberId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`bookings:barber:${barberId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `barber_id=eq.${barberId}`,
        },
        () => {
          // Clear cached hints for this month and re-fetch
          setHints((prev) => {
            const next = { ...prev };
            for (let d = 1; d <= daysInMonth; d++) {
              const dt = new Date(viewYear, viewMonth, d);
              delete next[toYMD(dt)];
            }
            return next;
          });
          setRealtimePing((n) => n + 1);
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [barberId, viewYear, viewMonth, daysInMonth]);

  // ── Navigation ──────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const prevDisabled = new Date(viewYear, viewMonth, 1) <= new Date(today.getFullYear(), today.getMonth(), 1);
  const nextDisabled = new Date(viewYear, viewMonth + 1, 1) > new Date(maxDate + 'T00:00:00');

  // ── Day helpers ─────────────────────────────────────────────
  function getDayState(day: number) {
    const dt   = new Date(viewYear, viewMonth, day);
    const iso  = toYMD(dt);
    const hint = hints[iso] ?? 'unknown';
    const isPast  = dt < today;
    const tooFar  = iso > maxDate;
    const tooNear = iso < minDate;
    const disabled = isPast || tooFar || tooNear || hint === 'full';
    const isSelected = iso === selectedDate;
    const isToday = iso === toYMD(today);
    return { iso, hint, disabled, isSelected, isToday };
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden select-none">
      {/* ── Header ───────────────────────────────────────── */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${brandColor}18, ${brandColor}08)` }}
      >
        <button
          onClick={prevMonth}
          disabled={prevDisabled}
          className="w-8 h-8 rounded-xl flex items-center justify-center glass-white hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          {loadingHints && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin opacity-60" />
          )}
          {/* Realtime indicator */}
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <span className="pulse-dot scale-75" />
            live
          </span>
        </div>

        <button
          onClick={nextMonth}
          disabled={nextDisabled}
          className="w-8 h-8 rounded-xl flex items-center justify-center glass-white hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* ── Day headers ──────────────────────────────────── */}
      <div className="grid grid-cols-7 px-3 pt-2 pb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>

      {/* ── Day cells ────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-0.5 px-3 pb-3">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} />;

          const { iso, hint, disabled, isSelected, isToday } = getDayState(day);

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onDateSelect(iso)}
              className={`
                relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium
                transition-all duration-150
                ${disabled
                  ? 'cursor-not-allowed opacity-35'
                  : isSelected
                    ? 'text-white shadow-brand scale-105'
                    : 'hover:scale-105 active:scale-95 cursor-pointer'
                }
              `}
              style={
                isSelected
                  ? { background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`, boxShadow: `0 4px 16px ${brandColor}44` }
                  : !disabled
                    ? { background: 'rgba(255,255,255,0.6)' }
                    : {}
              }
            >
              {/* Today ring */}
              {isToday && !isSelected && (
                <span
                  className="absolute inset-0.5 rounded-[10px] border-2"
                  style={{ borderColor: brandColor }}
                />
              )}

              <span className={`text-xs leading-none ${isSelected ? 'text-white' : isToday ? 'font-bold' : 'text-gray-700'}`}>
                {day}
              </span>

              {/* Availability dot */}
              {!disabled && hint !== 'unknown' && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{
                    background: isSelected
                      ? 'rgba(255,255,255,0.8)'
                      : hint === 'available'
                        ? '#22c55e'
                        : hint === 'limited'
                          ? '#f59e0b'
                          : 'transparent',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Legend ───────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 px-4 pb-3 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Open</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Few slots</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" /> Full</span>
      </div>
    </div>
  );
}
