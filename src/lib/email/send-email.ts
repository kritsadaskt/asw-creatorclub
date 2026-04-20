import nodemailer from 'nodemailer';
import { resolveSmtpEnv } from './resolve-smtp-env';
import type { SendEmailOptions, SendEmailResult } from './types';

export type { SendEmailOptions, SendEmailResult } from './types';

export { isSmtpConfigured, resolveSmtpEnv } from './resolve-smtp-env';

/**
 * Sends mail via SMTP. Reusable from any Route Handler or server-only module.
 * When SMTP is not configured, logs a warning and returns — same idea as send-password-otp local dev.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const hasBody = (options.html && options.html.length > 0) || (options.text && options.text.length > 0);
  if (!hasBody) {
    return { sent: false, reason: 'invalid_content' };
  }

  const cfg = resolveSmtpEnv();
  if (!cfg) {
    console.warn(
      '[sendEmail] SMTP not configured; set SMTP_HOST and SMTP_USERNAME/SMTP_USER, SMTP_PASSWORD/SMTP_PASS, SMTP_FROM_ADDRESS or SMTP_FROM.',
    );
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
    });

    await transporter.sendMail({
      from: cfg.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      ...(options.attachments?.length ? { attachments: options.attachments } : {}),
    });

    return { sent: true };
  } catch (cause) {
    console.error('[sendEmail]', cause);
    return { sent: false, reason: 'send_failed', cause };
  }
}
