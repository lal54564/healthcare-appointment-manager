import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/settings')({ component: SettingsPage });

function SettingsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <h1 className="text-3xl font-display font-bold text-slate-900 mb-6">System Settings</h1>
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <p className="text-slate-500 text-lg">Settings will appear here. (Coming soon)</p>
      </div>
    </div>
  );
}
