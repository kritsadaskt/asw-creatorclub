export type ResolvedSmtpEnv = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

/**
 * Reads SMTP settings with fallbacks so either naming style works:
 * - SMTP_USERNAME | SMTP_USER, SMTP_PASSWORD | SMTP_PASS
 * - SMTP_FROM_ADDRESS | SMTP_FROM (falls back to user)
 */
export function resolveSmtpEnv(): ResolvedSmtpEnv | null {
  const host = process.env.SMTP_HOST;
  if (!host || typeof host !== 'string') {
    return null;
  }

  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USERNAME ?? process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM_ADDRESS ?? process.env.SMTP_FROM ?? user;

  if (!user || !pass || !from) {
    return null;
  }

  return { host, port, user, pass, from };
}

export function isSmtpConfigured(): boolean {
  return resolveSmtpEnv() !== null;
}
