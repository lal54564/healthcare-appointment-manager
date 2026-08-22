import { createFileRoute, Link } from '@tanstack/react-router';
import { Activity, Users, FileWarning, ShieldAlert, Plus, Search } from 'lucide-react';

export const Route = createFileRoute('/admin/')({ component: AdminDashboard });

function AdminDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">System Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of hospital operations and system health.</p>
        </div>
        <div className="flex gap-3">
          <Link 
            to="/admin/doctors" 
            className="inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Doctor
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Doctors</p>
          <p className="text-3xl font-bold text-slate-900">42</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
            <Activity className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Active Appointments</p>
          <p className="text-3xl font-bold text-slate-900">156</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center mb-4">
            <FileWarning className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Failed Notifications</p>
          <p className="text-3xl font-bold text-slate-900">3</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mb-4">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Pending Summaries</p>
          <p className="text-3xl font-bold text-slate-900">12</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Doctor Overview</h2>
            <Link to="/admin/doctors" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              View all
            </Link>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                    <th className="px-6 py-4">Doctor</th>
                    <th className="px-6 py-4">Specialisation</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Today's Appts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { name: 'Dr. Emily Chen', spec: 'Cardiology', status: 'Active', count: 8 },
                    { name: 'Dr. Marcus Johnson', spec: 'Neurology', status: 'Active', count: 5 },
                    { name: 'Dr. Sarah Williams', spec: 'Pediatrics', status: 'Off Duty', count: 0 },
                  ].map((doc, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{doc.name}</td>
                      <td className="px-6 py-4 text-slate-500">{doc.spec}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          doc.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">{doc.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="space-y-6">
              {[
                { title: 'New Booking', desc: 'Patient James W. booked Dr. Chen', time: '10 mins ago', color: 'text-blue-500' },
                { title: 'Cancellation', desc: 'Appointment cancelled by Patient', time: '1 hr ago', color: 'text-red-500' },
                { title: 'System Update', desc: 'Database backup completed successfully', time: '3 hrs ago', color: 'text-green-500' },
              ].map((activity, i) => (
                <div key={i} className="flex gap-4 relative">
                  {i !== 2 && <div className="absolute left-2 top-6 bottom-[-1.5rem] w-px bg-slate-200"></div>}
                  <div className={`w-4 h-4 rounded-full mt-1 flex-shrink-0 border-2 border-white ring-2 ring-slate-100 ${
                    i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-red-500' : 'bg-green-500'
                  }`}></div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{activity.title}</h4>
                    <p className="text-sm text-slate-500 mt-0.5">{activity.desc}</p>
                    <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
