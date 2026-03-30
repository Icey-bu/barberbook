import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Admin — Monitoring' };

export default async function AdminMonitoringPage() {
  const supabase = await createClient();

  const { data: recentLogs } = await supabase
    .from('message_logs')
    .select('*, barber:barbers(name), client:clients(name,email)')
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: failedPayments } = await supabase
    .from('bookings')
    .select('*, client:clients(name,email), barber:barbers(name)')
    .eq('payment_status', 'failed')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Monitoring</h1>

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Message Logs</h2>
        <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800">
          {!recentLogs || recentLogs.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">No message logs.</div>
          ) : recentLogs.map((log: any) => (
            <div key={log.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white">{log.message_type} → {log.client?.email}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  log.status === 'sent' || log.status === 'delivered' ? 'bg-green-900 text-green-300' :
                  log.status === 'failed' ? 'bg-red-900 text-red-300' : 'bg-gray-800 text-gray-400'
                }`}>{log.status}</span>
              </div>
              <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {failedPayments && failedPayments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-red-400">Failed Payments</h2>
          <div className="bg-gray-900 rounded-xl border border-red-900 divide-y divide-gray-800">
            {failedPayments.map((booking: any) => (
              <div key={booking.id} className="px-4 py-3 flex justify-between">
                <div>
                  <p className="text-sm text-white">{booking.client?.name}</p>
                  <p className="text-xs text-gray-400">{booking.barber?.name} · {booking.booking_date}</p>
                </div>
                <p className="text-xs text-red-400">{booking.payment_status}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
