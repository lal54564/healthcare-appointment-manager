import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/doctor/settings')({ component: SettingsPage });

function SettingsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in font-vintage">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clinician Settings</h1>
          <p className="page-subtitle">Configure medical directory preferences and profile settings</p>
        </div>
      </div>
      <div className="hc-card p-12 text-center">
        <p className="text-[#3b2f2f]/60 text-lg italic">Clinical preferences and configuration options will compile here. (Coming soon)</p>
      </div>
    </div>
  );
}
