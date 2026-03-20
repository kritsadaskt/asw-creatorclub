import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/modules/utils/supabase';

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || typeof email !== 'string' || !otp || typeof otp !== 'string') {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const { data: recoveryRequest, error } = await supabase
      .from('password_recovery_requests')
      .select('*')
      .eq('email', email)
      .order('requested_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !recoveryRequest) {
      return NextResponse.json({ error: 'INVALID_OR_EXPIRED_OTP' }, { status: 400 });
    }

    if (recoveryRequest.status !== 'pending') {
      return NextResponse.json({ error: 'INVALID_OR_EXPIRED_OTP' }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(recoveryRequest.otp_expires_at);

    if (now > expiresAt) {
      await supabase
        .from('password_recovery_requests')
        .update({ status: 'expired' })
        .eq('id', recoveryRequest.id);

      return NextResponse.json({ error: 'INVALID_OR_EXPIRED_OTP' }, { status: 400 });
    }

    const attempts = recoveryRequest.attempts ?? 0;
    if (attempts >= MAX_ATTEMPTS) {
      await supabase
        .from('password_recovery_requests')
        .update({ status: 'failed' })
        .eq('id', recoveryRequest.id);

      return NextResponse.json({ error: 'INVALID_OR_EXPIRED_OTP' }, { status: 400 });
    }

    if (recoveryRequest.otp_code !== otp) {
      await supabase
        .from('password_recovery_requests')
        .update({ attempts: attempts + 1 })
        .eq('id', recoveryRequest.id);

      await supabase.from('password_recovery_logs').insert({
        profile_id: recoveryRequest.profile_id,
        email,
        action: 'otp_failed',
        status: 'failed',
        recovery_request_id: recoveryRequest.id,
        message: 'invalid_code',
      });

      return NextResponse.json({ error: 'INVALID_OR_EXPIRED_OTP' }, { status: 400 });
    }

    const resetToken = crypto.randomUUID();
    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase
      .from('password_recovery_requests')
      .update({
        status: 'verified',
        reset_token: resetToken,
        reset_token_expires_at: resetTokenExpiresAt,
      })
      .eq('id', recoveryRequest.id);

    await supabase.from('password_recovery_logs').insert({
      profile_id: recoveryRequest.profile_id,
      email,
      action: 'otp_verified',
      status: 'success',
      recovery_request_id: recoveryRequest.id,
    });

    return NextResponse.json({ success: true, resetToken });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
