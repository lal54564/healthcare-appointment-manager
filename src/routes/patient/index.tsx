import { createFileRoute, Link } from '@tanstack/react-router';
import { Calendar, Clock, CheckCircle, Pill, ChevronRight, Activity, FileText, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../../lib/db/client';
import { useState, useEffect } from 'react';
import { formatToClinicTime } from '../../../lib/timezone';
import { toast } from 'react-hot-toast';

export const Route = createFileRoute('/patient/')({ component: PatientDashboard });

function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: apts } = await supabase
        .from('appointments')
        .select('*, doctors!inner(*, profiles!fk_doctors_profiles(*)), symptom_forms(*), summaries(*)')
        .eq('patient_id', user?.id)
        .order('start_time', { ascending: true });
      setAppointments(apts || []);

      const { data: rx } = await supabase
        .from('prescriptions')
        .select('*, appointments!inner(*, doctors!inner(*, profiles!fk_doctors_profiles(*)))')
        .eq('patient_id', user?.id)
        .order('created_at', { ascending: false });
      setPrescriptions(rx || []);
    } catch (err: any) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-shimmer h-32 rounded-sm border border-[#d2c19d] bg-[#faf8f3]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="animate-shimmer h-28 rounded-sm border border-[#d2c19d]" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {[1,2].map(i => <div key={i} className="animate-shimmer h-28 rounded-sm border border-[#d2c19d]" />)}
          </div>
          <div className="animate-shimmer h-64 rounded-sm border border-[#d2c19d]" />
        </div>
      </div>
    );
  }

  const upcomingApts = appointments.filter(a => ['confirmed','held','rescheduled'].includes(a.status));
  const completedApts = appointments.filter(a => a.status === 'completed');
  const firstName = user?.profile?.full_name?.split(' ')[0] || 'there';

  const stats = [
    { label: 'Total Appointments', value: appointments.length, icon: Activity },
    { label: 'Upcoming Consultations', value: upcomingApts.length, icon: Clock },
    { label: 'Completed Visits', value: completedApts.length, icon: CheckCircle },
    { label: 'Active Prescriptions', value: prescriptions.length, icon: Pill },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-vintage">

      {/* Elegant Welcome Banner */}
      <div className="welcome-banner">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 90% 50%, #b59a5c 0%, transparent 60%)' }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#b59a5c]" />
              <p className="text-[#b59a5c] text-xs font-semibold uppercase tracking-wider font-classic">Patient Sanctuary</p>
            </div>
            <h1 className="text-3xl font-bold text-[#3b2f2f] font-classic">Good day, {firstName}.</h1>
            <p className="text-[#3b2f2f]/80 mt-1 text-base italic">Welcome back to your personal medical archive and appointment desk.</p>
          </div>
          <Link to="/patient/book" className="btn-primary shrink-0">
            <Calendar className="w-4 h-4" />
            Schedule Visit
          </Link>
        </div>
      </div>

      {/* Framed Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="stat-card">
            <div className="stat-card-icon text-[#b59a5c]">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-3xl font-bold text-[#3b2f2f] font-classic">{value}</p>
              <p className="text-xs font-semibold text-[#3b2f2f]/60 uppercase tracking-wider font-classic mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Upcoming Appointments */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-[#d2c19d]/40 pb-2">
            <h2 className="text-xl font-bold text-[#3b2f2f] font-classic">Upcoming Appointments</h2>
            <Link to="/patient/appointments" className="text-[#b59a5c] hover:text-[#9d8349] font-semibold text-sm flex items-center gap-1 font-classic uppercase tracking-wider">
              View Log <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingApts.length === 0 ? (
              <div className="hc-card p-8 text-center border-dashed">
                <Calendar className="w-10 h-10 text-[#d2c19d] mx-auto mb-3" />
                <p className="text-[#3b2f2f]/60 text-sm italic">No upcoming visits booked.</p>
                <Link to="/patient/book" className="btn-primary mt-4 text-xs px-4 py-2">
                  Request Slot
                </Link>
              </div>
            ) : (
              upcomingApts.map((apt, i) => {
                const doc = apt.doctors;
                const profile = doc?.profiles;
                const initials = `${profile?.first_name?.[0] || 'D'}${profile?.last_name?.[0] || ''}`;
                return (
                  <div key={apt.id || i} className="hc-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="avatar-initials text-sm">{initials}</div>
                      <div>
                        <p className="font-semibold text-[#3b2f2f] text-base font-classic">Dr. {profile?.first_name} {profile?.last_name}</p>
                        <p className="text-xs text-[#3b2f2f]/60 italic">{doc?.specialisation}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#3b2f2f]/80">
                          <Clock className="w-3.5 h-3.5 text-[#b59a5c]" />
                          <span>{formatToClinicTime(apt.start_time)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`badge badge-${apt.status === 'confirmed' ? 'confirmed' : 'upcoming'}`}>
                        {apt.status}
                      </span>
                      <Link to="/patient/appointments" className="btn-secondary text-xs px-3 py-1.5">
                        Open File
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Recent Prescriptions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#d2c19d]/40 pb-2">
            <h2 className="text-xl font-bold text-[#3b2f2f] font-classic">Recent Apothecary</h2>
            <Link to="/patient/prescriptions" className="text-[#b59a5c] hover:text-[#9d8349] font-semibold text-sm font-classic uppercase tracking-wider">
              All Orders
            </Link>
          </div>

          <div className="hc-card overflow-hidden">
            {prescriptions.length === 0 ? (
              <div className="p-8 text-center">
                <Pill className="w-8 h-8 text-[#d2c19d] mx-auto mb-2" />
                <p className="text-[#3b2f2f]/60 text-sm italic">No medications recorded.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#d2c19d]/25">
                {prescriptions.slice(0, 5).map((rx, i) => (
                  <div key={rx.id || i} className="p-4 flex items-start gap-3 hover:bg-[#faf7f0] transition-colors">
                    <div className="w-8 h-8 rounded-sm border border-[#b59a5c]/30 text-[#b59a5c] bg-[#faf7f0] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#3b2f2f] text-sm font-classic truncate">{rx.drug} {rx.dose}</p>
                      <p className="text-xs text-[#3b2f2f]/70 mt-0.5">{rx.frequency} · {rx.duration}</p>
                      <p className="text-xs text-[#3b2f2f]/50 mt-1 flex items-center gap-1 italic">
                        <FileText className="w-3.5 h-3.5 text-[#b59a5c]" />
                        Prescribed by Dr. {rx.appointments?.doctors?.profiles?.first_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
