-- Demo Accounts (create these via Supabase Auth dashboard or signup flow):
-- Admin:   admin@healthcare.demo / Demo@1234
-- Doctor1: dr.sharma@healthcare.demo / Demo@1234  (Cardiologist)
-- Doctor2: dr.patel@healthcare.demo / Demo@1234   (Dermatologist)  
-- Doctor3: dr.kumar@healthcare.demo / Demo@1234   (General Physician)
-- Patient: patient@healthcare.demo / Demo@1234

CREATE OR REPLACE FUNCTION seed_demo_data(
    admin_uid UUID, 
    doctor1_uid UUID, 
    doctor2_uid UUID, 
    doctor3_uid UUID, 
    patient_uid UUID
) RETURNS void AS $$
DECLARE
    doc1_id UUID;
    doc2_id UUID;
    doc3_id UUID;
    app1_id UUID;
    app2_id UUID;
    app3_id UUID;
BEGIN
    -- 1. Profiles
    INSERT INTO profiles (user_id, full_name, email, phone) VALUES
    (admin_uid, 'Admin User', 'admin@healthcare.demo', '+919000000001'),
    (doctor1_uid, 'Dr. Ananya Sharma', 'dr.sharma@healthcare.demo', '+919000000002'),
    (doctor2_uid, 'Dr. Rajesh Patel', 'dr.patel@healthcare.demo', '+919000000003'),
    (doctor3_uid, 'Dr. Priya Kumar', 'dr.kumar@healthcare.demo', '+919000000004'),
    (patient_uid, 'Demo Patient', 'patient@healthcare.demo', '+919000000005')
    ON CONFLICT (user_id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone;

    -- 2. User Roles
    INSERT INTO user_roles (user_id, role) VALUES
    (admin_uid, 'admin'),
    (doctor1_uid, 'doctor'),
    (doctor2_uid, 'doctor'),
    (doctor3_uid, 'doctor'),
    (patient_uid, 'patient')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- 3. Doctors
    INSERT INTO doctors (user_id, specialisation, bio, working_days, working_hours_start, working_hours_end, slot_duration_minutes, is_active) VALUES
    (doctor1_uid, 'Cardiologist', 'Experienced cardiologist with 15+ years in practice.', '{1,2,3,4,5}', '09:00', '17:00', 30, true),
    (doctor2_uid, 'Dermatologist', 'Specialist in skin care and cosmetic dermatology.', '{1,3,5}', '10:00', '16:00', 20, true),
    (doctor3_uid, 'General Physician', 'Family medicine and general health consultations.', '{1,2,3,4,5,6}', '08:00', '14:00', 15, true)
    ON CONFLICT (user_id) DO UPDATE SET
        specialisation = EXCLUDED.specialisation,
        bio = EXCLUDED.bio,
        working_days = EXCLUDED.working_days,
        working_hours_start = EXCLUDED.working_hours_start,
        working_hours_end = EXCLUDED.working_hours_end,
        slot_duration_minutes = EXCLUDED.slot_duration_minutes;

    -- Get Doctor IDs
    SELECT id INTO doc1_id FROM doctors WHERE user_id = doctor1_uid;
    SELECT id INTO doc2_id FROM doctors WHERE user_id = doctor2_uid;
    SELECT id INTO doc3_id FROM doctors WHERE user_id = doctor3_uid;

    -- 4. Doctor Leave
    INSERT INTO doctor_leave (doctor_id, leave_date, reason) VALUES
    (doc1_id, (now() + interval '5 days')::DATE, 'Medical Conference'),
    (doc2_id, (now() + interval '10 days')::DATE, 'Personal Leave'),
    (doc3_id, (now() + interval '2 days')::DATE, 'Family Emergency')
    ON CONFLICT (doctor_id, leave_date) DO NOTHING;

    -- 5. Appointments
    -- Past Completed Appointment
    INSERT INTO appointments (patient_id, doctor_id, start_time, end_time, status)
    VALUES (patient_uid, doc3_id, now() - interval '2 days', now() - interval '2 days' + interval '15 minutes', 'completed')
    RETURNING id INTO app1_id;

    -- Upcoming Confirmed Appointment
    INSERT INTO appointments (patient_id, doctor_id, start_time, end_time, status)
    VALUES (patient_uid, doc1_id, now() + interval '1 day', now() + interval '1 day' + interval '30 minutes', 'confirmed')
    RETURNING id INTO app2_id;

    -- Cancelled Appointment
    INSERT INTO appointments (patient_id, doctor_id, start_time, end_time, status, cancellation_reason)
    VALUES (patient_uid, doc2_id, now() - interval '1 day', now() - interval '1 day' + interval '20 minutes', 'cancelled', 'Patient requested cancellation')
    RETURNING id INTO app3_id;

    -- 6. Symptom Forms
    INSERT INTO symptom_forms (appointment_id, main_symptoms, duration, severity, additional_info)
    VALUES 
    (app1_id, 'Fever and mild cough', '3 days', 'mild', 'No prior history'),
    (app2_id, 'Chest pain and shortness of breath', '1 week', 'moderate', 'Pain radiates to left arm occasionally');

    -- 7. Visit Notes
    INSERT INTO visit_notes (appointment_id, doctor_id, diagnosis, notes, follow_up_instructions)
    VALUES 
    (app1_id, doc3_id, 'Viral Fever', 'Patient has mild viral infection. Prescribed rest and hydration.', 'Follow up if fever persists after 3 days.');

    -- 8. Prescriptions
    INSERT INTO prescriptions (appointment_id, doctor_id, patient_id, drug, dose, frequency, duration, instructions)
    VALUES 
    (app1_id, doc3_id, patient_uid, 'Paracetamol', '500mg', 'Twice a day', '3 days', 'Take after meals');

    -- 9. Summaries
    INSERT INTO summaries (appointment_id, summary_type, content, status)
    VALUES 
    (app1_id, 'post_visit', 'Patient visited for fever and cough. Diagnosed with viral fever. Paracetamol prescribed.', 'completed'),
    (app2_id, 'pre_visit', 'Patient reporting chest pain and shortness of breath for 1 week. Needs ECG evaluation.', 'completed');

END;
$$ LANGUAGE plpgsql;

-- For testing with known UUIDs (replace with actual auth.users IDs after signup)
DO $$ 
DECLARE
  admin_uid UUID := '00000000-0000-0000-0000-000000000001';
  doctor1_uid UUID := '00000000-0000-0000-0000-000000000002';
  doctor2_uid UUID := '00000000-0000-0000-0000-000000000003';
  doctor3_uid UUID := '00000000-0000-0000-0000-000000000004';
  patient_uid UUID := '00000000-0000-0000-0000-000000000005';
BEGIN
  -- Commented out so it doesn't run automatically, uncomment to execute with hardcoded UUIDs
  -- PERFORM seed_demo_data(admin_uid, doctor1_uid, doctor2_uid, doctor3_uid, patient_uid);
END $$;
