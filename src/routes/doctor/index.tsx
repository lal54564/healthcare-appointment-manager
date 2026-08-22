import { createFileRoute, Link } from '@tanstack/react-router';
import { Users, Calendar, CheckSquare, AlertCircle, Clock, Stethoscope } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../../lib/db/client';
import { useState, useEffect } from 'react';
import { formatToClinicTime } from '../../../lib/timezone';
import { toast } from 'react-hot-toast';

export const Route = createFileRoute('/doctor/')({ component: DoctorDashboard });

function DoctorDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!doctor) return;

      const { data, error } = await supabase
        .from('appointments')
        .select('*, profiles!fk_appointments_patient_profiles(*), symptom_forms(*), summaries(*)')
        .eq('doctor_id', doctor.id)
        .order('start_time');

      if (error) throw error;
      setAppointments(data || []);
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
        <div className="animate-shimmer h-64 rounded-sm border border-[#d2c19d]" />
      </div>
    );
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const todayApts = appointments.filter(apt => {
    const d = new Date(apt.start_time);
    return d >= todayStart && d < todayEnd && apt.status !== 'cancelled';
  });

  const upcomingApts = appointments.filter(a => ['confirmed','held','rescheduled'].includes(a.status));
  const completedApts = appointments.filter(a => a.status === 'completed');
  const pendingReviews = appointments.filter(a => a.status === 'confirmed' && a.symptom_forms?.length > 0);
  const firstName = user?.profile?.full_name?.split(' ')[0] || 'Doctor';

  const stats = [
    { label: "Today's Ledger", value: todayApts.length, icon: Users },
    { label: 'Upcoming Consultations', value: upcomingApts.length, icon: Calendar },
    { label: 'Completed Visits', value: completedApts.length, icon: CheckSquare },
    { label: 'Pending Reviews', value: pendingReviews.length, icon: AlertCircle },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-vintage">

      {/* Elegant Welcome Banner */}
      <div className="welcome-banner welcome-banner-doctor">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 90% 50%, #b59a5c 0%, transparent 60%)' }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope className="w-4 h-4 text-[#b59a5c]" />
              <p className="text-[#b59a5c] text-xs font-semibold uppercase tracking-wider font-classic">Clinician's Sanctuary</p>
            </div>
            <h1 className="text-3xl font-bold text-[#3b2f2f] font-classic">Salutations, Dr. {firstName}.</h1>
            <p className="text-[#3b2f2f]/80 mt-1 text-base italic">
              You are scheduled for <span className="font-semibold text-[#3b2f2f]">{todayApts.length}</span> patient consultations today.
            </p>
          </div>
          <Link to="/doctor/schedule" className="btn-primary shrink-0">
            <Calendar className="w-4 h-4" />
            Full Schedule
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

      {/* Today's Schedule Card */}
      <div className="hc-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#d2c19d]/40 flex items-center justify-between bg-[#faf7f0]">
          <h2 className="font-bold text-slate-900 font-display">Daily Consultation Ledger</h2>
          <span className="badge badge-confirmed">{todayApts.length} Active Slots</span>
        </div>

        {todayApts.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar className="w-10 h-10 text-[#d2c19d] mx-auto mb-3" />
            <p className="text-[#3b2f2f]/60 text-sm font-medium italic">No appointments scheduled for today.</p>
          </div>
        ) : (
          <table className="hc-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th>Reason for Consultation</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {todayApts.map((apt, i) => (
                <tr key={apt.id || i}>
                  <td>
                    <span className="flex items-center gap-1.5 text-[#3b2f2f] font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#b59a5c]" />
                      {formatToClinicTime(apt.start_time).split(',')[1]?.trim() || formatToClinicTime(apt.start_time)}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="avatar-initials-sm avatar-initials-doctor">
                        {apt.profiles?.full_name?.[0] || 'P'}
                      </div>
                      <span className="font-semibold text-[#3b2f2f] font-classic">{apt.profiles?.full_name || 'Patient'}</span>
                    </div>
                  </td>
                  <td className="text-[#3b2f2f]/80 text-sm italic">{apt.symptom_forms?.[0]?.main_symptoms || 'General Checkup'}</td>
                  <td>
                    <span className={`badge badge-${apt.status === 'completed' ? 'completed' : apt.status === 'confirmed' ? 'confirmed' : 'upcoming'} capitalize`}>
                      {apt.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <Link
                      to={`/doctor/consultation/${apt.id}`}
                      className="btn-success text-xs px-3 py-1.5"
                    >
                      Consult
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
