import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../utils/supabase';
import { getCreatorByEmail } from '../../../../utils/storage';

const OTP_EXPIRY_MINUTES = 10;

const generateOtp = () => {
  const code = Math.floor(100000 + Math.random() * 900000);
  return code.toString();
};

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 });
    }

    const creator = await getCreatorByEmail(email);

    // Always respond success for privacy; log not-found attempts
    if (!creator) {
      await supabase.from('password_recovery_logs').insert({
        email,
        action: 'request',
        status: 'failed',
        message: 'email_not_found',
      });

      return NextResponse.json({ success: true });
    }

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    const { data: requestRow, error: insertError } = await supabase
      .from('password_recovery_requests')
      .insert({
        profile_id: creator.id,
        email,
        otp_code: otp,
        otp_expires_at: otpExpiresAt,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating password recovery request:', insertError);
      return NextResponse.json({ error: 'FAILED_TO_CREATE_REQUEST' }, { status: 500 });
    }

    // TODO: replace with real email sending integration
    console.log('Password recovery OTP for', email, 'is', otp);

    await supabase.from('password_recovery_logs').insert({
      profile_id: creator.id,
      email,
      action: 'request',
      status: 'success',
      recovery_request_id: requestRow.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account recovery request error:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

