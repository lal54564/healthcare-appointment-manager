import { GoogleCalendarService, CalendarEvent as GCalendarEvent } from './google';
import { MockCalendarService } from './mock';
import { retry } from '../retry';

export type CalendarEvent = GCalendarEvent;

export function getCalendarService() {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return new GoogleCalendarService();
  }
  return new MockCalendarService();
}

export async function CalendarSyncJob(userId: string, action: 'create' | 'update' | 'delete', event: CalendarEvent, eventId?: string) {
  const service = getCalendarService();
  const connected = await service.isConnected(userId);
  
  if (!connected) return false;

  try {
    return await retry(async () => {
      switch (action) {
        case 'create':
          return await service.createEvent(userId, event);
        case 'update':
          if (!eventId) throw new Error('eventId required for update');
          return await service.updateEvent(userId, eventId, event);
        case 'delete':
          if (!eventId) throw new Error('eventId required for delete');
          return await service.deleteEvent(userId, eventId);
      }
    }, { maxRetries: 3, delayMs: 1000 });
  } catch (error) {
    console.error(\`Calendar sync job failed for action \${action}:\`, error);
    // Suppress error so it doesn't break main workflow
    return false;
  }
}
