-- ==========================================
-- FIX: Trigger + RLS so profile full_name is always saved
-- Run this in Supabase SQL Editor → New Query
-- ==========================================

-- Allow authenticated users to update their OWN profile (full_name fix)
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to insert their own profile (in case trigger missed it)
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow doctors to insert their own record (for self-registration)
DROP POLICY IF EXISTS "doctors_insert_own" ON public.doctors;
CREATE POLICY "doctors_insert_own" ON public.doctors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow doctors to update their own record
DROP POLICY IF EXISTS "doctors_update_own_record" ON public.doctors;
CREATE POLICY "doctors_update_own_record" ON public.doctors
  FOR UPDATE USING (auth.uid() = user_id);

SELECT 'RLS policies updated!' AS result;
