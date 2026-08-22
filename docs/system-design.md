# System Design Document

## 1. Double-Booking Prevention
To ensure high reliability in appointment scheduling, double-booking is prevented at the database level using a partial unique index. The index is defined on `(doctor_id, start_time)` and is active only for rows where the `status` is in `('held', 'confirmed', 'completed')`. This guarantees that the database physically rejects any attempt to insert a conflicting slot. Furthermore, booking is executed via a transactional PostgreSQL function (`hold_slot`), which attempts the insert and safely handles uniqueness constraint violations by returning a failure to the client rather than causing an application crash.

## 2. Database Transaction & Concurrency Strategy
Concurrency is managed using PostgreSQL's MVCC and explicit locking where necessary. Critical operations, such as confirming a held slot or modifying inventory (slots), utilize `SELECT FOR UPDATE` to lock specific rows during a transaction. This prevents race conditions when multiple users attempt to interact with the same appointment slot simultaneously. Atomic operations are strictly enforced; a booking process (creating the appointment, logging the action, and queuing notifications) succeeds or fails as a single unit, ensuring data integrity.

## 3. Slot Holds and Expiration
When a patient selects a time slot, it is placed in a "held" state for 5 minutes to allow them time to complete the booking form (e.g., symptom input). This is tracked by the `created_at` timestamp. A background process (via Supabase pg_cron or an Edge Function trigger) routinely runs the `cleanup_expired_holds` function. This function automatically transitions any 'held' appointments older than 5 minutes to a 'cancelled' or purged state, freeing up the slot for other users without manual intervention.

## 4. Doctor Leave Conflict Detection
When a doctor schedules leave (e.g., vacation or sick leave), the system invokes the `detect_leave_conflicts` function. This function queries the `appointments` table for any 'confirmed' appointments overlapping with the leave duration (`start_time` between `leave_start` and `leave_end`). The system flags these appointments as 'needs_rescheduling' and automatically queues notifications to the affected patients, prompting them to select a new time slot.

## 5. Notification Failure Handling
Notifications (Emails via Resend, SMS) are logged in the `notifications_log` table with a 'pending' status. A background queue processor attempts to send them. If a failure occurs, the system utilizes exponential backoff for retries (e.g., 1 min, 5 mins, 15 mins). A maximum retry limit (e.g., 5 attempts) is enforced. Once the limit is reached, the status is marked as 'permanent_failure', and the error is logged for administrative review. This decouples notification latency from the main user request flow.

## 6. AI Failure Handling
AI processing (for pre-visit symptom analysis and post-visit summaries) is designed to never block the critical booking or completion paths. When data is submitted, an AI task is queued, and the UI reflects a state machine: 'pending' -> 'processing' -> 'completed' or 'failed'. If the AI service times out or errors, it falls back to safe defaults (e.g., defaulting urgency to 'moderate' or displaying raw doctor notes) while a background job retries the task. 

## 7. Google Calendar Failure Handling
Integration with Google Calendar is performed asynchronously. Upon appointment confirmation or cancellation, a sync task is placed in a queue. All calendar operations are designed to be idempotent; syncing the same appointment twice will result in an update rather than a duplicate event. If the Google API rate-limits or fails, the task relies on the shared retry queue mechanism to re-attempt the sync later, ensuring eventual consistency.

## 8. Background Retry Queues
The architecture employs three distinct background queues: AI Processing, Email Notifications, and Calendar Sync. These queues share a common retry logic engine built on top of Supabase tables and Edge Functions (triggered periodically). This shared logic handles state transitions, exponential backoff calculations, and permanent failure logging, ensuring robust asynchronous processing across the application.

## 9. RLS and Security Model
Security is enforced deep within the stack using PostgreSQL Row Level Security (RLS). Every table has strict policies. For instance, patients can only SELECT their own appointments; doctors can access records assigned to them; and admins have elevated privileges. Role checks are central to this; a `has_role` database function securely verifies the user's role stored in the `profiles` table against the `auth.uid()`. This ensures that even if the client-side is bypassed, unauthorized data access or modification is impossible at the database layer.
