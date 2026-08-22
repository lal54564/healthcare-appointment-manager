-- ==========================================
-- FIX: Trigger now creates BOTH profile AND role
-- Run this in Supabase SQL Editor → New Query
-- ==========================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Get role from metadata, default to 'patient'
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
    
    -- Ensure role is valid
    IF v_role NOT IN ('admin', 'doctor', 'patient') THEN
        v_role := 'patient';
    END IF;

    -- Create profile
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'user@x'), '@', 1))
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Create role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user error for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
