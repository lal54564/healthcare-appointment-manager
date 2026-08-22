import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/db/client';
import { useAuth } from '../../context/AuthContext';
import { formatToClinicTime, formatToClinicDate, formatToClinicTimeOnly } from '../../../lib/timezone';
import { generatePostVisitSummary } from '../../../lib/ai/gateway';
import toast from 'react-hot-toast';
import { ArrowLeft, User, Clock, Stethoscope, FileText, Pill, Plus, Save, AlertTriangle, CheckCircle, Loader2, AlertCircle, Phone, Mail } from 'lucide-react';

export const Route = createFileRoute('/doctor/consultation/$appointmentId')({ component: ConsultationPage });

function ConsultationPage() {
  const { appointmentId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [symptoms, setSymptoms] = useState<any>(null);
  const [preVisitSummary, setPreVisitSummary] = useState<any>(null);
  const [postVisitSummary, setPostVisitSummary] = useState<any>(null);
  const [previousVisits, setPreviousVisits] = useState<any[]>([]);
  
  const [notesForm, setNotesForm] = useState({
    diagnosis: '',
    notes: '',
    follow_up_instructions: ''
  });
  
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [newPrescription, setNewPrescription] = useState({
    drug_name: '',
    dose: '',
    frequency: 'Once daily',
    duration: '',
    instructions: ''
  });
  
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingPrescriptions, setSavingPrescriptions] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    fetchConsultationData();
  }, [appointmentId]);

  const fetchConsultationData = async () => {
    try {
      setLoading(true);
      // Fetch appointment details
      const { data: aptData, error: aptError } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles!fk_appointments_patient_profiles(*),
          symptom_forms(*),
          summaries(*)
        `)
        .eq('id', appointmentId)
        .single();
        
      if (aptError) throw aptError;
      
      setAppointment(aptData);
      setPatient(aptData.profiles);
      setSymptoms(aptData.symptom_forms?.[0]);
      
      const preSummary = aptData.summaries?.find((s: any) => s.summary_type === 'pre_visit');
      const postSummary = aptData.summaries?.find((s: any) => s.summary_type === 'post_visit');
      
      setPreVisitSummary(preSummary);
      setPostVisitSummary(postSummary);

      // Fetch previous visits
      if (aptData.patient_id) {
        const { data: prevVisits, error: prevError } = await supabase
          .from('appointments')
          .select('*, visit_notes(*)')
          .eq('patient_id', aptData.patient_id)
          .lt('start_time', aptData.start_time)
          .order('start_time', { ascending: false })
          .limit(5);
          
        if (!prevError && prevVisits) {
          setPreviousVisits(prevVisits);
        }
      }
      
      // If already completed, fetch notes and prescriptions
      if (aptData.status === 'completed') {
        const { data: notes } = await supabase
          .from('visit_notes')
          .select('*')
          .eq('appointment_id', appointmentId)
          .single();
          
        if (notes) {
          setNotesForm({
            diagnosis: notes.diagnosis || '',
            notes: notes.clinical_notes || '',
            follow_up_instructions: notes.follow_up_instructions || ''
          });
        }
        
        const { data: rx } = await supabase
          .from('prescriptions')
          .select('*')
          .eq('appointment_id', appointmentId);
          
        if (rx) setPrescriptions(rx);
      }
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to load consultation data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrescription = () => {
    if (!newPrescription.drug_name || !newPrescription.dose || !newPrescription.duration) {
      toast.error('Please fill all required prescription fields');
      return;
    }
    
    setPrescriptions([...prescriptions, { ...newPrescription, id: Date.now().toString() }]);
    setNewPrescription({
      drug_name: '',
      dose: '',
      frequency: 'Once daily',
      duration: '',
      instructions: ''
    });
  };
  
  const handleRemovePrescription = (id: string) => {
    setPrescriptions(prescriptions.filter(p => p.id !== id));
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      
      const { error: notesError } = await supabase
        .from('visit_notes')
        .insert({
          appointment_id: appointmentId,
          doctor_id: appointment.doctor_id,
          patient_id: appointment.patient_id,
          diagnosis: notesForm.diagnosis,
          clinical_notes: notesForm.notes,
          follow_up_instructions: notesForm.follow_up_instructions
        });
        
      if (notesError) throw notesError;
      
      // Update appointment status via RPC
      const { error: rpcError } = await supabase.rpc('complete_appointment', {
        p_appointment_id: appointmentId,
        p_diagnosis: notesForm.diagnosis,
        p_notes: notesForm.notes,
        p_follow_up_instructions: notesForm.follow_up_instructions
      });
      
      if (rpcError) throw rpcError;
      
      toast.success('Notes saved successfully');
      fetchConsultationData(); // Refresh data
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSavePrescriptions = async () => {
    if (prescriptions.length === 0) return;
    
    try {
      setSavingPrescriptions(true);
      
      const prescriptionsToInsert = prescriptions.map(p => ({
        appointment_id: appointmentId,
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        drug: p.drug_name || p.drug,
        dose: p.dose,
        frequency: p.frequency,
        duration: p.duration,
        instructions: p.instructions,
      }));
      
      const { error } = await supabase
        .from('prescriptions')
        .insert(prescriptionsToInsert);
        
      if (error) throw error;
      
      toast.success('Prescriptions saved successfully');
      fetchConsultationData(); // Refresh data
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to save prescriptions');
    } finally {
      setSavingPrescriptions(false);
    }
  };
  
  const handleGeneratePostVisitSummary = async () => {
    try {
      setGeneratingSummary(true);
      
      const result = await generatePostVisitSummary({
        notes: notesForm.notes,
        diagnosis: notesForm.diagnosis,
        prescriptions: prescriptions,
        instructions: notesForm.follow_up_instructions
      });
      
      const { data, error } = await supabase
        .from('summaries')
        .insert({
          appointment_id: appointmentId,
          summary_type: 'post_visit',
          content: result,
          chief_complaint: notesForm.diagnosis.substring(0, 100),
          status: 'completed'
        })
        .select()
        .single();
        
      if (error) throw error;
      
      setPostVisitSummary(data);
      toast.success('Post-visit summary generated successfully');
      
    } catch (error: any) {
      toast.error('Failed to generate summary: ' + (error.message || 'Unknown error'));
    } finally {
      setGeneratingSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#b59a5c]" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="p-8 text-center font-vintage">
        <h2 className="text-2xl font-bold text-[#3b2f2f] font-classic">Appointment details not found</h2>
        <button onClick={() => navigate({ to: '/doctor/schedule' })} className="mt-4 text-[#b59a5c] font-bold hover:underline">
          Return to Ledger Schedule
        </button>
      </div>
    );
  }

  const isCompleted = appointment.status === 'completed';

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 font-vintage animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-[#d2c19d]/40 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate({ to: '/doctor/schedule' })}
            className="p-2 rounded-full hover:bg-[#e7d8b5]/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#3b2f2f]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#3b2f2f] font-classic">{patient?.full_name}</h1>
            <p className="text-xs text-[#3b2f2f]/60 uppercase tracking-wider font-classic">Clinical Consultation Log</p>
          </div>
        </div>
        <div>
          <span className={`badge badge-${appointment.status} capitalize`}>
            {appointment.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Context Archives */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Patient Info Card */}
          <div className="hc-card p-6">
            <h3 className="text-lg font-bold text-[#3b2f2f] font-classic mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-[#b59a5c]" />
              Patient Registry
            </h3>
            <div className="space-y-3 text-sm text-[#3b2f2f]/90">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#b59a5c] mt-0.5" />
                <div>
                  <p className="font-semibold text-[#3b2f2f]">{formatToClinicDate(appointment.start_time)}</p>
                  <p className="text-xs text-[#3b2f2f]/70 italic">{formatToClinicTime(appointment.start_time)}</p>
                </div>
              </div>
              {patient?.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-[#b59a5c]" />
                  <p>{patient.email}</p>
                </div>
              )}
              {patient?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-[#b59a5c]" />
                  <p>{patient.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Pre-Visit Summary */}
          <div className="hc-card p-6 border-2 border-[#b59a5c]">
            <h3 className="text-lg font-bold text-[#3b2f2f] font-classic mb-4 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#b59a5c]" />
              AI Diagnostics Summary (Pre-Visit)
            </h3>
            
            {preVisitSummary ? (
              <div className="space-y-4">
                {preVisitSummary.urgency && (
                  <div>
                    <span className={`badge badge-${preVisitSummary.urgency.toLowerCase() === 'high' ? 'cancelled' : 'upcoming'}`}>
                      {preVisitSummary.urgency} Urgency
                    </span>
                  </div>
                )}
                
                <div>
                  <h4 className="text-xs font-semibold text-[#3b2f2f]/70 uppercase font-classic">Chief Complaint</h4>
                  <p className="text-sm text-[#3b2f2f] italic mt-1 bg-[#faf7f0] p-3 rounded-sm border border-[#d2c19d]/30">"{preVisitSummary.chief_complaint || 'N/A'}"</p>
                </div>
                
                {preVisitSummary.suggested_questions?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#3b2f2f]/70 uppercase font-classic mb-2">Suggested Clinical Inquiries</h4>
                    <ol className="list-decimal pl-4 text-sm text-[#3b2f2f] space-y-1 italic">
                      {preVisitSummary.suggested_questions.map((q: string, i: number) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : symptoms ? (
              <div className="text-sm text-[#3b2f2f]/60 flex items-center gap-2 italic">
                <Loader2 className="w-4 h-4 animate-spin text-[#b59a5c]" />
                Filing diagnostics ledger...
              </div>
            ) : (
              <div className="text-sm text-[#3b2f2f]/60 italic">
                No preliminary symptom reports on file.
              </div>
            )}
          </div>

          {/* Raw Symptoms (if available) */}
          {symptoms && (
            <div className="hc-card p-6">
              <h3 className="text-lg font-bold text-[#3b2f2f] font-classic mb-4">Diagnostics Logged</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-[#3b2f2f]/60 uppercase tracking-wider font-classic">Reported Symptoms</span>
                  <div className="mt-1.5 p-3 rounded-sm bg-[#faf7f0] border border-[#d2c19d]/30 italic text-sm text-[#3b2f2f]">
                    "{symptoms.main_symptoms}"
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-[#3b2f2f]/60 uppercase tracking-wider font-classic">Duration</span>
                    <p className="text-sm font-semibold text-[#3b2f2f] mt-1">{symptoms.duration}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[#3b2f2f]/60 uppercase tracking-wider font-classic">Clinical Severity</span>
                    <p className="text-sm font-semibold text-[#3b2f2f] mt-1 capitalize">{symptoms.severity}</p>
                  </div>
                </div>
                
                {symptoms.additional_info && (
                  <div>
                    <span className="text-xs font-semibold text-[#3b2f2f]/60 uppercase tracking-wider font-classic">Additional Logs</span>
                    <p className="text-sm text-[#3b2f2f]/80 mt-1 bg-[#faf7f0] p-3 rounded-sm border border-[#d2c19d]/30 italic">
                      {symptoms.additional_info}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Previous Visits */}
          {previousVisits.length > 0 && (
            <div className="hc-card p-6">
              <h3 className="text-lg font-bold text-[#3b2f2f] font-classic mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#b59a5c]" />
                Archival Records
              </h3>
              <div className="space-y-4 divide-y divide-[#d2c19d]/20">
                {previousVisits.map((visit, index) => (
                  <div key={visit.id} className={`text-sm ${index > 0 ? 'pt-4' : ''}`}>
                    <p className="font-semibold text-[#3b2f2f] font-classic">{formatToClinicDate(visit.start_time)}</p>
                    {visit.visit_notes?.[0] ? (
                      <>
                        <p className="text-[#3b2f2f] mt-1 italic"><span className="font-semibold text-[#3b2f2f]/70 uppercase tracking-wider text-[10px] font-classic block">Diagnosis:</span> {visit.visit_notes[0].diagnosis}</p>
                        <p className="text-[#3b2f2f]/80 mt-1 line-clamp-2">{visit.visit_notes[0].clinical_notes}</p>
                      </>
                    ) : (
                      <p className="text-[#3b2f2f]/40 italic mt-1">No notes recorded.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Actions */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Notes Section */}
          <div className="hc-card overflow-hidden">
            <div className="bg-[#faf7f0] px-6 py-4 border-b border-[#d2c19d]/40 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#3b2f2f] font-classic flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#b59a5c]" />
                Clinician Consultation Files
              </h3>
              {isCompleted && (
                <span className="badge badge-completed flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Filed
                </span>
              )}
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="hc-label">Diagnosis</label>
                <input 
                  type="text" 
                  value={notesForm.diagnosis}
                  onChange={(e) => setNotesForm({...notesForm, diagnosis: e.target.value})}
                  disabled={isCompleted}
                  className="hc-input"
                  placeholder="Primary diagnosis..."
                />
              </div>
              
              <div>
                <label className="hc-label">Clinical Observations</label>
                <textarea 
                  rows={4}
                  value={notesForm.notes}
                  onChange={(e) => setNotesForm({...notesForm, notes: e.target.value})}
                  disabled={isCompleted}
                  className="hc-input"
                  placeholder="Clinical observations, examinations, and diagnostic details..."
                />
              </div>
              
              <div>
                <label className="hc-label">Apothecary & Follow-up Instructions</label>
                <textarea 
                  rows={3}
                  value={notesForm.follow_up_instructions}
                  onChange={(e) => setNotesForm({...notesForm, follow_up_instructions: e.target.value})}
                  disabled={isCompleted}
                  className="hc-input"
                  placeholder="Directives for post-consultation recovery, diet, and timelines..."
                />
              </div>
              
              {!isCompleted && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes || !notesForm.diagnosis || !notesForm.notes}
                    className="btn-primary min-w-[200px]"
                  >
                    {savingNotes ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Ledger notes
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Prescription Section */}
          <div className="hc-card overflow-hidden">
            <div className="bg-[#faf7f0] px-6 py-4 border-b border-[#d2c19d]/40">
              <h3 className="text-lg font-bold text-[#3b2f2f] font-classic flex items-center gap-2">
                <Pill className="w-4 h-4 text-[#b59a5c]" />
                Medicinal Prescriptions
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              {!isCompleted && (
                <div className="bg-[#faf7f0] p-4 rounded-sm border border-[#d2c19d]/40 space-y-4">
                  <h4 className="text-sm font-bold text-[#3b2f2f] uppercase tracking-wider font-classic">Register New Medication</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#3b2f2f]/60 uppercase font-classic mb-1">Drug Name *</label>
                      <input 
                        type="text" 
                        value={newPrescription.drug_name}
                        onChange={(e) => setNewPrescription({...newPrescription, drug_name: e.target.value})}
                        className="hc-input"
                        placeholder="e.g., Amoxicillin"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#3b2f2f]/60 uppercase font-classic mb-1">Dose *</label>
                      <input 
                        type="text" 
                        value={newPrescription.dose}
                        onChange={(e) => setNewPrescription({...newPrescription, dose: e.target.value})}
                        className="hc-input"
                        placeholder="e.g., 500mg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#3b2f2f]/60 uppercase font-classic mb-1">Frequency</label>
                      <select 
                        value={newPrescription.frequency}
                        onChange={(e) => setNewPrescription({...newPrescription, frequency: e.target.value})}
                        className="hc-input bg-[#faf8f3]"
                      >
                        <option>Once daily</option>
                        <option>Twice daily</option>
                        <option>Three times daily</option>
                        <option>Four times daily</option>
                        <option>As needed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#3b2f2f]/60 uppercase font-classic mb-1">Duration *</label>
                      <input 
                        type="text" 
                        value={newPrescription.duration}
                        onChange={(e) => setNewPrescription({...newPrescription, duration: e.target.value})}
                        className="hc-input"
                        placeholder="e.g., 7 days"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-[#3b2f2f]/60 uppercase font-classic mb-1">Special Directives (Optional)</label>
                      <input 
                        type="text" 
                        value={newPrescription.instructions}
                        onChange={(e) => setNewPrescription({...newPrescription, instructions: e.target.value})}
                        className="hc-input"
                        placeholder="e.g., Take after meals"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddPrescription}
                      className="btn-secondary"
                    >
                      <Plus className="w-4 h-4 mr-1 text-[#b59a5c]" /> Add to list
                    </button>
                  </div>
                </div>
              )}
              
              {prescriptions.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-[#3b2f2f] uppercase tracking-wider font-classic border-b border-[#d2c19d]/20 pb-1">Prescription Registry</h4>
                  {prescriptions.map((rx, idx) => (
                    <div key={rx.id || idx} className="hc-card p-4 flex justify-between items-center bg-[#faf7f0]">
                      <div>
                        <p className="font-bold text-[#3b2f2f] font-classic text-sm">{rx.drug_name || rx.drug} <span className="text-[#3b2f2f]/60 font-normal italic font-vintage">({rx.dose})</span></p>
                        <p className="text-xs text-[#3b2f2f]/70 mt-1 italic">
                          {rx.frequency} for {rx.duration}
                          {rx.instructions && ` • ${rx.instructions}`}
                        </p>
                      </div>
                      {!isCompleted && !rx.created_at && (
                        <button 
                          onClick={() => handleRemovePrescription(rx.id)}
                          className="text-[#8c2a2a] hover:text-[#722121] text-xs font-semibold uppercase tracking-wider font-classic"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {!isCompleted && prescriptions.some(p => !p.created_at) && (
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleSavePrescriptions}
                        disabled={savingPrescriptions}
                        className="btn-primary min-w-[180px]"
                      >
                        {savingPrescriptions ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Prescription
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-[#3b2f2f]/60 text-sm border-2 border-dashed border-[#d2c19d] bg-[#faf7f0]/20 rounded-sm italic">
                  No medication logs added yet.
                </div>
              )}
            </div>
          </div>

          {/* Post-Visit Summary Section (Only visible if completed) */}
          {isCompleted && (
            <div className="hc-card border-2 border-[#b59a5c] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#d2c19d]/40 flex items-center justify-between bg-[#faf7f0]">
                <h3 className="text-lg font-bold text-[#3b2f2f] font-classic flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#b59a5c]" />
                  AI Post-Visit Summary Ledger
                </h3>
                {!postVisitSummary && (
                  <button
                    onClick={handleGeneratePostVisitSummary}
                    disabled={generatingSummary}
                    className="btn-primary py-1.5 px-3 text-xs"
                  >
                    {generatingSummary ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                    Compile with AI
                  </button>
                )}
              </div>
              
              <div className="p-6">
                {postVisitSummary ? (
                  <div className="space-y-4 text-sm text-[#3b2f2f]/90 leading-relaxed font-vintage">
                    <div>
                      <h4 className="font-bold text-[#3b2f2f] font-classic uppercase text-xs">Visits Ledger Summary</h4>
                      <p className="mt-1.5 bg-[#faf7f0] p-3 rounded-sm border border-[#d2c19d]/30 italic">{postVisitSummary.content?.visit_summary || 'N/A'}</p>
                    </div>
                    {postVisitSummary.content?.medication_schedule && (
                      <div>
                        <h4 className="font-bold text-[#3b2f2f] font-classic uppercase text-xs">Medication Timelines</h4>
                        <p className="mt-1.5 bg-[#faf7f0] p-3 rounded-sm border border-[#d2c19d]/30 italic whitespace-pre-wrap">{postVisitSummary.content.medication_schedule}</p>
                      </div>
                    )}
                    {postVisitSummary.content?.follow_up_steps?.length > 0 && (
                      <div>
                        <h4 className="font-bold text-[#3b2f2f] font-classic uppercase text-xs">Directives & Steps</h4>
                        <ul className="list-decimal pl-5 mt-1.5 bg-[#faf7f0] p-3 rounded-sm border border-[#d2c19d]/30 italic space-y-1">
                          {postVisitSummary.content.follow_up_steps.map((step: string, i: number) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {postVisitSummary.content?.important_instructions && (
                      <div>
                        <h4 className="font-bold flex items-center gap-1 text-[#8c2a2a] font-classic uppercase text-xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#8c2a2a]" /> Important Safety Warns
                        </h4>
                        <p className="mt-1.5 bg-[#ffebee] border border-[#ffcdd2] p-3 rounded-sm text-[#c62828] italic">{postVisitSummary.content.important_instructions}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-[#3b2f2f]/60 text-sm italic">
                    Compile AI-powered files to sync reports to the patient archives.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
