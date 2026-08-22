-- ============================================================
-- 012_fix_timezone.sql
-- Fix get_available_slots() to treat working hours as IST
-- Run in Supabase SQL Editor if 003_functions.sql was already applied
-- ============================================================

CREATE OR REPLACE FUNCTION get_available_slots(
    p_doctor_id UUID,
    p_date DATE,
    p_requesting_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    slot_start TIMESTAMPTZ,
    slot_end TIMESTAMPTZ,
    is_available BOOLEAN,
    is_held BOOLEAN,
    held_by_current_user BOOLEAN
) AS $$
DECLARE
    v_doctor RECORD;
    v_day_of_week INT;
    v_slot_start TIMESTAMPTZ;
    v_slot_end TIMESTAMPTZ;
    v_working_start TIMESTAMPTZ;
    v_working_end TIMESTAMPTZ;
BEGIN
    SELECT d.* INTO v_doctor FROM doctors d WHERE d.id = p_doctor_id AND d.is_active = true;
    IF NOT FOUND THEN RETURN; END IF;

    IF EXISTS (SELECT 1 FROM doctor_leave dl WHERE dl.doctor_id = p_doctor_id AND dl.leave_date = p_date) THEN
        RETURN;
    END IF;

    v_day_of_week := EXTRACT(ISODOW FROM p_date);
    IF NOT (v_day_of_week = ANY(v_doctor.working_days)) THEN RETURN; END IF;

    -- FIX: interpret working hours as IST (Asia/Kolkata) not server UTC
    v_working_start := (p_date::TEXT || ' ' || v_doctor.working_hours_start)::TIMESTAMP AT TIME ZONE 'Asia/Kolkata';
    v_working_end   := (p_date::TEXT || ' ' || v_doctor.working_hours_end)::TIMESTAMP   AT TIME ZONE 'Asia/Kolkata';

    v_slot_start := v_working_start;
    WHILE v_slot_start + (v_doctor.slot_duration_minutes || ' minutes')::INTERVAL <= v_working_end LOOP
        v_slot_end := v_slot_start + (v_doctor.slot_duration_minutes || ' minutes')::INTERVAL;
        IF v_slot_start > now() THEN
            RETURN QUERY SELECT
                v_slot_start, v_slot_end,
                NOT EXISTS (SELECT 1 FROM appointments a WHERE a.doctor_id = p_doctor_id AND a.start_time = v_slot_start AND a.status IN ('confirmed','held') AND (a.status != 'held' OR a.hold_expires_at > now())) AS is_available,
                EXISTS     (SELECT 1 FROM appointments a WHERE a.doctor_id = p_doctor_id AND a.start_time = v_slot_start AND a.status = 'held' AND a.hold_expires_at > now()) AS is_held,
                COALESCE(EXISTS(SELECT 1 FROM appointments a WHERE a.doctor_id = p_doctor_id AND a.start_time = v_slot_start AND a.status = 'held' AND a.hold_expires_at > now() AND a.patient_id = p_requesting_user_id), false) AS held_by_current_user;
        END IF;
        v_slot_start := v_slot_end;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'get_available_slots() updated to Asia/Kolkata timezone.' AS result;
