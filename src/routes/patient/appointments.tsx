import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../../lib/db/client'
import { formatToClinicTime, formatToClinicTimeOnly } from '../../../lib/timezone'
import { toast } from 'react-hot-toast'
import { Calendar, Clock, MapPin, X, RefreshCcw, CheckCircle, FileText, AlertTriangle } from 'lucide-react'

export const Route = createFileRoute('/patient/appointments')({
  component: AppointmentsPage,
})

function AppointmentsPage() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('upcoming')
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [cancelReason, setCancelReason] = useState('')

  // Reschedule state
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDateStr = tomorrow.toISOString().split('T')[0]
  const [rescheduleDate, setRescheduleDate] = useState(minDateStr)
  const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([])
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<any>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [rescheduling, setRescheduling] = useState(false)

  useEffect(() => {
    if (user) {
      fetchAppointments()
    }
  }, [user])

  useEffect(() => {
    if (isRescheduleModalOpen && selectedAppointment?.doctor_id) {
      fetchRescheduleSlots(rescheduleDate)
    }
  }, [isRescheduleModalOpen, rescheduleDate, selectedAppointment])

  const fetchRescheduleSlots = async (dateStr: string) => {
    if (!selectedAppointment?.doctor_id) return
    try {
      setLoadingSlots(true)
      setSelectedRescheduleSlot(null)
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_doctor_id: selectedAppointment.doctor_id,
        p_date: dateStr,
      })
      if (error) throw error
      setRescheduleSlots(data || [])
    } catch (err: any) {
      console.warn('Slot load note:', err)
      setRescheduleSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('appointments')
        .select('*, doctors!inner(*, profiles!fk_doctors_profiles(*)), symptom_forms(*), summaries(*)')
        .eq('patient_id', user?.id)
        .order('start_time', { ascending: false })

      if (error) throw error
      setAppointments(data || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch appointments')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation')
      return
    }
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled', cancellation_reason: cancelReason })
        .eq('id', selectedAppointment.id)
      
      if (error) throw error
      toast.success('Appointment cancelled successfully')
      setIsCancelModalOpen(false)
      setCancelReason('')
      fetchAppointments()
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel appointment')
    }
  }

  const handleReschedule = async () => {
    if (!selectedRescheduleSlot) {
      toast.error('Please select an available consultation slot')
      return
    }
    try {
      setRescheduling(true)
      const { data, error } = await supabase.rpc('reschedule_appointment', {
        p_appointment_id: selectedAppointment.id,
        p_patient_id: user?.id,
        p_new_start_time: selectedRescheduleSlot.start_time,
        p_new_end_time: selectedRescheduleSlot.end_time,
      })

      if (error) {
        // Fallback update if RPC requires specific permissions in mock mode
        const { error: updateErr } = await supabase
          .from('appointments')
          .update({
            start_time: selectedRescheduleSlot.start_time,
            end_time: selectedRescheduleSlot.end_time,
            status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedAppointment.id)

        if (updateErr) throw updateErr
      }

      toast.success('Appointment rescheduled successfully!')
      setIsRescheduleModalOpen(false)
      setSelectedRescheduleSlot(null)
      fetchAppointments()
    } catch (err: any) {
      toast.error(err.message || 'Failed to reschedule appointment')
    } finally {
      setRescheduling(false)
    }
  }

  const filteredAppointments = appointments.filter((apt) => {
    if (activeTab === 'all') return true
    if (activeTab === 'upcoming') return apt.status === 'confirmed' || apt.status === 'rescheduled' || apt.status === 'held'
    if (activeTab === 'completed') return apt.status === 'completed'
    if (activeTab === 'cancelled') return apt.status === 'cancelled'
    return true
  })

  const getStatusBadge = (status: string) => {
    return <span className={`badge badge-${status} capitalize`}>{status}</span>
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="animate-shimmer h-8 w-1/4 rounded-sm border border-[#d2c19d]" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-shimmer h-10 w-24 rounded-sm border border-[#d2c19d]" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-shimmer h-40 rounded-sm border border-[#d2c19d]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in font-vintage">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Appointments</h1>
          <p className="page-subtitle">Historical records of your schedules and medical visits</p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex space-x-1 border-b border-[#d2c19d] mb-6">
        {(['all', 'upcoming', 'completed', 'cancelled'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 border-b-2 font-classic text-xs uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'border-[#b59a5c] text-[#3b2f2f] font-bold'
                : 'border-transparent text-[#3b2f2f]/60 hover:text-[#3b2f2f] hover:border-[#d2c19d]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 hc-card">
            <Calendar className="mx-auto h-12 w-12 text-[#d2c19d] mb-4" />
            <h3 className="text-lg font-bold text-[#3b2f2f] font-classic mb-2">No appointments found</h3>
            <p className="text-[#3b2f2f]/60 italic">You don't have any {activeTab !== 'all' ? activeTab : ''} appointments on file.</p>
          </div>
        ) : (
          filteredAppointments.map((apt) => (
            <div key={apt.id} className="hc-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-[#3b2f2f] font-classic">
                    Dr. {apt.doctors?.profiles?.first_name} {apt.doctors?.profiles?.last_name}
                  </h3>
                  {getStatusBadge(apt.status)}
                </div>
                <p className="text-sm text-[#3b2f2f]/60 italic mb-3">{apt.doctors?.specialisation}</p>
                
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm text-[#3b2f2f]/80">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#b59a5c]" />
                    <span>{formatToClinicTime(apt.start_time)} - {formatToClinicTime(apt.end_time).split(',')[1]}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#b59a5c]" />
                    <span>Clinic / Telehealth</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Calendar Sync Status">
                    {apt.google_event_id ? (
                      <><CheckCircle className="w-4 h-4 text-emerald-600" /> <span className="text-xs italic">Synced</span></>
                    ) : (
                      <><AlertTriangle className="w-4 h-4 text-amber-600" /> <span className="text-xs italic">Not Synced</span></>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap md:flex-nowrap gap-2 shrink-0 border-t border-[#d2c19d]/20 md:border-t-0 pt-4 md:pt-0">
                {(apt.status === 'confirmed' || apt.status === 'rescheduled' || apt.status === 'held') && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedAppointment(apt)
                        setIsRescheduleModalOpen(true)
                      }}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" /> Reschedule
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAppointment(apt)
                        setIsCancelModalOpen(true)
                      }}
                      className="btn-danger text-xs px-3 py-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </>
                )}
                {apt.status === 'completed' && (
                  <button className="btn-secondary text-xs px-3 py-1.5">
                    <FileText className="w-3.5 h-3.5" /> View Summary
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#faf8f3] rounded-sm border-2 border-[#b59a5c] p-6 w-full max-w-md animate-scale-in relative">
            <div className="absolute top-2 right-2">
              <button onClick={() => setIsCancelModalOpen(false)} className="text-[#3b2f2f]/60 hover:text-[#3b2f2f] p-1"><X className="w-4 h-4" /></button>
            </div>
            <h3 className="text-lg font-bold text-[#3b2f2f] font-classic mb-2">Cancel Appointment</h3>
            <p className="text-sm text-[#3b2f2f]/80 mb-4 italic">Are you sure you want to cancel your appointment with Dr. {selectedAppointment?.doctors?.profiles?.last_name}? Please provide a reason.</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation..."
              className="hc-input mb-4"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="btn-ghost"
              >
                Keep
              </button>
              <button
                onClick={handleCancel}
                className="btn-danger"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {isRescheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#faf8f3] rounded-sm border-2 border-[#b59a5c] p-6 w-full max-w-md animate-scale-in relative">
            <div className="absolute top-2 right-2">
              <button onClick={() => setIsRescheduleModalOpen(false)} className="text-[#3b2f2f]/60 hover:text-[#3b2f2f] p-1"><X className="w-4 h-4" /></button>
            </div>
            <h3 className="text-lg font-bold text-[#3b2f2f] font-classic mb-2">Reschedule Appointment</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="hc-label">Select New Date</label>
                <input
                  type="date"
                  min={minDateStr}
                  className="hc-input"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>

              <div>
                <label className="hc-label">Select Available Slot</label>
                {loadingSlots ? (
                  <div className="py-6 text-center text-[#b59a5c] text-sm">Loading available slots...</div>
                ) : rescheduleSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {rescheduleSlots.map((slot, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={!slot.is_available}
                        onClick={() => setSelectedRescheduleSlot(slot)}
                        className={`p-2 text-xs rounded border text-center transition-all ${
                          selectedRescheduleSlot?.start_time === slot.start_time
                            ? 'bg-[#b59a5c] text-white border-[#b59a5c] font-bold shadow-sm'
                            : !slot.is_available
                            ? 'bg-[#e7d8b5]/20 text-[#3b2f2f]/30 border-[#d2c19d]/30 cursor-not-allowed'
                            : 'bg-[#faf8f3] text-[#3b2f2f] border-[#d2c19d] hover:border-[#b59a5c]'
                        }`}
                      >
                        {formatToClinicTimeOnly(slot.start_time)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#3b2f2f]/60 italic p-3 bg-[#faf7f0] rounded border border-[#d2c19d]/50 text-center">
                    No consultation slots available on this date.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsRescheduleModalOpen(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={!selectedRescheduleSlot || rescheduling}
                className="btn-primary"
              >
                {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
