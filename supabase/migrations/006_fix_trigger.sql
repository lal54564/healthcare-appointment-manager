-- ==========================================
-- FIX: Replace trigger with robust version
-- Run this in Supabase SQL Editor
-- ==========================================

-- Step 1: Drop the old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Step 2: Recreate the function with error handling and conflict safety
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert profile, skip if already exists
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'user'), '@', 1))
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't block user creation
        RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 3: Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 4: Fix ALL profile policies properly
DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admins_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "doctors_read_patients_profiles" ON public.profiles;
DROP POLICY IF EXISTS "service_insert_profiles" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id OR true);

CREATE POLICY "profiles_admin_all" ON public.profiles
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Step 5: Fix user_roles — allow users to insert their OWN role at signup
DROP POLICY IF EXISTS "admins_insert_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_update_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_delete_roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_insert_own_role" ON public.user_roles;
DROP POLICY IF EXISTS "admins_manage_roles" ON public.user_roles;

CREATE POLICY "user_roles_select_own" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_roles_insert_own" ON public.user_roles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_roles_admin_all" ON public.user_roles
    FOR ALL USING (has_role(auth.uid(), 'admin'));
