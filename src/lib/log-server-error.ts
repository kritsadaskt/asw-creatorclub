import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { LogServerErrorPayload } from '@/modules/types';

function normalizeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

/** Safe pathname + method only (no cookies/body). */
export function requestLogContext(request: NextRequest): { method: string; pathname: string } {
  return { method: request.method, pathname: request.nextUrl.pathname };
}

/**
 * Persists to `error_logs` via service role. Never throws.
 * Omit `created_at` in DB so Bangkok default applies.
 */
export async function logServerError(payload: LogServerErrorPayload): Promise<void> {
  try {
    const { error: errUnknown, message: msgOverride, stack: stackOverride, ...row } = payload;
    const normalized =
      errUnknown !== undefined ? normalizeError(errUnknown) : { message: '', stack: undefined };

    const message = (msgOverride ?? normalized.message).trim() || '(no message)';
    const stack = stackOverride ?? normalized.stack ?? null;

    const { error } = await supabaseAdmin.from('error_logs').insert({
      environment: row.environment,
      source: row.source,
      severity: row.severity,
      message,
      stack,
      context: row.context ?? null,
    });

    if (error) {
      console.error('[logServerError] insert failed:', error.message, { source: row.source });
    }
  } catch (e) {
    console.error('[logServerError]', e);
  }
}
