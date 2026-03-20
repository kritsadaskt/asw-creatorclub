import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body?.email as string | undefined;
    const otp = body?.otp as string | undefined;

    if (!email || typeof email !== 'string' || !otp || typeof otp !== 'string') {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM ?? user;

    if (!host || !user || !pass || !from) {
      console.warn(
        '[send-password-otp] SMTP not configured; set SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM. OTP for',
        email,
        ':',
        otp,
      );
      return NextResponse.json({ success: true, dev: true });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: 'รหัสยืนยันกู้คืนรหัสผ่าน — Creator Club',
      text: `รหัสยืนยันของคุณคือ ${otp} (หมดอายุใน 10 นาที)`,
      html: `<p>รหัสยืนยันของคุณคือ <strong>${otp}</strong></p><p>รหัสหมดอายุใน 10 นาที</p>`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[send-password-otp]', error);
    return NextResponse.json({ error: 'EMAIL_SEND_FAILED' }, { status: 500 });
  }
}
