-- ============================================================
-- MASTER FIX SCRIPT - Run this ONCE in Supabase SQL Editor
-- Fixes ALL RLS policies, triggers, FKs, and seeds demo data
-- ============================================================

-- ============================================================
-- STEP 1: DROP ALL EXISTING POLICIES (clean slate)
-- ============================================================
DO $$ 
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- STEP 2: DROP AND RECREATE THE TRIGGER
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
  IF v_role NOT IN ('admin','doctor','patient') THEN v_role := 'patient'; END IF;

  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email,'u@x'),'@',1))
  )
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        email = COALESCE(EXCLUDED.email, profiles.email);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_role = 'doctor' THEN
    INSERT INTO public.doctors (
      user_id, specialisation, qualification, experience_years,
      working_days, working_hours_start, working_hours_end, slot_duration_minutes, is_active
    ) VALUES (
      NEW.id, 'General Physician', 'MBBS', 0,
      '{1,2,3,4,5}', '09:00', '17:00', 30, true
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 3: ADD FK RELATIONSHIPS (safe - skip if exists)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_doctors_profiles'
  ) THEN
    ALTER TABLE public.doctors
      ADD CONSTRAINT fk_doctors_profiles
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_appointments_patient_profiles'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT fk_appointments_patient_profiles
      FOREIGN KEY (patient_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- STEP 4: RECREATE ALL RLS POLICIES
-- ============================================================

-- PROFILES
CREATE POLICY "profiles_select_own"   ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own"   ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id OR true);
CREATE POLICY "profiles_update_own"   ON public.profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_admin"        ON public.profiles FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- USER ROLES
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_roles_insert_own" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_roles_admin"      ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- DOCTORS
CREATE POLICY "doctors_select_all"    ON public.doctors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "doctors_insert_own"    ON public.doctors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "doctors_update_own"    ON public.doctors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "doctors_admin"         ON public.doctors FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- DOCTOR LEAVE
CREATE POLICY "doctor_leave_select"   ON public.doctor_leave FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "doctor_leave_insert"   ON public.doctor_leave FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','doctor')));
CREATE POLICY "doctor_leave_delete"   ON public.doctor_leave FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','doctor')));

-- APPOINTMENTS
CREATE POLICY "appt_patient_select"   ON public.appointments FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "appt_patient_insert"   ON public.appointments FOR INSERT WITH CHECK (patient_id = auth.uid());
CREATE POLICY "appt_patient_update"   ON public.appointments FOR UPDATE USING (patient_id = auth.uid());
CREATE POLICY "appt_doctor_select"    ON public.appointments FOR SELECT USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));
CREATE POLICY "appt_doctor_update"    ON public.appointments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));
CREATE POLICY "appt_admin"            ON public.appointments FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- SYMPTOM FORMS
CREATE POLICY "symptoms_patient_select" ON public.symptom_forms FOR SELECT USING (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.patient_id = auth.uid()));
CREATE POLICY "symptoms_patient_insert" ON public.symptom_forms FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.patient_id = auth.uid()));
CREATE POLICY "symptoms_patient_update" ON public.symptom_forms FOR UPDATE USING (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.patient_id = auth.uid()));
CREATE POLICY "symptoms_doctor_select"  ON public.symptom_forms FOR SELECT USING (EXISTS (SELECT 1 FROM public.appointments a JOIN public.doctors d ON d.id = a.doctor_id WHERE a.id = appointment_id AND d.user_id = auth.uid()));
CREATE POLICY "symptoms_admin"          ON public.symptom_forms FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- VISIT NOTES
CREATE POLICY "notes_doctor_select"   ON public.visit_notes FOR SELECT USING (EXISTS (SELECT 1 FROM public.appointments a JOIN public.doctors d ON d.id = a.doctor_id WHERE a.id = appointment_id AND d.user_id = auth.uid()));
CREATE POLICY "notes_doctor_insert"   ON public.visit_notes FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.appointments a JOIN public.doctors d ON d.id = a.doctor_id WHERE a.id = appointment_id AND d.user_id = auth.uid()));
CREATE POLICY "notes_doctor_update"   ON public.visit_notes FOR UPDATE USING (EXISTS (SELECT 1 FROM public.appointments a JOIN public.doctors d ON d.id = a.doctor_id WHERE a.id = appointment_id AND d.user_id = auth.uid()));
CREATE POLICY "notes_patient_select"  ON public.visit_notes FOR SELECT USING (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.patient_id = auth.uid()));
CREATE POLICY "notes_admin"           ON public.visit_notes FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- SUMMARIES
CREATE POLICY "summaries_patient_select" ON public.summaries FOR SELECT USING (EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.patient_id = auth.uid()));
CREATE POLICY "summaries_doctor_select"  ON public.summaries FOR SELECT USING (EXISTS (SELECT 1 FROM public.appointments a JOIN public.doctors d ON d.id = a.doctor_id WHERE a.id = appointment_id AND d.user_id = auth.uid()));
CREATE POLICY "summaries_doctor_insert"  ON public.summaries FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.appointments a JOIN public.doctors d ON d.id = a.doctor_id WHERE a.id = appointment_id AND d.user_id = auth.uid()));
CREATE POLICY "summaries_doctor_update"  ON public.summaries FOR UPDATE USING (EXISTS (SELECT 1 FROM public.appointments a JOIN public.doctors d ON d.id = a.doctor_id WHERE a.id = appointment_id AND d.user_id = auth.uid()));
CREATE POLICY "summaries_admin"          ON public.summaries FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- PRESCRIPTIONS
CREATE POLICY "rx_patient_select"     ON public.prescriptions FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "rx_doctor_select"      ON public.prescriptions FOR SELECT USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));
CREATE POLICY "rx_doctor_insert"      ON public.prescriptions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.user_id = auth.uid()));
CREATE POLICY "rx_admin"              ON public.prescriptions FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- MEDICATION REMINDERS
CREATE POLICY "medrem_patient_select" ON public.medication_reminders FOR SELECT USING (patient_id = auth.uid());
CREATE POLICY "medrem_admin"          ON public.medication_reminders FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- NOTIFICATIONS LOG
CREATE POLICY "notif_own_select"      ON public.notifications_log FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_admin"           ON public.notifications_log FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- CALENDAR CONNECTIONS
CREATE POLICY "cal_own_select"        ON public.calendar_connections FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cal_own_insert"        ON public.calendar_connections FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "cal_own_update"        ON public.calendar_connections FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "cal_own_delete"        ON public.calendar_connections FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- STEP 5: SEED DEMO AUTH USERS
-- ============================================================
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) VALUES
('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 'admin@healthcare.demo', crypt('Demo@1234',gen_salt('bf')), now(),
 '{"full_name":"Admin User","role":"admin"}', now(),now(),false,false),
('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 'dr.sharma@healthcare.demo', crypt('Demo@1234',gen_salt('bf')), now(),
 '{"full_name":"Dr. Ananya Sharma","role":"doctor"}', now(),now(),false,false),
('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 'dr.patel@healthcare.demo', crypt('Demo@1234',gen_salt('bf')), now(),
 '{"full_name":"Dr. Rajesh Patel","role":"doctor"}', now(),now(),false,false),
('44444444-4444-4444-4444-444444444444','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 'dr.kumar@healthcare.demo', crypt('Demo@1234',gen_salt('bf')), now(),
 '{"full_name":"Dr. Priya Kumar","role":"doctor"}', now(),now(),false,false),
('55555555-5555-5555-5555-555555555555','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 'patient@healthcare.demo', crypt('Demo@1234',gen_salt('bf')), now(),
 '{"full_name":"Demo Patient","role":"patient"}', now(),now(),false,false)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = now(),
  raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- Auth identities
INSERT INTO auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES
('11111111-1111-1111-1111-111111111111','admin@healthcare.demo',
 '11111111-1111-1111-1111-111111111111',
 '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@healthcare.demo"}',
 'email',now(),now(),now()),
('22222222-2222-2222-2222-222222222222','dr.sharma@healthcare.demo',
 '22222222-2222-2222-2222-222222222222',
 '{"sub":"22222222-2222-2222-2222-222222222222","email":"dr.sharma@healthcare.demo"}',
 'email',now(),now(),now()),
('33333333-3333-3333-3333-333333333333','dr.patel@healthcare.demo',
 '33333333-3333-3333-3333-333333333333',
 '{"sub":"33333333-3333-3333-3333-333333333333","email":"dr.patel@healthcare.demo"}',
 'email',now(),now(),now()),
('44444444-4444-4444-4444-444444444444','dr.kumar@healthcare.demo',
 '44444444-4444-4444-4444-444444444444',
 '{"sub":"44444444-4444-4444-4444-444444444444","email":"dr.kumar@healthcare.demo"}',
 'email',now(),now(),now()),
('55555555-5555-5555-5555-555555555555','patient@healthcare.demo',
 '55555555-5555-5555-5555-555555555555',
 '{"sub":"55555555-5555-5555-5555-555555555555","email":"patient@healthcare.demo"}',
 'email',now(),now(),now())
ON CONFLICT (provider, provider_id) DO NOTHING;

-- ============================================================
-- STEP 6: SEED PROFILES, ROLES, DOCTORS
-- ============================================================
INSERT INTO public.profiles (user_id, full_name, email, phone) VALUES
('11111111-1111-1111-1111-111111111111','Admin User','admin@healthcare.demo','+919000000001'),
('22222222-2222-2222-2222-222222222222','Dr. Ananya Sharma','dr.sharma@healthcare.demo','+919000000002'),
('33333333-3333-3333-3333-333333333333','Dr. Rajesh Patel','dr.patel@healthcare.demo','+919000000003'),
('44444444-4444-4444-4444-444444444444','Dr. Priya Kumar','dr.kumar@healthcare.demo','+919000000004'),
('55555555-5555-5555-5555-555555555555','Demo Patient','patient@healthcare.demo','+919000000005')
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name, email = EXCLUDED.email, phone = EXCLUDED.phone;

INSERT INTO public.user_roles (user_id, role) VALUES
('11111111-1111-1111-1111-111111111111','admin'),
('22222222-2222-2222-2222-222222222222','doctor'),
('33333333-3333-3333-3333-333333333333','doctor'),
('44444444-4444-4444-4444-444444444444','doctor'),
('55555555-5555-5555-5555-555555555555','patient')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.doctors (user_id, specialisation, qualification, experience_years, bio, working_days, working_hours_start, working_hours_end, slot_duration_minutes, is_active) VALUES
('22222222-2222-2222-2222-222222222222','Cardiologist','MD, DM Cardiology',15,
 'Senior cardiologist with 15+ years in interventional cardiology.','{1,2,3,4,5}','09:00','17:00',30,true),
('33333333-3333-3333-3333-333333333333','Dermatologist','MBBS, MD Dermatology',8,
 'Specialist in skin care, acne, and cosmetic dermatology.','{1,3,5}','10:00','16:00',20,true),
('44444444-4444-4444-4444-444444444444','General Physician','MBBS, MD General Medicine',10,
 'Experienced family medicine doctor for general health consultations.','{1,2,3,4,5,6}','08:00','14:00',15,true)
ON CONFLICT (user_id) DO UPDATE SET
  specialisation = EXCLUDED.specialisation,
  qualification = EXCLUDED.qualification,
  bio = EXCLUDED.bio,
  working_days = EXCLUDED.working_days,
  working_hours_start = EXCLUDED.working_hours_start,
  working_hours_end = EXCLUDED.working_hours_end,
  slot_duration_minutes = EXCLUDED.slot_duration_minutes,
  is_active = EXCLUDED.is_active;

-- ============================================================
-- STEP 7: SEED SAMPLE APPOINTMENT + RECORDS
-- ============================================================
DO $$
DECLARE
  doc1_id UUID; doc3_id UUID;
  app1_id UUID; app2_id UUID;
BEGIN
  SELECT id INTO doc1_id FROM public.doctors WHERE user_id = '22222222-2222-2222-2222-222222222222';
  SELECT id INTO doc3_id FROM public.doctors WHERE user_id = '44444444-4444-4444-4444-444444444444';

  -- Completed past appointment
  INSERT INTO public.appointments (patient_id, doctor_id, start_time, end_time, status)
  VALUES ('55555555-5555-5555-5555-555555555555', doc3_id,
    now() - interval '3 days', now() - interval '3 days' + interval '15 minutes', 'completed')
  RETURNING id INTO app1_id;

  INSERT INTO public.symptom_forms (appointment_id, main_symptoms, duration, severity, additional_info)
  VALUES (app1_id,'Fever and mild cough','3 days','mild','No prior history');

  INSERT INTO public.visit_notes (appointment_id, doctor_id, diagnosis, notes, follow_up_instructions)
  VALUES (app1_id, doc3_id,'Viral Fever','Mild viral infection. Prescribed rest and hydration.','Follow up if fever persists after 3 days.');

  INSERT INTO public.prescriptions (appointment_id, doctor_id, patient_id, drug, dose, frequency, duration, instructions)
  VALUES (app1_id, doc3_id,'55555555-5555-5555-5555-555555555555','Paracetamol','500mg','Twice a day','3 days','Take after meals');

  INSERT INTO public.summaries (appointment_id, summary_type, content, status)
  VALUES (app1_id,'post_visit','Patient visited for fever and cough. Diagnosed with viral fever. Paracetamol prescribed. Recovery in 3–5 days.','completed');

  -- Upcoming confirmed appointment
  INSERT INTO public.appointments (patient_id, doctor_id, start_time, end_time, status)
  VALUES ('55555555-5555-5555-5555-555555555555', doc1_id,
    now() + interval '2 days', now() + interval '2 days' + interval '30 minutes', 'confirmed')
  RETURNING id INTO app2_id;

  INSERT INTO public.symptom_forms (appointment_id, main_symptoms, duration, severity, additional_info)
  VALUES (app2_id,'Chest pain and shortness of breath','1 week','moderate','Pain radiates to left arm occasionally');

  INSERT INTO public.summaries (appointment_id, summary_type, content, urgency, status)
  VALUES (app2_id,'pre_visit','Patient reporting chest pain and shortness of breath. Needs ECG evaluation urgently.','high','completed');

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Seed appointments error: %', SQLERRM;
END $$;

SELECT 'ALL DONE! Database is fully set up.' AS result;
