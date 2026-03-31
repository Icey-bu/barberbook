'use client';

import type { TimeSlot } from '@/types';

interface Props {
  slots: TimeSlot[];
  selected: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
  brandColor?: string;
}

const PERIODS = [
  { label: 'Morning', icon: '🌤', range: [6, 12] },
  { label: 'Afternoon', icon: '☀️', range: [12, 17] },
  { label: 'Evening', icon: '🌙', range: [17, 24] },
];

function getHour(isoStr: string): number {
  return new Date(isoStr).getHours();
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function TimeSlotPicker({ slots, selected, onSelect, brandColor = '#111827' }: Props) {
  if (slots.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center slide-up">
        <div className="text-3xl mb-2">📅</div>
        <p className="text-sm font-medium text-gray-600">No slots available</p>
        <p className="text-xs text-gray-400 mt-1">Try selecting a different day.</p>
      </div>
    );
  }

  // Group slots by period
  const grouped = PERIODS.map((period) => ({
    ...period,
    slots: slots.filter((s) => {
      const h = getHour(s.startTime);
      return h >= period.range[0] && h < period.range[1];
    }),
  })).filter((g) => g.slots.length > 0);

  return (
    <div className="space-y-4 slide-up">
      {grouped.map((group) => (
        <div key={group.label}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">{group.icon}</span>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{group.label}</h4>
            <span className="text-xs text-gray-300">({group.slots.length})</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {group.slots.map((slot, i) => {
              const isSelected = selected?.startTime === slot.startTime;
              return (
                <button
                  key={slot.startTime}
                  type="button"
                  onClick={() => onSelect(slot)}
                  className={`
                    relative py-2.5 px-2 rounded-xl text-sm font-medium transition-all duration-200
                    ${isSelected
                      ? 'text-white shadow-brand scale-[1.04]'
                      : 'glass-white hover:scale-[1.03] active:scale-[0.97] text-gray-700'
                    }
                  `}
                  style={{
                    animationDelay: `${i * 40}ms`,
                    ...(isSelected
                      ? {
                          background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`,
                          boxShadow: `0 4px 16px ${brandColor}44`,
                        }
                      : {}),
                  }}
                >
                  {/* Selected checkmark */}
                  {isSelected && (
                    <span className="absolute top-1 right-1 w-3 h-3 bg-white/30 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                  {formatTime(slot.startTime)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
