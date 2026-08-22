/**
 * Background Jobs Worker
 * 
 * Handles periodic background tasks:
 * 1. AI Retry Queue: Processes pending/failed AI summaries.
 * 2. Email Retry Queue: Sends pending/failed notifications via Resend.
 * 3. Calendar Sync Queue: Synchronizes appointments with Google Calendar.
 * 4. Appointment Reminders: Detects upcoming appointments (24h/1h) and queues reminder emails.
 * 5. Medication Reminders: Processes scheduled medication reminders.
 * 
 * Can be run as a cron job, serverless function, or local background loop.
 */

import { supabase, createServiceClient } from '../db/client';
import { generatePreVisitSummary, generatePostVisitSummary } from '../ai/gateway';
import { sendEmail } from '../email/resend';
import {
  bookingConfirmation,
  appointmentReminder,
  cancellationNotice,
  reschedulingNotice,
  leaveConflictNotice,
  medicationReminder,
} from '../email/templates';
import { getCalendarService } from '../calendar';
import { calculateNextRetryAt, shouldRetry } from '../retry';
import type { Database } from '../db/types';

// Use service client for background processes to bypass RLS
const db = createServiceClient();

/**
 * 1. Process AI Queue
 * Fetches summaries that are pending/failed and due for a retry.
 */
export async function processAIQueue(): Promise<void> {
  const { data: items, error } = await db
    .from('summaries')
    .select('*, appointments(*, symptom_forms(*), visit_notes(*))')
    .in('status', ['pending', 'failed'])
    .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
    .limit(10);

  if (error || !items) {
    console.error('Error fetching AI queue:', error);
    return;
  }

  for (const item of items) {
    // Mark as processing
    await db.from('summaries').update({ status: 'processing' }).eq('id', item.id);

    try {
      const appt = item.appointments;
      if (!appt) throw new Error('Appointment not found');

      if (item.summary_type === 'pre_visit') {
        const symptoms = appt.symptom_forms;
        if (!symptoms) throw new Error('Symptom form not found');
        
        const summary = await generatePreVisitSummary({
          main_symptoms: symptoms.main_symptoms,
          duration: symptoms.duration || undefined,
          severity: symptoms.severity || undefined,
          additional_info: symptoms.additional_info || undefined,
        });

        await db.from('summaries').update({
          status: 'completed',
          content: summary.chief_complaint, // map to content
          chief_complaint: summary.chief_complaint,
          urgency: summary.urgency,
          suggested_questions: summary.suggested_questions,
          error_message: null,
          updated_at: new Date().toISOString(),
        }).eq('id', item.id);

      } else {
        const note = appt.visit_notes?.[0];
        if (!note) throw new Error('Visit notes not found');

        // Fetch prescriptions for this appointment
        const { data: prescriptions } = await db
          .from('prescriptions')
          .select('*')
          .eq('appointment_id', appt.id);

        const summary = await generatePostVisitSummary({
          diagnosis: note.diagnosis || undefined,
          notes: note.notes,
          follow_up_instructions: note.follow_up_instructions || undefined,
          prescriptions: prescriptions || undefined,
        });

        await db.from('summaries').update({
          status: 'completed',
          content: summary.visit_summary, // map to content
          error_message: null,
          updated_at: new Date().toISOString(),
        }).eq('id', item.id);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const nextRetry = item.retry_count + 1;
      const canRetry = shouldRetry(nextRetry);

      await db.from('summaries').update({
        status: canRetry ? 'failed' : 'failed', // Keep failed status
        retry_count: nextRetry,
        next_retry_at: canRetry ? calculateNextRetryAt(nextRetry) : null,
        error_message: errorMsg,
        updated_at: new Date().toISOString(),
      }).eq('id', item.id);
    }
  }
}

/**
 * 2. Process Email Queue
 * Sends pending/failed email notifications.
 */
export async function processEmailQueue(): Promise<void> {
  const { data: logs, error } = await db
    .from('notifications_log')
    .select('*')
    .in('status', ['pending', 'failed'])
    .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
    .limit(10);

  if (error || !logs) {
    console.error('Error fetching email queue:', error);
    return;
  }

  for (const log of logs) {
    try {
      const result = await sendEmail({
        to: log.recipient,
        subject: log.subject || 'Healthcare Notification',
        html: log.body || '',
      });

      if (result.success) {
        await db.from('notifications_log').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempt_count: log.attempt_count + 1,
          last_error: null,
        }).eq('id', log.id);
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const nextAttempt = log.attempt_count + 1;
      const canRetry = shouldRetry(nextAttempt);

      await db.from('notifications_log').update({
        status: canRetry ? 'failed' : 'failed', // Keep failed, but schedule retry
        attempt_count: nextAttempt,
        next_retry_at: canRetry ? calculateNextRetryAt(nextAttempt) : null,
        last_error: errorMsg,
      }).eq('id', log.id);
    }
  }
}

/**
 * 3. Process Google Calendar Sync Queue
 * Synchronizes new, updated, or cancelled appointments with Google Calendar.
 */
export async function processCalendarQueue(): Promise<void> {
  const { data: appointments, error } = await db
    .from('appointments')
    .select('*, doctors(*, profiles(*))')
    .eq('calendar_sync_status', 'pending')
    .limit(10);

  if (error || !appointments) {
    console.error('Error fetching calendar sync queue:', error);
    return;
  }

  const calendarService = getCalendarService();

  for (const appt of appointments) {
    try {
      // Get patient profile
      const { data: patientProfile } = await db
        .from('profiles')
        .select('*')
        .eq('user_id', appt.patient_id)
        .single();

      const doctorName = appt.doctors?.profiles?.full_name || 'Doctor';
      const patientName = patientProfile?.full_name || 'Patient';

      const event = {
        title: `Medical Appointment - ${doctorName} & ${patientName}`,
        description: `Healthcare Consultation.\nAppointment ID: ${appt.id}\nStatus: ${appt.status}`,
        startTime: appt.start_time,
        endTime: appt.end_time,
        location: 'Clinic',
      };

      let syncStatus: 'synced' | 'failed' = 'synced';
      let patientEventId = appt.calendar_event_id_patient;
      let doctorEventId = appt.calendar_event_id_doctor;

      // 1. Sync for Patient
      try {
        if (appt.status === 'cancelled') {
          if (patientEventId) {
            await calendarService.deleteEvent(appt.patient_id, patientEventId);
            patientEventId = null;
          }
        } else if (patientEventId) {
          await calendarService.updateEvent(appt.patient_id, patientEventId, event);
        } else {
          patientEventId = await calendarService.createEvent(appt.patient_id, event);
        }
      } catch (err) {
        console.error(`Failed patient calendar sync for appt ${appt.id}:`, err);
        syncStatus = 'failed';
      }

      // 2. Sync for Doctor
      try {
        const doctorUserId = appt.doctors?.user_id;
        if (doctorUserId) {
          if (appt.status === 'cancelled') {
            if (doctorEventId) {
              await calendarService.deleteEvent(doctorUserId, doctorEventId);
              doctorEventId = null;
            }
          } else if (doctorEventId) {
            await calendarService.updateEvent(doctorUserId, doctorEventId, event);
          } else {
            doctorEventId = await calendarService.createEvent(doctorUserId, event);
          }
        }
      } catch (err) {
        console.error(`Failed doctor calendar sync for appt ${appt.id}:`, err);
        syncStatus = 'failed';
      }

      await db.from('appointments').update({
        calendar_sync_status: syncStatus,
        calendar_event_id_patient: patientEventId,
        calendar_event_id_doctor: doctorEventId,
        updated_at: new Date().toISOString(),
      }).eq('id', appt.id);

    } catch (err) {
      console.error(`Error processing calendar sync for appointment ${appt.id}:`, err);
      await db.from('appointments').update({
        calendar_sync_status: 'failed',
        updated_at: new Date().toISOString(),
      }).eq('id', appt.id);
    }
  }
}

/**
 * 4. Generate Appointment Reminders
 * Scans upcoming appointments within 24h or 1h and creates notifications logs.
 */
export async function generateAppointmentReminders(): Promise<void> {
  const now = new Date();
  
  // 24 Hours Reminder Window
  const start24h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const end24h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  
  // 1 Hour Reminder Window
  const start1h = new Date(now.getTime() + 30 * 60 * 1000);
  const end1h = new Date(now.getTime() + 90 * 60 * 1000);

  // Helper to query and queue
  const queueReminders = async (start: Date, end: Date, typeLabel: '24h' | '1h') => {
    const { data: appointments, error } = await db
      .from('appointments')
      .select('*, doctors(*, profiles(*))')
      .eq('status', 'confirmed')
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString());

    if (error || !appointments) return;

    for (const appt of appointments) {
      // Check if we already sent a reminder of this type to avoid duplicates
      const subjectMatch = `%${typeLabel} Reminder%`;
      const { data: exists } = await db
        .from('notifications_log')
        .select('id')
        .eq('appointment_id', appt.id)
        .eq('notification_type', 'appointment_reminder')
        .like('subject', subjectMatch)
        .limit(1);

      if (exists && exists.length > 0) continue; // Skip

      // Get patient profile
      const { data: patientProfile } = await db
        .from('profiles')
        .select('*')
        .eq('user_id', appt.patient_id)
        .single();

      if (!patientProfile) continue;

      const doctorName = appt.doctors?.profiles?.full_name || 'Doctor';
      const emailContent = appointmentReminder({
        patientName: patientProfile.full_name,
        doctorName,
        dateTime: appt.start_time,
        timeRemaining: typeLabel === '24h' ? '24 hours' : '1 hour',
      });

      await db.from('notifications_log').insert({
        user_id: appt.patient_id,
        appointment_id: appt.id,
        notification_type: 'appointment_reminder',
        recipient: patientProfile.email,
        subject: emailContent.subject,
        body: emailContent.html,
        status: 'pending',
      });
    }
  };

  await queueReminders(start24h, end24h, '24h');
  await queueReminders(start1h, end1h, '1h');
}

/**
 * 5. Generate Medication Reminders
 * Scans medication_reminders that are pending and due to be sent.
 */
export async function generateMedicationReminders(): Promise<void> {
  const { data: reminders, error } = await db
    .from('medication_reminders')
    .select('*, prescriptions(*, doctors(*, profiles(*)))')
    .eq('status', 'pending')
    .lte('scheduled_time', new Date().toISOString())
    .limit(20);

  if (error || !reminders) {
    console.error('Error fetching medication reminders:', error);
    return;
  }

  for (const reminder of reminders) {
    try {
      const rx = reminder.prescriptions;
      if (!rx) throw new Error('Prescription not found');

      // Get patient profile
      const { data: patientProfile } = await db
        .from('profiles')
        .select('*')
        .eq('user_id', reminder.patient_id)
        .single();

      if (!patientProfile) throw new Error('Patient profile not found');

      const emailContent = medicationReminder({
        patientName: patientProfile.full_name,
        drug: rx.drug,
        dose: rx.dose,
        frequency: rx.frequency,
        instructions: rx.instructions || undefined,
      });

      // Insert directly into notifications log to be sent by email queue
      await db.from('notifications_log').insert({
        user_id: reminder.patient_id,
        notification_type: 'medication_reminder',
        recipient: patientProfile.email,
        subject: emailContent.subject,
        body: emailContent.html,
        status: 'pending',
      });

      // Update reminder status to sent
      await db.from('medication_reminders').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).eq('id', reminder.id);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const nextAttempt = reminder.retry_count + 1;
      const canRetry = shouldRetry(nextAttempt);

      await db.from('medication_reminders').update({
        status: canRetry ? 'pending' : 'failed',
        retry_count: nextAttempt,
      }).eq('id', reminder.id);
    }
  }
}

/**
 * Run all queues sequentially
 */
export async function runAllJobs(): Promise<void> {
  console.log('[Worker] Starting background jobs processing...');
  await processAIQueue();
  await processEmailQueue();
  await processCalendarQueue();
  await generateAppointmentReminders();
  await generateMedicationReminders();
  console.log('[Worker] Background jobs processing complete.');
}
