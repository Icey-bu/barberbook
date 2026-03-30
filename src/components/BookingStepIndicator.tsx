'use client';

interface Props {
  steps: readonly string[];
  currentStep: number;
  brandColor?: string;
}

export default function BookingStepIndicator({ steps, currentStep, brandColor = '#111827' }: Props) {
  return (
    <div className="flex items-center justify-center gap-1 py-2">
      {steps.map((step, index) => {
        const isDone = index < currentStep;
        const isActive = index === currentStep;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all
                  ${isDone ? 'text-white' : isActive ? 'text-white' : 'bg-gray-100 text-gray-400'}
                `}
                style={isDone || isActive ? { backgroundColor: brandColor } : {}}
              >
                {isDone ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`mt-1 text-[10px] font-medium hidden sm:block ${
                  isActive ? 'text-gray-900' : isDone ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className="w-8 h-0.5 mx-1 mt-0 sm:-mt-4 transition-colors"
                style={{
                  backgroundColor: isDone ? brandColor : '#e5e7eb',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
