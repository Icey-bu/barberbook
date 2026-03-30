import type { BookingStatus } from '@/types';

interface Props {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  booked:          { label: 'Booked',     className: 'bg-blue-100 text-blue-700' },
  deposit_pending: { label: 'Pending',    className: 'bg-yellow-100 text-yellow-700' },
  confirmed:       { label: 'Confirmed',  className: 'bg-green-100 text-green-700' },
  rescheduled:     { label: 'Rescheduled',className: 'bg-purple-100 text-purple-700' },
  cancelled:       { label: 'Cancelled',  className: 'bg-red-100 text-red-700' },
  completed:       { label: 'Completed',  className: 'bg-gray-100 text-gray-700' },
  no_show:         { label: 'No Show',    className: 'bg-orange-100 text-orange-700' },
};

export default function StatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
