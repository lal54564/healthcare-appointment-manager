# API Documentation

## Server Functions / RPCs

### `get_available_slots`
- **Purpose**: Retrieves available appointment slots for a specific doctor on a given date.
- **Authentication**: Required (Patient, Doctor, Admin)
- **Input Parameters**:
  | Parameter | Type | Description |
  |---|---|---|
  | `p_doctor_id` | UUID | The ID of the doctor. |
  | `p_date` | Date | The date to check for availability. |
- **Output**: List of available time slots (Array of Timestamps).
- **Error Cases**: Invalid doctor ID, past date.
- **Authorization**: Any authenticated user.

### `hold_slot`
- **Purpose**: Places a temporary hold on a time slot to prevent double-booking while a patient completes the booking process.
- **Authentication**: Required (Patient, Admin)
- **Input Parameters**:
  | Parameter | Type | Description |
  |---|---|---|
  | `p_doctor_id` | UUID | The ID of the doctor. |
  | `p_start_time` | Timestamp | The requested slot start time. |
- **Output**: Boolean (true if successful, false if already held or booked).
- **Error Cases**: Slot unavailable, user already has a hold.
- **Authorization**: Patient, Admin.

### `confirm_appointment`
- **Purpose**: Confirms an appointment from a held slot.
- **Authentication**: Required (Patient, Admin)
- **Input Parameters**:
  | Parameter | Type | Description |
  |---|---|---|
  | `p_appointment_id` | UUID | The ID of the held appointment. |
- **Output**: Updated appointment object.
- **Error Cases**: Hold expired, appointment not found.
- **Authorization**: Owner of the appointment or Admin.

### `cancel_appointment`
- **Purpose**: Cancels an upcoming appointment.
- **Authentication**: Required (Patient, Doctor, Admin)
- **Input Parameters**:
  | Parameter | Type | Description |
  |---|---|---|
  | `p_appointment_id` | UUID | The ID of the appointment to cancel. |
- **Output**: Boolean (true if successful).
- **Error Cases**: Appointment already cancelled, appointment in the past.
- **Authorization**: Owner, assigned Doctor, or Admin.

### `reschedule_appointment`
- **Purpose**: Reschedules an existing appointment to a new time.
- **Authentication**: Required (Patient, Admin)
- **Input Parameters**:
  | Parameter | Type | Description |
  |---|---|---|
  | `p_appointment_id` | UUID | The appointment ID. |
  | `p_new_start_time` | Timestamp | The new requested slot. |
- **Output**: Updated appointment object.
- **Error Cases**: New slot unavailable, past appointment.
- **Authorization**: Owner of the appointment or Admin.

### `complete_appointment`
- **Purpose**: Marks an appointment as completed (usually done by the doctor after the visit).
- **Authentication**: Required (Doctor, Admin)
- **Input Parameters**:
  | Parameter | Type | Description |
  |---|---|---|
  | `p_appointment_id` | UUID | The appointment ID. |
- **Output**: Boolean (true if successful).
- **Error Cases**: Appointment already completed, future appointment.
- **Authorization**: Assigned Doctor or Admin.

### `detect_leave_conflicts`
- **Purpose**: Identifies appointments that conflict with newly added doctor leave.
- **Authentication**: Required (Doctor, Admin)
- **Input Parameters**:
  | Parameter | Type | Description |
  |---|---|---|
  | `p_doctor_id` | UUID | The doctor ID. |
  | `p_leave_start` | Timestamp | Start of leave. |
  | `p_leave_end` | Timestamp | End of leave. |
- **Output**: List of conflicting appointment IDs.
- **Error Cases**: Invalid dates.
- **Authorization**: Assigned Doctor or Admin.

### `search_doctors`
- **Purpose**: Searches for doctors based on criteria (specialty, name).
- **Authentication**: Not required.
- **Input Parameters**:
  | Parameter | Type | Description |
  |---|---|---|
  | `p_query` | String | Search query. |
  | `p_specialty` | String | (Optional) Specialty filter. |
- **Output**: List of doctor profiles.
- **Error Cases**: None.
- **Authorization**: Public.

### `has_role`
- **Purpose**: Checks if the current user has a specific role.
- **Authentication**: Required.
- **Input Parameters**:
  | Parameter | Type | Description |
  |---|---|---|
  | `p_role` | String | The role to check (e.g., 'admin'). |
- **Output**: Boolean.
- **Error Cases**: None.
- **Authorization**: Any authenticated user.

### `get_user_role`
- **Purpose**: Retrieves the role of the current authenticated user.
- **Authentication**: Required.
- **Input Parameters**: None.
- **Output**: String (Role name).
- **Error Cases**: User not found in profiles.
- **Authorization**: Any authenticated user.

### `cleanup_expired_holds`
- **Purpose**: Clears appointment holds that have exceeded the 5-minute limit.
- **Authentication**: Required (Service Role / Cron).
- **Input Parameters**: None.
- **Output**: Number of cleared holds.
- **Error Cases**: None.
- **Authorization**: Admin / Service Role only.

## Supabase Table Operations (CRUD)

- **profiles**: Managed during signup. Users can read/update their own profiles. Admins have full access.
- **doctors**: Contains doctor-specific details (specialty, working hours). Public read access. Admin full access.
- **doctor_leave**: Doctors can add/view their own leaves. Admins have full access.
- **appointments**: Core booking table. Patients see their own, doctors see theirs, admins see all.
- **symptom_forms**: Pre-visit forms submitted by patients. Linked to appointments.
- **visit_notes**: Doctor's notes from the appointment. Restricted to assigned doctor and patient.
- **summaries**: AI-generated post-visit summaries. Visible to patient and doctor.
- **prescriptions**: Medication prescribed during a visit.
- **medication_reminders**: Reminders configured based on prescriptions. Patient access only.
- **notifications_log**: System log of emails/SMS sent. Admin access only.
- **calendar_connections**: OAuth tokens for Google Calendar sync. Restricted to the specific user.
