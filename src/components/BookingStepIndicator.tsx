'use client';

interface Props {
  steps: readonly string[];
  currentStep: number;
  brandColor?: string;
}

export default function BookingStepIndicator({ steps, currentStep, brandColor = '#111827' }: Props) {
  return (
    <div className="glass-card rounded-2xl px-4 py-3 mb-2">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isDone   = index < currentStep;
          const isActive = index === currentStep;
          return (
            <div key={step} className="flex items-center flex-1">
              {/* Circle + label */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    transition-all duration-300
                    ${isDone
                      ? 'text-white shadow-brand'
                      : isActive
                        ? 'text-white shadow-brand ring-4 ring-offset-0 scale-105'
                        : 'bg-gray-100/80 text-gray-400 backdrop-blur-sm'
                    }
                  `}
                  style={
                    isDone
                      ? { background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }
                      : isActive
                        ? {
                            background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`,
                            boxShadow: `0 0 0 4px ${brandColor}25`,
                          }
                        : {}
                  }
                >
                  {isDone ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`mt-1 text-[9px] font-semibold uppercase tracking-wider hidden sm:block transition-colors ${
                    isActive ? 'text-gray-800' : isDone ? 'text-gray-400' : 'text-gray-300'
                  }`}
                >
                  {step}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 mt-0 sm:-mt-4">
                  <div
                    className="h-0.5 rounded-full transition-all duration-500"
                    style={{
                      background: isDone
                        ? `linear-gradient(90deg, ${brandColor}, ${brandColor}88)`
                        : 'rgba(0,0,0,0.08)',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
