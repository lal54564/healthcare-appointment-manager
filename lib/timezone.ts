/**
 * Timezone Configuration
 * 
 * Single source of truth for timezone handling across the application.
 * All timestamps are stored in UTC in the database.
 * This module handles conversion to/from the clinic's local timezone for display.
 */

// Clinic timezone - configurable via environment variable
const rawTz = typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLINIC_TIMEZONE
    ? import.meta.env.VITE_CLINIC_TIMEZONE
    : 'Asia/Kolkata';

// Strip quotes and whitespace in case of accidental bad formatting in Vercel env vars
export const CLINIC_TIMEZONE = (rawTz || 'Asia/Kolkata').replace(/^["']|["']$/g, '').trim();

/**
 * Format a UTC date to the clinic's local timezone for display
 */
export function formatToClinicTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  return d.toLocaleString('en-IN', { ...defaultOptions, ...options });
}

/**
 * Format a UTC date to clinic date only (no time)
 */
export function formatToClinicDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a UTC date to clinic time only (no date)
 */
export function formatToClinicTimeOnly(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-IN', {
    timeZone: CLINIC_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get the current date in the clinic timezone as YYYY-MM-DD string
 */
export function getClinicToday(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Convert a clinic-local date and time to a UTC Date object
 * @param dateStr - Date string in YYYY-MM-DD format (clinic timezone)
 * @param timeStr - Time string in HH:MM format (clinic timezone)
 */
export function clinicTimeToUTC(dateStr: string, timeStr: string): Date {
  // Create a date string that JavaScript can parse with timezone info
  const clinicDateTimeStr = `${dateStr}T${timeStr}:00`;
  
  // Use Intl to figure out the UTC offset for the clinic timezone at this date/time
  const tempDate = new Date(clinicDateTimeStr + 'Z');
  const utcStr = tempDate.toLocaleString('en-US', { timeZone: 'UTC' });
  const clinicStr = tempDate.toLocaleString('en-US', { timeZone: CLINIC_TIMEZONE });
  
  const utcDate = new Date(utcStr);
  const clinicDate = new Date(clinicStr);
  const offsetMs = clinicDate.getTime() - utcDate.getTime();
  
  const localDate = new Date(clinicDateTimeStr);
  return new Date(localDate.getTime() - offsetMs);
}

/**
 * Get day of week (1=Monday, 7=Sunday) for a date in clinic timezone
 */
export function getClinicDayOfWeek(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dayStr = d.toLocaleDateString('en-US', {
    timeZone: CLINIC_TIMEZONE,
    weekday: 'short',
  });
  const dayMap: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
  };
  return dayMap[dayStr] || 0;
}

/**
 * Format relative time (e.g., "in 2 hours", "3 days ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMins) < 1) return 'just now';
  if (Math.abs(diffMins) < 60) {
    return diffMins > 0 ? `in ${diffMins} min` : `${Math.abs(diffMins)} min ago`;
  }
  if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
  }
  return diffDays > 0 ? `in ${diffDays}d` : `${Math.abs(diffDays)}d ago`;
}
