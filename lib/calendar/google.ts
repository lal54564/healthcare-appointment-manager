import { supabaseAdmin } from '../db/client';

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startTime: Date | string;
  endTime: Date | string;
  location?: string;
}

export class GoogleCalendarService {
  private clientId = process.env.GOOGLE_CLIENT_ID;
  private clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  private redirectUrl = process.env.GOOGLE_REDIRECT_URL;

  async getAuthUrl(userId: string): Promise<string> {
    // Generates an OAuth URL for the user
    return \`https://accounts.google.com/o/oauth2/v2/auth?client_id=\${this.clientId}&redirect_uri=\${this.redirectUrl}&response_type=code&scope=https://www.googleapis.com/auth/calendar.events&state=\${userId}\`;
  }

  async handleCallback(code: string, userId: string): Promise<boolean> {
    try {
      // Mocked for now - this would use the real OAuth client
      const tokens = { access_token: 'acc_token', refresh_token: 'ref_token', expiry_date: Date.now() + 3600000 };
      
      const { error } = await supabaseAdmin
        .from('calendar_connections')
        .upsert({ 
          user_id: userId, 
          provider: 'google',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(tokens.expiry_date).toISOString()
        });

      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Failed to handle google callback:', e);
      return false;
    }
  }

  async createEvent(userId: string, event: CalendarEvent): Promise<string> {
    try {
      // Stub for creating Google event
      return \`google-event-\${Date.now()}\`;
    } catch (e) {
      console.error('Failed to create google event:', e);
      throw e;
    }
  }

  async updateEvent(userId: string, eventId: string, event: CalendarEvent): Promise<boolean> {
    try {
      // Stub for updating Google event
      return true;
    } catch (e) {
      console.error('Failed to update google event:', e);
      return false;
    }
  }

  async deleteEvent(userId: string, eventId: string): Promise<boolean> {
    try {
      // Stub for deleting Google event
      return true;
    } catch (e) {
      console.error('Failed to delete google event:', e);
      return false;
    }
  }

  async refreshToken(userId: string): Promise<boolean> {
    // Stub to refresh token logic
    return true;
  }

  async isConnected(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('calendar_connections')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .single();
        
      return !!data && !error;
    } catch (e) {
      return false;
    }
  }
}
