-- ==========================================
-- FIX: Add FK between doctors and profiles
-- so Supabase can resolve the join
-- Run this in Supabase SQL Editor → New Query
-- ==========================================

-- Add FK: doctors.user_id → profiles.user_id
-- (profiles.user_id is UNIQUE so this works)
ALTER TABLE doctors
  ADD CONSTRAINT fk_doctors_profiles
  FOREIGN KEY (user_id) REFERENCES profiles(user_id)
  ON DELETE CASCADE;

-- Add FK: appointments.patient_id → profiles.user_id
-- so "profiles!patient_id(*)" works
ALTER TABLE appointments
  ADD CONSTRAINT fk_appointments_patient_profiles
  FOREIGN KEY (patient_id) REFERENCES profiles(user_id)
  ON DELETE CASCADE;
