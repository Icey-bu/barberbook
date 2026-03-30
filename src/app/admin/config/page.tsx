import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Admin — Config' };

export default async function AdminConfigPage() {
  const supabase = await createClient();
  const { data: configs } = await supabase.from('platform_config').select('*').order('key');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Config</h1>
      <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800">
        {configs?.map((config) => (
          <div key={config.key} className="px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-mono text-gray-300">{config.key}</p>
            <p className="text-sm text-gray-400">{JSON.stringify(config.value)}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500">Config is managed via Supabase Dashboard for MVP. Admin config UI is a Milestone 4 deliverable.</p>
    </div>
  );
}
