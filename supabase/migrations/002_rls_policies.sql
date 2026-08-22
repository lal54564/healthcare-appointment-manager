-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_leave ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 1. PROFILES POLICIES
-- ==========================================
-- Users can read their own profile
CREATE POLICY "users_read_own_profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "admins_read_all_profiles" ON profiles
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Doctors can read profiles of their patients (patients who have appointments with them)
CREATE POLICY "doctors_read_patients_profiles" ON profiles
FOR SELECT USING (
    has_role(auth.uid(), 'doctor') AND 
    EXISTS (
        SELECT 1 FROM appointments a 
        WHERE a.patient_id = profiles.id 
        AND a.doctor_id = auth.uid()
    )
);

-- ==========================================
-- 2. USER ROLES POLICIES
-- ==========================================
-- Users can read their own role
CREATE POLICY "users_read_own_role" ON user_roles
FOR SELECT USING (auth.uid() = user_id);

-- Only admins can insert/update/delete roles (for role escalation prevention)
CREATE POLICY "admins_insert_roles" ON user_roles
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_update_roles" ON user_roles
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_delete_roles" ON user_roles
FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- 3. DOCTORS POLICIES
-- ==========================================
-- Anyone authenticated can read active doctors (for doctor search)
CREATE POLICY "authenticated_read_doctors" ON doctors
FOR SELECT USING (auth.role() = 'authenticated');

-- Admins can insert/update/delete doctors
CREATE POLICY "admins_insert_doctors" ON doctors
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_update_doctors" ON doctors
FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_delete_doctors" ON doctors
FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Doctors can update their own record
CREATE POLICY "doctors_update_own_record" ON doctors
FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- 4. DOCTOR LEAVE POLICIES
-- ==========================================
-- Anyone authenticated can read doctor leave (needed for availability check)
CREATE POLICY "authenticated_read_doctor_leave" ON doctor_leave
FOR SELECT USING (auth.role() = 'authenticated');

-- Admins can insert/delete leave
CREATE POLICY "admins_insert_doctor_leave" ON doctor_leave
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_delete_doctor_leave" ON doctor_leave
FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- 5. APPOINTMENTS POLICIES
-- ==========================================
-- Patients can read their own appointments
CREATE POLICY "patients_read_own_appointments" ON appointments
FOR SELECT USING (patient_id = auth.uid());

-- Patients can insert appointments (for booking)
CREATE POLICY "patients_insert_appointments" ON appointments
FOR INSERT WITH CHECK (patient_id = auth.uid());

-- Patients can update their own appointments (for cancellation)
CREATE POLICY "patients_update_own_appointments" ON appointments
FOR UPDATE USING (patient_id = auth.uid());

-- Doctors can read appointments assigned to them
CREATE POLICY "doctors_read_own_appointments" ON appointments
FOR SELECT USING (doctor_id = auth.uid());

-- Doctors can update appointments assigned to them (for completion)
CREATE POLICY "doctors_update_own_appointments" ON appointments
FOR UPDATE USING (doctor_id = auth.uid());

-- Admins can read all appointments
CREATE POLICY "admins_read_all_appointments" ON appointments
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- 6. SYMPTOM FORMS POLICIES
-- ==========================================
-- Patients can read/insert/update symptom forms for their own appointments
CREATE POLICY "patients_manage_own_symptom_forms_select" ON symptom_forms
FOR SELECT USING (
    EXISTS (SELECT 1 FROM appointments a WHERE a.id = symptom_forms.appointment_id AND a.patient_id = auth.uid())
);

CREATE POLICY "patients_manage_own_symptom_forms_insert" ON symptom_forms
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM appointments a WHERE a.id = appointment_id AND a.patient_id = auth.uid())
);

CREATE POLICY "patients_manage_own_symptom_forms_update" ON symptom_forms
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM appointments a WHERE a.id = symptom_forms.appointment_id AND a.patient_id = auth.uid())
);

-- Doctors can read symptom forms for appointments assigned to them
CREATE POLICY "doctors_read_symptom_forms" ON symptom_forms
FOR SELECT USING (
    EXISTS (SELECT 1 FROM appointments a WHERE a.id = symptom_forms.appointment_id AND a.doctor_id = auth.uid())
);

-- Admins can read all symptom forms
CREATE POLICY "admins_read_all_symptom_forms" ON symptom_forms
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- 7. VISIT NOTES POLICIES
-- ==========================================
-- Doctors can read/insert/update visit notes for their appointments
CREATE POLICY "doctors_manage_visit_notes_select" ON visit_notes
FOR SELECT USING (
    EXISTS (SELECT 1 FROM appointments a WHERE a.id = visit_notes.appointment_id AND a.doctor_id = auth.uid())
);

CREATE POLICY "doctors_manage_visit_notes_insert" ON visit_notes
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM appointments a WHERE a.id = appointment_id AND a.doctor_id = auth.uid())
);

CREATE POLICY "doctors_manage_visit_notes_update" ON visit_notes
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM appointments a WHERE a.id = visit_notes.appointment_id AND a.doctor_id = auth.uid())
);

-- Patients can read visit notes for their own appointments
CREATE POLICY "patients_read_own_visit_notes" ON visit_notes
FOR SELECT USING (
    EXISTS (SELECT 1 FROM appointments a WHERE a.id = visit_notes.appointment_id AND a.patient_id = auth.uid())
);

-- Admins can read all visit notes
CREATE POLICY "admins_read_all_visit_notes" ON visit_notes
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- 8. SUMMARIES POLICIES
-- ==========================================
-- Patients can read summaries for their own appointments
CREATE POLICY "patients_read_own_summaries" ON summaries
FOR SELECT USING (
    EXISTS (SELECT 1 FROM appointments a WHERE a.id = summaries.appointment_id AND a.patient_id = auth.uid())
);

-- Doctors can read summaries for their appointments
CREATE POLICY "doctors_read_own_summaries" ON summaries
FOR SELECT USING (
    EXISTS (SELECT 1 FROM appointments a WHERE a.id = summaries.appointment_id AND a.doctor_id = auth.uid())
);

-- Doctors can insert/update summaries (for post-visit)
CREATE POLICY "doctors_manage_summaries_insert" ON summaries
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM appointments a WHERE a.id = appointment_id AND a.doctor_id = auth.uid())
);

CREATE POLICY "doctors_manage_summaries_update" ON summaries
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM appointments a WHERE a.id = summaries.appointment_id AND a.doctor_id = auth.uid())
);

-- Admins can read all summaries
CREATE POLICY "admins_read_all_summaries" ON summaries
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- 9. PRESCRIPTIONS POLICIES
-- ==========================================
-- Patients can read their own prescriptions
CREATE POLICY "patients_read_own_prescriptions" ON prescriptions
FOR SELECT USING (
    EXISTS (SELECT 1 FROM appointments a WHERE a.id = prescriptions.appointment_id AND a.patient_id = auth.uid())
);

-- Doctors can read/insert prescriptions for their appointments
CREATE POLICY "doctors_read_prescriptions" ON prescriptions
FOR SELECT USING (
    EXISTS (SELECT 1 FROM appointments a WHERE a.id = prescriptions.appointment_id AND a.doctor_id = auth.uid())
);

CREATE POLICY "doctors_insert_prescriptions" ON prescriptions
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM appointments a WHERE a.id = appointment_id AND a.doctor_id = auth.uid())
);

-- Admins can read all prescriptions
CREATE POLICY "admins_read_all_prescriptions" ON prescriptions
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- 10. MEDICATION REMINDERS POLICIES
-- ==========================================
-- Patients can read their own medication reminders
CREATE POLICY "patients_read_own_medication_reminders" ON medication_reminders
FOR SELECT USING (patient_id = auth.uid());

-- ==========================================
-- 11. NOTIFICATIONS LOG POLICIES
-- ==========================================
-- Users can read their own notifications
CREATE POLICY "users_read_own_notifications" ON notifications_log
FOR SELECT USING (user_id = auth.uid());

-- Admins can read all notifications
CREATE POLICY "admins_read_all_notifications" ON notifications_log
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- ==========================================
-- 12. CALENDAR CONNECTIONS POLICIES
-- ==========================================
-- Users can read/update their own calendar connection
CREATE POLICY "users_read_own_calendar_connections" ON calendar_connections
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_update_own_calendar_connections" ON calendar_connections
FOR UPDATE USING (user_id = auth.uid());

-- Users can insert their own calendar connection
CREATE POLICY "users_insert_own_calendar_connections" ON calendar_connections
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can delete their own calendar connection
CREATE POLICY "users_delete_own_calendar_connections" ON calendar_connections
FOR DELETE USING (user_id = auth.uid());
