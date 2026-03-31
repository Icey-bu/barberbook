'use client';

import type { ServiceGroup } from '@/types';
import { DepositType } from '@/types';

interface Props {
  service: ServiceGroup;
  selected?: boolean;
  onClick?: () => void;
  brandColor?: string;
}

export default function ServiceCard({ service, selected, onClick, brandColor = '#111827' }: Props) {
  const depositLabel = (() => {
    if (service.deposit_type === DepositType.NONE || service.deposit_value === 0) return null;
    if (service.deposit_type === DepositType.FIXED) return `$${Number(service.deposit_value).toFixed(0)} deposit`;
    if (service.deposit_type === DepositType.PERCENTAGE) return `${service.deposit_value}% deposit`;
    return null;
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group w-full text-left rounded-2xl transition-all duration-250 overflow-hidden
        ${selected
          ? 'glass-card glow-brand scale-[1.01]'
          : 'glass-card hover:shadow-glass-lg hover:scale-[1.008] active:scale-[0.99]'
        }
      `}
      style={
        selected
          ? {
              borderColor: `${brandColor}44`,
              boxShadow: `0 0 0 2px ${brandColor}30, 0 8px 32px rgba(0,0,0,0.08)`,
            }
          : {}
      }
    >
      <div className="p-4">
        {/* Top accent line when selected */}
        {selected && (
          <div
            className="absolute top-0 inset-x-0 h-0.5 rounded-t-2xl"
            style={{ background: `linear-gradient(90deg, transparent, ${brandColor}, transparent)` }}
          />
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {selected && (
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center scale-in"
                  style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              <h3 className="font-semibold text-gray-900 text-sm leading-snug">{service.name}</h3>
            </div>

            {service.description && (
              <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2">{service.description}</p>
            )}

            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100/70 rounded-full px-2 py-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                </svg>
                {service.duration_minutes} min
              </span>
              {depositLabel && (
                <span
                  className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 font-medium"
                  style={{ color: brandColor, background: `${brandColor}15` }}
                >
                  {depositLabel}
                </span>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 text-right">
            <p className="font-bold text-gray-900 text-lg leading-none">
              ${Number(service.price).toFixed(0)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">CAD</p>
          </div>
        </div>
      </div>
    </button>
  );
}
