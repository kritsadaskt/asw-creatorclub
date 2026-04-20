/** Nodemailer attachment shape (path or content). */
export type SendEmailAttachment = {
  filename?: string;
  path?: string;
  content?: string | Buffer;
  contentType?: string;
};

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: SendEmailAttachment[];
};

export type SendEmailResult =
  | { sent: true }
  | { sent: false; reason: 'not_configured' }
  | { sent: false; reason: 'invalid_content' }
  | { sent: false; reason: 'send_failed'; cause: unknown };
