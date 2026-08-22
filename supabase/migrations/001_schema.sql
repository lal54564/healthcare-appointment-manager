-- ==========================================
-- Healthcare Appointment & Follow-up Manager
-- Database Schema (Supabase)
-- ==========================================

-- Enable the pgcrypto extension for gen_random_uuid() if not already available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- Functions (Utility)
-- ==========================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Tables
-- ==========================================

-- profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    date_of_birth DATE,
    gender TEXT,
    address TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- user_roles
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','doctor','patient')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role)
);
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- doctors
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    specialisation TEXT NOT NULL,
    qualification TEXT,
    experience_years INT DEFAULT 0,
    bio TEXT,
    working_days INT[] NOT NULL DEFAULT '{1,2,3,4,5}',
    working_hours_start TIME NOT NULL DEFAULT '09:00',
    working_hours_end TIME NOT NULL DEFAULT '17:00',
    slot_duration_minutes INT NOT NULL DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

-- doctor_leave
CREATE TABLE doctor_leave (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE NOT NULL,
    leave_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(doctor_id, leave_date)
);
ALTER TABLE doctor_leave ENABLE ROW LEVEL SECURITY;

-- appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held','confirmed','completed','cancelled','rescheduled')),
    cancellation_reason TEXT,
    rescheduled_from UUID REFERENCES appointments(id) ON DELETE SET NULL,
    hold_expires_at TIMESTAMPTZ,
    calendar_event_id_patient TEXT,
    calendar_event_id_doctor TEXT,
    calendar_sync_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- symptom_forms
CREATE TABLE symptom_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE UNIQUE NOT NULL,
    main_symptoms TEXT NOT NULL,
    duration TEXT,
    severity TEXT CHECK (severity IN ('mild','moderate','severe')),
    additional_info TEXT,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE symptom_forms ENABLE ROW LEVEL SECURITY;

-- visit_notes
CREATE TABLE visit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE NOT NULL,
    diagnosis TEXT,
    notes TEXT NOT NULL,
    follow_up_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE visit_notes ENABLE ROW LEVEL SECURITY;

-- summaries
CREATE TABLE summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
    summary_type TEXT NOT NULL CHECK (summary_type IN ('pre_visit','post_visit')),
    content TEXT,
    urgency TEXT CHECK (urgency IN ('low','medium','high')),
    chief_complaint TEXT,
    suggested_questions TEXT[],
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- prescriptions
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    drug TEXT NOT NULL,
    dose TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- medication_reminders
CREATE TABLE medication_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
    retry_count INT DEFAULT 0,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE medication_reminders ENABLE ROW LEVEL SECURITY;

-- notifications_log
CREATE TABLE notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('booking_confirmation','appointment_reminder','cancellation','rescheduling','leave_conflict','medication_reminder')),
    recipient TEXT NOT NULL,
    subject TEXT,
    body TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
    attempt_count INT DEFAULT 0,
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- calendar_connections
CREATE TABLE calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    provider TEXT NOT NULL DEFAULT 'google',
    access_token TEXT,
    refresh_token TEXT,
    token_expiry TIMESTAMPTZ,
    calendar_id TEXT,
    connection_status TEXT NOT NULL DEFAULT 'disconnected' CHECK (connection_status IN ('connected','disconnected','expired','error')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- Triggers for updated_at
-- ==========================================

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_symptom_forms_updated_at BEFORE UPDATE ON symptom_forms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visit_notes_updated_at BEFORE UPDATE ON visit_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_connections_updated_at BEFORE UPDATE ON calendar_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==========================================
-- Indexes
-- ==========================================

CREATE UNIQUE INDEX idx_no_double_booking ON appointments(doctor_id, start_time) WHERE status IN ('held', 'confirmed');
CREATE INDEX idx_appointments_doctor_time ON appointments(doctor_id, start_time);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_status ON appointments(status);

CREATE INDEX idx_notifications_log_status_retry ON notifications_log(status, next_retry_at);
CREATE INDEX idx_summaries_status_retry ON summaries(status, next_retry_at);
CREATE INDEX idx_medication_reminders_status_time ON medication_reminders(status, scheduled_time);
CREATE INDEX idx_doctor_leave_doc_date ON doctor_leave(doctor_id, leave_date);


-- ==========================================
-- Functions (Business Logic)
-- ==========================================

-- has_role
CREATE OR REPLACE FUNCTION has_role(user_uuid UUID, check_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = user_uuid AND role = check_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_user_role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    found_role TEXT;
BEGIN
    SELECT role INTO found_role FROM user_roles WHERE user_id = user_uuid LIMIT 1;
    RETURN found_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- cleanup_expired_holds
CREATE OR REPLACE FUNCTION cleanup_expired_holds()
RETURNS void AS $$
BEGIN
    UPDATE appointments
    -- Change status to cancelled for expired holds
    SET status = 'cancelled', cancellation_reason = 'Hold expired'
    WHERE status = 'held' AND hold_expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Trigger: Handle new user
-- ==========================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
