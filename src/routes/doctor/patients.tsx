import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/doctor/patients')({ component: PatientsPage });

function PatientsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in font-vintage">
      <div className="page-header">
        <div>
          <h1 className="page-title">Patient Archives</h1>
          <p className="page-subtitle">Historical records and clinical logs of patients under your care</p>
        </div>
      </div>
      <div className="hc-card p-12 text-center">
        <p className="text-[#3b2f2f]/60 text-lg italic">Historical patient registries will compile here. (Coming soon)</p>
      </div>
    </div>
  );
}
