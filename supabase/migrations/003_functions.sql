-- ==========================================
-- Server-side Booking Functions
-- 
-- ALL booking logic runs on the database server.
-- The client NEVER determines slot availability.
-- ==========================================

-- ==========================================
-- 1. Generate available slots for a doctor on a given date
-- ==========================================
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
    -- Get doctor info
    SELECT d.* INTO v_doctor
    FROM doctors d
    WHERE d.id = p_doctor_id AND d.is_active = true;

    IF NOT FOUND THEN
        RETURN; -- No slots for inactive/nonexistent doctor
    END IF;

    -- Check if doctor is on leave
    IF EXISTS (
        SELECT 1 FROM doctor_leave dl
        WHERE dl.doctor_id = p_doctor_id AND dl.leave_date = p_date
    ) THEN
        RETURN; -- No slots on leave days
    END IF;

    -- Check day of week (1=Mon, 7=Sun using ISO)
    v_day_of_week := EXTRACT(ISODOW FROM p_date);
    
    IF NOT (v_day_of_week = ANY(v_doctor.working_days)) THEN
        RETURN; -- Not a working day
    END IF;

    -- Calculate working hours for this date in IST (Asia/Kolkata, UTC+5:30)
    -- Using AT TIME ZONE ensures the times are interpreted as IST regardless of
    -- the DB server's own timezone setting (which is typically UTC on Supabase).
    v_working_start := (p_date::TEXT || ' ' || v_doctor.working_hours_start)::TIMESTAMP
                       AT TIME ZONE 'Asia/Kolkata';
    v_working_end   := (p_date::TEXT || ' ' || v_doctor.working_hours_end)::TIMESTAMP
                       AT TIME ZONE 'Asia/Kolkata';


    -- Generate slots
    v_slot_start := v_working_start;
    WHILE v_slot_start + (v_doctor.slot_duration_minutes || ' minutes')::INTERVAL <= v_working_end LOOP
        v_slot_end := v_slot_start + (v_doctor.slot_duration_minutes || ' minutes')::INTERVAL;

        -- Skip slots in the past
        IF v_slot_start > now() THEN
            RETURN QUERY
            SELECT
                v_slot_start,
                v_slot_end,
                -- Available if no confirmed/held appointment exists
                NOT EXISTS (
                    SELECT 1 FROM appointments a
                    WHERE a.doctor_id = p_doctor_id
                    AND a.start_time = v_slot_start
                    AND a.status IN ('confirmed', 'held')
                    AND (a.status != 'held' OR a.hold_expires_at > now())
                ) AS is_available,
                -- Check if held
                EXISTS (
                    SELECT 1 FROM appointments a
                    WHERE a.doctor_id = p_doctor_id
                    AND a.start_time = v_slot_start
                    AND a.status = 'held'
                    AND a.hold_expires_at > now()
                ) AS is_held,
                -- Check if held by requesting user
                COALESCE(
                    EXISTS (
                        SELECT 1 FROM appointments a
                        WHERE a.doctor_id = p_doctor_id
                        AND a.start_time = v_slot_start
                        AND a.status = 'held'
                        AND a.hold_expires_at > now()
                        AND a.patient_id = p_requesting_user_id
                    ),
                    false
                ) AS held_by_current_user;
        END IF;

        v_slot_start := v_slot_end;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 2. Hold a slot (temporary reservation)
-- ==========================================
CREATE OR REPLACE FUNCTION hold_slot(
    p_doctor_id UUID,
    p_patient_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_hold_duration_minutes INT DEFAULT 5
)
RETURNS TABLE (
    appointment_id UUID,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_doctor RECORD;
    v_appointment_id UUID;
    v_date DATE;
    v_day_of_week INT;
BEGIN
    -- Clean up expired holds first
    PERFORM cleanup_expired_holds();

    -- Validate doctor exists and is active
    SELECT * INTO v_doctor FROM doctors WHERE id = p_doctor_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Doctor not found or inactive'::TEXT;
        RETURN;
    END IF;

    -- Validate slot timing
    v_date := p_start_time::DATE;
    v_day_of_week := EXTRACT(ISODOW FROM v_date);

    -- Check working day
    IF NOT (v_day_of_week = ANY(v_doctor.working_days)) THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Doctor does not work on this day'::TEXT;
        RETURN;
    END IF;

    -- Check leave
    IF EXISTS (SELECT 1 FROM doctor_leave WHERE doctor_id = p_doctor_id AND leave_date = v_date) THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Doctor is on leave on this date'::TEXT;
        RETURN;
    END IF;

    -- Check slot is in the future
    IF p_start_time <= now() THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Cannot book slots in the past'::TEXT;
        RETURN;
    END IF;

    -- Check if patient already has a hold or confirmed appointment at this time
    IF EXISTS (
        SELECT 1 FROM appointments
        WHERE patient_id = p_patient_id
        AND start_time = p_start_time
        AND status IN ('confirmed', 'held')
        AND (status != 'held' OR hold_expires_at > now())
    ) THEN
        RETURN QUERY SELECT NULL::UUID, false, 'You already have an appointment at this time'::TEXT;
        RETURN;
    END IF;

    -- Attempt to insert with conflict detection via unique index
    BEGIN
        INSERT INTO appointments (
            patient_id, doctor_id, start_time, end_time,
            status, hold_expires_at
        ) VALUES (
            p_patient_id, p_doctor_id, p_start_time, p_end_time,
            'held', now() + (p_hold_duration_minutes || ' minutes')::INTERVAL
        )
        RETURNING id INTO v_appointment_id;

        RETURN QUERY SELECT v_appointment_id, true, NULL::TEXT;
    EXCEPTION
        WHEN unique_violation THEN
            RETURN QUERY SELECT NULL::UUID, false, 'This slot is no longer available'::TEXT;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 3. Confirm an appointment (from held status)
-- ==========================================
CREATE OR REPLACE FUNCTION confirm_appointment(
    p_appointment_id UUID,
    p_patient_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_appointment RECORD;
BEGIN
    -- Lock the appointment row
    SELECT * INTO v_appointment
    FROM appointments
    WHERE id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Appointment not found'::TEXT;
        RETURN;
    END IF;

    -- Verify ownership
    IF v_appointment.patient_id != p_patient_id THEN
        RETURN QUERY SELECT false, 'Unauthorized'::TEXT;
        RETURN;
    END IF;

    -- Check status
    IF v_appointment.status != 'held' THEN
        RETURN QUERY SELECT false, ('Appointment is not in held status. Current status: ' || v_appointment.status)::TEXT;
        RETURN;
    END IF;

    -- Check hold expiry
    IF v_appointment.hold_expires_at < now() THEN
        -- Mark as cancelled
        UPDATE appointments SET status = 'cancelled', cancellation_reason = 'Hold expired'
        WHERE id = p_appointment_id;
        RETURN QUERY SELECT false, 'Hold has expired. Please book again.'::TEXT;
        RETURN;
    END IF;

    -- Confirm the appointment
    UPDATE appointments
    SET status = 'confirmed',
        hold_expires_at = NULL,
        updated_at = now()
    WHERE id = p_appointment_id;

    RETURN QUERY SELECT true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 4. Cancel an appointment
-- ==========================================
CREATE OR REPLACE FUNCTION cancel_appointment(
    p_appointment_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT 'Cancelled by user'
)
RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_appointment RECORD;
    v_is_admin BOOLEAN;
    v_is_doctor BOOLEAN;
BEGIN
    -- Check if user is admin or doctor
    v_is_admin := has_role(p_user_id, 'admin');
    v_is_doctor := has_role(p_user_id, 'doctor');

    -- Lock the appointment row
    SELECT * INTO v_appointment
    FROM appointments
    WHERE id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Appointment not found'::TEXT;
        RETURN;
    END IF;

    -- Authorization check
    IF NOT v_is_admin AND NOT v_is_doctor AND v_appointment.patient_id != p_user_id THEN
        RETURN QUERY SELECT false, 'Unauthorized to cancel this appointment'::TEXT;
        RETURN;
    END IF;

    -- Check if already cancelled
    IF v_appointment.status IN ('cancelled', 'completed') THEN
        RETURN QUERY SELECT false, ('Cannot cancel appointment with status: ' || v_appointment.status)::TEXT;
        RETURN;
    END IF;

    -- Cancel the appointment
    UPDATE appointments
    SET status = 'cancelled',
        cancellation_reason = p_reason,
        updated_at = now()
    WHERE id = p_appointment_id;

    RETURN QUERY SELECT true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 5. Reschedule an appointment
-- ==========================================
CREATE OR REPLACE FUNCTION reschedule_appointment(
    p_appointment_id UUID,
    p_patient_id UUID,
    p_new_start_time TIMESTAMPTZ,
    p_new_end_time TIMESTAMPTZ
)
RETURNS TABLE (
    new_appointment_id UUID,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_old_appointment RECORD;
    v_doctor RECORD;
    v_new_id UUID;
    v_new_date DATE;
    v_day_of_week INT;
BEGIN
    -- Lock the old appointment
    SELECT * INTO v_old_appointment
    FROM appointments
    WHERE id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Appointment not found'::TEXT;
        RETURN;
    END IF;

    -- Verify ownership
    IF v_old_appointment.patient_id != p_patient_id THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Unauthorized'::TEXT;
        RETURN;
    END IF;

    -- Check status allows rescheduling
    IF v_old_appointment.status NOT IN ('confirmed', 'held') THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Cannot reschedule appointment with status: ' || v_old_appointment.status;
        RETURN;
    END IF;

    -- Validate new slot
    v_new_date := p_new_start_time::DATE;
    v_day_of_week := EXTRACT(ISODOW FROM v_new_date);

    SELECT * INTO v_doctor FROM doctors WHERE id = v_old_appointment.doctor_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Doctor is no longer active'::TEXT;
        RETURN;
    END IF;

    -- Check working day
    IF NOT (v_day_of_week = ANY(v_doctor.working_days)) THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Doctor does not work on this day'::TEXT;
        RETURN;
    END IF;

    -- Check leave
    IF EXISTS (SELECT 1 FROM doctor_leave WHERE doctor_id = v_doctor.id AND leave_date = v_new_date) THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Doctor is on leave on this date'::TEXT;
        RETURN;
    END IF;

    -- Check future
    IF p_new_start_time <= now() THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Cannot reschedule to a past time'::TEXT;
        RETURN;
    END IF;

    -- Mark old appointment as rescheduled
    UPDATE appointments
    SET status = 'rescheduled',
        updated_at = now()
    WHERE id = p_appointment_id;

    -- Create new appointment
    BEGIN
        INSERT INTO appointments (
            patient_id, doctor_id, start_time, end_time,
            status, rescheduled_from
        ) VALUES (
            p_patient_id, v_old_appointment.doctor_id,
            p_new_start_time, p_new_end_time,
            'confirmed', p_appointment_id
        )
        RETURNING id INTO v_new_id;

        RETURN QUERY SELECT v_new_id, true, NULL::TEXT;
    EXCEPTION
        WHEN unique_violation THEN
            -- Rollback the old appointment status change
            UPDATE appointments SET status = 'confirmed', updated_at = now()
            WHERE id = p_appointment_id;
            RETURN QUERY SELECT NULL::UUID, false, 'New slot is no longer available'::TEXT;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 6. Complete an appointment (doctor action)
-- ==========================================
CREATE OR REPLACE FUNCTION complete_appointment(
    p_appointment_id UUID,
    p_doctor_user_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_appointment RECORD;
    v_doctor RECORD;
BEGIN
    -- Get doctor record
    SELECT * INTO v_doctor FROM doctors WHERE user_id = p_doctor_user_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Doctor record not found'::TEXT;
        RETURN;
    END IF;

    -- Lock appointment
    SELECT * INTO v_appointment
    FROM appointments
    WHERE id = p_appointment_id AND doctor_id = v_doctor.id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Appointment not found or not assigned to you'::TEXT;
        RETURN;
    END IF;

    IF v_appointment.status != 'confirmed' THEN
        RETURN QUERY SELECT false, 'Only confirmed appointments can be completed'::TEXT;
        RETURN;
    END IF;

    UPDATE appointments
    SET status = 'completed', updated_at = now()
    WHERE id = p_appointment_id;

    RETURN QUERY SELECT true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 7. Detect leave conflicts
-- ==========================================
CREATE OR REPLACE FUNCTION detect_leave_conflicts(
    p_doctor_id UUID,
    p_leave_date DATE
)
RETURNS TABLE (
    appointment_id UUID,
    patient_id UUID,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    patient_email TEXT,
    patient_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.patient_id,
        a.start_time,
        a.end_time,
        p.email,
        p.full_name
    FROM appointments a
    JOIN profiles p ON p.user_id = a.patient_id
    WHERE a.doctor_id = p_doctor_id
    AND a.start_time::DATE = p_leave_date
    AND a.status IN ('confirmed', 'held');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 8. Search doctors with availability info
-- ==========================================
CREATE OR REPLACE FUNCTION search_doctors(
    p_search_term TEXT DEFAULT NULL,
    p_specialisation TEXT DEFAULT NULL,
    p_date DATE DEFAULT NULL
)
RETURNS TABLE (
    doctor_id UUID,
    user_id UUID,
    full_name TEXT,
    email TEXT,
    specialisation TEXT,
    qualification TEXT,
    experience_years INT,
    bio TEXT,
    slot_duration_minutes INT,
    is_active BOOLEAN,
    available_slots_count BIGINT,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id AS doctor_id,
        d.user_id,
        p.full_name,
        p.email,
        d.specialisation,
        d.qualification,
        d.experience_years,
        d.bio,
        d.slot_duration_minutes,
        d.is_active,
        CASE WHEN p_date IS NOT NULL THEN
            (SELECT COUNT(*) FROM get_available_slots(d.id, p_date) gs WHERE gs.is_available = true)
        ELSE
            0::BIGINT
        END AS available_slots_count,
        p.avatar_url
    FROM doctors d
    JOIN profiles p ON p.user_id = d.user_id
    WHERE d.is_active = true
    AND (p_search_term IS NULL OR (
        p.full_name ILIKE '%' || p_search_term || '%'
        OR d.specialisation ILIKE '%' || p_search_term || '%'
    ))
    AND (p_specialisation IS NULL OR d.specialisation ILIKE p_specialisation)
    ORDER BY p.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
