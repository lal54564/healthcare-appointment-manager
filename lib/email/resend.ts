export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResponse {
  success: boolean;
  error?: string;
  messageId?: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResponse> {
  if (!RESEND_API_KEY) {
    console.log('[DEV] Email Mock:');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Html length: ${options.html.length}`);
    return { success: true, messageId: 'mock-id-' + Date.now() };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Healthcare Appointment Manager <noreply@yourdomain.com>',
        ...options,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      console.error('Resend API error:', data);
      return { success: false, error: data.message || 'Failed to send email' };
    }

    const data = await res.json();
    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error('Email send failed:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}
