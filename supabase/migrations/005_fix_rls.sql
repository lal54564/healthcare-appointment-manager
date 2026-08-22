-- ==========================================
-- FIX: RLS Policies & Registration Issues
-- Run this in Supabase SQL Editor
-- ==========================================

-- FIX 1: Fix the profiles read policy (was comparing wrong column)
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile" ON profiles
FOR SELECT USING (auth.uid() = user_id);

-- FIX 2: Fix the profiles update policy (was comparing wrong column)
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile" ON profiles
FOR UPDATE USING (auth.uid() = user_id);

-- FIX 3: Allow the handle_new_user trigger to insert profiles
-- (The trigger runs as SECURITY DEFINER so this allows it to bypass RLS)
DROP POLICY IF EXISTS "service_insert_profiles" ON profiles;
CREATE POLICY "service_insert_profiles" ON profiles
FOR INSERT WITH CHECK (true);

-- FIX 4: Allow new users to insert their own role during registration
-- (Previously only admins could insert roles, which broke self-registration)
DROP POLICY IF EXISTS "admins_insert_roles" ON user_roles;
CREATE POLICY "users_insert_own_role" ON user_roles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- FIX 5: Keep admins able to manage all roles
CREATE POLICY "admins_manage_roles" ON user_roles
FOR ALL USING (has_role(auth.uid(), 'admin'));
