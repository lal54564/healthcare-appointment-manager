import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Set VITE_USE_MOCK=true in .env to use local mock data (no real Supabase calls).
// Remove or set to false for production.
export const isDevMockMode = import.meta.env.VITE_USE_MOCK === 'true';

if (isDevMockMode) {
  console.warn(
    'Running in Development Mock Mode: Supabase is mocked with localStorage-persisted seed data.'
  );
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Real client definition (if ever needed or to compile types)
const realSupabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ==========================================
// MOCK DATABASE & SIMULATOR FOR OFFLINE USE
// ==========================================

export interface MockDb {
  profiles: any[];
  doctors: any[];
  appointments: any[];
  symptom_forms: any[];
  visit_notes: any[];
  prescriptions: any[];
  summaries: any[];
  doctor_leave: any[];
}

const INITIAL_PROFILES = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    user_id: '11111111-1111-1111-1111-111111111111',
    full_name: 'Admin User',
    first_name: 'Admin',
    last_name: 'User',
    email: 'admin@healthcare.demo',
    phone: '+919000000001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    user_id: '22222222-2222-2222-2222-222222222222',
    full_name: 'Dr. Ananya Sharma',
    first_name: 'Ananya',
    last_name: 'Sharma',
    email: 'dr.sharma@healthcare.demo',
    phone: '+919000000002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    user_id: '33333333-3333-3333-3333-333333333333',
    full_name: 'Dr. Rajesh Patel',
    first_name: 'Rajesh',
    last_name: 'Patel',
    email: 'dr.patel@healthcare.demo',
    phone: '+919000000003',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    user_id: '44444444-4444-4444-4444-444444444444',
    full_name: 'Dr. Priya Kumar',
    first_name: 'Priya',
    last_name: 'Kumar',
    email: 'dr.kumar@healthcare.demo',
    phone: '+919000000004',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    user_id: '55555555-5555-5555-5555-555555555555',
    full_name: 'Demo Patient',
    first_name: 'Demo',
    last_name: 'Patient',
    email: 'patient@healthcare.demo',
    phone: '+919000000005',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const INITIAL_DOCTORS = [
  {
    id: 'doc-sharma-id',
    user_id: '22222222-2222-2222-2222-222222222222',
    specialisation: 'Cardiologist',
    qualification: 'MD, DM Cardiology',
    experience_years: 15,
    bio: 'Senior cardiologist with 15+ years specialising in interventional cardiology and heart disease prevention.',
    working_days: [1, 2, 3, 4, 5],
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    slot_duration_minutes: 30,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'doc-patel-id',
    user_id: '33333333-3333-3333-3333-333333333333',
    specialisation: 'Dermatologist',
    qualification: 'MBBS, MD Dermatology',
    experience_years: 8,
    bio: 'Specialist in skin care, acne treatment, and cosmetic dermatology procedures.',
    working_days: [1, 3, 5],
    working_hours_start: '10:00',
    working_hours_end: '16:00',
    slot_duration_minutes: 20,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'doc-kumar-id',
    user_id: '44444444-4444-4444-4444-444444444444',
    specialisation: 'General Physician',
    qualification: 'MBBS, MD General Medicine',
    experience_years: 10,
    bio: 'Experienced family medicine doctor handling general health consultations and preventive care.',
    working_days: [1, 2, 3, 4, 5, 6],
    working_hours_start: '08:00',
    working_hours_end: '14:00',
    slot_duration_minutes: 15,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Helper to get dates relative to today
const getRelativeDateString = (daysOffset: number, timeStr: string) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const datePart = d.toISOString().split('T')[0];
  return `${datePart}T${timeStr}`;
};

const INITIAL_APPOINTMENTS = [
  {
    id: 'apt-past-1',
    patient_id: '55555555-5555-5555-5555-555555555555',
    doctor_id: 'doc-kumar-id',
    start_time: getRelativeDateString(-3, '09:00:00Z'),
    end_time: getRelativeDateString(-3, '09:15:00Z'),
    status: 'completed',
    cancellation_reason: null,
    rescheduled_from: null,
    hold_expires_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'apt-upcoming-1',
    patient_id: '55555555-5555-5555-5555-555555555555',
    doctor_id: 'doc-sharma-id',
    start_time: getRelativeDateString(1, '10:00:00Z'),
    end_time: getRelativeDateString(1, '10:30:00Z'),
    status: 'confirmed',
    cancellation_reason: null,
    rescheduled_from: null,
    hold_expires_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const INITIAL_SYMPTOM_FORMS = [
  {
    id: 'sf-past-1',
    appointment_id: 'apt-past-1',
    main_symptoms: 'Fever and mild cough',
    duration: '3 days',
    severity: 'mild',
    additional_info: 'No prior history',
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'sf-upcoming-1',
    appointment_id: 'apt-upcoming-1',
    main_symptoms: 'Chest tightness and light palpitations',
    duration: '2 days',
    severity: 'moderate',
    additional_info: 'Occurs mostly after climbing stairs',
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const INITIAL_VISIT_NOTES = [
  {
    id: 'vn-past-1',
    appointment_id: 'apt-past-1',
    doctor_id: 'doc-kumar-id',
    diagnosis: 'Viral Fever',
    notes: 'Patient has mild viral infection. Prescribed rest and hydration.',
    clinical_notes: 'Patient has mild viral infection. Prescribed rest and hydration.',
    follow_up_instructions: 'Follow up if fever persists after 3 days.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const INITIAL_PRESCRIPTIONS = [
  {
    id: 'pr-past-1',
    appointment_id: 'apt-past-1',
    doctor_id: 'doc-kumar-id',
    patient_id: '55555555-5555-5555-5555-555555555555',
    drug: 'Paracetamol',
    dose: '500mg',
    frequency: 'Twice a day',
    duration: '3 days',
    instructions: 'Take after meals',
    created_at: new Date().toISOString()
  }
];

const INITIAL_SUMMARIES = [
  {
    id: 'sum-past-1',
    appointment_id: 'apt-past-1',
    summary_type: 'post_visit',
    content: 'Patient visited for fever and cough. Diagnosed with viral fever. Paracetamol prescribed. Recovery expected in 3-5 days.',
    urgency: 'low',
    chief_complaint: 'Fever and cough',
    suggested_questions: [],
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'sum-upcoming-1',
    appointment_id: 'apt-upcoming-1',
    summary_type: 'pre_visit',
    content: 'Patient is experiencing mild chest discomfort and palpitations. Urgent follow-up recommended.',
    urgency: 'medium',
    chief_complaint: 'Chest discomfort',
    suggested_questions: ['Have you had this discomfort before?', 'Does the pain radiate to your left arm?', 'Are you experiencing shortness of breath?'],
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export function getMockDb(): MockDb {
  if (typeof window === 'undefined') {
    return {
      profiles: INITIAL_PROFILES,
      doctors: INITIAL_DOCTORS,
      appointments: INITIAL_APPOINTMENTS,
      symptom_forms: INITIAL_SYMPTOM_FORMS,
      visit_notes: INITIAL_VISIT_NOTES,
      prescriptions: INITIAL_PRESCRIPTIONS,
      summaries: INITIAL_SUMMARIES,
      doctor_leave: []
    };
  }
  const dbStr = localStorage.getItem('healthcare_mock_db');
  if (!dbStr) {
    const db = {
      profiles: INITIAL_PROFILES,
      doctors: INITIAL_DOCTORS,
      appointments: INITIAL_APPOINTMENTS,
      symptom_forms: INITIAL_SYMPTOM_FORMS,
      visit_notes: INITIAL_VISIT_NOTES,
      prescriptions: INITIAL_PRESCRIPTIONS,
      summaries: INITIAL_SUMMARIES,
      doctor_leave: []
    };
    localStorage.setItem('healthcare_mock_db', JSON.stringify(db));
    return db;
  }
  return JSON.parse(dbStr);
}

export function saveMockDb(db: MockDb) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('healthcare_mock_db', JSON.stringify(db));
}

async function executeMockQuery(table: string, queryState: any) {
  const db = getMockDb();
  let data = (db as any)[table] || [];

  // Filter based on queryState filters
  for (const filter of queryState.filters) {
    const { type, col, val } = filter;
    if (type === 'eq') {
      if (col.includes('.')) {
        const [parentTable, childCol] = col.split('.');
        if (parentTable === 'appointments') {
          data = data.filter((item: any) => {
            const apt = db.appointments.find(a => a.id === item.appointment_id || a.id === item.id);
            return apt && apt[childCol] === val;
          });
        }
      } else {
        data = data.filter((item: any) => item[col] === val);
      }
    } else if (type === 'neq') {
      data = data.filter((item: any) => item[col] !== val);
    } else if (type === 'gte') {
      data = data.filter((item: any) => new Date(item[col]) >= new Date(val));
    } else if (type === 'lte') {
      data = data.filter((item: any) => new Date(item[col]) <= new Date(val));
    } else if (type === 'lt') {
      data = data.filter((item: any) => new Date(item[col]) < new Date(val));
    } else if (type === 'in') {
      data = data.filter((item: any) => val.includes(item[col]));
    }
  }

  // Handle relations / selects
  if (queryState.select) {
    const selectStr = queryState.select;
    data = data.map((item: any) => {
      const copy = { ...item };

      if (selectStr.includes('profiles!fk_doctors_profiles(*)') || selectStr.includes('profiles(*)')) {
        const profile = db.profiles.find(p => p.user_id === item.user_id);
        copy.profiles = profile || null;
      }
      
      if (selectStr.includes('profiles!fk_appointments_patient_profiles(*)')) {
        const profile = db.profiles.find(p => p.user_id === item.patient_id);
        copy.profiles = profile || null;
      }

      if (selectStr.includes('doctors!inner(*') || selectStr.includes('doctors(*')) {
        const doctor = db.doctors.find(d => d.id === item.doctor_id);
        if (doctor) {
          const docCopy = { ...doctor };
          const docProfile = db.profiles.find(p => p.user_id === doctor.user_id);
          docCopy.profiles = docProfile || null;
          copy.doctors = docCopy;
        } else {
          copy.doctors = null;
        }
      }

      if (selectStr.includes('appointments!inner(*') || selectStr.includes('appointments(*')) {
        const appointment = db.appointments.find(a => a.id === item.appointment_id);
        if (appointment) {
          const aptCopy = { ...appointment };
          const doctor = db.doctors.find(d => d.id === appointment.doctor_id);
          if (doctor) {
            const docCopy = { ...doctor };
            const docProfile = db.profiles.find(p => p.user_id === doctor.user_id);
            docCopy.profiles = docProfile || null;
            aptCopy.doctors = docCopy;
          }
          copy.appointments = aptCopy;
        } else {
          copy.appointments = null;
        }
      }

      if (selectStr.includes('symptom_forms(*)')) {
        const sf = db.symptom_forms.filter(s => s.appointment_id === item.id);
        copy.symptom_forms = sf;
      }

      if (selectStr.includes('summaries(*)')) {
        const s = db.summaries.filter(sum => sum.appointment_id === item.id);
        copy.summaries = s;
      }

      if (selectStr.includes('visit_notes(*)')) {
        const vn = db.visit_notes.filter(v => v.appointment_id === item.id || v.appointment_id === item.appointment_id);
        copy.visit_notes = vn;
      }

      if (selectStr.includes('prescriptions(*)')) {
        const p = db.prescriptions.filter(pr => pr.appointment_id === item.id);
        copy.prescriptions = p;
      }

      return copy;
    });
  }

  // Handle sorting
  if (queryState.order) {
    const { col, ascending } = queryState.order;
    data = [...data].sort((a, b) => {
      let valA = a[col];
      let valB = b[col];
      if (col === 'start_time' || col === 'created_at') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (valA < valB) return ascending ? -1 : 1;
      if (valA > valB) return ascending ? 1 : -1;
      return 0;
    });
  }

  // Handle limit
  if (queryState.limit !== null) {
    data = data.slice(0, queryState.limit);
  }

  // Handle single
  if (queryState.single) {
    if (data.length === 0) {
      throw new Error('No rows found');
    }
    return { data: data[0], error: null };
  }

  return { data, error: null };
}

async function handleMockInsert(table: string, records: any) {
  const db = getMockDb();
  const arr = Array.isArray(records) ? records : [records];
  const newRecords = arr.map(r => ({
    id: r.id || Math.random().toString(36).substring(2),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...r
  }));

  (db as any)[table] = [...((db as any)[table] || []), ...newRecords];
  saveMockDb(db);

  return { data: Array.isArray(records) ? newRecords : newRecords[0], error: null };
}

async function handleMockUpdate(table: string, updates: any, filters: any[]) {
  const db = getMockDb();
  let data = (db as any)[table] || [];
  let updatedRecords: any[] = [];

  data = data.map((item: any) => {
    let matches = true;
    for (const filter of filters) {
      const { type, col, val } = filter;
      if (type === 'eq' && item[col] !== val) matches = false;
    }

    if (matches) {
      const updated = {
        ...item,
        ...updates,
        updated_at: new Date().toISOString()
      };
      updatedRecords.push(updated);
      return updated;
    }
    return item;
  });

  (db as any)[table] = data;
  saveMockDb(db);

  return { data: updatedRecords, error: null };
}

async function handleMockDelete(table: string, filters: any[]) {
  const db = getMockDb();
  let data = (db as any)[table] || [];
  let deletedRecords: any[] = [];

  const remaining = data.filter((item: any) => {
    let matches = true;
    for (const filter of filters) {
      const { type, col, val } = filter;
      if (type === 'eq' && item[col] !== val) matches = false;
    }
    if (matches) {
      deletedRecords.push(item);
    }
    return !matches;
  });

  (db as any)[table] = remaining;
  saveMockDb(db);

  return { data: deletedRecords, error: null };
}

async function executeMockRpc(fnName: string, args?: any) {
  if (fnName === 'search_doctors') {
    const { p_search_term, p_specialisation } = args || {};
    const db = getMockDb();
    // Return flat shape matching the real DB search_doctors() RPC:
    // { doctor_id, user_id, full_name, email, specialisation, qualification,
    //   experience_years, bio, slot_duration_minutes, is_active,
    //   available_slots_count, avatar_url }
    let result = db.doctors
      .filter(d => d.is_active !== false)
      .map(d => {
        const profile = db.profiles.find(p => p.user_id === d.user_id);
        return {
          doctor_id: d.id,
          user_id: d.user_id,
          full_name: profile?.full_name ?? 'Unknown Doctor',
          email: profile?.email ?? '',
          specialisation: d.specialisation,
          qualification: d.qualification ?? null,
          experience_years: d.experience_years ?? 0,
          bio: d.bio ?? null,
          slot_duration_minutes: d.slot_duration_minutes,
          is_active: d.is_active,
          available_slots_count: 0,
          avatar_url: profile?.avatar_url ?? null,
        };
      });

    if (p_specialisation) {
      result = result.filter(d =>
        d.specialisation.toLowerCase().includes(p_specialisation.toLowerCase())
      );
    }
    if (p_search_term) {
      result = result.filter(d =>
        d.full_name.toLowerCase().includes(p_search_term.toLowerCase()) ||
        d.specialisation.toLowerCase().includes(p_search_term.toLowerCase())
      );
    }

    return { data: result, error: null };
  }

  if (fnName === 'get_available_slots') {
    const { p_doctor_id, p_date } = args || {};
    const db = getMockDb();
    const doctor = db.doctors.find(d => d.id === p_doctor_id);
    if (!doctor) return { data: [], error: null };

    const startHourStr = doctor.working_hours_start || '09:00';
    const endHourStr = doctor.working_hours_end || '17:00';
    const slotDuration = doctor.slot_duration_minutes || 30;

    // Treat working hours as IST (UTC+5:30) to match VITE_CLINIC_TIMEZONE=Asia/Kolkata
    // and mirror the behaviour of the real get_available_slots() SQL function which runs
    // on a UTC server and needs the same offset applied.
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in ms
    const parseDateAsIST = (dateStr: string, timeStr: string): Date => {
      // Build a UTC Date that represents the given local IST date+time
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hour, minute] = timeStr.split(':').map(Number);
      return new Date(Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MS);
    };

    let current = parseDateAsIST(p_date, startHourStr);
    const end = parseDateAsIST(p_date, endHourStr);
    const now = new Date();

    const slots: any[] = [];
    while (current < end) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + slotDuration * 60 * 1000);

      // Skip past slots (mirrors SQL: IF v_slot_start > now())
      if (slotStart > now) {
        const isTaken = db.appointments.some(apt => {
          if (apt.doctor_id !== p_doctor_id) return false;
          if (apt.status === 'cancelled') return false;

          const aptStart = new Date(apt.start_time).getTime();
          const aptEnd = new Date(apt.end_time).getTime();
          const sStart = slotStart.getTime();
          const sEnd = slotEnd.getTime();

          return (sStart >= aptStart && sStart < aptEnd) || (sEnd > aptStart && sEnd <= aptEnd);
        });

        slots.push({
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          is_available: !isTaken,
          is_held: false,
          held_by_current_user: false,
        });
      }

      current = slotEnd;
    }

    return { data: slots, error: null };
  }

  if (fnName === 'hold_slot') {
    const { p_doctor_id, p_start_time, p_end_time, p_patient_id } = args || {};
    const db = getMockDb();
    
    const newApt = {
      id: Math.random().toString(36).substring(2),
      patient_id: p_patient_id || '55555555-5555-5555-5555-555555555555',
      doctor_id: p_doctor_id,
      start_time: p_start_time,
      end_time: p_end_time,
      status: 'held',
      hold_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      cancellation_reason: null,
      rescheduled_from: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.appointments.push(newApt);
    saveMockDb(db);

    return { data: [newApt], error: null };
  }

  if (fnName === 'confirm_appointment') {
    const { p_appointment_id } = args || {};
    const db = getMockDb();
    
    db.appointments = db.appointments.map(apt => {
      if (apt.id === p_appointment_id) {
        return {
          ...apt,
          status: 'confirmed',
          hold_expires_at: null,
          updated_at: new Date().toISOString()
        };
      }
      return apt;
    });
    
    const apt = db.appointments.find(a => a.id === p_appointment_id);
    if (apt) {
      const sf = db.symptom_forms.find(s => s.appointment_id === p_appointment_id);
      const mainSymptoms = sf ? sf.main_symptoms : 'General symptoms';
      
      const newSummary = {
        id: Math.random().toString(36).substring(2),
        appointment_id: p_appointment_id,
        summary_type: 'pre_visit',
        content: `AI Analysis based on symptoms: "${mainSymptoms}". The patient has reported these symptoms. Recommend standard physical and blood tests.`,
        urgency: 'low',
        chief_complaint: mainSymptoms.substring(0, 50),
        suggested_questions: ['How long have you had these symptoms?', 'Are you experiencing any other symptoms?'],
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.summaries.push(newSummary);
    }
    
    saveMockDb(db);
    return { data: { success: true }, error: null };
  }

  if (fnName === 'complete_appointment') {
    const { p_appointment_id, p_diagnosis, p_notes, p_follow_up_instructions } = args || {};
    const db = getMockDb();
    
    db.appointments = db.appointments.map(apt => {
      if (apt.id === p_appointment_id) {
        return {
          ...apt,
          status: 'completed',
          updated_at: new Date().toISOString()
        };
      }
      return apt;
    });

    const apt = db.appointments.find(a => a.id === p_appointment_id);
    const doctorId = apt ? apt.doctor_id : 'doc-sharma-id';

    db.visit_notes.push({
      id: Math.random().toString(36).substring(2),
      appointment_id: p_appointment_id,
      doctor_id: doctorId,
      diagnosis: p_diagnosis,
      notes: p_notes,
      clinical_notes: p_notes,
      follow_up_instructions: p_follow_up_instructions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    db.summaries.push({
      id: Math.random().toString(36).substring(2),
      appointment_id: p_appointment_id,
      summary_type: 'post_visit',
      content: `Consultation completed. Diagnosis: ${p_diagnosis}. Visit notes: ${p_notes}. Follow up instructions: ${p_follow_up_instructions}`,
      urgency: 'low',
      chief_complaint: p_diagnosis,
      suggested_questions: [],
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    saveMockDb(db);
    return { data: { success: true }, error: null };
  }

  if (fnName === 'detect_leave_conflicts') {
    const { p_doctor_id, p_leave_date } = args || {};
    const db = getMockDb();
    
    const conflicts = db.appointments.filter(apt => {
      if (apt.doctor_id !== p_doctor_id) return false;
      if (apt.status === 'cancelled') return false;
      
      const aptDate = apt.start_time.split('T')[0];
      return aptDate === p_leave_date;
    });

    return { data: conflicts, error: null };
  }

  return { data: null, error: new Error(`RPC function ${fnName} not implemented in mock mode`) };
}

class MockBuilder {
  private table: string;
  private queryState: any;

  constructor(table: string, queryState: any = {}) {
    this.table = table;
    this.queryState = {
      select: '*',
      filters: [],
      order: null,
      single: false,
      limit: null,
      mode: 'select',
      pendingUpdate: null,
      ...queryState
    };
  }

  select(columns: string) {
    this.queryState.select = columns;
    return this;
  }

  eq(col: string, val: any) {
    this.queryState.filters.push({ type: 'eq', col, val });
    return this;
  }

  neq(col: string, val: any) {
    this.queryState.filters.push({ type: 'neq', col, val });
    return this;
  }

  gte(col: string, val: any) {
    this.queryState.filters.push({ type: 'gte', col, val });
    return this;
  }

  lte(col: string, val: any) {
    this.queryState.filters.push({ type: 'lte', col, val });
    return this;
  }

  lt(col: string, val: any) {
    this.queryState.filters.push({ type: 'lt', col, val });
    return this;
  }

  in(col: string, val: any) {
    this.queryState.filters.push({ type: 'in', col, val });
    return this;
  }

  order(col: string, options?: { ascending?: boolean }) {
    this.queryState.order = { col, ascending: options?.ascending !== false };
    return this;
  }

  limit(num: number) {
    this.queryState.limit = num;
    return this;
  }

  single() {
    this.queryState.single = true;
    return this;
  }

  async insert(records: any) {
    return handleMockInsert(this.table, records);
  }

  // update() is NOT async – it returns `this` so filters like .eq() can be chained after it.
  // Execution happens when the builder is awaited via then().
  update(updates: any) {
    this.queryState.pendingUpdate = updates;
    this.queryState.mode = 'update';
    return this;
  }

  delete() {
    this.queryState.mode = 'delete';
    return this;
  }

  // Makes the builder itself awaitable: `await supabase.from(...).update(...).eq(...)`
  then(resolve: (v: any) => any, reject?: (e: any) => any) {
    let promise: Promise<any>;
    if (this.queryState.mode === 'update') {
      promise = handleMockUpdate(this.table, this.queryState.pendingUpdate, this.queryState.filters);
    } else if (this.queryState.mode === 'delete') {
      promise = handleMockDelete(this.table, this.queryState.filters);
    } else {
      promise = executeMockQuery(this.table, this.queryState);
    }
    return promise.then(resolve, reject);
  }

  async upsert(records: any) {
    const db = getMockDb();
    const arr = Array.isArray(records) ? records : [records];
    const tableData = (db as any)[this.table] || [];

    const newOrUpdated = arr.map(r => {
      const matchIndex = tableData.findIndex((item: any) => {
        if (r.id && item.id === r.id) return true;
        if (r.user_id && item.user_id === r.user_id) return true;
        return false;
      });

      if (matchIndex >= 0) {
        tableData[matchIndex] = {
          ...tableData[matchIndex],
          ...r,
          updated_at: new Date().toISOString()
        };
        return tableData[matchIndex];
      } else {
        const newRec = {
          id: r.id || Math.random().toString(36).substring(2),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...r
        };
        tableData.push(newRec);
        return newRec;
      }
    });

    (db as any)[this.table] = tableData;
    saveMockDb(db);

    return { data: Array.isArray(records) ? newOrUpdated : newOrUpdated[0], error: null };
  }

}

class MockSupabaseClient {
  auth = {
    getUser: async () => {
      const userStr = localStorage.getItem('healthcare_mock_user');
      if (userStr) {
        return { data: { user: JSON.parse(userStr) }, error: null };
      }
      return { data: { user: null }, error: null };
    },
    signUp: async (params: any) => {
      return { data: { user: null }, error: new Error('Use auth helper instead') };
    },
    signInWithPassword: async (params: any) => {
      return { data: { user: null }, error: new Error('Use auth helper instead') };
    },
    signOut: async () => {
      localStorage.removeItem('healthcare_mock_user');
      return { error: null };
    },
    onAuthStateChange: (callback: any) => {
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
  };

  from(table: string) {
    return new MockBuilder(table);
  }

  async rpc(fnName: string, args?: any) {
    return executeMockRpc(fnName, args);
  }
}

// Export the mock client when isDevMockMode is true, otherwise export the real client
export const supabase = isDevMockMode
  ? (new MockSupabaseClient() as any)
  : realSupabase;

/**
 * Create a Supabase client with the service role key for server-side operations.
 * This bypasses RLS - use only in server functions.
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';
  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
