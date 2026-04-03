import { NextRequest, NextResponse } from 'next/server';
import { logServerError, requestLogContext } from '@/lib/log-server-error';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/modules/utils/supabase';
import { hashPassword, validatePassword } from '@/modules/utils/password';

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword, resetToken } = await request.json();

    if (!email || typeof email !== 'string' || !newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const { isValid, error: validationError } = validatePassword(newPassword);
    if (!isValid) {
      return NextResponse.json({ error: 'WEAK_PASSWORD', message: validationError }, { status: 400 });
    }

    const query = supabase
      .from('password_recovery_requests')
      .select('*')
      .eq('email', email)
      .order('requested_at', { ascending: false })
      .limit(1)
      .single();

    const { data: recoveryRequest, error } = await query;

    if (error || !recoveryRequest) {
      return NextResponse.json({ error: 'INVALID_RESET_REQUEST' }, { status: 400 });
    }

    if (recoveryRequest.status !== 'verified') {
      return NextResponse.json({ error: 'INVALID_RESET_REQUEST' }, { status: 400 });
    }

    if (resetToken && recoveryRequest.reset_token !== resetToken) {
      return NextResponse.json({ error: 'INVALID_RESET_REQUEST' }, { status: 400 });
    }

    if (recoveryRequest.reset_token_expires_at) {
      const now = new Date();
      const expiresAt = new Date(recoveryRequest.reset_token_expires_at);
      if (now > expiresAt) {
        return NextResponse.json({ error: 'INVALID_RESET_REQUEST' }, { status: 400 });
      }
    }

    const passwordHash = await hashPassword(newPassword);

    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ password_hash: passwordHash })
      .eq('id', recoveryRequest.profile_id);

    if (updateProfileError) {
      console.error('Error updating password:', updateProfileError);
      await logServerError({
        environment: process.env.NODE_ENV ?? 'development',
        source: 'api:account-recovery/reset-password',
        severity: 'error',
        error: updateProfileError,
        context: requestLogContext(request),
      });
      return NextResponse.json({ error: 'FAILED_TO_UPDATE_PASSWORD' }, { status: 500 });
    }

    await supabaseAdmin
      .from('password_recovery_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', recoveryRequest.id);

    await supabaseAdmin.from('password_recovery_logs').insert({
      profile_id: recoveryRequest.profile_id,
      email,
      action: 'reset_success',
      status: 'success',
      recovery_request_id: recoveryRequest.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    await logServerError({
      environment: process.env.NODE_ENV ?? 'development',
      source: 'api:account-recovery/reset-password',
      severity: 'error',
      error,
      context: requestLogContext(request),
    });
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
