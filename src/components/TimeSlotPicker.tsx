'use client';

import type { TimeSlot } from '@/types';

interface Props {
  slots: TimeSlot[];
  selected: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
  brandColor?: string;
}

export default function TimeSlotPicker({ slots, selected, onSelect, brandColor = '#111827' }: Props) {
  if (slots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No available slots for this date.
        <br />
        <span className="text-xs">Try another day.</span>
      </div>
    );
  }

  const formatTime = (isoStr: string) => {
    return new Date(isoStr).toLocaleTimeString('en-CA', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {slots.map((slot) => {
        const isSelected = selected?.startTime === slot.startTime;
        return (
          <button
            key={slot.startTime}
            type="button"
            onClick={() => onSelect(slot)}
            className={`
              py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-150
              ${isSelected
                ? 'text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
              }
            `}
            style={isSelected ? { backgroundColor: brandColor } : {}}
          >
            {formatTime(slot.startTime)}
          </button>
        );
      })}
    </div>
  );
}
