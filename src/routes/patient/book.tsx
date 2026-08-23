import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/db/client';
import { useAuth } from '../../context/AuthContext';
import { formatToClinicTime, formatToClinicTimeOnly, formatToClinicDate } from '../../../lib/timezone';
import { generatePreVisitSummary } from '../../../lib/ai/gateway';
import toast from 'react-hot-toast';
import { Search, Calendar, Clock, Stethoscope, ChevronRight, ChevronLeft, Check, AlertCircle, Loader2 } from 'lucide-react';

export const Route = createFileRoute('/patient/book')({
  component: BookAppointmentPage,
});

type Doctor = {
  id: string;
  specialisation: string;
  experience_years: number;
  qualification: string;
  slot_duration: number;
  profiles: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
};

type Slot = {
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_held: boolean;
};

type SymptomsForm = {
  main_symptoms: string;
  duration: string;
  severity: 'mild' | 'moderate' | 'severe';
  additional_info: string;
};

function BookAppointmentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [specialisation, setSpecialisation] = useState('');
  
  // Tomorrow's date for min attribute
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split('T')[0];
  
  const thirtyDaysOut = new Date();
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
  const maxDateStr = thirtyDaysOut.toISOString().split('T')[0];

  const [searchDate, setSearchDate] = useState(minDateStr);
  const [slotsDate, setSlotsDate] = useState(minDateStr);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  
  const [symptoms, setSymptoms] = useState<SymptomsForm>({
    main_symptoms: '',
    duration: '',
    severity: 'moderate',
    additional_info: '',
  });

  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirming, setConfirming] = useState(false);
  
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiPending, setAiPending] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);
  
  const [holdCountdown, setHoldCountdown] = useState(0);

  useEffect(() => {
    if (step === 1) {
      fetchDoctors();
    }
  }, [searchTerm, specialisation, searchDate, step]);

  useEffect(() => {
    if (step === 2 && selectedDoctor) {
      fetchSlots();
    }
  }, [slotsDate, selectedDoctor, step]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (holdCountdown > 0) {
      timer = setInterval(() => setHoldCountdown((prev) => prev - 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [holdCountdown]);

  const fetchDoctors = async () => {
    try {
      setLoadingDoctors(true);
      
      const { data, error } = await supabase.rpc('search_doctors', {
        p_search_term: searchTerm || null,
        p_specialisation: specialisation || null,
      });

      if (error) throw error;

      // Adapt flat fields to nested profiles object expected by frontend components
      const adapted = (data || []).map((d: any) => {
        if (d.profiles) {
          return {
            ...d,
            id: d.id || d.doctor_id,
            slot_duration: d.slot_duration || d.slot_duration_minutes || 30
          };
        }

        const cleanFullName = (d.full_name || '').replace(/^(Dr\.|Dr)\s+/i, '');
        const nameParts = cleanFullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        return {
          id: d.doctor_id || d.id,
          specialisation: d.specialisation,
          experience_years: d.experience_years ?? 0,
          qualification: d.qualification ?? '',
          slot_duration: d.slot_duration_minutes || 30,
          profiles: {
            first_name: firstName,
            lastName: lastName, // wait, type says last_name or lastName? Let's check: in Doctor type: last_name.
            last_name: lastName,
            avatar_url: d.avatar_url || undefined
          }
        };
      });

      setDoctors(adapted);
    } catch (err: any) {
      toast.error(err.message || 'Failed to search doctors');
    } finally {
      setLoadingDoctors(false);
    }
  };

  const fetchSlots = async () => {
    if (!selectedDoctor) return;
    try {
      setLoadingSlots(true);
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_doctor_id: selectedDoctor.id,
        p_date: slotsDate,
      });

      if (error) throw error;
      
      // Adapt backend slot fields (slot_start, slot_end) to frontend expected fields (start_time, end_time)
      const adaptedSlots = (data || []).map((s: any) => ({
        start_time: s.slot_start || s.start_time,
        end_time: s.slot_end || s.end_time,
        is_available: s.is_available,
        is_held: s.is_held
      }));
      
      setSlots(adaptedSlots);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleNextStep = () => {
    if (step === 3) {
      if (!symptoms.main_symptoms.trim() || !symptoms.duration.trim()) {
        toast.error('Please fill in required symptom details');
        return;
      }
      setStep(4);
    }
  };

  const handleConfirm = async () => {
    if (!selectedDoctor || !selectedSlot || !user) return;
    try {
      setConfirming(true);

      const { data: holdData, error: holdError } = await supabase.rpc('hold_slot', {
        p_doctor_id: selectedDoctor.id,
        p_start_time: selectedSlot.start_time,
        p_end_time: selectedSlot.end_time,
        p_patient_id: user.id,
      });

      if (holdError) throw holdError;

      const holdAppointment = holdData && holdData[0];
      if (!holdAppointment) {
        throw new Error('Failed to hold appointment slot. Try again.');
      }

      const { error: formError } = await supabase
        .from('symptom_forms')
        .insert({
          appointment_id: holdAppointment.id,
          main_symptoms: symptoms.main_symptoms,
          duration: symptoms.duration,
          severity: symptoms.severity,
          additional_info: symptoms.additional_info,
        });

      if (formError) throw formError;

      const { error: confirmError } = await supabase.rpc('confirm_appointment', {
        p_appointment_id: holdAppointment.id,
      });

      if (confirmError) throw confirmError;

      setAppointmentDetails({
        id: holdAppointment.id,
        doctor: selectedDoctor,
        slot: selectedSlot,
        symptoms: symptoms,
      });

      setStep(5);
      triggerAiSummary(holdAppointment.id);

    } catch (err: any) {
      toast.error(err.message || 'Booking confirmation failed');
    } finally {
      setConfirming(false);
    }
  };

  const triggerAiSummary = async (appointmentId: string) => {
    try {
      setAiPending(true);
      const summary = await generatePreVisitSummary({
        mainSymptoms: symptoms.main_symptoms,
        duration: symptoms.duration,
        severity: symptoms.severity,
        additionalInfo: symptoms.additional_info,
      });

      const { error: sumError } = await supabase
        .from('summaries')
        .insert({
          appointment_id: appointmentId,
          summary_type: 'pre_visit',
          content: summary.summaryText,
          urgency: summary.urgency.toLowerCase(),
          chief_complaint: symptoms.main_symptoms.substring(0, 100),
          suggested_questions: summary.suggestedQuestions,
          status: 'completed',
        });

      if (sumError) throw sumError;

      setAiSummary({
        urgency: summary.urgency,
        chief_complaint: symptoms.main_symptoms,
        suggested_questions: summary.suggestedQuestions,
      });

    } catch (err: any) {
      console.error('AI summary generation failed:', err);
    } finally {
      setAiPending(false);
    }
  };

  const renderStepProgress = () => {
    return (
      <div className="mb-8 font-vintage">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-[#3b2f2f]/60 uppercase tracking-wider font-classic">Step {step} of 5</span>
          <span className="text-sm font-semibold text-[#b59a5c] uppercase tracking-wider font-classic">
            {['Select Doctor', 'Choose Time', 'Symptom Log', 'Ledger Review', 'Confirmation'][step - 1]}
          </span>
        </div>
        <div className="w-full bg-[#e7d8b5]/40 rounded-sm h-1">
          <div
            className="bg-[#b59a5c] h-1 rounded-sm transition-all duration-300 ease-in-out"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 animate-fade-in font-vintage">
      <div className="mb-6 flex items-center justify-between border-b border-[#d2c19d]/40 pb-3">
        <h1 className="text-3xl font-bold text-[#3b2f2f] font-classic">Request Appointment Slot</h1>
        {step > 1 && step < 5 && (
          <button
            onClick={handlePrevStep}
            className="flex items-center text-[#3b2f2f]/70 hover:text-[#3b2f2f] transition-colors font-classic uppercase tracking-wider text-xs"
          >
            <ChevronLeft className="w-4 h-4 mr-1 text-[#b59a5c]" />
            Back
          </button>
        )}
      </div>

      {renderStepProgress()}

      {/* STEP 1: Search & Select Doctor */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-[#d2c19d] w-4 h-4" />
              <input
                type="text"
                placeholder="Search clinician name..."
                className="hc-input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <select
                className="hc-input bg-[#faf8f3]"
                value={specialisation}
                onChange={(e) => setSpecialisation(e.target.value)}
              >
                <option value="">All Specialisations</option>
                <option value="Cardiologist">Cardiologist</option>
                <option value="Dermatologist">Dermatologist</option>
                <option value="General Practitioner">General Practitioner</option>
                <option value="Neurologist">Neurologist</option>
                <option value="Pediatrician">Pediatrician</option>
              </select>
            </div>
            <div>
              <input
                type="date"
                min={minDateStr}
                max={maxDateStr}
                className="hc-input"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
              />
            </div>
          </div>

          {loadingDoctors ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#b59a5c]" />
            </div>
          ) : doctors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {doctors.map((doctor) => {
                const initials = `${doctor.profiles?.first_name?.[0] || 'D'}${doctor.profiles?.last_name?.[0] || ''}`;
                return (
                  <div key={doctor.id} className="hc-card p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          {doctor.profiles?.avatar_url ? (
                            <img src={doctor.profiles.avatar_url} alt="Doctor" className="w-16 h-16 rounded-full object-cover border border-[#b59a5c]/30" />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-[#faf7f0] border border-[#b59a5c]/30 flex items-center justify-center text-[#b59a5c] font-bold text-xl font-classic">
                              {initials}
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg font-bold text-[#3b2f2f] font-classic">
                              Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name}
                            </h3>
                            <p className="text-[#b59a5c] text-sm font-semibold italic">{doctor.specialisation}</p>
                            <p className="text-xs text-[#3b2f2f]/60 mt-1">{doctor.qualification} • {doctor.experience_years} Years Experience</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          setSelectedDoctor(doctor);
                          setSlotsDate(searchDate || minDateStr);
                          setStep(2);
                        }}
                        className="w-full btn-primary"
                      >
                        Select Doctor
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 hc-card border-dashed">
              <Stethoscope className="w-12 h-12 text-[#d2c19d] mx-auto mb-3" />
              <p className="text-[#3b2f2f]/60 italic">No clinicians matching your parameters were found.</p>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Select Time Slot */}
      {step === 2 && selectedDoctor && (
        <div className="space-y-6 animate-fade-in">
          <div className="hc-card p-4 flex items-center space-x-4">
             <div className="w-12 h-12 rounded-full bg-[#faf7f0] border border-[#b59a5c]/30 flex items-center justify-center text-[#b59a5c] font-bold font-classic">
              {selectedDoctor.profiles?.first_name?.[0]}{selectedDoctor.profiles?.last_name?.[0]}
            </div>
            <div>
              <h3 className="font-bold text-[#3b2f2f] font-classic text-lg">Dr. {selectedDoctor.profiles?.first_name} {selectedDoctor.profiles?.last_name}</h3>
              <p className="text-xs text-[#3b2f2f]/60 italic">{selectedDoctor.specialisation}</p>
            </div>
          </div>

          <div className="hc-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center font-classic text-[#3b2f2f]">
                <Calendar className="w-5 h-5 mr-2 text-[#b59a5c]" />
                Select Consultation Time
              </h3>
              <input
                type="date"
                min={minDateStr}
                max={maxDateStr}
                className="hc-input max-w-[180px]"
                value={slotsDate}
                onChange={(e) => setSlotsDate(e.target.value)}
              />
            </div>

            {loadingSlots ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#b59a5c]" />
              </div>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {slots.map((slot, idx) => (
                  <button
                    key={idx}
                    disabled={!slot.is_available}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setStep(3);
                    }}
                    className={`
                      py-2 px-2 rounded-sm text-sm font-medium border flex items-center justify-center transition-all font-classic uppercase tracking-wider text-xs
                      ${!slot.is_available 
                        ? 'bg-[#e7d8b5]/10 text-[#3b2f2f]/30 border-[#d2c19d]/20 cursor-not-allowed opacity-40' 
                        : slot.is_held
                        ? 'bg-[#fff8e1] text-[#b78103] border-[#ffe082]'
                        : 'bg-[#faf8f3] text-[#3b2f2f] border-[#d2c19d] hover:bg-[#e7d8b5]/20 hover:border-[#b59a5c]'
                      }
                    `}
                  >
                    <Clock className="w-3.5 h-3.5 mr-1 text-[#b59a5c] opacity-85" />
                    {formatToClinicTimeOnly(slot.start_time)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-[#3b2f2f]/60 italic">No available consultation hours on this date.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Enter Symptoms */}
      {step === 3 && (
        <div className="hc-card p-6 md:p-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-[#3b2f2f] mb-6 font-classic">Enter Diagnostics & Symptom Log</h2>
          
          <div className="space-y-6">
            <div>
              <label className="hc-label">
                Primary Symptoms <span className="text-[#8c2a2a] font-bold">*</span>
              </label>
              <textarea
                required
                rows={3}
                className="hc-input"
                placeholder="E.g., Severe migraine, high fever, chest pressure"
                value={symptoms.main_symptoms}
                onChange={(e) => setSymptoms({ ...symptoms, main_symptoms: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="hc-label">
                  Duration <span className="text-[#8c2a2a] font-bold">*</span>
                </label>
                <input
                  required
                  type="text"
                  className="hc-input"
                  placeholder="E.g., 3 days, 1 week"
                  value={symptoms.duration}
                  onChange={(e) => setSymptoms({ ...symptoms, duration: e.target.value })}
                />
              </div>

              <div>
                <label className="hc-label">
                  Clinical Severity
                </label>
                <select
                  className="hc-input bg-[#faf8f3]"
                  value={symptoms.severity}
                  onChange={(e) => setSymptoms({ ...symptoms, severity: e.target.value as any })}
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe (Urgent)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="hc-label">
                Additional Clinical History (Optional)
              </label>
              <textarea
                rows={2}
                className="hc-input"
                placeholder="Any active treatments, historical diagnoses, family medical history..."
                value={symptoms.additional_info}
                onChange={(e) => setSymptoms({ ...symptoms, additional_info: e.target.value })}
              />
            </div>
            
            <div className="pt-4 flex justify-end">
              <button
                onClick={handleNextStep}
                className="btn-primary"
              >
                Review Ledger Summary
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Confirm */}
      {step === 4 && selectedDoctor && selectedSlot && (
        <div className="space-y-6 animate-fade-in">
          <div className="hc-card overflow-hidden">
            <div className="bg-[#faf7f0] px-6 py-4 border-b border-[#d2c19d]/40">
              <h2 className="text-lg font-bold text-[#3b2f2f] font-classic">Verify Entry in Medical Ledger</h2>
            </div>
            <div className="p-6 space-y-6">
              
              <div className="flex items-start space-x-4 border-b border-[#d2c19d]/20 pb-6">
                 <div className="w-14 h-14 rounded-full bg-[#faf7f0] border border-[#b59a5c] flex items-center justify-center text-[#b59a5c] font-bold text-lg font-classic">
                  {selectedDoctor.profiles?.first_name?.[0]}{selectedDoctor.profiles?.last_name?.[0]}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#3b2f2f] font-classic">Dr. {selectedDoctor.profiles?.first_name} {selectedDoctor.profiles?.last_name}</h3>
                  <p className="text-[#b59a5c] italic text-sm">{selectedDoctor.specialisation}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-[#d2c19d]/20 pb-6">
                <div>
                  <h4 className="text-xs font-semibold text-[#3b2f2f]/60 uppercase tracking-wider font-classic mb-2">Requested Time</h4>
                  <div className="text-[#3b2f2f] font-bold text-lg font-classic">
                    {formatToClinicDate(selectedSlot.start_time)}
                  </div>
                  <div className="text-[#b59a5c] font-semibold mt-1">
                    {formatToClinicTimeOnly(selectedSlot.start_time)}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-semibold text-[#3b2f2f]/60 uppercase tracking-wider font-classic mb-2">Symptom Summary</h4>
                  <div className="flex space-x-2 mb-2">
                    <span className={`badge badge-${symptoms.severity === 'severe' ? 'cancelled' : symptoms.severity === 'moderate' ? 'upcoming' : 'completed'}`}>
                      {symptoms.severity} Severity
                    </span>
                    <span className="badge badge-pending">
                      {symptoms.duration}
                    </span>
                  </div>
                  <p className="text-sm text-[#3b2f2f] italic">"{symptoms.main_symptoms}"</p>
                </div>
              </div>
              
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="btn-primary min-w-[200px]"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Filing...
                    </>
                  ) : (
                    <>
                      Lock Slot & Register
                      <Check className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Confirmation */}
      {step === 5 && appointmentDetails && (
        <div className="space-y-6 animate-fade-in">
          <div className="hc-card p-8 text-center">
            <div className="w-16 h-16 bg-[#e8f5e9] border border-[#2e7d32]/30 rounded-full flex items-center justify-center mx-auto mb-6 text-[#2e7d32]">
              <Check className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold text-[#3b2f2f] font-classic mb-2">Ledger Entry Confirmed</h2>
            <p className="text-[#3b2f2f]/80 mb-8 max-w-md mx-auto italic">
              Your appointment with Dr. {appointmentDetails.doctor.profiles?.last_name} has been successfully locked in the system.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => navigate({ to: '/patient/appointments' })}
                className="btn-secondary"
              >
                Go To Appointments
              </button>
              <button
                onClick={() => {
                  setStep(1);
                  setAppointmentDetails(null);
                  setSelectedDoctor(null);
                  setSelectedSlot(null);
                  setSymptoms({ main_symptoms: '', duration: '', severity: 'moderate', additional_info: '' });
                  setAiSummary(null);
                }}
                className="btn-primary"
              >
                Schedule Another
              </button>
            </div>
          </div>
          
          <div className="hc-card p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#b59a5c]"></div>
            <h3 className="text-lg font-bold text-[#3b2f2f] mb-4 flex items-center font-classic">
              <AlertCircle className="w-5 h-5 mr-2 text-[#b59a5c]" />
              AI Diagnostics Summary & Guidance
            </h3>
            
            {aiPending ? (
              <div className="flex items-center text-[#3b2f2f]/60 space-x-3 py-4 italic">
                <Loader2 className="w-5 h-5 animate-spin text-[#b59a5c]" />
                <span>Running diagnostic engine and writing pre-visit files...</span>
              </div>
            ) : aiSummary ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className={`badge badge-${aiSummary.urgency === 'High' ? 'cancelled' : aiSummary.urgency === 'Medium' ? 'upcoming' : 'completed'}`}>
                    {aiSummary.urgency || 'Standard'} Urgency
                  </span>
                </div>
                
                <div>
                  <h4 className="text-xs font-semibold text-[#3b2f2f]/60 uppercase font-classic mb-1">Chief Complaint</h4>
                  <p className="text-[#3b2f2f] italic">"{aiSummary.chief_complaint || appointmentDetails.symptoms.main_symptoms}"</p>
                </div>
                
                {aiSummary.suggested_questions && aiSummary.suggested_questions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#3b2f2f]/60 uppercase font-classic mb-2">Inquiries to discuss with your Clinician:</h4>
                    <ul className="list-decimal pl-5 text-[#3b2f2f]/90 space-y-1 text-sm italic">
                      {aiSummary.suggested_questions.map((q: string, i: number) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[#3b2f2f]/60 italic py-2">
                Summary compiler is inactive. Your ledger ticket remains confirmed.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BookAppointmentPage;
