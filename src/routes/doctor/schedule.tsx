import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/db/client';
import { useAuth } from '../../context/AuthContext';
import { formatToClinicTime, formatToClinicDate } from '../../../lib/timezone';
import { Calendar, Clock, User, ChevronRight } from 'lucide-react';

export const Route = createFileRoute('/doctor/schedule')({
  component: DoctorSchedule,
});

function DoctorSchedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'completed' | 'cancelled'>('today');

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (doctorError) throw doctorError;

      const { data, error } = await supabase
        .from('appointments')
        .select('*, profiles!fk_appointments_patient_profiles(*), symptom_forms(*), summaries(*)')
        .eq('doctor_id', doctor.id)
        .order('start_time');

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const filteredAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.start_time);
    switch (activeTab) {
      case 'today':
        return aptDate >= today && aptDate < tomorrow && apt.status !== 'cancelled' && apt.status !== 'completed';
      case 'upcoming':
        return aptDate >= tomorrow && apt.status !== 'cancelled' && apt.status !== 'completed';
      case 'completed':
        return apt.status === 'completed';
      case 'cancelled':
        return apt.status === 'cancelled';
      default:
        return true;
    }
  });

  const getStatusBadge = (status: string) => {
    return <span className={`badge badge-${status} capitalize`}>{status}</span>;
  };

  const getUrgencyBadge = (urgency: string) => {
    const lower = urgency?.toLowerCase() || 'low';
    return <span className={`badge badge-${lower === 'high' ? 'cancelled' : lower === 'medium' ? 'upcoming' : 'completed'} capitalize`}>{urgency} Urgency</span>;
  };

  const tabs = [
    { id: 'today', label: 'Today\'s Ledger' },
    { id: 'upcoming', label: 'Upcoming Consultations' },
    { id: 'completed', label: 'Completed Visits' },
    { id: 'cancelled', label: 'Cancelled Slots' },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6 animate-fade-in font-vintage">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ledger & Schedule</h1>
          <p className="page-subtitle">Track and record chronological consultation slots</p>
        </div>
      </div>

      <div className="flex space-x-1 border-b border-[#d2c19d] mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 border-b-2 font-classic text-xs uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? 'border-[#b59a5c] text-[#3b2f2f] font-bold'
                : 'border-transparent text-[#3b2f2f]/60 hover:text-[#3b2f2f] hover:border-[#d2c19d]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-shimmer h-24 rounded-sm border border-[#d2c19d] bg-[#faf8f3]" />
          ))
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12 hc-card">
            <Calendar className="mx-auto h-12 w-12 text-[#d2c19d] mb-3" />
            <h3 className="text-lg font-bold text-[#3b2f2f] font-classic">No Records Found</h3>
            <p className="mt-1 text-[#3b2f2f]/60 italic">
              There are no {activeTab} appointments in the ledger database.
            </p>
          </div>
        ) : (
          filteredAppointments.map((apt) => {
            const summary = apt.summaries?.find((s: any) => s.summary_type === 'pre_visit' || s.summary_type === 'post_visit');
            const initials = apt.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2) || 'P';
            
            return (
              <div 
                key={apt.id} 
                className="hc-card overflow-hidden"
                onClick={() => navigate({ to: '/doctor/consultation/$appointmentId', params: { appointmentId: apt.id } })}
              >
                <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="avatar-initials avatar-initials-doctor flex-shrink-0">
                      {initials}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#3b2f2f] font-classic">
                        {apt.profiles?.full_name || 'Unknown Patient'}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-[#3b2f2f]/80">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-[#b59a5c]" />
                          {formatToClinicDate(apt.start_time)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-[#b59a5c]" />
                          {formatToClinicTime(apt.start_time)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(apt.status)}
                      {summary?.urgency && getUrgencyBadge(summary.urgency)}
                    </div>
                    <ChevronRight className="h-5 w-5 text-[#b59a5c]" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
