import { Resend } from 'resend';

export * from './templates';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends transactional email via Resend in production.
 * Falls back to console logging in development when RESEND_API_KEY is unset.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'AI JobMatch Copilot <noreply@localhost>';

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[email] RESEND_API_KEY is not set — email not sent:', { to, subject });
      return;
    }
    console.log(`\n[email] DEV — To: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, html, text });

  if (error) {
    console.error('[email] Resend error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/** Fire-and-forget email — avoids timing attacks on auth flows */
export function sendEmailAsync(input: SendEmailInput): void {
  void sendEmail(input).catch((err) => {
    console.error('[email] Async send failed:', err);
  });
}
