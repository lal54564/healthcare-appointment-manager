export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startTime: Date | string;
  endTime: Date | string;
  location?: string;
}

export class MockCalendarService {
  async getAuthUrl(userId: string): Promise<string> {
    console.log(\`[Mock Calendar] Generating auth URL for user \${userId}\`);
    return \`http://localhost:3000/auth/calendar/callback?mock=true\`;
  }

  async handleCallback(code: string, userId: string): Promise<boolean> {
    console.log(\`[Mock Calendar] Handling callback for user \${userId} with code \${code}\`);
    return true;
  }

  async createEvent(userId: string, event: CalendarEvent): Promise<string> {
    console.log(\`[Mock Calendar] Creating event for user \${userId}\`, event);
    return \`mock-event-\${Date.now()}\`;
  }

  async updateEvent(userId: string, eventId: string, event: CalendarEvent): Promise<boolean> {
    console.log(\`[Mock Calendar] Updating event \${eventId} for user \${userId}\`, event);
    return true;
  }

  async deleteEvent(userId: string, eventId: string): Promise<boolean> {
    console.log(\`[Mock Calendar] Deleting event \${eventId} for user \${userId}\`);
    return true;
  }

  async refreshToken(userId: string): Promise<boolean> {
    console.log(\`[Mock Calendar] Refreshing token for user \${userId}\`);
    return true;
  }

  async isConnected(userId: string): Promise<boolean> {
    console.log(\`[Mock Calendar] Checking connection for user \${userId}\`);
    return true;
  }
}
