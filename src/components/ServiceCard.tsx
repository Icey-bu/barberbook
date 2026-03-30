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
        w-full text-left p-4 rounded-xl border-2 transition-all duration-200
        ${selected
          ? 'border-current bg-opacity-5'
          : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
        }
      `}
      style={selected ? { borderColor: brandColor, backgroundColor: `${brandColor}08` } : {}}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {selected && (
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: brandColor }}
              >
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            <h3 className="font-semibold text-gray-900 text-sm">{service.name}</h3>
          </div>
          {service.description && (
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">{service.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <span>⏱ {service.duration_minutes} min</span>
            {depositLabel && (
              <>
                <span>·</span>
                <span style={{ color: brandColor }}>{depositLabel}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="font-bold text-gray-900">${Number(service.price).toFixed(0)}</p>
        </div>
      </div>
    </button>
  );
}
