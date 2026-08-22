-- ==========================================
-- COMPLETE SEED WITH AUTH USERS
-- Run this in Supabase SQL Editor → New Query
-- This creates all demo users + doctors + data
-- ==========================================

-- Step 1: Create auth users directly
-- Password for all accounts: Demo@1234
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at, confirmed_at,
  raw_user_meta_data,
  created_at, updated_at,
  is_sso_user, is_anonymous
) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'admin@healthcare.demo',
  crypt('Demo@1234', gen_salt('bf')),
  now(), now(),
  '{"full_name": "Admin User", "role": "admin"}',
  now(), now(), false, false
),
(
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'dr.sharma@healthcare.demo',
  crypt('Demo@1234', gen_salt('bf')),
  now(), now(),
  '{"full_name": "Dr. Ananya Sharma", "role": "doctor"}',
  now(), now(), false, false
),
(
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'dr.patel@healthcare.demo',
  crypt('Demo@1234', gen_salt('bf')),
  now(), now(),
  '{"full_name": "Dr. Rajesh Patel", "role": "doctor"}',
  now(), now(), false, false
),
(
  '44444444-4444-4444-4444-444444444444',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'dr.kumar@healthcare.demo',
  crypt('Demo@1234', gen_salt('bf')),
  now(), now(),
  '{"full_name": "Dr. Priya Kumar", "role": "doctor"}',
  now(), now(), false, false
),
(
  '55555555-5555-5555-5555-555555555555',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'patient@healthcare.demo',
  crypt('Demo@1234', gen_salt('bf')),
  now(), now(),
  '{"full_name": "Demo Patient", "role": "patient"}',
  now(), now(), false, false
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create auth identities (needed for email login)
INSERT INTO auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'admin@healthcare.demo',
  '11111111-1111-1111-1111-111111111111',
  '{"sub": "11111111-1111-1111-1111-111111111111", "email": "admin@healthcare.demo"}',
  'email', now(), now(), now()
),
(
  '22222222-2222-2222-2222-222222222222',
  'dr.sharma@healthcare.demo',
  '22222222-2222-2222-2222-222222222222',
  '{"sub": "22222222-2222-2222-2222-222222222222", "email": "dr.sharma@healthcare.demo"}',
  'email', now(), now(), now()
),
(
  '33333333-3333-3333-3333-333333333333',
  'dr.patel@healthcare.demo',
  '33333333-3333-3333-3333-333333333333',
  '{"sub": "33333333-3333-3333-3333-333333333333", "email": "dr.patel@healthcare.demo"}',
  'email', now(), now(), now()
),
(
  '44444444-4444-4444-4444-444444444444',
  'dr.kumar@healthcare.demo',
  '44444444-4444-4444-4444-444444444444',
  '{"sub": "44444444-4444-4444-4444-444444444444", "email": "dr.kumar@healthcare.demo"}',
  'email', now(), now(), now()
),
(
  '55555555-5555-5555-5555-555555555555',
  'patient@healthcare.demo',
  '55555555-5555-5555-5555-555555555555',
  '{"sub": "55555555-5555-5555-5555-555555555555", "email": "patient@healthcare.demo"}',
  'email', now(), now(), now()
)
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Step 3: Profiles
INSERT INTO public.profiles (user_id, full_name, email, phone) VALUES
('11111111-1111-1111-1111-111111111111', 'Admin User',        'admin@healthcare.demo',     '+919000000001'),
('22222222-2222-2222-2222-222222222222', 'Dr. Ananya Sharma', 'dr.sharma@healthcare.demo', '+919000000002'),
('33333333-3333-3333-3333-333333333333', 'Dr. Rajesh Patel',  'dr.patel@healthcare.demo',  '+919000000003'),
('44444444-4444-4444-4444-444444444444', 'Dr. Priya Kumar',   'dr.kumar@healthcare.demo',  '+919000000004'),
('55555555-5555-5555-5555-555555555555', 'Demo Patient',      'patient@healthcare.demo',   '+919000000005')
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone;

-- Step 4: Roles
INSERT INTO public.user_roles (user_id, role) VALUES
('11111111-1111-1111-1111-111111111111', 'admin'),
('22222222-2222-2222-2222-222222222222', 'doctor'),
('33333333-3333-3333-3333-333333333333', 'doctor'),
('44444444-4444-4444-4444-444444444444', 'doctor'),
('55555555-5555-5555-5555-555555555555', 'patient')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Doctors
INSERT INTO public.doctors (user_id, specialisation, qualification, experience_years, bio, working_days, working_hours_start, working_hours_end, slot_duration_minutes, is_active) VALUES
(
  '22222222-2222-2222-2222-222222222222',
  'Cardiologist', 'MD, DM Cardiology', 15,
  'Senior cardiologist with 15+ years specialising in interventional cardiology and heart disease prevention.',
  '{1,2,3,4,5}', '09:00', '17:00', 30, true
),
(
  '33333333-3333-3333-3333-333333333333',
  'Dermatologist', 'MBBS, MD Dermatology', 8,
  'Specialist in skin care, acne treatment, and cosmetic dermatology procedures.',
  '{1,3,5}', '10:00', '16:00', 20, true
),
(
  '44444444-4444-4444-4444-444444444444',
  'General Physician', 'MBBS, MD General Medicine', 10,
  'Experienced family medicine doctor handling general health consultations and preventive care.',
  '{1,2,3,4,5,6}', '08:00', '14:00', 15, true
)
ON CONFLICT (user_id) DO UPDATE SET
  specialisation = EXCLUDED.specialisation,
  is_active = EXCLUDED.is_active;

-- Step 6: Sample appointment (past - completed)
DO $$
DECLARE
  doc3_id UUID;
  app1_id UUID;
BEGIN
  SELECT id INTO doc3_id FROM public.doctors WHERE user_id = '44444444-4444-4444-4444-444444444444';

  INSERT INTO public.appointments (patient_id, doctor_id, start_time, end_time, status)
  VALUES (
    '55555555-5555-5555-5555-555555555555',
    doc3_id,
    now() - interval '3 days',
    now() - interval '3 days' + interval '15 minutes',
    'completed'
  )
  RETURNING id INTO app1_id;

  -- Symptom form for past appointment
  INSERT INTO public.symptom_forms (appointment_id, main_symptoms, duration, severity, additional_info)
  VALUES (app1_id, 'Fever and mild cough', '3 days', 'mild', 'No prior history');

  -- Visit note
  INSERT INTO public.visit_notes (appointment_id, doctor_id, diagnosis, notes, follow_up_instructions)
  VALUES (app1_id, doc3_id, 'Viral Fever', 'Patient has mild viral infection. Prescribed rest and hydration.', 'Follow up if fever persists after 3 days.');

  -- Prescription
  INSERT INTO public.prescriptions (appointment_id, doctor_id, patient_id, drug, dose, frequency, duration, instructions)
  VALUES (app1_id, doc3_id, '55555555-5555-5555-5555-555555555555', 'Paracetamol', '500mg', 'Twice a day', '3 days', 'Take after meals');

  -- Post-visit summary
  INSERT INTO public.summaries (appointment_id, summary_type, content, status)
  VALUES (app1_id, 'post_visit', 'Patient visited for fever and cough. Diagnosed with viral fever. Paracetamol prescribed. Recovery expected in 3-5 days.', 'completed');
END $$;

-- Done!
SELECT 'Seed completed successfully!' AS result;
